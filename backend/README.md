# DocuVideo Backend (FastAPI)

## Configuração do Gemini

- Crie um arquivo `.env` a partir de `.env.example` e defina `GOOGLE_API_KEY`.
- Model padrão: `DOCUVIDEO_GEMINI_MODEL=gemini-1.5-flash` (ou `gemini-1.5-pro`).

O backend usa `ffmpeg` para gerar um clipe curto por timestamp (para funcionar bem com vídeos grandes).

Exemplos:
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

## Áudio-to-Text

AI Analysis (Gemini):
- Upload de vídeo: `POST /videos` (multipart: `video`) ou `POST /videos/raw` (raw body)
	- O backend salva o vídeo localmente.
	- A cada `smart-text`, ele gera um clipe curto ao redor do timestamp e envia *apenas o clipe* ao Gemini.
- Status: `GET /videos/{video_id}/status`
- Descrição por timestamp: `GET /videos/{video_id}/smart-text?timestamp=00:05:30`
