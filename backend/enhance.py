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

# ---------------------------------------------------------------------------
# Doc Pro: Prompt otimizado para Gemini gerar documento altamente estruturado
# ---------------------------------------------------------------------------

DOC_PRO_SYSTEM_PROMPT = """Você é um Redator Técnico Sênior especializado em criar documentação de software de excelência.

Sua tarefa é transformar passos capturados de um tutorial em um documento Markdown profissional e altamente estruturado.

## REGRAS OBRIGATÓRIAS

### Estrutura de Cada Passo
Cada passo DEVE conter obrigatoriamente:
1. **Objetivo**: Uma frase curta e direta que descreve o propósito do passo (máximo 15 palavras)
2. **Procedimento**: Lista numerada com as ações específicas em linguagem imperativa

### Callouts (Alertas)
Identifique pontos críticos e marque-os usando a sintaxe GitHub:
- `> [!NOTE]` - Para informações complementares úteis
- `> [!TIP]` - Para dicas de otimização ou atalhos
- `> [!WARNING]` - Para avisos sobre ações que podem causar problemas
- `> [!CAUTION]` - Para alertas críticos sobre segurança ou perda de dados

Use pelo menos 2 callouts no documento, posicionados após o procedimento do passo relevante.

### Seções Finais Obrigatórias
Ao final do documento, SEMPRE inclua:
1. **Checklist de Verificação Final** - Lista de verificação com `- [ ]`
2. **Problemas Comuns e Soluções** - Tabela markdown com colunas: Problema | Causa | Solução

### Preservação de Imagens
Quando o passo indicar "[com imagem]" ou "has_image: true", inclua a referência:
`![Passo N](./img/step_NN.png)` onde NN é o número do passo com 2 dígitos.

### Idioma e Estilo
- Escreva em português do Brasil (pt-BR)
- Use linguagem imperativa nos procedimentos (ex: "Clique em...", "Selecione...")
- Seja profissional mas acessível
- Não invente passos que não foram informados"""


def build_doc_pro_prompt(
    title: str,
    steps: list[dict[str, Any]],
) -> str:
    """Constrói o prompt para o Doc Pro (Gemini) gerar documento estruturado."""
    
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
    
    prompt = f'''TÍTULO DO DOCUMENTO: {title}

PASSOS CAPTURADOS:
{steps_text}

---

Gere o documento Markdown seguindo EXATAMENTE esta estrutura:

```markdown
# {title}

## Visão Geral
[Um parágrafo resumindo o objetivo do procedimento e o que será alcançado]

---

## Passo 1: [Nome Descritivo do Passo]

### Objetivo
[Frase curta descrevendo o propósito deste passo]

### Procedimento
1. [Primeira ação em linguagem imperativa]
2. [Segunda ação]
3. [Continue conforme necessário...]

> [!NOTE/TIP/WARNING]
> [Callout se aplicável a este passo]

![Passo 1](./img/step_01.png)

---

## Passo 2: [Nome Descritivo]
[Continue o padrão para todos os passos...]

---

## Checklist de Verificação Final

Antes de considerar o procedimento concluído, confirme:

- [ ] [Item de verificação 1]
- [ ] [Item de verificação 2]
- [ ] [Continue conforme necessário...]

---

## Problemas Comuns e Soluções

| Problema | Causa | Solução |
|----------|-------|---------|
| [Descrição do problema] | [Por que ocorre] | [Como resolver] |
| [Segundo problema] | [Causa] | [Solução] |
```

IMPORTANTE:
1. Agrupe passos relacionados em seções lógicas quando apropriado
2. Use linguagem imperativa nos procedimentos
3. Inclua pelo menos 2 callouts (> [!NOTE], > [!TIP], > [!WARNING])
4. Inclua referência à imagem (![Passo N](./img/step_NN.png)) APENAS para passos que têm "[com imagem]"
5. A tabela de problemas deve ter PELO MENOS 2 problemas comuns relacionados ao processo
6. O checklist deve ter PELO MENOS 3 itens de verificação

Gere o documento completo agora:'''

    return prompt


