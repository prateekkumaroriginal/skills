---
name: style-frames
description: Use after elementation and before animating a motion-graphic video, to show the user style frames and motion tests of every element the video will use and get the full look and motion approved.
---

# Style frames

**Style frames** are finished-looking stills of the video's elements and key moments. **Motion tests** are short clips of those same elements moving. They build on the look the user already approved in the `elementation` skill: every element kind in every state, and how each one moves. Together they let the user approve the video's look and motion in full before any scene is animated, so that feedback arrives before the first cut instead of after it.

Render both with the same renderer and assets the video will use, at the video's resolution, so what the user approves is what the cuts will show. In a `director` project that is the kit in `src/`: stills with `render.mjs --stills`, motion tests as their own page with `--page`.

Inputs: `brief.md`, the confirmed `script.md`, and `style.md` with its inventory and approved look from elementation. Outputs go in the project folder:

```
style.md              extended with states, motion and the frames that show them
style/frames/         style-frame PNGs, beside elementation's look frame
style/motion-tests.mp4
```

## Steps

### 1. Style frames

Render these stills in the approved look:

- **Element sheet**: one of every element kind in the `style.md` inventory at full size, each with its real label, icon and state (normal, dimmed, active, error).
- **Key moments**: one or two more frames from the script composed in full, including the climax. The busiest scene is already the look frame.

Every reading text is at least 28 px at 1080p, so it stays legible at 480×270.

### 2. Motion tests

Load the `choreography` skill and give every element kind its verb from the motion vocabulary. Render one test of 2–4 seconds per verb, using the real element on a plain stage with no narration: an icon travelling its path, a card making its entrance and exit, one shape morphing into another, the rest of a frame dimming around a focal element, an emphasis ring. Join them into `style/motion-tests.mp4` with each test's verb as a small caption.

### 3. Approval

Show the user the style frames and the motion-test reel, and ask what to change. Revise and show again until the user explicitly approves both. Then extend `style.md`: for each element kind its states, its verb, duration and easing, and the frame or test that shows it, and replace the Motion section's not-yet-approved note with the approved motion.

Done when the user has explicitly approved, and every element kind in `style.md` has its states and motion.

## Later changes

When feedback on a cut is about how an element looks or moves as a kind (every pill, every entrance), update the style frame or motion test first, get it approved, then carry it into the cut. A change to one moment in one scene belongs to the beat sheet or the renderer, not here.
