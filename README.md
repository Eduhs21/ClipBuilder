# ClipBuilder

ClipBuilder transforma vídeos em tutoriais visuais passo-a-passo. Faça upload de um vídeo, capture frames como passos, gere descrições automáticas usando IA (configurável) e exporte o resultado em vários formatos (Markdown, DOCX, HTML, texto simples).

## Visão geral

ClipBuilder acelera a criação de documentação visual e tutoriais a partir de material em vídeo. É ideal para instrutores, equipes de suporte e criadores que precisam transformar gravações em guias práticos rapidamente.

Principais fluxos:
- Faça upload de um vídeo (MP4/MKV)
- Capture frames que representem passos do tutorial
- Gere descrições automáticas por IA (prompt customizável)
- Ajuste textos manualmente quando necessário
- Exporte imagens + descrições em formatos prontos para publicação

## Principais funcionalidades

- Captura de frames direto do player
- Geração de texto por IA com prompt editável e exemplos rápidos
- Configurações: incluir/excluir timestamp, escolha de modelo Gemini, formato de saída
- Persistência local de prompts/preferências
- Exportação de imagens e conteúdo em ZIP (suporta Markdown/DOCX/HTML/Text)

## Tecnologias usadas

- Frontend: React, Vite
- Estilização: Tailwind CSS (opcional/configurável)
- Backend: FastAPI (uvicorn)
- IA: Google Gemini (via integração no backend)
- Processamento de mídia: ffmpeg (server-side)
- HTTP client: axios
- Persistência local: localStorage

## Requisitos

- Python 3.10+ (para o backend)
- Node 16+ / npm (para o frontend)
- ffmpeg instalado no servidor (necessário para manipulação de vídeos)
- Chave de API Google (para Gemini) — armazenada/configurada no backend ou via helpers do frontend

## Instalação rápida (desenvolvimento)

1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# certifique-se de que ffmpeg está instalado no sistema
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra o frontend (normalmente `http://localhost:5173`) e configure a URL da API se necessário (o frontend tenta `http://127.0.0.1:8000` por padrão). Para usar a integração com Gemini, configure a chave/credenciais no backend e no ambiente conforme suas práticas de segurança.

## Configurações importantes

- `DOCUVIDEO_OUTPUT_FORMAT`: formato de saída padrão salvo no frontend (pode ser alterado pelo modal de configurações)
- `DOCUVIDEO_SAVED_PROMPT`: prompt padrão salvo localmente
- Backend: variáveis de ambiente para chave Google / credenciais de API devem ser configuradas no servidor (não exponha chaves no frontend em produção)

## Uso

1. Faça upload de um vídeo.
2. Capture frames com o botão de captura (ou `S`).
3. Selecione um passo no painel direito, edite a descrição ou gere com IA.
4. Abra `Configurações da IA` para ajustar formato de saída, modelo e exemplos de prompt.
5. Clique em `Exportar` para baixar um ZIP com imagens e as descrições.

## Desenvolvimento

- Para desenvolvimento iterativo, rode backend e frontend em terminais separados (veja comandos acima).
- Logs de erros de IA e processamento de vídeo aparecem no backend — verifique problemas com `ffmpeg` e quotas de API do provedor de IA.

## Licença

Este repositório pode ser licenciado sob a licença MIT. Crie um arquivo `LICENSE` com o texto da MIT License se desejar permitir uso permissivo.

---
Se quiser, eu posso:
- adicionar um `LICENSE` (MIT) automaticamente;
- criar badges (build/license) e exemplos de screenshots/GIF no `README`;
- ajustar o texto para usar o nome `DocuVideo` em vez de `ClipBuilder` — me diga qual prefere.
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