def enhance_document_with_gemini(
    title: str,
    steps: list[dict[str, Any]],
    api_key: str,
    model: str = "models/gemini-2.5-flash",
) -> str:
    """
    Transforma passos capturados em documento profissional usando Gemini.
    
    Args:
        title: Título do documento
        steps: Lista de passos com descrição, timestamp, has_image
        api_key: Chave da API Google (Gemini)
        model: Modelo a usar (padrão: gemini-2.5-flash)
        
    Returns:
        Documento Markdown estruturado com:
        - Objetivo e Procedimento por passo
        - Callouts (NOTE, TIP, WARNING)
        - Checklist de Verificação Final
        - Tabela de Problemas Comuns e Soluções
    """
    try:
        import google.generativeai as genai
    except ImportError as exc:
        raise RuntimeError(
            "Dependência 'google-generativeai' não instalada. Execute: pip install google-generativeai"
        ) from exc
    
    genai.configure(api_key=api_key)
    
    # Normalizar nome do modelo
    normalized_model = model
    if not model.startswith("models/"):
        normalized_model = f"models/{model}"
    
    # Construir prompt
    user_prompt = build_doc_pro_prompt(title, steps)
    
    try:
        gen_model = genai.GenerativeModel(
            model_name=normalized_model,
            system_instruction=DOC_PRO_SYSTEM_PROMPT,
        )
        
        response = gen_model.generate_content(
            user_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=8192,
            ),
        )
        
        result = response.text or ""
        
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
        if "rate" in error_msg or "quota" in error_msg or "429" in error_msg:
            raise RuntimeError(
                "Quota/limite do Gemini excedido. Verifique billing/limites do projeto e tente novamente."
            ) from exc
        if "invalid" in error_msg and "api" in error_msg:
            raise RuntimeError(
                "Chave da API Google inválida. Verifique GOOGLE_API_KEY no .env"
            ) from exc
        if "permission" in error_msg or "403" in error_msg:
            raise RuntimeError(
                "Permissão negada pelo Gemini. Verifique se a API está habilitada."
            ) from exc
        raise RuntimeError(f"Erro ao processar com Gemini: {str(exc)[:200]}") from exc


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


# ---------------------------------------------------------------------------
# Documentação Estruturada no formato do Template (JSON)
# ---------------------------------------------------------------------------

DOC_TEMPLATE_SYSTEM_PROMPT = """Você é um Redator Técnico Sênior especializado em criar documentação de software para o sistema WinThor.

Sua tarefa é transformar passos capturados de um tutorial em um documento JSON estruturado profissional.

## FORMATO DE SAÍDA OBRIGATÓRIO (JSON válido)

Retorne APENAS um objeto JSON válido seguindo EXATAMENTE esta estrutura:

{
  "visao_geral": "Resumo do procedimento e sua importância para o sistema/processo fiscal",
  "passos": [
    {
      "numero": 1,
      "titulo": "Nome Descritivo do Passo",
      "objetivo": "Uma frase curta e direta descrevendo o propósito deste passo (máximo 15 palavras)",
      "procedimento": [
        "Primeira ação em linguagem imperativa",
        "Segunda ação",
        "Continue conforme necessário"
      ],
      "imagem": "./img/step_01.png"
    }
  ],
  "avisos": [
    {
      "tipo": "WARNING",
      "texto": "Pontos críticos que podem causar problemas se ignorados"
    },
    {
      "tipo": "TIP",
      "texto": "Boas práticas ou atalhos para otimizar o processo"
    }
  ],
  "checklist": [
    "Item de verificação 1",
    "Item de verificação 2",
    "Item de verificação 3"
  ],
  "troubleshooting": [
    {
      "problema": "Descrição do problema comum",
      "causa": "Por que esse problema ocorre",
      "solucao": "Como resolver o problema"
    }
  ]
}

## REGRAS OBRIGATÓRIAS

1. **Retorne APENAS JSON válido** - Sem texto antes ou depois, sem markdown code blocks
2. **Cada passo DEVE ter** objetivo (max 15 palavras) e procedimento (lista de ações imperativas)
3. **Avisos**: Inclua pelo menos 1 WARNING e 1 TIP relevantes ao processo
4. **Checklist**: Mínimo 3 itens de verificação final
5. **Troubleshooting**: Mínimo 2 problemas comuns com causa e solução
6. **Idioma**: Português do Brasil (pt-BR)
7. **Estilo**: Linguagem imperativa nos procedimentos (ex: "Clique em...", "Selecione...")
8. **Imagens**: Use "./img/step_NN.png" onde NN é o número do passo com 2 dígitos
9. **Não invente** passos que não foram informados"""



def _summarize_context_with_groq(text: str, client, model: str) -> str:
    """Resume contexto técnico mantendo detalhes cruciais."""
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um especialista em síntese técnica. Seu objetivo é resumir o texto fornecido mantendo TODOS os detalhes procedimentais (cliques, nomes de campos, valores), mas removendo verbosidade excessiva e repetições. O resultado deve ser uma lista de passos sequenciais claros."
                },
                {
                    "role": "user",
                    "content": f"Resuma o seguinte conteúdo técnico:\n\n{text[:50000]}" # Limite hard de segurança
                }
            ],
            temperature=0.3, # Baixa temperatura para precisão
            max_tokens=4096
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Erro ao resumir contexto: {e}")
        return text[:25000] # Fallback: truncar

