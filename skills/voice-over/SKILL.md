---
name: voice-over
description: Generate natural-sounding video narration from a script with local Qwen3-TTS CustomVoice. Use for a new voiceover, a passage retake, or a new narrator reading the same script.
---

## Direct the read

Use the listener the user identified. If they haven't identified one, ask "Who is the narrator speaking to?" and wait for the answer before generating narration. Use that answer in the direction given to the model. A listener can be one person or a specific audience.

For a conversational explainer, adapt this direction to the brief and pass it through `--instructions` on every take:

> You're explaining this to [the listener the user named]. Speak in your own conversational voice. Carry the thought across sentences. Give the main point a little emphasis.

## Record in passages

Use Qwen3-TTS 1.7B CustomVoice with the requested voice and language. For installation, voice names, device selection, and the synthesis command, see [setup](references/setup.md).

Group the script into passages of 2-4 connected sentences, aiming for about 15 seconds per take. Keep a thought and its payoff together. Pass the whole passage in one text argument so the model can phrase the sentences together. Preserve the script's wording and meaning when spelling out a number for speech.

Give each passage a distinct seed. Save each raw WAV with its passage number and seed, such as `take-03-seed-103.wav`. If a reading sounds stiff or a word is wrong, generate that passage again with a fresh seed and a new filename. Assemble from the selected WAVs.

## Check what was said

Transcribe each selected WAV with a speech recognizer for the narration language. Compare the transcript with the passage. Treat "3,000" and "three thousand" as equivalent. Flag changed values, units, names, and missing words. On a mismatch such as "three thousand" versus "thirty thousand," replay the flagged phrase against the script. Keep the take if the words are clear and correct. Regenerate and recheck the passage if the reading is wrong or ambiguous.

## Finish the audio

Join the selected WAVs in script order. Leave 0.2-0.6 seconds of silence between passages, counting silence already present at the edges. Use the shorter pause for a continuing thought and the longer pause for a change of subject. Apply the filter to the joined narration, then encode once:

```sh
ffmpeg -i joined.wav -af "highpass=f=45,loudnorm=I=-16:TP=-1.5:LRA=9" -c:a aac -b:a 192k -ar 48000 narration.m4a
```
