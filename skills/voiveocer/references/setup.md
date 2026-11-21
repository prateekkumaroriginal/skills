# Local voice setup

The video used speech.cpp **0.11.0** (C API 4.2) with **Qwen3-TTS-12Hz-1.7B-CustomVoice-Q5_K.gguf**. The 1.7B CustomVoice model accepts a named speaker and delivery instructions in the same request. Its speech.cpp catalog name is `qwen3-tts-1.7b:q5_k`, and its model file is 1,569,079,808 bytes. [Original model](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice) · [GGUF model files](https://huggingface.co/sakasegawa/Qwen3-TTS-12Hz-1.7B-CustomVoice-GGUF)

## Install the runtime

Download the 0.11.0 archive for the target machine. The release provides Windows x64 with Vulkan, Linux x64 with CPU or Vulkan, and macOS arm64 with Metal. Extract the archive, keep the executable with its accompanying library, and add the executable's directory to PATH. For other architectures, consult the project's build instructions for that target. Install FFmpeg for the final encode. [Release archives](https://github.com/nyosegawa/speech.cpp/releases/tag/v0.11.0) · [Build instructions](https://github.com/nyosegawa/speech.cpp/tree/v0.11.0) · [FFmpeg downloads](https://ffmpeg.org/download.html)

```sh
speech --version
speech devices
speech info qwen3-tts-1.7b:q5_k
```

The first use of the model name fetches the release's pinned GGUF. Subsequent runs reuse it. `speech info` lists the accepted voice IDs and languages. Set `--device cpu` for CPU synthesis. For GPU synthesis, use a device name reported by `speech devices`. The Windows machine used for this video listed `Vulkan0` for Intel Iris Xe. On macOS use the Metal device reported locally.

| System | Default model cache |
| --- | --- |
| Windows | `%LOCALAPPDATA%\speech.cpp\models` |
| macOS | `~/Library/Caches/speech.cpp/models` |
| Linux | `$XDG_CACHE_HOME/speech.cpp/models`, or `~/.cache/speech.cpp/models` when unset |

Use `speech models --json` to find the exact model path. Set `SPEECH_MODEL_DIR` to choose a different cache directory. An existing GGUF can also be passed by path in place of the catalog name. [Model cache documentation](https://github.com/nyosegawa/speech.cpp/blob/v0.11.0/docs/models.md)

## Check the installation

Run this one-sentence setup test in a writable directory. Substitute the selected voice ID for `ryan`. Play the WAV and confirm the sentence is audible and complete.

```sh
speech tts qwen3-tts-1.7b:q5_k --device cpu --threads 4 --language en --voice ryan --seed 72 -o setup-test.wav "You can hear my voice clearly from the beginning of this sentence to the end."
```

For a production take, supply the selected language and voice, the direction with the user's listener filled in, and the full passage as one argument. Replace the uppercase placeholders:

```sh
speech tts qwen3-tts-1.7b:q5_k --device auto --language LANGUAGE --voice VOICE --instructions "LISTENER-SPECIFIC DIRECTION" --seed 103 -o take-03-seed-103.wav "FULL PASSAGE"
```

For the English transcript check on this project, the recognizer was faster-whisper with the `base.en` model on CPU using `int8`. To reproduce it, install `faster-whisper` in a Python environment and use `WhisperModel("base.en", device="cpu", compute_type="int8")`. Call `transcribe` on each WAV with `language="en"` and read the returned segments. For other languages use a multilingual recognizer. [faster-whisper usage](https://github.com/SYSTRAN/faster-whisper#usage)
