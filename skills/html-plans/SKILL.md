---
name: html-plans
description: Create browser-viewable HTML plans. Use when the user asks for a plan, roadmap, checklist, implementation plan, project plan, migration plan, launch plan, or similar planning artifact that should be viewed in a browser.
---

# HTML Plans

Create a standalone HTML plan that is researched, outcome-oriented, and clear about the destination without pre-implementing the solution. Open the saved plan in a browser for the user.

## Steps

1. Research enough context to understand the user's goal, constraints, and unknowns. If a missing detail would materially change the plan, include it as a question or assumption in the HTML instead of stopping for clarification.
2. Put the title and one short outcome summary in the header. Do not add a separate goal, summary, or outcome section that repeats the header.
3. Use only sections that earn their place. Prefer a shorter plan with useful decisions, checkpoints, validation, and open questions over a complete template.
4. Include risks, side effects, tables, or code-level detail only when they clarify sequencing, contracts, or real risk, or when the user specifically asks for them.
5. Keep the plan strictly static and self-contained. Static means read-only HTML: no JavaScript, no forms, no inputs, no buttons, no checkboxes, no toggles, no collapsible sections, no editable controls, no hover-only reveals, no local storage, no external stylesheets, no fonts, no scripts, and no network assets.
6. Use semantic HTML and a clean editor-like layout with compact typography, clear section headings, subtle borders, and code-style pills for paths when useful.
7. Save the document as a `.html` file in the user's workspace with a clear kebab-case filename, then open it in a browser.
8. Before finishing, verify the HTML contains none of these tags: `<script>`, `<form>`, `<input>`, `<button>`, `<select>`, `<textarea>`, `<details>`, or `<summary>`.
9. Finish only when the user has the browser-viewable plan and the saved file path.

## Output

Do not return raw HTML unless the user explicitly asks for the source. Tell the user the saved file path and that it has been opened in the browser.
