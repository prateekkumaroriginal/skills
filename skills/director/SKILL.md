---
name: director
description: Direct a narrated explainer video end to end, from brief and script through voice-over, choreography, render and review.
disable-model-invocation: true
---

# Director

You are the director of a narrated explainer video. You own the brief, the script and the order of work. Four skills do the specialist work: load the `elementation` skill before the look is set, the `style-frames` skill before the full look and motion are set, the `voice-over` skill before recording and the `choreography` skill before the beat sheet, and follow them in full. This skill decides when each runs and what it receives.

## Project layout

Keep everything for one video in one project folder so it renders the same on any machine:

```
brief.md          audience, goal, length, style, exclusions
script.md         scene by scene: on screen and narration, with sources
style.md          approved look, from elementation; states and motion, from style-frames
style/            look frame, style frames and motion tests
audio/            takes, narration.m4a, timing.json (word timings)
beat-sheet.md     from the choreography skill
assets/           images and fonts used by the renderer
src/              renderer: a copy of this skill's kit/ plus the video's scenes
cuts/             cut-01.mp4, cut-02.mp4, ...
cuts.md           one entry per cut: what changed, why, review scores when reviewed
```

The renderer reads fonts and images only from `assets/`, never from OS font folders or absolute paths. Start `src/` by copying this skill's [`kit/`](kit/README.md) into it; its README holds the scene contract, the commands and the Motion gotchas.

## Steps

### 1. Brief

Ask the user, in one round, whatever they haven't already said:

- Who is watching, and what they already know
- The one thing the viewer should understand by the end
- Target length
- How the narration should sound (the voice-over skill's question)
- Anything to include or leave out
- Whether a fresh reviewer should review the first cut before they see it

Defaults unless the user says otherwise: 1920×1080 at 30 fps, no subtitles, no in-video progress bar or playback UI. Write `brief.md`. Done when every item has an answer or a stated default.

### 2. Script

Research the topic from primary sources (specs, official docs, papers) and list them at the end of `script.md`. Build the video around one concrete **running example** the viewer follows from start to finish. Introduce each idea only after the ideas it depends on, and define every term the first time it appears.

Write the script **scene by scene**. Each scene has:

- **Title**: what the scene is about
- **On screen**: what the viewer sees, in the order it appears and changes
- **Narration**: the exact lines spoken, in 2–4 sentence passages the voice-over skill can record as one take

Every narration line has something on screen that shows it.

Then discuss the script with the user. Present it scene by scene, take their changes, and revise until they confirm it. Steps 3–9 start only after that confirmation. The step is done when the user has explicitly confirmed the script.

### 3. Elementation

Load the `elementation` skill, inventory the confirmed script's elements and get the look approved from one composed frame. Done when the user has approved the look frame and `style.md` gives every element kind a look.

### 4. Style frames

Run this step unless the user has already said to skip style frames; decide from what they have said and carry on without asking. When it runs, load the `style-frames` skill and get every element's states and motion approved. Done when the user has approved the style frames and motion tests, or when the step is skipped.

Step 5 is independent of steps 3 and 4, so recording runs while the user reviews the look and style frames.

### 5. Voice-over

Load the `voice-over` skill and record, check and assemble the narration of the confirmed script. Then produce `audio/timing.json` with the start and end time of every word, using an aligner or a speech recognizer with word timestamps. Done when the narration passes the voice-over skill's transcript check and every script word has a timestamp.

### 6. Beat sheet

Load the `choreography` skill and write `beat-sheet.md` from the script's scenes, `style.md` and `timing.json`. Its motion vocabulary is the one approved in `style.md`. When style frames were skipped, choose each element kind's verb from the choreography skill's vocabulary and record it in `style.md`'s Motion section as not pre-approved. Each scene's on-screen description is the starting point for its beats. Every narration sentence maps to at least one beat, and each beat's entrance is pinned to its keyword's timestamp. Name the climax.

### 7. Animate and render

Write the scenes into `src/scene.mjs` from the beat sheet, as one Motion sequence pinned to keyword times, with every element drawn as approved in `style.md`. Draw at output resolution with vector shapes and type, and use source images at least as large as they appear on screen. Render each version to a new numbered file in `cuts/` and add its entry to `cuts.md`. Earlier cuts stay untouched.

### 8. Review

Run this step only when the user asked for a review, in the brief or later; otherwise show them the first cut as rendered and go to step 9.

Give a fresh reviewer only the cut, `brief.md`, `style.md` with its frames and these criteria. Leave out the list of recent fixes, so it judges the cut as a viewer would:

- **Animation, Transition, Focus, Choreography**: the choreography skill's Review section
- **Sharpness**: legible at native size and at 480×270
- **Clarity**: would the audience in `brief.md` reach the goal from this video alone?
- **Sync**: does every visual land on its narration keyword?

Each criterion gets a score out of 10 with timestamped evidence. Record the scores in `cuts.md`, fix what the review found and render the next cut. Each request buys one review: show the fixed cut without reviewing it again.

### 9. Deliver

Show the user the latest cut. Report its path and duration, the sources and anything left unresolved; when the cut was reviewed, add the review scores and what was fixed after the review, and when it was not, say so. When style frames were skipped, say that the motion in this cut was not pre-approved. If the user asks for changes, route them as in Feedback, render a new cut with exactly those changes and show it. A cut made from the user's feedback is reviewed only when the user asks for a review of it.

## Feedback

Route each piece of user feedback to the step that owns it, then redo the steps after it. Content or wording goes to step 2, and only the passages that changed get re-recorded in step 5. How a kind of element looks goes to step 4 when style frames exist and to step 3 when they were skipped. How a kind of element moves goes to step 4 when style frames exist and to step 6 when they were skipped. Voice goes to step 5. Motion, transitions and focus in a scene go to step 6. Sharpness and layout go to step 7.
