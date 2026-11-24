---
name: elementation
description: Use after a motion-graphic video's script is confirmed, to list every element the script calls for and get the video's look approved from one composed frame before style frames or animation.
---

# Elementation

**Elementation** turns a confirmed script into the video's cast of elements and one finished-looking frame that sets their look. It is the user's first look at the video, so it stays small: one composed frame plus the palette and type, approved before any further visual work. Everything later (style frames, beat sheet, cuts) draws elements as approved here.

Render with the same renderer and assets the video will use, at the video's resolution, so what the user approves is what the cuts will show. In a `director` project that is the kit in `src/`, with stills from `render.mjs --stills`.

Inputs: `brief.md` and the confirmed `script.md`. Outputs go in the project folder:

```
style.md                 palette, type, inventory, and each element kind's look
style/frames/look.png    the composed frame
style/frames/palette.png palette and type sheet
```

## Steps

### 1. Inventory

List every element the script's **On screen** lines call for, grouped by kind: actors (cards, windows, devices), messages (pills, bubbles, packets), connections (lines, lanes), text (titles, labels, code) and emphasis (rings, highlights, cursors). Give each its role in one line. Done when every On screen line maps to listed elements.

### 2. Look frame

Render two stills:

- **Look frame**: the script's busiest scene composed in full, with real labels, icons and text, so it shows as many element kinds as one frame can hold.
- **Palette and type**: each colour with the meaning it carries, and each text size with what it is used for.

Every reading text is at least 28 px at 1080p, so it stays legible at 480×270. Done when both stills are rendered at output resolution.

### 3. Approval

Show the user both stills and ask what to change. Revise and show again until the user explicitly approves the look. Then write `style.md` with:

- the palette with meanings and the type sizes;
- the inventory, and for each element kind its look (shape, fill, stroke, radius, icon, type), taken from the look frame or, for kinds the frame does not show, derived from it in the same style;
- a **Motion** section that says motion is not yet approved.

Done when the user has explicitly approved the look and `style.md` gives every inventoried element kind a look.

## Later changes

When feedback on a cut is about how a kind of element looks (every pill, every card) and the project has no style frames, update the look frame, get it approved, update `style.md`, then carry the change into the cut.
