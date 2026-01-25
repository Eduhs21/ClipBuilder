# ClipBuilder

ClipBuilder transforma vídeos em tutoriais visuais passo‑a‑passo: você faz upload/importa um vídeo, captura frames como passos, gera descrições com IA (Gemini) e exporta em **HTML / DOCX / texto / ZIP**.

## Estrutura

- `backend/`: FastAPI (upload/import, Gemini, export)
- `frontend/`: React + Vite (player, captura, edição)

## Requisitos

- Python 3.10+
- Node.js 18+
- `ffmpeg` instalado no sistema (backend)

## Rodar localmente (dev)

1) Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- Health: http://127.0.0.1:8000/health

2) Frontend

```bash
cd frontend
npm install
npm run dev
```

- UI: http://localhost:5173

## Rodar com Docker (recomendado para servidor)

1) Crie um arquivo `.env` na raiz do repo com a chave do Gemini:

```bash
GOOGLE_API_KEY=SEU_TOKEN_AQUI
```

2) Suba tudo com um comando:

```bash
docker compose up -d --build
```

3) Abra:

- http://localhost:8080 (frontend)

Observação: o frontend usa `/api` por padrão e o `nginx` no container faz proxy para o backend.

## Configuração

### Backend (.env)

Crie `backend/.env` baseado em [backend/.env.example](backend/.env.example) e defina pelo menos:

- `GOOGLE_API_KEY` (Gemini)

Opcional (principais):

- `CLIPBUILDER_GEMINI_MODEL` (padrão: `models/gemini-2.5-flash`)
- `CLIPBUILDER_DATA_DIR` (onde salvar uploads/clipes)
- `CLIPBUILDER_MAX_VIDEO_BYTES` (limite de upload)
- `CLIPBUILDER_YTDLP_COOKIES_FILE` ou `CLIPBUILDER_YTDLP_COOKIES_FROM_BROWSER` (YouTube)

### Frontend (localStorage)

O frontend salva preferências no navegador. As principais são:

- `CLIPBUILDER_API_URL` (ex.: `http://127.0.0.1:8000`)
- `CLIPBUILDER_GOOGLE_API_KEY` (opcional; evite em produção)

## Fluxo de uso

1. Faça upload de um vídeo (MP4/MKV) ou importe do YouTube.
2. Capture frames (atalho `S`) e ajuste os passos.
3. Gere descrições com IA por timestamp (configurável no modal).
4. Exporte em HTML/DOCX/texto ou ZIP.

## Troubleshooting

- **Gemini 429 (quota/rate limit)**: é limite do provedor; aguarde/reset e/ou ajuste billing/limites da chave.
- **YouTube “not a bot”**: configure cookies do `yt-dlp` via `CLIPBUILDER_YTDLP_COOKIES_FILE` ou `CLIPBUILDER_YTDLP_COOKIES_FROM_BROWSER`.
- **Erros de vídeo**: confirme que `ffmpeg` está instalado e que `CLIPBUILDER_DATA_DIR` tem espaço em disco.

## Licença

Veja [LICENSE](LICENSE).
