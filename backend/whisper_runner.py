import sys
import numpy as np
import librosa
from transformers import pipeline

def main():
    if len(sys.argv) < 2:
        print("Usage: python whisper_runner.py <audio_file_path>", file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    TARGET_SR = 16000

    # Load audio file and resample to 16kHz
    audio_array, sr = librosa.load(audio_path, sr=TARGET_SR)

    # Ensure mono
    if audio_array.ndim > 1:
        audio_array = audio_array.mean(axis=1)

    # Normalize to float32
    audio_array = audio_array.astype(np.float32)
    max_val = np.abs(audio_array).max()
    if max_val > 0:
        audio_array = audio_array / max_val

    # Initialize Whisper pipeline
    asr_pipe = pipeline(
        "automatic-speech-recognition",
        model="openai/whisper-tiny.en",
        chunk_length_s=30,
    )

    # Transcribe
    result = asr_pipe({"array": audio_array, "sampling_rate": TARGET_SR}, batch_size=8)
    print(result["text"])

if __name__ == "__main__":
    main()
