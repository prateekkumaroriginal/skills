---
name: html-plans
description: Create browser-viewable HTML plans. Use when the user asks for a plan, roadmap, checklist, implementation plan, project plan, migration plan, launch plan, or similar planning artifact that should be viewed in a browser.
---

# HTML plans

Create a self-contained HTML plan with the dark, amber-accented report style below. Keep the plan researched and clear about the destination without pre-implementing the solution. Follow an explicit user-supplied style instead when provided.

## Steps

1. Research the goal, constraints, and unknowns. Account for every requested workstream. Record unresolved details as questions or assumptions when a useful plan can proceed without an answer.
2. Write one descriptive title and a short outcome summary. Choose sections for the actual work, with concrete completion checks. Include risks, contracts, sequencing, and code-level detail only where they affect a decision. Distinguish proposed changes from completed work and verified facts from assumptions.
3. Read [assets/plan.css](assets/plan.css) and inline it in a `<style>` element. Apply the visual and content guidance below. Adapt the layout to the material rather than filling a fixed template.
4. Save a standalone `.html` file in the user's workspace with a clear kebab-case filename. Keep CSS and any permitted embedded assets inside the document. Use read-only semantic HTML; native `<details>` disclosures and anchor navigation are supported. Omit scripts, forms, editable controls, buttons, external stylesheets, font downloads, and network assets.
5. Verify each requested workstream is covered, section anchors resolve, and the document has no scripts, forms, editable controls, or external asset dependencies. Check long headings, paths, and tables fit narrow screens. Keep reading text at least 14px and keyboard focus visible. For a strictly static request, expand all content and omit disclosures. Fix issues before delivery.
6. Present the saved plan using the environment's supported HTML viewer or browser workflow, and provide its absolute file link. Report whether it actually opened; if viewing fails, provide the file and the specific limitation.

## Visual style

- Use a near-black canvas `#050505`, off-white text `#f5f5f5`, muted gray `#aaa`, thin charcoal rules `#282828`, and dark inset panels `#121212`. Amber `#ffb000` marks title emphasis, section indices, links, and disclosure symbols. Reserve green `#35c79a` for confirmed or successful states, with a text label too.
- Give the title large, bold, condensed type with tight leading. A short phrase may occupy an amber second line. Use condensed uppercase display type only for the title, section headings, and section numbers. Prefer Nimbus Sans Narrow or Arial Narrow where installed, then Impact and sans-serif. Use Arial/Helvetica for body text, captions, navigation, and small labels; monospace belongs to code and paths. An embedded, redistribution-permitted display font is optional when exact typography matters.
- Use a centered column up to 1160px wide, generous section spacing, and horizontal dividers. Number substantial sections in a narrow left column, with aligned heading and body content to the right. On phones, let the body use the full width. Favor flat sections and restrained insets over repeated cards, shadows, or decoration.
- Add a compact, wrapping contents row only when it helps navigation. Use tables for actual comparisons, workflow columns for parallel steps, and charts for meaningful measured comparisons. Stack columns on phones. Keep wide tables in their own scrolling region or turn cells into labeled rows.
- For long plans, place a collapsed problem statement immediately below each numbered heading when it adds useful context. Give its expanded text a dark inset and amber left border. Keep essential decisions and completion checks visible. Collapse lengthy evidence and source indexes by default. Put the `+`/`−` directly before each disclosure label, with a keyboard-accessible summary and a comfortable hit area. Native disclosures need no JavaScript.
- Standalone files use the palette above. An inline host viewer may require transparent outer backgrounds, theme variables, and different gutters; follow its rendering contract while preserving the typography, amber emphasis, and hierarchy.

## Content

Use short sentences and direct topic titles such as "Profile performance benchmarks" or "Remove Bootstrap". Keep only what the reader needs to understand the proposal, its limits, and how completion is verified. A user-approved title can retain its wording.

Keep each explanation in one place. A contents row already maps the sections; add an overview table only when it supplies a different comparison. Use one header summary, and omit repeated goal sections, decorative metadata, promotional section slogans, and bulk expand controls.

## Output

Return the saved file link and viewing status. Return raw HTML only when the user asks for source.
