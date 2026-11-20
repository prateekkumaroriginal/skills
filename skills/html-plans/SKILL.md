---
name: html-plans
description: Create browser-viewable HTML plans. Use when the user asks for a plan, roadmap, checklist, implementation plan, project plan, migration plan, launch plan, or similar planning artifact that should be viewed in a browser.
---

# HTML plans

Create a self-contained HTML plan with the cool, near-black reading style below. Keep the plan researched and clear about the destination without pre-implementing the solution. Follow an explicit user-supplied style instead when provided.

## Steps

1. Research the goal, constraints, and unknowns. Account for every requested workstream. Record unresolved details as questions or assumptions when a useful plan can proceed without an answer.
2. Write one descriptive title and a short outcome summary. Choose sections for the actual work, with concrete completion checks. Include risks, contracts, sequencing, and code-level detail only where they affect a decision. Distinguish proposed changes from completed work and verified facts from assumptions.
3. Read [assets/plan.css](assets/plan.css) and inline it in a `<style>` element. Add the Google Fonts stylesheet for Archivo, Geist, and Geist Mono (see Typography). Apply the visual and content guidance below. Adapt the layout to the material rather than filling a fixed template.
4. Save a standalone `.html` file in the user's workspace with a clear kebab-case filename. Keep CSS and any diagrams inside the document. Use read-only semantic HTML; native `<details>` disclosures and anchor navigation are supported. The Google Fonts stylesheet is the only allowed network asset. Omit scripts, forms, editable controls, buttons, other external stylesheets, and other network assets.
5. Verify each requested workstream is covered, section anchors resolve, and the document has no scripts, forms, editable controls, or network assets besides the font stylesheet. Check that every rendered font size is a multiple of 4 and every weight is 400 or 700. Check long headings, paths, code, and tables fit a 390px screen without horizontal page scroll. Keep keyboard focus visible. For a strictly static request, expand all content and omit disclosures. Fix issues before delivery.
6. Present the saved plan using the environment's supported HTML viewer or browser workflow, and provide its absolute file link. Report whether it actually opened; if viewing fails, provide the file and the specific limitation.

## Colors

The page should stay comfortable for an hour of reading. Use a cool, black-ish canvas, never a warm or greyish one, and a single accent.

| Token | Value | Use |
|---|---|---|
| Background | `#0a0b0d` | Page canvas |
| Surface | `#121418` | Insets, code blocks, highlighted rows |
| Surface 2 | `#181b21` | Inline code, diagram boxes |
| Line | `#22262d` | Thin rules inside lists, grids, tables, and frames |
| Ink | `#e6e9ee` | Titles and bold words |
| Body | `#b9bec7` | All reading text |
| Dim | `#8b919b` | Metadata, captions, labels |
| Faint | `#767c87` | Footer and code comments |
| Accent | `#7ab1ec` | Title emphasis, step and section labels, link hover, focus, diagram request paths |
| Teal | `#8fd0c4` | Secondary only: diagram return paths, code strings, confirmed states (with a text label) |
| Code | `#b3c8de` | Inline code text |

Use the accent sparingly. Do not use amber, gold, bright green, or pure white text.

## Typography

- Load fonts with `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@94,700&family=Geist:wght@400;700&family=Geist+Mono:wght@400&display=swap">`, with system fallbacks in every stack.
- Archivo (700, `font-stretch: 94%`) for titles only: page title, section headings, and small headings. Geist for all other text. Geist Mono for code, file paths, labels, and step numbers.
- Use only font sizes divisible by 4 and only weights 400 and 700. Do not scale type with `vw` or `clamp()`; switch sizes at one phone breakpoint (680px) instead.

| Size | Font | Use |
|---|---|---|
| 60px (phone 40px) | Archivo 700 | Page title |
| 40px (phone 32px) | Archivo 700 | Large figures, such as test counts |
| 32px (phone 28px) | Archivo 700 | Section headings |
| 24px | Archivo 700 | Small headings |
| 24px | Geist 400 | Summary under the title |
| 20px | Geist 400 / 700 | All reading text: paragraphs, lists, cards, steps; bold words |
| 16px | Geist 400 | Captions, metadata, contents links, tables, footer |
| 16px | Geist Mono 400 | Inline and block code, labels, step numbers |
| 12px / 16px | Geist Mono 400 / Geist 700 | Diagram labels / diagram box titles |

- Body line height 1.6; code blocks 1.75. Do not shrink text inside cards or steps below the 20px reading size.
- Put an uppercase Geist Mono label (letter-spacing 0.08em, dim) above the title, such as "Plan" or "Engineering".

## Layout

- Content uses the full width up to `max-width: 1080px`, centered, with side gutters of `max(20px, 5vw)` (20px from 1240px wide). Do not add separate `max-width` caps to paragraphs, summaries, code, tables, or captions.
- Separate sections with space only: 48px block padding per section (32px on phones). Do not put rules between sections. Thin `#22262d` rules may separate items inside a list, grid, or table, but never leave a rule after the last item.
- Keep corners square. Avoid cards, shadows, and decoration; use a surface inset only for code, examples, and callouts.
- A contents row under the header may have a thin rule above and below. On phones, lay its links out as a three-column grid with 44px tap targets.
- Use labeled rows for sequential steps: a 96px Geist Mono accent label ("Step 1") beside a small heading and body text. Stack them on phones. Use a 2 × 2 or 3-column grid only for parallel items.
- Use tables for real comparisons, inside their own scrolling region.
- Code blocks: surface background, 1px line border, 2px accent left border, 16px Geist Mono, horizontal scroll inside the block.
- Diagrams: inline SVG inside a surface frame with its own horizontal scroll (min-width about 760px). Style shapes and text with classes that use the color tokens. Draw arrowheads as solid markers with `markerUnits="userSpaceOnUse"`, about 11px, `refX` at the tip, filled with the same token as their line. Never reference a color variable that the page does not define.
- For long plans, a collapsed problem statement may follow a section heading when it adds context; give the expanded text a surface inset and an accent left border. Keep decisions and completion checks visible. Collapse long evidence and source lists by default. Put `+`/`−` before each disclosure label with a 44px hit area.
- Standalone files use the palette above. An inline host viewer may require transparent outer backgrounds or theme variables; follow its rendering contract while keeping the typography and hierarchy.

## Content

Use short sentences and plain, literal titles such as "Profile performance benchmarks" or "Remove Bootstrap". No fluffy, promotional, or clever wording in titles, summaries, or section headings. Keep only what the reader needs to understand the proposal, its limits, and how completion is verified. A user-approved title can retain its wording.

Keep each explanation in one place. A contents row already maps the sections; add an overview table only when it supplies a different comparison. Use one header summary, and omit repeated goal sections, decorative metadata, promotional section slogans, and bulk expand controls. Number sections only when order is part of the information.

## Output

Return the saved file link and viewing status. Return raw HTML only when the user asks for source.
