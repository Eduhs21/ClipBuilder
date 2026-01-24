from __future__ import annotations

import io
import json
import logging
import logging.handlers
import os
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
import zipfile
from dataclasses import dataclass, field
from errno import ENOSPC
from pathlib import Path
from typing import Any

import anyio
from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

try:
    from dotenv import load_dotenv

    _dotenv_path = Path(__file__).resolve().parent / ".env"
    if _dotenv_path.exists():
        load_dotenv(dotenv_path=_dotenv_path)
    else:
        load_dotenv()
except Exception:
    pass


LOG_DIR = Path(os.getenv("DOCUVIDEO_LOG_DIR", Path(__file__).resolve().parent / "logs"))
LOG_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger("docuvideo")
if not logger.handlers:
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    info_handler = logging.handlers.RotatingFileHandler(
        LOG_DIR / "docuvideo.log",
        maxBytes=2_000_000,
        backupCount=5,
        encoding="utf-8",
    )
    info_handler.setLevel(logging.INFO)
    info_handler.setFormatter(fmt)

    error_handler = logging.handlers.RotatingFileHandler(
        LOG_DIR / "docuvideo.error.log",
        maxBytes=2_000_000,
        backupCount=10,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(fmt)

    logger.addHandler(info_handler)
    logger.addHandler(error_handler)


def _http_exception_handler(_request: Request, exc: StarletteHTTPException):
    # Starlette hides multipart errors behind a generic message; return actionable hint.
    if exc.status_code == 400 and str(exc.detail) == "There was an error parsing the body":
        logger.warning("multipart parse error: %s", exc.detail)
        return JSONResponse(
            status_code=400,
            content={
                "detail": (
                    "Falha ao ler o upload (multipart). Isso costuma acontecer com vídeos grandes por limite do parser. "
                    "Use o upload raw (endpoint /videos/raw) no frontend/backend atualizados."
                )
            },
        )

    if exc.status_code >= 500:
        logger.error("http error %s: %s", exc.status_code, exc.detail, exc_info=True)
    elif exc.status_code >= 400:
        logger.warning("http %s: %s", exc.status_code, exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


def _unhandled_exception_handler(_request: Request, exc: Exception):
    logger.error("unhandled error: %s", exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Erro interno no servidor"})


MAX_TOTAL_IMAGE_BYTES = 50 * 1024 * 1024  # 50MB
MAX_SINGLE_IMAGE_BYTES = 15 * 1024 * 1024  # 15MB


def _env_int(name: str, default: int) -> int:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value > 0 else default


MAX_VIDEO_BYTES = _env_int("DOCUVIDEO_MAX_VIDEO_BYTES", 700 * 1024 * 1024)  # default 700MB
MAX_VIDEO_MB = max(1, int(MAX_VIDEO_BYTES / (1024 * 1024)))

logger.info("config: DOCUVIDEO_MAX_VIDEO_BYTES=%s (~%s MB)", MAX_VIDEO_BYTES, MAX_VIDEO_MB)

GEMINI_CLIP_SECONDS = _env_int("DOCUVIDEO_GEMINI_CLIP_SECONDS", 90)
GEMINI_PROXY_HEIGHT = _env_int("DOCUVIDEO_GEMINI_PROXY_HEIGHT", 720)

DEFAULT_GEMINI_MODEL = os.getenv("DOCUVIDEO_GEMINI_MODEL", "models/gemini-2.0-flash")
GEMINI_POLL_TIMEOUT_SECONDS = 300
GEMINI_POLL_INTERVAL_SECONDS = 2

app = FastAPI(title="DocuVideo")

app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
app.add_exception_handler(Exception, _unhandled_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class VideoEntry:
    path: Path
    status: str  # ready|error
    clip_cache: dict[str, str] = field(default_factory=dict)  # key -> gemini_file_name
    error: str | None = None


DATA_DIR = Path(os.getenv("DOCUVIDEO_DATA_DIR", Path(__file__).resolve().parent / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
logger.info("config: DOCUVIDEO_DATA_DIR=%s", DATA_DIR)

_videos_lock = threading.Lock()
_videos: dict[str, VideoEntry] = {}

def _configure_genai(api_key: str) -> None:
    try:
        import google.generativeai as genai
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Dependência 'google-generativeai' não instalada no backend.",
        ) from exc

    genai.configure(api_key=api_key)


def _get_api_key(x_google_api_key: str | None) -> str:
    api_key = (os.getenv("GOOGLE_API_KEY") or "").strip() or (x_google_api_key or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_API_KEY não configurada. Defina no backend (.env) ou envie no header X-Google-Api-Key.",
        )
    return api_key


def _upload_video_to_gemini(video_path: Path, api_key: str) -> str:
    _configure_genai(api_key)
    import google.generativeai as genai

    uploaded = genai.upload_file(path=str(video_path))
    file_name = getattr(uploaded, "name", None)
    if not file_name:
        raise RuntimeError("Falha ao fazer upload do vídeo para o Gemini")

    deadline = time.time() + GEMINI_POLL_TIMEOUT_SECONDS
    while time.time() < deadline:
        current = genai.get_file(file_name)
        state = getattr(getattr(current, "state", None), "name", None) or str(getattr(current, "state", ""))
        if state == "ACTIVE":
            return file_name
        if state in {"FAILED", "ERROR"}:
            raise RuntimeError("Gemini falhou ao processar o arquivo de vídeo")
        time.sleep(GEMINI_POLL_INTERVAL_SECONDS)

    raise RuntimeError("Timeout aguardando o Gemini processar o arquivo (ACTIVE)")


def _format_timestamp(seconds: float) -> str:
    if seconds < 0:
        seconds = 0
    total = int(seconds)
    hh = total // 3600
    mm = (total % 3600) // 60
    ss = total % 60
    return f"{hh:02d}:{mm:02d}:{ss:02d}"


def _parse_timestamp_to_seconds(timestamp: str) -> float:
    ts = (timestamp or "").strip()
    if not ts:
        return 0.0
    parts = ts.split(":")
    if len(parts) > 3:
        raise ValueError("timestamp inválido")
    try:
        nums = [float(p) for p in parts]
    except ValueError as exc:
        raise ValueError("timestamp inválido") from exc

    while len(nums) < 3:
        nums.insert(0, 0.0)
    hh, mm, ss = nums
    return max(0.0, hh * 3600.0 + mm * 60.0 + ss)


def _ensure_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise HTTPException(
            status_code=500,
            detail="ffmpeg não está instalado no servidor. No Fedora: sudo dnf install -y ffmpeg",
        )
    return path


def _make_gemini_clip(*, source_path: Path, timestamp_seconds: float, clip_seconds: int, out_path: Path) -> tuple[int, int]:
    ffmpeg: str = _ensure_ffmpeg()
    clip_seconds = max(10, int(clip_seconds))
    half = clip_seconds // 2
    start = max(0, int(timestamp_seconds) - half)
    duration = clip_seconds

    def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(cmd, capture_output=True, text=True)

    def tail(stderr: str) -> str:
        return "\n".join((stderr or "").strip().splitlines()[-20:]).strip()

    # Attempt 1: re-encode to a smaller proxy (best for cost/speed), but may fail on
    # ffmpeg builds without libx264 (common on Fedora ffmpeg-free).
    vf = f"scale=-2:{max(144, int(GEMINI_PROXY_HEIGHT))}"
    for video_encoder in ["libx264", "libopenh264"]:
        cmd = [
            ffmpeg,
            "-y",
            "-ss",
            str(start),
            "-t",
            str(duration),
            "-i",
            str(source_path),
            "-vf",
            vf,
            "-c:v",
            video_encoder,
            "-preset",
            "veryfast",
            "-crf",
            "28",
            "-c:a",
            "aac",
            "-b:a",
            "96k",
            "-movflags",
            "+faststart",
            str(out_path),
        ]

        proc = run(cmd)
        if proc.returncode == 0:
            return start, duration

        err = proc.stderr or ""
        # If encoder isn't available, try the next option.
        if f"Unknown encoder '{video_encoder}'" in err:
            continue

        # Other failures: break and try stream copy.
        break

    # Attempt 2: stream copy (no re-encode). This is very compatible and avoids encoder issues.
    copy_cmd = [
        ffmpeg,
        "-y",
        "-ss",
        str(start),
        "-t",
        str(duration),
        "-i",
        str(source_path),
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        str(out_path),
    ]

    proc = run(copy_cmd)
    if proc.returncode != 0:
        raise RuntimeError("ffmpeg falhou: " + tail(proc.stderr or ""))
    return start, duration


def _describe_at_timestamp(*, gemini_file_name: str, timestamp: str, clip_seconds: int, api_key: str, model_name: str, user_prompt: str | None = None, include_timestamp: bool = True) -> str:
    _configure_genai(api_key)
    import google.generativeai as genai

    # Accept either "gemini-2.0-flash" or "models/gemini-2.0-flash".
    normalized_model = (model_name or "").strip()
    if normalized_model and not normalized_model.startswith("models/"):
        normalized_model = f"models/{normalized_model}"

    file_ref = genai.get_file(gemini_file_name)
    base_parts: list[str] = [
        "Analise o vídeo e o áudio.",
        f"O arquivo enviado é um recorte (~{int(clip_seconds)}s) do vídeo original.",
    ]
    if include_timestamp:
        base_parts.append(f"O recorte é centrado no timestamp {timestamp}.")
        base_parts.append(f"Descreva detalhadamente, em estilo tutorial técnico, o procedimento que está sendo executado especificamente no timestamp {timestamp}.")
    else:
        base_parts.append("Descreva detalhadamente, em estilo tutorial técnico, o procedimento exibido no clipe. Não inclua o timestamp nas descrições.")
    base_parts.append("Seja direto e instrutivo.")
    base = " ".join(base_parts)

    if user_prompt and str(user_prompt).strip():
        prompt = str(user_prompt).strip() + "\n\n" + base
    else:
        prompt = base

    model = genai.GenerativeModel(normalized_model or DEFAULT_GEMINI_MODEL)
    response = model.generate_content([file_ref, prompt])
    text = getattr(response, "text", None)
    if not text:
        return ""
    return str(text).strip()


@dataclass
class StepPayload:
    description: str


def _parse_steps(steps_raw: str) -> list[StepPayload]:
    try:
        payload: Any = json.loads(steps_raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid steps JSON: {exc.msg}") from exc

    if not isinstance(payload, list):
        raise HTTPException(status_code=400, detail="Steps must be a JSON array")

    steps: list[StepPayload] = []
    for item in payload:
        if isinstance(item, str):
            steps.append(StepPayload(description=item))
            continue
        if isinstance(item, dict):
            description = item.get("description", "")
            if not isinstance(description, str):
                raise HTTPException(status_code=400, detail="Each step description must be a string")
            steps.append(StepPayload(description=description))
            continue
        raise HTTPException(status_code=400, detail="Each step must be a string or an object")

    return steps


_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _validate_png(image_bytes: bytes) -> None:
    # Frontend captures frames as PNG (canvas.toDataURL('image/png')).
    if not image_bytes.startswith(_PNG_MAGIC):
        raise HTTPException(status_code=400, detail="One or more images are invalid (expected PNG)")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/videos")
async def upload_video(
    video: UploadFile = File(...),
    x_google_api_key: str | None = Header(default=None, alias="X-Google-Api-Key"),
):
    filename = (video.filename or "").strip()
    ext = Path(filename).suffix.lower()
    content_type = (video.content_type or "").lower().strip()

    content_type_to_ext = {
        "video/mp4": ".mp4",
        "video/x-matroska": ".mkv",
        "application/x-matroska": ".mkv",
    }

    if ext == "" and content_type in content_type_to_ext:
        ext = content_type_to_ext[content_type]

    if ext not in {".mp4", ".mkv"}:
        raise HTTPException(
            status_code=400,
            detail=f"Formato inválido. Use .mp4 ou .mkv (filename='{filename}', content_type='{content_type}')",
        )

    video_id = uuid.uuid4().hex
    target_path = DATA_DIR / f"video_{video_id}{ext}"

    total = 0
    try:
        with target_path.open("wb") as f:
            while True:
                chunk = await video.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_VIDEO_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"Vídeo muito grande (limite atual: {MAX_VIDEO_MB} MB). "
                            "Ajuste DOCUVIDEO_MAX_VIDEO_BYTES no backend/.env."
                        ),
                    )
                f.write(chunk)
    except OSError as exc:
        if getattr(exc, "errno", None) == ENOSPC:
            logger.error("disk full while saving upload to %s", target_path, exc_info=True)
            raise HTTPException(
                status_code=507,
                detail=(
                    "Sem espaço em disco para salvar o vídeo. "
                    "Ajuste DOCUVIDEO_DATA_DIR para um caminho com espaço suficiente."
                ),
            ) from exc
        logger.error("os error while saving upload to %s", target_path, exc_info=True)
        raise
    finally:
        try:
            await video.close()
        except Exception:
            pass

    # For very large videos, we keep the original locally and only send a short clip to Gemini on demand.
    with _videos_lock:
        _videos[video_id] = VideoEntry(path=target_path, status="ready")

    # Validate API key early so the user gets fast feedback.
    _get_api_key(x_google_api_key)
    return {"video_id": video_id, "status": "ready"}


@app.post("/videos/raw")
async def upload_video_raw(
    request: Request,
    x_filename: str | None = Header(default=None, alias="X-Filename"),
    x_google_api_key: str | None = Header(default=None, alias="X-Google-Api-Key"),
):
    filename = (x_filename or "video.mp4").strip()
    ext = Path(filename).suffix.lower()
    if ext not in {".mp4", ".mkv"}:
        raise HTTPException(status_code=400, detail="Formato inválido. Use .mp4 ou .mkv")

    video_id = uuid.uuid4().hex
    target_path = DATA_DIR / f"video_{video_id}{ext}"

    total = 0
    try:
        with target_path.open("wb") as f:
            async for chunk in request.stream():
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_VIDEO_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"Vídeo muito grande (limite atual: {MAX_VIDEO_MB} MB). "
                            "Ajuste DOCUVIDEO_MAX_VIDEO_BYTES no backend/.env."
                        ),
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except OSError as exc:
        if getattr(exc, "errno", None) == ENOSPC:
            logger.error("disk full while saving raw upload to %s", target_path, exc_info=True)
            raise HTTPException(
                status_code=507,
                detail=(
                    "Sem espaço em disco para salvar o vídeo. "
                    "Ajuste DOCUVIDEO_DATA_DIR para um caminho com espaço suficiente."
                ),
            ) from exc
        logger.error("os error while saving raw upload to %s", target_path, exc_info=True)
        raise
    except Exception as exc:
        logger.warning("raw upload stream failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=400, detail="Falha ao ler o upload (conexão interrompida?)") from exc

    # For very large videos, we keep the original locally and only send a short clip to Gemini on demand.
    with _videos_lock:
        _videos[video_id] = VideoEntry(path=target_path, status="ready")

    # Validate API key early so the user gets fast feedback.
    _get_api_key(x_google_api_key)
    return {"video_id": video_id, "status": "ready"}


@app.get("/videos/{video_id}/status")
def video_status(video_id: str):
    with _videos_lock:
        entry = _videos.get(video_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Vídeo não encontrado")
        return {"status": entry.status, "error": entry.error}


@app.get("/videos/{video_id}/smart-text")
async def smart_text(
    video_id: str,
    timestamp: str | None = None,
    t: float | None = None,
    model: str = DEFAULT_GEMINI_MODEL,
    prompt: str | None = None,
    include_timestamp: bool = True,
    x_google_api_key: str | None = Header(default=None, alias="X-Google-Api-Key"),
):
    with _videos_lock:
        entry = _videos.get(video_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Vídeo não encontrado")
        if entry.status != "ready":
            raise HTTPException(status_code=409, detail=entry.error or "Vídeo não está pronto")
        source_path = entry.path

    api_key = _get_api_key(x_google_api_key)
    if timestamp is None:
        if t is None:
            raise HTTPException(status_code=400, detail="Informe timestamp (HH:MM:SS) ou t (segundos)")
        timestamp = _format_timestamp(float(t))

    try:
        ts_seconds = _parse_timestamp_to_seconds(str(timestamp))
    except ValueError:
        raise HTTPException(status_code=400, detail="timestamp inválido. Use HH:MM:SS")

    clip_key = f"{int(ts_seconds)}:{int(GEMINI_CLIP_SECONDS)}"
    with _videos_lock:
        cached = entry.clip_cache.get(clip_key)

    if not cached:
        clip_path = DATA_DIR / f"clip_{video_id}_{int(ts_seconds)}_{int(GEMINI_CLIP_SECONDS)}.mp4"
        try:
            _make_gemini_clip(
                source_path=source_path,
                timestamp_seconds=ts_seconds,
                clip_seconds=GEMINI_CLIP_SECONDS,
                out_path=clip_path,
            )

            def upload_work() -> str:
                return _upload_video_to_gemini(clip_path, api_key)

            cached = await anyio.to_thread.run_sync(upload_work)
            with _videos_lock:
                current = _videos.get(video_id)
                if current and current.status == "ready":
                    current.clip_cache[clip_key] = cached
        except HTTPException:
            raise
        except Exception as exc:
            with _videos_lock:
                current = _videos.get(video_id)
                if current:
                    current.error = str(exc)
            logger.error(
                "gemini clip upload failed (video_id=%s, timestamp=%s): %s",
                video_id,
                timestamp,
                exc,
                exc_info=True,
            )
            raise HTTPException(status_code=500, detail="Falha ao preparar/enviar clipe para o Gemini") from exc
        finally:
            try:
                if clip_path.exists():
                    clip_path.unlink()
            except Exception:
                pass

    def work() -> str:
        return _describe_at_timestamp(
            gemini_file_name=str(cached),
            timestamp=str(timestamp),
            clip_seconds=int(GEMINI_CLIP_SECONDS),
            api_key=api_key,
            model_name=model,
            user_prompt=prompt,
            include_timestamp=bool(include_timestamp),
        )

    try:
        text = await anyio.to_thread.run_sync(work)
    except Exception as exc:
        # Normalize common Gemini errors so the frontend gets a meaningful status.
        try:
            from google.api_core import exceptions as gexc  # type: ignore

            if isinstance(exc, getattr(gexc, "ResourceExhausted", ())):
                raise HTTPException(
                    status_code=429,
                    detail="Quota do Gemini excedida (429). Verifique billing/limites na sua conta/projeto.",
                ) from exc

            if isinstance(exc, getattr(gexc, "TooManyRequests", ())):
                raise HTTPException(
                    status_code=429,
                    detail="Muitas requisições ao Gemini (429). Tente novamente em instantes.",
                ) from exc

            if isinstance(exc, getattr(gexc, "PermissionDenied", ())):
                raise HTTPException(
                    status_code=403,
                    detail="Permissão negada pelo Gemini. Verifique se a API está habilitada e se a chave é válida.",
                ) from exc

            if isinstance(exc, getattr(gexc, "NotFound", ())):
                raise HTTPException(
                    status_code=400,
                    detail="Modelo do Gemini não encontrado/suportado. Ajuste o model para um valor retornado por list_models().",
                ) from exc

            if isinstance(exc, getattr(gexc, "InvalidArgument", ())):
                raise HTTPException(status_code=400, detail="Parâmetros inválidos ao chamar o Gemini.") from exc
        except Exception:
            # If google-api-core isn't available or anything goes wrong while mapping,
            # fall back to the generic handler below.
            pass

        with _videos_lock:
            current = _videos.get(video_id)
            if current:
                current.error = str(exc)
        logger.error(
            "gemini smart-text failed (video_id=%s, model=%s, timestamp=%s): %s",
            video_id,
            model,
            timestamp,
            exc,
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Falha ao analisar com Gemini") from exc

    return {"text": text}


@app.post("/export")
async def export_documentation(
    steps: str = Form(...),
    images: list[UploadFile] = File(...),
):
    parsed_steps = _parse_steps(steps)

    if len(parsed_steps) != len(images):
        raise HTTPException(
            status_code=400,
            detail=f"Steps count ({len(parsed_steps)}) must match images count ({len(images)})",
        )

    total_bytes = 0
    processed_images: list[bytes] = []

    for upload in images:
        image_bytes = await upload.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="One or more images are empty")

        if len(image_bytes) > MAX_SINGLE_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="One or more images are too large")

        total_bytes += len(image_bytes)
        if total_bytes > MAX_TOTAL_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Export payload too large")

        _validate_png(image_bytes)
        processed_images.append(image_bytes)

    md_lines: list[str] = ["# Tutorial\n"]
    for i, step in enumerate(parsed_steps, start=1):
        md_lines.append(f"## Passo {i}\n")
        description = step.description.strip() or "(sem descrição)"
        md_lines.append(description + "\n")
        md_lines.append(f"![Passo {i}](./img/step_{i:02d}.png)\n")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("tutorial.md", "\n".join(md_lines).strip() + "\n")
        for i, image_bytes in enumerate(processed_images, start=1):
            zf.writestr(f"img/step_{i:02d}.png", image_bytes)

    zip_buffer.seek(0)

    headers = {"Content-Disposition": 'attachment; filename="docuvideo_export.zip"'}
    return StreamingResponse(zip_buffer, media_type="application/zip", headers=headers)
