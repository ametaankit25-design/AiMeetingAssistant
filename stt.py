import numpy as np
import gradio as gr
from transformers import pipeline
import librosa

from langchain_core.prompts import PromptTemplate
from langchain_ollama import ChatOllama
from langchain_core.output_parsers import StrOutputParser

# ============================================================
# STEP 1: Whisper — Audio to raw transcript
# ============================================================
asr_pipe = pipeline(
    "automatic-speech-recognition",
    model="openai/whisper-tiny.en",
    chunk_length_s=30,
)

TARGET_SR = 16000

def transcribe_audio(audio_file):
    sampling_rate, audio_array = audio_file

    if audio_array.ndim > 1:
        audio_array = audio_array.mean(axis=1)

    audio_array = audio_array.astype(np.float32)
    max_val = np.abs(audio_array).max()
    if max_val > 0:
        audio_array = audio_array / max_val

    if sampling_rate != TARGET_SR:
        audio_array = librosa.resample(audio_array, orig_sr=sampling_rate, target_sr=TARGET_SR)
        sampling_rate = TARGET_SR

    result = asr_pipe({"array": audio_array, "sampling_rate": sampling_rate}, batch_size=8)["text"]
    return result


# ============================================================
# STEP 2: LLAMA 3.2 (Ollama) — Transcript Clean-Up Assistant
# ============================================================
llm = ChatOllama(model="llama3.2", temperature=0.3)

cleanup_prompt = PromptTemplate.from_template("""You are a transcript cleaning assistant. 
You will be given a raw, unedited transcript from a speech-to-text system.

Your task:
- Remove filler words (um, uh, like, you know)
- Fix punctuation and capitalization
- Remove repeated words or stutters
- Keep the original meaning and speaker intent intact
- Do NOT summarize or shorten the content — only clean it up

Raw Transcript:
{raw_transcript}

Cleaned Transcript:""")

cleanup_chain = cleanup_prompt | llm | StrOutputParser()

def clean_transcript(raw_transcript):
    if not raw_transcript or raw_transcript.strip() == "":
        return "No transcript to clean."
    return cleanup_chain.invoke({"raw_transcript": raw_transcript})


# ============================================================
# STEP 3: LLAMA 3.2 (Ollama) — Meeting Minute + Task List Generator
# ============================================================
minutes_prompt = PromptTemplate.from_template("""You are a meeting assistant. 
Based on the cleaned meeting transcript below, generate:

1. A concise summary of the meeting (3-5 bullet points)
2. A list of action items / tasks mentioned, with the responsible person if stated

Format your response exactly like this:

## Meeting Summary
- point 1
- point 2

## Action Items
- [Owner] Task description

Cleaned Transcript:
{cleaned_transcript}
""")

minutes_chain = minutes_prompt | llm | StrOutputParser()

def generate_minutes(cleaned_transcript):
    if not cleaned_transcript or cleaned_transcript.strip() == "":
        return "No transcript to summarize."
    return minutes_chain.invoke({"cleaned_transcript": cleaned_transcript})


# ============================================================
# FULL PIPELINE — Audio -> Raw Transcript -> Clean -> Minutes
# ============================================================
def process_meeting_audio(audio_file):
    if audio_file is None:
        return "No audio provided.", "", ""

    raw_transcript = transcribe_audio(audio_file)
    cleaned_transcript = clean_transcript(raw_transcript)
    meeting_minutes = generate_minutes(cleaned_transcript)

    return raw_transcript, cleaned_transcript, meeting_minutes


# ============================================================
# GRADIO INTERFACE
# ============================================================
audio_input = gr.Audio(sources=["upload", "microphone"], type="numpy", label="Upload / Record Meeting Audio")

raw_output = gr.Textbox(label="Raw Transcript (Whisper)")
cleaned_output = gr.Textbox(label="Cleaned Transcript (LLAMA 3.2)")
minutes_output = gr.Textbox(label="Meeting Minutes + Task List (LLAMA 3.2)")

iface = gr.Interface(
    fn=process_meeting_audio,
    inputs=audio_input,
    outputs=[raw_output, cleaned_output, minutes_output],
    title="AI Meeting Assistant",
    description="Upload or record meeting audio to get transcript, cleaned transcript, and meeting minutes with action items — powered entirely by local Ollama models.",
)

if __name__ == "__main__":
    iface.launch()