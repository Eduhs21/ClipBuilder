# ClipBuilder - Prompt de Contextualização para IA

## Visão Geral do Projeto

O **ClipBuilder** é uma aplicação web que transforma vídeos em tutoriais passo-a-passo profissionais. O sistema permite capturar frames de vídeos, adicionar descrições (manualmente ou via IA), editar imagens e exportar documentação em múltiplos formatos. É ideal para criar guias técnicos, manuais de usuário e documentação de processos.

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  React + Vite + TailwindCSS (Nginx em produção)                │
│  Porta: 8080                                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ /api (proxy)
┌───────────────────────────▼─────────────────────────────────────┐
│                          BACKEND                                 │
│  Python + FastAPI + Uvicorn                                     │
│  Porta: 8000                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Gemini    │  │    Groq     │  │   FFmpeg    │             │
│  │  (Google)   │  │ (Llama 4)   │  │ (Vídeos)    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

### Frontend
| Tecnologia | Uso |
|------------|-----|
| **React 18** | Framework UI principal |
| **Vite** | Build tool e dev server |
| **TailwindCSS** | Estilização (tema claro/escuro) |
| **Axios** | Requisições HTTP ao backend |
| **Lucide React** | Biblioteca de ícones |
| **Fabric.js** | Editor de imagens (anotações/corte) |
| **gif.js** | Geração de GIFs animados |
| **JSZip** | Exportação/importação de arquivos ZIP |
| **marked** | Renderização de Markdown |
| **Nginx** | Servidor web em produção |

### Backend
| Tecnologia | Uso |
|------------|-----|
| **FastAPI** | Framework web API |
| **Uvicorn** | Servidor ASGI |
| **google-generativeai** | SDK do Gemini para análise de vídeo |
| **groq** | SDK Groq (Llama 4 Vision + Whisper Turbo) |
| **FFmpeg** | Processamento de vídeo/áudio |
| **yt-dlp** | Download de vídeos do YouTube |
| **python-docx** | Geração de documentos Word |
| **reportlab** | Geração de PDFs |
| **Pillow** | Processamento de imagens |
| **PyJWT** | Autenticação JWT (Clerk) |

### Infraestrutura
| Tecnologia | Uso |
|------------|-----|
| **Docker Compose** | Orquestração de containers |
| **Docker** | Containerização frontend/backend |

---

## Estrutura de Diretórios

```
ClipBuilder/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Componente principal da aplicação
│   │   ├── main.jsx             # Entry point React
│   │   ├── index.css            # Estilos globais TailwindCSS
│   │   ├── components/
│   │   │   ├── Header.jsx               # Cabeçalho da aplicação
│   │   │   ├── Sidebar.jsx              # Lista de passos do tutorial
│   │   │   ├── VideoArea.jsx            # Player de vídeo e captura
│   │   │   ├── StepCard.jsx             # Card individual de passo
│   │   │   ├── ImageEditorModal.jsx     # Editor de imagens (Fabric.js)
│   │   │   ├── SettingsModal.jsx        # Modal de configurações
│   │   │   ├── SettingsModalExtended.jsx # Configurações avançadas
│   │   │   ├── ImportMarkdownModal.jsx  # Importação de documentação
│   │   │   ├── EnhancedDocPreview.jsx   # Preview de documento profissional
│   │   │   ├── GifPreviewModal.jsx      # Preview e edição de GIF
│   │   │   └── GifStepPreview.jsx       # Visualização de GIF em passo
│   │   └── lib/                 # Utilitários
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── main.py                  # API FastAPI principal (~2100 linhas)
│   ├── enhance.py               # Lógica de enhancement de documentos
│   ├── document_loader.py       # Carregamento de documentos
│   ├── export_from_markdown.py  # Exportação para DOCX/PDF
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── app/                     # Módulos auxiliares
│   ├── data/                    # Arquivos de vídeo temporários
│   └── logs/                    # Logs do backend
├── docker-compose.yml
└── README.md
```

---

## Endpoints da API (Backend)

### Vídeos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/upload-video` | Upload de vídeo (multipart) |
| POST | `/upload-video-raw` | Upload de vídeo (streaming) |
| POST | `/upload-youtube` | Importar vídeo do YouTube |
| GET | `/video/{video_id}/status` | Status do processamento |
| GET | `/video/{video_id}/file` | Streaming do arquivo de vídeo |

### Geração de Texto com IA
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/smart-text/{video_id}` | Gerar descrição de passo via Gemini/Groq |
| POST | `/describe-gif` | Gerar descrição de GIF via Groq Vision |
| POST | `/enhance-document` | Transformar passos em documento profissional |

### Exportação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/export` | Exportar documentação (Markdown/HTML/DOCX/PDF/texto) |
| POST | `/markdown-to-docx` | Converter Markdown para DOCX |
| POST | `/format-and-export` | Formatar e exportar documento |

