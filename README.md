# ClipBuilder

ClipBuilder transforma vídeos em tutoriais passo‑a‑passo e exporta em **HTML / DOCX / PDF / texto / ZIP**.

## Como funciona

1) Você faz **upload** de um vídeo (MP4/MKV) ou **importa do YouTube**.
2) O app permite **capturar frames** do vídeo e organizar em uma lista de "passos".
3) Para cada passo, você pode:
	- escrever/editar a descrição manualmente
	- pedir para a IA (**Gemini** ou **Groq/Llama 4**) gerar a descrição com base no **timestamp**
	- editar a imagem do passo (corte/anotações)
4) **Gravar GIF**: você pode gravar GIFs animados diretamente do vídeo e adicioná-los como passos. A IA analisa o GIF e gera automaticamente a descrição do passo.
5) **Gerar Documento Profissional**: clique em "Doc Pro" na área principal para que a IA (Groq) transforme seus passos em um documento estruturado com visão geral, seções numeradas, checklists e troubleshooting. No preview você pode:
	- **Editar** o markdown gerado diretamente
	- Alternar entre visualização **Markdown** e **Layout Word** (renderizado)
	- **Baixar como Word (.docx)** com um clique
6) No fim, você exporta o tutorial em:
	- **Markdown** (inclui opção de ZIP com imagens)
	- **HTML**
	- **DOCX (Word)**
	- **PDF**
	- **Texto simples**
7) Você também pode **importar** documentação existente (arquivo `.md` ou `.zip` com imagens)

## O que foi usado (stack)

**Frontend**
- React + Vite
- TailwindCSS (com suporte a **Modo Escuro** 🌙 e Claro)
- Nginx (em produção via Docker) com proxy `/api` → backend

**Backend**
- Python + FastAPI (API HTTP)
- Gemini (SDK `google.generativeai`) para geração de texto
- Groq (SDK `groq`) com Llama 4 Vision e Whisper Turbo para análise alternativa
- Autenticação JWT via Clerk (opcional)
- `ffmpeg` para suporte a vídeo
- `yt-dlp` para importação do YouTube (com suporte a cookies quando necessário)

**Exportação**
- Markdown/HTML/texto: geração direta no backend
- DOCX: `python-docx` (e suporte a imagens)
- PDF: `reportlab` (com fontes DejaVu no container para PT-BR)

**Infra/Deploy**
- Docker Compose (frontend + backend)
- Upload de arquivos grandes: limites configurados (padrão 6GB)

## Subir com Docker (passo a passo)

### 1) Pré‑requisitos

- Docker Engine instalado e rodando
- Docker Compose (plugin) disponível

Verifique:

```bash
docker --version
docker compose version
```

### 2) Subir o projeto com Docker

### 2.1) Entre na pasta do projeto

```bash
cd "/caminho/para/Projeto DOC"
```

### 2.2) Crie o arquivo de ambiente do backend (obrigatório)

Crie `backend/.env` (esse arquivo é local e fica fora do git):

```bash
GOOGLE_API_KEY=SEU_TOKEN_AQUI
```

Dica: você pode copiar e editar o exemplo: [backend/.env.example](backend/.env.example)

### 2.3) Suba os containers

Se o seu usuário **tem permissão** no Docker:

```bash
docker compose up -d --build
```

Se aparecer `permission denied while trying to connect to the Docker daemon socket`, use `sudo`:

```bash
sudo docker compose up -d --build
```

### 2.4) Acesse no navegador

- Frontend (UI): http://localhost:8080
- Backend (API): http://localhost:8000
- Healthcheck: http://localhost:8000/health

Observação: o frontend roda com Nginx e encaminha chamadas `/api` para o backend.

### 3) Comandos úteis (status, logs, parar, reiniciar)

### Ver status

```bash
sudo docker compose ps
```

### Ver logs

```bash
sudo docker compose logs -f --tail=200
```

Somente backend:

```bash
sudo docker compose logs -f --tail=200 backend
```

Somente frontend:

```bash
sudo docker compose logs -f --tail=200 frontend
```

### Parar (mantém dados)

```bash
sudo docker compose stop
```

### Subir novamente

```bash
sudo docker compose start
```

### Reiniciar tudo (recria containers)

```bash
sudo docker compose down
sudo docker compose up -d --build
```

### Rebuild apenas do frontend (quando mexer em UI/Nginx)

```bash
sudo docker compose up -d --build --force-recreate frontend
```

### Rebuild apenas do backend

```bash
sudo docker compose up -d --build --force-recreate backend
```

### 4) Onde ficam os dados/logs

Por padrão, o Compose monta:

- `backend/data/` → arquivos e resultados
- `backend/logs/` → logs do backend

Em Fedora/RHEL com SELinux, os mounts usam `:Z` (já configurado no [docker-compose.yml](docker-compose.yml)).

### 5) Configurações mais comuns (no backend/.env)

Além de `GOOGLE_API_KEY`, você pode definir no `backend/.env` (opcional):

- `CLIPBUILDER_GEMINI_MODEL` (ex.: `models/gemini-2.5-flash`)
- `CLIPBUILDER_MAX_VIDEO_BYTES` (padrão 6GB)
- `CLIPBUILDER_YTDLP_COOKIES_FILE` / `CLIPBUILDER_YTDLP_COOKIES_FROM_BROWSER` (para import do YouTube)
- `GROQ_API_KEY` (chave da API Groq para usar Llama 4 Vision e Whisper Turbo)
- `ALLOWED_ORIGINS` (lista de origens permitidas para CORS, separadas por vírgula)
- `CLERK_ISSUER` (URL do emissor Clerk para autenticação JWT, ex.: `https://seu-site.clerk.accounts.dev`)

O Compose já exporta defaults e usa o `backend/.env` via `env_file`.

### 6) Troubleshooting (Docker)

### “permission denied” no docker.sock

Use `sudo docker compose ...` ou adicione seu usuário ao grupo `docker`:

```bash
sudo usermod -aG docker $USER
```

Depois faça logout/login para surtir efeito.

### Fedora / firewalld / rede no container

Se houver erros de rede dentro do container (DNS/"No route to host"), revise sua configuração do `firewalld` (zona do `docker0`, masquerade/NAT). Em alguns cenários, mudanças de zona podem quebrar o NAT do Docker.

### UI não atualiza depois de rebuild

Faça hard refresh no navegador (`Ctrl+Shift+R`). O Nginx está configurado para evitar cache “preso” do `index.html`, mas abas antigas ainda podem manter assets carregados.

## Licença

Veja [LICENSE](LICENSE).
