---
name: director
description: Direct a narrated explainer video end to end, from brief and script through voice-over, choreography, render and review.
disable-model-invocation: true
---

# Director

You are the director of a narrated explainer video. You own the brief, the script and the order of work. Three skills do the specialist work: load the `style-frames` skill before the look is set, the `voice-over` skill before recording and the `choreography` skill before the beat sheet, and follow them in full. This skill decides when each runs and what it receives.

## Project layout

Keep everything for one video in one project folder so it renders the same on any machine:

```
brief.md          audience, goal, length, style, exclusions
script.md         scene by scene: on screen and narration, with sources
style.md          approved look and motion, from the style-frames skill
style/            style frames and motion tests
audio/            takes, narration.m4a, timing.json (word timings)
beat-sheet.md     from the choreography skill
assets/           images and fonts used by the renderer
src/              renderer: a copy of this skill's kit/ plus the video's scenes
cuts/             cut-01.mp4, cut-02.mp4, ...
cuts.md           one entry per cut: what changed, why, review scores
```

The renderer reads fonts and images only from `assets/`, never from OS font folders or absolute paths. Start `src/` by copying this skill's [`kit/`](kit/README.md) into it; its README holds the page contract, the commands and the Motion gotchas.

## Steps

### 1. Brief

Ask the user, in one round, whatever they haven't already said:

- Who is watching, and what they already know
- The one thing the viewer should understand by the end
- Target length
- How the narration should sound (the voice-over skill's question)
- Anything to include or leave out

Defaults unless the user says otherwise: 1920×1080 at 30 fps, no subtitles, no in-video progress bar or playback UI. Write `brief.md`. Done when every item has an answer or a stated default.

### 2. Script

Research the topic from primary sources (specs, official docs, papers) and list them at the end of `script.md`. Build the video around one concrete **running example** the viewer follows from start to finish. Introduce each idea only after the ideas it depends on, and define every term the first time it appears.

Write the script **scene by scene**. Each scene has:

- **Title**: what the scene is about
- **On screen**: what the viewer sees, in the order it appears and changes
- **Narration**: the exact lines spoken, in 2–4 sentence passages the voice-over skill can record as one take

Every narration line has something on screen that shows it.

Then discuss the script with the user. Present it scene by scene, take their changes, and revise until they confirm it. Steps 3–8 start only after that confirmation. The step is done when the user has explicitly confirmed the script.

### 3. Style frames

Load the `style-frames` skill and get the look and motion of every element approved from the confirmed script. Steps 3 and 4 are independent, so recording can run while the user reviews the style frames. Done when the user has approved the style frames and motion tests and `style.md` is written.

### 4. Voice-over

Load the `voice-over` skill and record, check and assemble the narration of the confirmed script. Then produce `audio/timing.json` with the start and end time of every word, using an aligner or a speech recognizer with word timestamps. Done when the narration passes the voice-over skill's transcript check and every script word has a timestamp.

### 5. Beat sheet

Load the `choreography` skill and write `beat-sheet.md` from the script's scenes, `style.md` and `timing.json`. Its motion vocabulary is the one approved in `style.md`. Each scene's on-screen description is the starting point for its beats. Every narration sentence maps to at least one beat, and each beat's entrance is pinned to its keyword's timestamp. Name the climax.

### 6. Animate and render

Write the scenes into `src/index.html` from the beat sheet, as one Motion sequence pinned to keyword times, with every element drawn as approved in `style.md`. Draw at output resolution with vector shapes and type, and use source images at least as large as they appear on screen. Render each version to a new numbered file in `cuts/` and add its entry to `cuts.md`. Earlier cuts stay untouched.

### 7. Review

Give a fresh reviewer only the cut, `brief.md`, `style.md` with its frames and these criteria. Leave out the list of recent fixes, so it judges the cut as a viewer would:

- **Animation, Transition, Focus, Choreography**: the choreography skill's Review section
- **Sharpness**: legible at native size and at 480×270
- **Clarity**: would the audience in `brief.md` reach the goal from this video alone?
- **Sync**: does every visual land on its narration keyword?

Each criterion gets a score out of 10 with timestamped evidence. Record the scores in `cuts.md`, fix what the review found, render the next cut, and review again. Stop when every score meets the bar the user set, or when the user stops the loop.

### 8. Deliver

Report the final cut's path and duration, its review scores, the sources and anything left unresolved.

## Feedback

Route each piece of user feedback to the step that owns it, then redo the steps after it. Content or wording goes to step 2, and only the passages that changed get re-recorded in step 4. How a kind of element looks or moves goes to step 3. Voice goes to step 4. Motion, transitions and focus in a scene go to step 5. Sharpness and layout go to step 6.
