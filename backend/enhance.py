"""
Enhancement de Documentação com Groq

Este módulo contém funções para transformar passos capturados no ClipBuilder
em documentos profissionais estruturados usando a API do Groq.
"""

from __future__ import annotations

import base64
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("clipbuilder.enhance")

# Meta-prompt para formatar documento como manual passo a passo (template padrão)
TEMPLATE_SYSTEM_PROMPT = """Você é um especialista em documentação técnica. Analise o texto fornecido e converta-o em um manual passo a passo seguindo rigorosamente a estrutura do modelo padrão: **Título principal** em negrito; seção **Pré-requisitos**; passos numerados com subtítulos claros; **Checklist de verificação** ao final; **Notas importantes** quando aplicável. Mantenha apenas informações presentes no texto; não invente conteúdo. Responda em Markdown, usando # para título, ## para seções, listas numeradas e listas com - [ ] para checklist."""


def build_enhancement_prompt(
    title: str,
    steps: list[dict[str, Any]],
    document_type: str = "guia_tecnico",
) -> str:
    """Constrói o prompt otimizado para Groq gerar documento estruturado."""
    
    # Formatar os passos para o prompt
    steps_text = ""
    for i, step in enumerate(steps, 1):
        desc = step.get("description", "").strip()
        timestamp = step.get("timestamp", "")
        has_image = step.get("has_image", False)
        
        steps_text += f"\n{i}. {desc}"
        if timestamp:
            steps_text += f" (timestamp: {timestamp})"
        if has_image:
            steps_text += " [com imagem]"
    
    prompt = f'''Você é um especialista em Documentação Técnica de Software.

TAREFA: Transforme os passos capturados abaixo em um documento profissional estruturado.

TÍTULO DO PROCESSO: {title}

PASSOS CAPTURADOS:
{steps_text}

FORMATO DE SAÍDA OBRIGATÓRIO:

Gere um documento em Markdown seguindo EXATAMENTE esta estrutura:

```markdown
# [Título do Documento]

## Visão Geral
[Escreva um parágrafo explicando o objetivo geral do processo e o que será alcançado]

---

## Índice
[Liste todas as seções numeradas]

---

## 1. [Nome da Primeira Seção/Etapa]

### Objetivo
[Descreva em 1-2 frases o objetivo desta etapa específica]

### Procedimento
1. [Primeiro passo imperativo]
2. [Segundo passo imperativo]
3. [Continue numerando...]

📝 **Nota:** [Se aplicável, adicione uma nota relevante]

💡 **Dica:** [Se aplicável, adicione uma dica útil]

⚠️ **Importante:** [Se aplicável, adicione um aviso importante]

---

## 2. [Nome da Segunda Seção/Etapa]
[Continue o mesmo padrão...]

---

## Checklist de Verificação Final

Antes de finalizar o processo, confirme:

- [ ] [Item 1 a verificar]
- [ ] [Item 2 a verificar]
- [ ] [Continue...]

---

## Problemas Comuns e Soluções

### Problema: [Descrição do problema]
**Solução:** [Como resolver]

### Problema: [Outro problema comum]
**Solução:** [Como resolver]

---

## Notas Importantes

1. [Primeira nota importante sobre o processo]
2. [Segunda nota importante]
3. [Continue se necessário]
```

REGRAS IMPORTANTES:
1. Agrupe passos relacionados em seções lógicas (não crie uma seção para cada passo individual)
2. Use linguagem imperativa nos procedimentos (ex: "Clique em...", "Selecione...", "Acesse...")
3. Adicione notas (📝), dicas (💡) e avisos (⚠️) quando apropriado
4. Crie um checklist relevante para o processo
5. Identifique possíveis problemas e suas soluções
6. Escreva em português do Brasil (pt-BR)
7. Seja profissional mas acessível
8. Não invente passos que não foram informados, apenas organize e melhore a redação
9. Inclua referências às imagens quando o passo tiver "[com imagem]"

Gere o documento completo agora:'''

    return prompt