### Sistema
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Verificação de saúde da API |

---

## Fluxo Principal de Uso

1. **Upload de Vídeo**: Usuário faz upload de MP4/MKV ou importa do YouTube
2. **Captura de Frames**: Navega pelo vídeo e captura frames em timestamps específicos
3. **Geração de Descrições**: 
   - Manual: Usuário digita a descrição
   - IA (Gemini): Analisa o vídeo diretamente
   - IA (Groq/Llama 4): Extrai frames + áudio e analisa separadamente
4. **Gravação de GIFs**: Opcionalmente, grava GIFs animados do vídeo
5. **Edição de Imagens**: Usa o editor integrado para cortar/anotar imagens
6. **Geração de Documento Profissional**: IA estrutura o conteúdo em formato profissional
7. **Exportação**: Escolhe o formato de saída desejado

---

## Funcionalidades da IA

### Gemini (Google)
- **Análise Direta de Vídeo**: Recebe o vídeo completo e gera descrições baseadas em timestamps
- **Modelo Padrão**: `models/gemini-2.5-flash`
- **Uso**: Descrições precisas de ações em vídeos de software

### Groq (Llama 4 Vision + Whisper)
- **Análise de Frames**: Extrai 5 frames em janela de 80s ao redor do timestamp
- **Transcrição de Áudio**: Usa Whisper Turbo para transcrever o áudio
- **Modelo Vision**: `meta-llama/llama-4-scout-17b-16e-instruct`
- **Uso**: Alternativa ao Gemini, análise de GIFs, enhancement de documentos

---

## Variáveis de Ambiente

```bash
# Obrigatórias
GOOGLE_API_KEY=sua_chave_gemini        # API Key do Google Gemini

# Opcionais
GROQ_API_KEY=sua_chave_groq            # API Key do Groq
CLIPBUILDER_GEMINI_MODEL=models/gemini-2.5-flash
CLIPBUILDER_MAX_VIDEO_BYTES=6442450944  # 6GB padrão
CLIPBUILDER_MAX_DATA_FILES=5            # Máximo de vídeos a manter
CLIPBUILDER_YTDLP_COOKIES_FILE=/path/to/cookies.txt
ALLOWED_ORIGINS=http://localhost:8080   # CORS
CLERK_ISSUER=https://seu-site.clerk.accounts.dev  # Autenticação JWT
```

---

## Comandos Docker

```bash
# Subir tudo
docker compose up -d --build

# Ver logs
docker compose logs -f --tail=200

# Rebuild específico
docker compose up -d --build --force-recreate backend
docker compose up -d --build --force-recreate frontend

# Parar
docker compose down
```

---

## Formatos de Exportação Suportados

| Formato | Extensão | Descrição |
|---------|----------|-----------|
| Markdown | `.md` | Texto formatado com referências a imagens |
| Markdown ZIP | `.zip` | Markdown + imagens em pasta |
| HTML | `.html` | Página web standalone com CSS inline |
| Word | `.docx` | Documento Microsoft Word com imagens |
| PDF | `.pdf` | Documento PDF (fontes DejaVu para PT-BR) |
| Texto | `.txt` | Texto simples sem formatação |

---

## Idioma e Localização

- **Idioma Principal**: Português do Brasil (pt-BR)
- **Prompts de IA**: Configurados para gerar conteúdo em português
- **Interface**: Totalmente em português
- **Fontes PDF**: DejaVu incluídas para suporte a caracteres especiais

---

## Limitações e Configurações

- **Tamanho máximo de vídeo**: 6GB (configurável)
- **Tamanho máximo de GIF**: 20MB
- **Tamanho máximo de imagem única**: 15MB
- **Tamanho total de imagens**: 50MB
- **Arquivos mantidos**: 5 vídeos (limpa automaticamente os mais antigos)

---

## Como Usar Este Prompt

Copie e cole este documento para contextualizar qualquer IA sobre o projeto ClipBuilder. A IA terá informações sobre:

1. ✅ Arquitetura e tecnologias utilizadas
2. ✅ Estrutura de diretórios e arquivos principais
3. ✅ Endpoints da API e seus propósitos
4. ✅ Fluxo de uso da aplicação
5. ✅ Funcionalidades de IA integradas
6. ✅ Configurações e variáveis de ambiente
7. ✅ Comandos Docker para desenvolvimento

---

*Última atualização: Janeiro 2026*
