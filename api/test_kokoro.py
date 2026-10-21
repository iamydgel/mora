import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline


def main():
    output_path = Path(__file__).resolve().parent / "sortie.wav"
    text = "Bonjour. Ceci est un test de synthese vocale avec Mora."

    try:
        pipeline = KPipeline(lang_code="f")
        audio_chunks = [
            audio
            for _, _, audio in pipeline(text, voice="ff_siwis")
            if audio is not None and len(audio) > 0
        ]
        if not audio_chunks:
            raise RuntimeError("Kokoro n'a produit aucun audio.")

        audio = np.concatenate(audio_chunks)
        sf.write(output_path, audio, 24000)
        print(f"Succes : fichier audio cree ici : {output_path}")
    except Exception as error:
        print(f"Erreur pendant la generation audio : {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