def build_enhancement_prompt_with_images(
    title: str,
    steps: list[dict[str, Any]],
    images_b64: list[str],
) -> tuple[str, list[dict[str, Any]]]:
    """
    Constrói prompt com suporte a imagens para análise visual.
    
    Retorna tupla (texto_prompt, lista_de_conteúdo_para_api)
    """
    base_prompt = build_enhancement_prompt(title, steps)
    
    # Se não há imagens, retorna só o texto
    if not images_b64:
        return base_prompt, [{"type": "text", "text": base_prompt}]
    
    # Construir conteúdo multimodal
    content: list[dict[str, Any]] = [{"type": "text", "text": base_prompt}]
    
    for i, b64_img in enumerate(images_b64[:10]):  # Max 10 imagens
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{b64_img}",
            },
        })
    
    # Adicionar instrução sobre as imagens
    content.append({
        "type": "text",
        "text": (
            "\n\nAs imagens acima correspondem aos passos capturados. "
            "Use-as para entender melhor o contexto visual do processo "
            "e gerar descrições mais precisas."
        ),
    })
    
    return base_prompt, content


def enhance_document_with_groq(
    title: str,
    steps: list[dict[str, Any]],
    api_key: str,
    model: str = "meta-llama/llama-4-scout-17b-16e-instruct",
    images_b64: list[str] | None = None,
) -> str:
    """
    Transforma passos capturados em documento profissional usando Groq.
    
    Args:
        title: Título do documento
        steps: Lista de passos com descrição, timestamp, has_image
        api_key: Chave da API Groq
        model: Modelo a usar (padrão: Llama 4 Scout)
        images_b64: Lista opcional de imagens em base64
        
    Returns:
        Documento Markdown estruturado
    """
    try:
        from groq import Groq
    except ImportError as exc:
        raise RuntimeError(
            "Dependência 'groq' não instalada. Execute: pip install groq"
        ) from exc
    
    client = Groq(api_key=api_key)
    
    # Construir prompt
    if images_b64:
        _, content = build_enhancement_prompt_with_images(title, steps, images_b64)
        messages = [{"role": "user", "content": content}]
    else:
        prompt = build_enhancement_prompt(title, steps)
        messages = [{"role": "user", "content": prompt}]
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_completion_tokens=8192,  # Documento longo
        )
        
        result = response.choices[0].message.content or ""
        
        # Limpar possíveis marcadores de código markdown
        if result.startswith("```markdown"):
            result = result[len("```markdown"):].strip()
        if result.startswith("```"):
            result = result[3:].strip()
        if result.endswith("```"):
            result = result[:-3].strip()
            
        return result
        
    except Exception as exc:
        error_msg = str(exc).lower()
        if "rate" in error_msg or "limit" in error_msg or "429" in error_msg:
            raise RuntimeError(
                "Limite de requisições do Groq excedido. Tente novamente em alguns segundos."
            ) from exc
        if "invalid" in error_msg and "api" in error_msg:
            raise RuntimeError(
                "Chave da API Groq inválida. Verifique GROQ_API_KEY no .env"
            ) from exc
        raise RuntimeError(f"Erro ao processar com Groq: {str(exc)[:200]}") from exc


def format_document_like_template(
    raw_text: str,
    api_key: str,
    model: str = "meta-llama/llama-4-scout-17b-16e-instruct",
) -> str:
    """
    Analisa o texto e reformata como manual passo a passo segundo o template padrão.

    Args:
        raw_text: Texto bruto do documento (extraído de .md, .docx ou .pdf).
        api_key: Chave da API Groq.
        model: Modelo Groq (padrão: Llama 4 Scout).

    Returns:
        Markdown formatado (título, pré-requisitos, passos numerados, checklist, notas).
    """
    try:
        from groq import Groq
    except ImportError as exc:
        raise RuntimeError(
            "Dependência 'groq' não instalada. Execute: pip install groq"
        ) from exc

    client = Groq(api_key=api_key)
    messages = [
        {"role": "system", "content": TEMPLATE_SYSTEM_PROMPT},
        {"role": "user", "content": raw_text.strip() or "(Texto vazio.)"},
    ]

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.5,
            max_completion_tokens=8192,
        )
        result = response.choices[0].message.content or ""

        # Limpar possíveis blocos de código markdown
        if result.startswith("```markdown"):
            result = result[len("```markdown") :].strip()
        if result.startswith("```"):
            result = result[3:].strip()
        if result.endswith("```"):
            result = result[:-3].strip()

        return result

    except Exception as exc:
        error_msg = str(exc).lower()
        if "rate" in error_msg or "limit" in error_msg or "429" in error_msg:
            raise RuntimeError(
                "Limite de requisições do Groq excedido. Tente novamente em alguns segundos."
            ) from exc
        if "invalid" in error_msg and "api" in error_msg:
            raise RuntimeError(
                "Chave da API Groq inválida. Verifique GROQ_API_KEY no .env"
            ) from exc
        raise RuntimeError(f"Erro ao processar com Groq: {str(exc)[:200]}") from exc
