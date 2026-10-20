---
name: grill-with-ui
description: Present grill-with-docs through an interactive answer UI.
disable-model-invocation: true
---

1. Load `grill-with-docs` from the active skill catalog. Use it for questions as this is the engine. If a required dependency is unavailable, name it and establish that limitation before claiming to run the full interview.
2. Present the questions it produces through an interactive UI.

# UI behavior

- Give each question an editable answer field and an Explain more button.
- Render options as selectable controls if the underlying interview supplies them.
- Expose a recommendation supplied by the interview through a Use recommendation button.
- Use the writing field's text as the single answer state for its question. Selecting an option or clicking Use recommendation writes that answer into the field. Editing the field updates the controls: matching text selects its option or recommendation; custom text or an empty field clears the previous selection.
- Make Explain more write exactly `Explain more` into the same field and answer state, clearing the previous option or recommendation selection.
- Place Copy answers button at the end. Copy only the answers without extra fluff.
- Compose each entry as `<question number>: <current field text>`, with a blank line between entries. Use `Unanswered` for an empty field.

The output should be formatted like this:

```text
1: Use pnpm only

2: Watch source files and rebuild automatically

3: Unanswered
```
