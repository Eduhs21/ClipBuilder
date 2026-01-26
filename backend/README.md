# ClipBuilder Backend (FastAPI)

## Configuração do Groq

- Crie um arquivo `.env` a partir de `.env.example` e defina `GROQ_API_KEY`.
- Models padrão:
  - Texto: `CLIPBUILDER_GROQ_MODEL=llama-3.3-70b-versatile`
  - Visão: `CLIPBUILDER_GROQ_VISION_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct`

### Modelos de Visão Suportados

Para análise de imagens/frames de vídeo, use um destes modelos:
- `meta-llama/llama-4-maverick-17b-128e-instruct` (recomendado)
- `meta-llama/llama-4-scout-17b-16e-instruct`
- `llama-3.2-11b-vision-preview`
- `llama-3.2-90b-vision-preview`

O backend usa `ffmpeg` para extrair frames de vídeo.

Exemplos de instalação do ffmpeg:
- Debian/Ubuntu: `sudo apt-get install -y ffmpeg`
- Fedora: `sudo dnf install -y ffmpeg`
- Arch: `sudo pacman -S ffmpeg`

## Rodar localmente

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- Health check: http://localhost:8000/health
- Export: `POST /export` (multipart: `steps` JSON + `images[]`)

### Exportação (`POST /export`)

Campos principais:
- `steps` (string JSON)
- `images[]` (arquivos PNG, somente para passos com `has_image=true`)
- `image_name_prefix` (opcional)
- `output_format`: `markdown` (ZIP), `html`, `docx`, `pdf`, `plain`

Observações:
- `markdown` retorna um ZIP com `tutorial.md` + pasta `img/`.
- `pdf` é gerado via ReportLab (no Docker já inclui fonte DejaVu para acentos/pt-BR).

## AI Vision (Groq)

Análise de frames de vídeo com IA:
- Upload de vídeo: `POST /videos` (multipart: `video`) ou `POST /videos/raw` (raw body)
	- O backend salva o vídeo localmente.
	- A cada `smart-text`, extrai um frame do timestamp e envia ao Groq Vision.
- Status: `GET /videos/{video_id}/status`
- Descrição por timestamp: `GET /videos/{video_id}/smart-text?timestamp=00:05:30`

## Importar do YouTube (yt-dlp)

Alguns videos disparam o bloqueio do YouTube ("Sign in to confirm you're not a bot"). Nesse caso, o `yt-dlp` precisa de cookies.

- Exporte um arquivo `cookies.txt` do seu navegador (formato Netscape) e aponte no backend:
	- `CLIPBUILDER_YTDLP_COOKIES_FILE=/caminho/absoluto/para/cookies.txt`

Alternativa (sem export manual): usar os cookies direto do perfil do navegador:

- `CLIPBUILDER_YTDLP_COOKIES_FROM_BROWSER=firefox` (ou `chrome`, `chromium`, etc.)
- Opcional: `CLIPBUILDER_YTDLP_COOKIES_FROM_BROWSER_ARGS=default` (se precisar escolher perfil/variante)

Observacao: mantenha esse arquivo privado (ele da acesso a sua sessao).
