# Word timings for the voice-over: voice.wav -> words.json ([{word, start, end}] in seconds), then hand-fix them.
# Usage: python scripts/words_whisper.py <voice.wav> <words.json> [model=small]   (models: base.en, small, ...)
# faster-whisper's own decoder (PyAV) breaks with av 19 ("open() got an unexpected keyword argument 'metadata_errors'"),
# so ffmpeg decodes to 16 kHz mono float32 and the numpy array is passed in instead of the file path.
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

if len(sys.argv) < 3:
    sys.exit("usage: python scripts/words_whisper.py <voice.wav> <words.json> [model=small]")
wav, out = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "small"
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.float32)
segs, _ = WhisperModel(model, device="cpu", compute_type="int8").transcribe(audio, language="en", word_timestamps=True)
words = [{"word": w.word.strip(), "start": round(w.start, 2), "end": round(w.end, 2)} for s in segs for w in s.words]
assert words, "no words recognised"
json.dump(words, open(out, "w", encoding="utf-8"), indent=1)
print(len(words), "words ->", out, f"({words[0]['start']}-{words[-1]['end']} s, audio {len(audio) / 16000:.2f} s)")
