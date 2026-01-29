"""
Extração de texto de documentos para o pipeline format-and-export.

Suporta: Markdown (string ou .md), DOCX e PDF.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import UploadFile

logger = logging.getLogger("clipbuilder.document_loader")

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = (".md", ".docx", ".pdf")


async def extract_text_from_document(
    file: "UploadFile | None" = None,
    markdown_text: str | None = None,
) -> str:
    """
    Extrai texto a partir de markdown (string), ou de um ficheiro .md, .docx ou .pdf.

    Args:
        file: Ficheiro enviado (opcional).
        markdown_text: Texto Markdown já em string (opcional).

    Returns:
        Texto bruto para envio ao Groq.

    Raises:
        ValueError: Se nem file nem markdown_text forem fornecidos, ou se o ficheiro
                    for inválido (extensão ou tamanho).
    """
    if markdown_text is not None and markdown_text.strip():
        return markdown_text.strip()

    if file is None or not file.filename:
        raise ValueError("É necessário fornecer 'markdown' (texto) ou enviar um ficheiro .md, .docx ou .pdf.")

    filename = file.filename
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Formato de ficheiro não suportado: {ext}. Use .md, .docx ou .pdf."
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_FILE_BYTES:
        raise ValueError(
            f"Ficheiro demasiado grande (máx. {MAX_FILE_BYTES // (1024*1024)} MB)."
        )
    if len(raw_bytes) == 0:
        raise ValueError("O ficheiro está vazio.")

    if ext == ".md":
        try:
            return raw_bytes.decode("utf-8").strip()
        except UnicodeDecodeError:
            try:
                return raw_bytes.decode("latin-1").strip()
            except Exception as e:
                raise ValueError(f"Falha ao ler ficheiro .md: {e}") from e

    if ext == ".docx":
        return _extract_text_from_docx(raw_bytes)

    if ext == ".pdf":
        return _extract_text_from_pdf(raw_bytes)

    raise ValueError(f"Formato não implementado: {ext}")


def _extract_text_from_docx(raw_bytes: bytes) -> str:
    """Extrai texto de um DOCX usando python-docx."""
    try:
        from docx import Document
    except ImportError as exc:
        raise RuntimeError(
            "Dependência 'python-docx' não instalada. Instale no backend."
        ) from exc

    doc = Document(io.BytesIO(raw_bytes))
    parts = []
    for para in doc.paragraphs:
        if para.text.strip():
            parts.append(para.text)
    return "\n\n".join(parts).strip() if parts else ""


def _extract_text_from_pdf(raw_bytes: bytes) -> str:
    """Extrai texto de um PDF usando pypdf."""
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError(
            "Dependência 'pypdf' não instalada. Execute: pip install pypdf"
        ) from exc

    reader = PdfReader(io.BytesIO(raw_bytes))
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text and text.strip():
            parts.append(text.strip())
    return "\n\n".join(parts).strip() if parts else ""
