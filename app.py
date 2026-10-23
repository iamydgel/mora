import os

import gradio as gr
import uvicorn
from fastapi import HTTPException

from api.app import main as mora_api


def generate_speech(text: str, voice: str):
    try:
        audio = mora_api.synthesize_audio(text, voice)
    except HTTPException as error:
        raise gr.Error(error.detail) from error
    return 24000, audio


with gr.Blocks(title="MORA — synthèse vocale française") as demo:
    gr.Markdown("# MORA\nTransformez votre texte français en audio.")
    text_input = gr.Textbox(
        label="Texte à lire",
        placeholder="Saisissez votre texte en français…",
        lines=6,
        max_length=1000,
    )
    voice_input = gr.Dropdown(
        choices=[("Français — Siwis", "ff_siwis")],
        value="ff_siwis",
        label="Voix",
    )
    generate_button = gr.Button("Générer l’audio", variant="primary")
    audio_output = gr.Audio(label="Audio généré", type="numpy")
    generate_button.click(
        fn=generate_speech,
        inputs=[text_input, voice_input],
        outputs=audio_output,
        api_name="tts",
    )


app = gr.mount_gradio_app(mora_api.app, demo, path="/")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port)