def generate_structured_documentation(
    title: str,
    steps: list[dict[str, Any]],
    api_key: str,
    model: str = "meta-llama/llama-4-scout-17b-16e-instruct",
    images_b64: list[str] | None = None,
) -> dict[str, Any]:
    """
    Gera documentação estruturada em formato JSON usando Groq.
    
    Args:
        title: Título do documento
        steps: Lista de passos com descrição, timestamp, has_image
        api_key: Chave da API Groq
        model: Modelo a usar (padrão: Llama 4 Scout)
        images_b64: Lista opcional de imagens em base64
        
    Returns:
        Dicionário JSON estruturado com:
        - visao_geral: str
        - passos: list[dict] com numero, titulo, objetivo, procedimento, imagem
        - avisos: list[dict] com tipo (WARNING/TIP/NOTE) e texto
        - checklist: list[str]
        - troubleshooting: list[dict] com problema, causa, solucao
    """
    import json
    import re
    
    try:
        from groq import Groq
    except ImportError as exc:
        raise RuntimeError(
            "Dependência 'groq' não instalada. Execute: pip install groq"
        ) from exc
    
    client = Groq(api_key=api_key)
    
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

    # Validação e Compressão de Contexto
    MAX_CONTEXT_LENGTH = 25000  # Caracteres (~6k tokens)
    if len(steps_text) > MAX_CONTEXT_LENGTH:
        print(f"Contexto muito longo ({len(steps_text)} chars). Resumindo com IA...")
        steps_text = _summarize_context_with_groq(steps_text, client, model)

    user_prompt = f'''TÍTULO DO DOCUMENTO: {title}

PASSOS CAPTURADOS:
{steps_text}

---

Analise os passos acima e gere o JSON estruturado seguindo exatamente o formato especificado.

Lembre-se:
- Agrupe passos relacionados quando apropriado
- Gere avisos WARNING para pontos críticos
- Gere avisos TIP para boas práticas
- O checklist deve verificar os pontos-chave do processo
- O troubleshooting deve conter problemas reais que podem ocorrer

Retorne APENAS o JSON válido:'''

    # Build message content
    if images_b64:
        content: list[dict[str, Any]] = [{"type": "text", "text": user_prompt}]
        for i, b64_img in enumerate(images_b64[:5]):  # Max 5 imagens
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{b64_img}",
                },
            })
        messages = [
            {"role": "system", "content": DOC_TEMPLATE_SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ]
    else:
        messages = [
            {"role": "system", "content": DOC_TEMPLATE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.5,  # Menor temperatura para JSON mais consistente
            max_completion_tokens=8192,
        )
        
        result = response.choices[0].message.content or ""
        
        # Tentar limpar marcadores de código markdown
        result = result.strip()
        if result.startswith("```json"):
            result = result[len("```json"):].strip()
        if result.startswith("```"):
            result = result[3:].strip()
        if result.endswith("```"):
            result = result[:-3].strip()
        
        # Tentar parse do JSON
        try:
            parsed = json.loads(result)
            
            # Validar estrutura mínima
            if not isinstance(parsed, dict):
                raise ValueError("Resposta não é um objeto JSON")
            
            # Garantir campos obrigatórios com valores padrão
            if "visao_geral" not in parsed:
                parsed["visao_geral"] = f"Procedimento para {title}"
            if "passos" not in parsed:
                parsed["passos"] = []
            if "avisos" not in parsed:
                parsed["avisos"] = []
            if "checklist" not in parsed:
                parsed["checklist"] = []
            if "troubleshooting" not in parsed:
                parsed["troubleshooting"] = []
                
            return parsed
            
        except json.JSONDecodeError as json_exc:
            # Fallback: tentar extrair JSON do texto
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                try:
                    parsed = json.loads(json_match.group())
                    return parsed
                except json.JSONDecodeError:
                    pass
            
            # Se falhar, criar estrutura básica a partir do resultado
            logger.warning("Falha ao parsear JSON do Groq, criando estrutura básica: %s", json_exc)
            return {
                "visao_geral": f"Procedimento para {title}",
                "passos": [
                    {
                        "numero": i,
                        "titulo": f"Passo {i}",
                        "objetivo": step.get("description", "")[:100],
                        "procedimento": [step.get("description", "")],
                        "imagem": f"./img/step_{i:02d}.png" if step.get("has_image") else None
                    }
                    for i, step in enumerate(steps, 1)
                ],
                "avisos": [
                    {"tipo": "NOTE", "texto": "Documentação gerada automaticamente - verifique os detalhes"}
                ],
                "checklist": ["Verificar se todos os passos foram concluídos"],
                "troubleshooting": [],
                "_raw_response": result  # Para debug
            }
            
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
