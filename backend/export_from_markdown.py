"""
Exporta Markdown (saída do Groq) para .docx ou .pdf.

Parsing simples: # ## ###, **negrito**, listas e checklist (- [ ]).
"""

from __future__ import annotations

import io
import re


def _escape_html(s: str) -> str:
    """Escapa &, <, > para uso em Paragraph do reportlab."""
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _parse_inline_bold(text: str) -> list[tuple[str, bool]]:
    """Retorna lista de (fragmento, is_bold). Ex: 'Foo **bar** baz' -> [('Foo ', False), ('bar', True), (' baz', False)]."""
    parts: list[tuple[str, bool]] = []
    rest = text
    while rest:
        i = rest.find("**")
        if i == -1:
            if rest:
                parts.append((rest, False))
            break
        before = rest[:i]
        rest = rest[i + 2:]
        j = rest.find("**")
        if j == -1:
            parts.append((before + "**" + rest, False))
            break
        if before:
            parts.append((before, False))
        parts.append((rest[:j], True))
        rest = rest[j + 2:]
    return parts


def markdown_to_docx(markdown: str) -> bytes:
    """
    Converte Markdown em bytes de um documento Word (.docx).

    Suporta: # ## ###, **negrito**, listas -, *, 1., e - [ ] (checklist).
    """
    try:
        from docx import Document
        from docx.shared import Pt
    except ImportError as exc:
        raise RuntimeError(
            "Dependência 'python-docx' não instalada. Instale no backend."
        ) from exc

    doc = Document()
    lines = markdown.replace("\r\n", "\n").replace("\r", "\n").split("\n")

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Headings
        if stripped.startswith("### "):
            doc.add_heading(stripped[4:].strip(), level=3)
            i += 1
            continue
        if stripped.startswith("## "):
            doc.add_heading(stripped[3:].strip(), level=2)
            i += 1
            continue
        if stripped.startswith("# "):
            doc.add_heading(stripped[2:].strip(), level=1)
            i += 1
            continue

        # Horizontal rule / ---
        if stripped in ("---", "***", "___"):
            i += 1
            continue

        # Checklist: - [ ] ou - [x]
        if re.match(r"^[\s]*-\s*\[[\sxX]\]\s*", stripped):
            text = re.sub(r"^[\s]*-\s*\[[\sxX]\]\s*", "☐ ", stripped)
            p = doc.add_paragraph()
            for frag, bold in _parse_inline_bold(text):
                run = p.add_run(frag)
                run.bold = bold
            i += 1
            continue

        # Unordered list: - item or * item
        if re.match(r"^[\s]*[-*]\s+", stripped):
            text = re.sub(r"^[\s]*[-*]\s+", "", stripped, count=1)
            p = doc.add_paragraph(style="List Bullet")
            for frag, bold in _parse_inline_bold(text):
                run = p.add_run(frag)
                run.bold = bold
            i += 1
            continue

        # Numbered list: 1. item
        num_match = re.match(r"^[\s]*(\d+)\.\s+", stripped)
        if num_match:
            text = stripped[num_match.end() :]
            p = doc.add_paragraph(style="List Number")
            for frag, bold in _parse_inline_bold(text):
                run = p.add_run(frag)
                run.bold = bold
            i += 1
            continue

        # Empty line
        if not stripped:
            i += 1
            continue

        # Normal paragraph
        p = doc.add_paragraph()
        for frag, bold in _parse_inline_bold(stripped):
            run = p.add_run(frag)
            run.bold = bold
        i += 1

    out = io.BytesIO()
    doc.save(out)
    out.seek(0)
    return out.read()


def markdown_to_pdf(markdown: str) -> bytes:
    """
    Converte Markdown em bytes de um PDF.

    Reutiliza padrão do projeto: DejaVu/Helvetica, SimpleDocTemplate, Paragraph.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    except ImportError as exc:
        raise RuntimeError(
            "Dependência 'reportlab' não instalada. Instale no backend."
        ) from exc

    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    try:
        pdfmetrics.registerFont(TTFont("DejaVuSans", font_path))
        base_font = "DejaVuSans"
    except Exception:
        base_font = "Helvetica"

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "MdTitle",
        parent=styles["Title"],
        fontName=base_font,
    )
    h2_style = ParagraphStyle(
        "MdH2",
        parent=styles["Heading2"],
        fontName=base_font,
        spaceBefore=12,
        spaceAfter=6,
    )
    h3_style = ParagraphStyle(
        "MdH3",
        parent=styles["Heading3"],
        fontName=base_font,
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "MdBody",
        parent=styles["BodyText"],
        fontName=base_font,
        leading=14,
    )

    out = io.BytesIO()
    doc = SimpleDocTemplate(
        out,
        pagesize=A4,
        leftMargin=0.8 * inch,
        rightMargin=0.8 * inch,
        topMargin=0.8 * inch,
        bottomMargin=0.8 * inch,
        title="Manual",
    )

    story: list[object] = []
    lines = markdown.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("### "):
            text = _escape_html(stripped[4:].strip())
            story.append(Paragraph(text, h3_style))
            story.append(Spacer(1, 4))
            i += 1
            continue
        if stripped.startswith("## "):
            text = _escape_html(stripped[3:].strip())
            story.append(Paragraph(text, h2_style))
            story.append(Spacer(1, 6))
            i += 1
            continue
        if stripped.startswith("# "):
            text = _escape_html(stripped[2:].strip())
            story.append(Paragraph(text, title_style))
            story.append(Spacer(1, 12))
            i += 1
            continue

        if stripped in ("---", "***", "___"):
            i += 1
            continue

        # Checklist or list
        if re.match(r"^[\s]*-\s*\[[\sxX]\]\s*", stripped):
            text = re.sub(r"^[\s]*-\s*\[[\sxX]\]\s*", "☐ ", stripped)
            text = _escape_html(text).replace("\n", "<br/>")
            story.append(Paragraph(text, body_style))
            i += 1
            continue
        if re.match(r"^[\s]*[-*]\s+", stripped):
            text = re.sub(r"^[\s]*[-*]\s+", "• ", stripped, count=1)
            text = _escape_html(text).replace("\n", "<br/>")
            story.append(Paragraph(text, body_style))
            i += 1
            continue
        num_match = re.match(r"^[\s]*(\d+)\.\s+", stripped)
        if num_match:
            text = stripped[num_match.end() :]
            text = _escape_html(text).replace("\n", "<br/>")
            story.append(Paragraph(text, body_style))
            i += 1
            continue

        if not stripped:
            i += 1
            continue

        text = _escape_html(stripped).replace("\n", "<br/>")
        story.append(Paragraph(text, body_style))
        story.append(Spacer(1, 6))
        i += 1

    doc.build(story)
    out.seek(0)
    return out.read()
