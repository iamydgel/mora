from contextlib import asynccontextmanager
from io import BytesIO
import logging
import os

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from kokoro import KPipeline


logger = logging.getLogger(__name__)
pipeline = None
SUPPORTED_VOICES = {"ff_siwis"}
DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def get_allowed_origins():
    configured_origins = os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline
    try:
        logger.info("Chargement du modèle Kokoro (hexgrad/Kokoro-82M)...")
        pipeline = KPipeline(lang_code="f", repo_id="hexgrad/Kokoro-82M")
        logger.info("Modèle Kokoro chargé.")
        yield
    except Exception:
        logger.exception("Échec du chargement du modèle Kokoro.")
        raise
    finally:
        pipeline = None


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class TTSRequest(BaseModel):
    text: str
    voice: str = "ff_siwis"


def synthesize_audio(text: str, voice: str = "ff_siwis") -> np.ndarray:
    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Le texte ne peut pas être vide.")
    if len(text) > 1000:
        raise HTTPException(status_code=400, detail="Le texte ne peut pas dépasser 1000 caractères.")
    if voice not in SUPPORTED_VOICES:
        raise HTTPException(
            status_code=400,
            detail=f"Voix inconnue : {voice}. Voix disponible : ff_siwis.",
        )

    try:
        audio_chunks = [
            audio
            for _, _, audio in pipeline(text, voice=voice)
            if audio is not None and len(audio) > 0
        ]
        if not audio_chunks:
            raise RuntimeError("Kokoro n'a produit aucun audio.")
        return np.concatenate(audio_chunks)
    except Exception as error:
        logger.exception("La génération audio a échoué : %s", error)
        raise HTTPException(status_code=500, detail="La génération audio a échoué.") from error


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/tts")
def text_to_speech(request: TTSRequest):
    audio = synthesize_audio(request.text, request.voice)
    try:
        wav_buffer = BytesIO()
        sf.write(wav_buffer, audio, 24000, format="WAV")
        return Response(
            content=wav_buffer.getvalue(),
            media_type="audio/wav",
            headers={"Content-Disposition": 'attachment; filename="mora.wav"'},
        )
    except Exception as error:
        logger.exception("La génération audio a échoué : %s", error)
        raise HTTPException(status_code=500, detail="La génération audio a échoué.") from error
