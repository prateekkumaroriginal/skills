---
name: elementation
description: Use after a motion-graphic video's script is confirmed, to list every element the script calls for and get the video's look approved from one HTML page of its elements before style frames or animation.
---

# Elementation

**Elementation** turns a confirmed script into the video's cast of elements and one HTML page that shows their look. It is the user's first look at the video, so it stays small: one composed frame, the palette and type, and each element kind once in its resting state, approved before any further visual work. Everything later (style frames, beat sheet, cuts) draws elements as approved here.

Render with the same renderer and assets the video will use, at the video's resolution, so what the user approves is what the cuts will show. In a `director` project that is the kit in `src/`, with stills from `render.mjs --stills`.

Inputs: `brief.md` and the confirmed `script.md`. Outputs go in the project folder:

```
style.md                 palette, type, inventory, and each element kind's look
style/elements.html      the page the user approves from
style/frames/look.png    the composed frame
style/frames/palette.png palette and type sheet
style/frames/el-<kind>.png  one tile per element kind
```

## Steps

### 1. Inventory

List every element the script's **On screen** lines call for, grouped by kind: actors (cards, windows, devices), messages (pills, bubbles, packets), connections (lines, lanes), text (titles, labels, code) and emphasis (rings, highlights, cursors). Give each its role in one line. Done when every On screen line maps to listed elements.

### 2. Stills

Render these stills:

- **Look frame**: the script's busiest scene composed in full, with real labels, icons and text, so it shows as many element kinds as one frame can hold.
- **Palette and type**: each colour with the meaning it carries, and each text size with what it is used for.
- **Element tiles**: one per inventoried element kind, showing that element alone on the video's background in its resting state, with real content, drawn at the size it has in the video and cropped close. Other states and motion belong to style frames.

Every reading text is at least 28 px at 1080p, so it stays legible at 480×270. Done when the look frame and palette are rendered at output resolution and every inventoried kind has a tile.

### 3. Elements page

Write `style/elements.html`, a single self-contained page that shows, in this order:

1. the look frame at full width;
2. the palette and type sheet;
3. the inventory, grouped by kind as in step 1, with each element's tile, name and one-line role.

Reference the stills by relative path (`frames/look.png`) so the page opens straight from disk with no server, and keep CSS inline with no external fonts or scripts. Give the page the video's background colour so the tiles sit on it as they will in the video. The page only presents the stills: never redraw an element in HTML or CSS, because the user must approve what the renderer draws.

Done when the page opens from disk and shows every still.

### 4. Approval

Show the user the elements page, in the harness's HTML preview when it has one and otherwise by giving its path, and ask what to change. Revise the stills, rebuild the page and show it again until the user explicitly approves the look. Then write `style.md` with:

- the palette with meanings and the type sizes;
- the inventory, and for each element kind its look (shape, fill, stroke, radius, icon, type), taken from its tile;
- a **Motion** section that says motion is not yet approved.

Done when the user has explicitly approved the look and `style.md` gives every inventoried element kind a look.

## Later changes

When feedback on a cut is about how a kind of element looks (every pill, every card) and the project has no style frames, update the look frame and that kind's tile, rebuild the elements page, get it approved, update `style.md`, then carry the change into the cut.
