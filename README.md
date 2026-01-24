# DocuVideo

Aplicação web local para capturar frames de um vídeo e gerar um tutorial em Markdown + imagens.

## Estrutura
- `backend/` FastAPI (exporta .zip com `tutorial.md` + `img/step_XX.png`)
- `frontend/` React + Vite + Tailwind (player + captura + edição + exportação)

## Backend (Python/FastAPI)

Configuração do Gemini:
- Crie `backend/.env` (use [backend/.env.example](backend/.env.example) como base) e defina `GOOGLE_API_KEY`.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Health: http://127.0.0.1:8000/health

AI Analysis (Gemini):
- Upload de vídeo (backend faz upload para Gemini e aguarda ACTIVE): `POST /videos/raw` (body raw do arquivo; recomendado)
- (fallback) Upload multipart: `POST /videos` (multipart: `video`)
- Status: `GET /videos/{video_id}/status`
- Descrição por timestamp: `GET /videos/{video_id}/smart-text?timestamp=00:05:30`

## Frontend (React)

Pré-requisito: Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Notas
- Captura de frame: botão "Capturar Frame" ou atalho `S`.
- Exportação envia `steps` + `images` para `POST /export` e baixa o `.zip`.
- Ao capturar um frame, a descrição tenta ser gerada pela IA no timestamp.
