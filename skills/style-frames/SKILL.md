---
name: style-frames
description: Use before animating a motion-graphic video, to show the user style frames and motion tests of every element the video will use and get the look and motion approved.
---

# Style frames

**Style frames** are finished-looking stills of the video's elements and key moments. **Motion tests** are short clips of those same elements moving. Together they let the user approve how the video looks and moves before any scene is animated, so feedback on the look arrives before the first cut instead of after it.

Render both with the same renderer and assets the video will use, at the video's resolution, so what the user approves is what the cuts will show.

Inputs: `brief.md` and the confirmed `script.md`. Outputs go in the project folder:

```
style.md              the approved look and motion, one section per element kind
style/frames/         style-frame PNGs
style/motion-tests.mp4
```

## Steps

### 1. Inventory

List every element the script's **On screen** lines call for, grouped by kind: actors (cards, windows, devices), messages (pills, bubbles, packets), connections (lines, lanes), text (titles, labels, code) and emphasis (rings, highlights, cursors). Give each its role in one line. Done when every On screen line maps to listed elements.

### 2. Style frames

Render these stills:

- **Element sheet**: one of every element kind at full size, each with its real label, icon and state (normal, dimmed, active, error).
- **Palette and type**: each colour with the meaning it carries, and each text size with what it is used for.
- **Key moments**: two or three frames from the script composed in full, including the busiest scene and the climax.

Every reading text is at least 28 px at 1080p, so it stays legible at 480×270.

### 3. Motion tests

Load the `choreography` skill and give every element kind its verb from the motion vocabulary. Render one test of 2–4 seconds per verb, using the real element on a plain stage with no narration: an icon travelling its path, a card making its entrance and exit, one shape morphing into another, the rest of a frame dimming around a focal element, an emphasis ring. Join them into `style/motion-tests.mp4` with each test's verb as a small caption.

### 4. Approval

Show the user the style frames and the motion-test reel, and ask what to change. Revise and show again until the user explicitly approves both. Then write `style.md`: palette with meanings, type sizes, and for each element kind its look, its verb, duration and easing, and the frame or test that shows it.

Done when the user has explicitly approved, and `style.md` names every element kind from the inventory.

## Later changes

When feedback on a cut is about how an element looks or moves as a kind (every pill, every entrance), update the style frame or motion test first, get it approved, then carry it into the cut. A change to one moment in one scene belongs to the beat sheet or the renderer, not here.
