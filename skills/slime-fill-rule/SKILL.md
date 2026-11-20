---
name: slime-fill-rule
description: Slime form-fill rules — writing, fixing or explaining an importable rule JSON for the Slime Chrome extension, including custom dropdowns, radios and checkboxes.
---

# Slime fill rules

Slime is a Chrome extension that fills web forms from rules imported as JSON. This file caches how Slime behaves. When Slime's source is at hand it is the source of truth: re-read the file named in a section when a fact here looks wrong, and fix this file.

## Steps

1. **Map the target form.** From the page's markup or source, list every control: element, a stable selector, required or optional, validation rules, and which controls load data asynchronously or only appear after an action. Done when every required control has a selector and a value that passes its validation.
2. **Write the rule.** Done when the JSON uses the envelope below.
3. **Validate**: `node <this skill>/scripts/validate.mjs <file.json>`. Done when it prints `VALID` and every previewed value fits its field.
4. **Hand over** the file path, the import steps, and each wait/position assumption the user may need to tune. Say it is untested in a browser unless you ran it.

## Import

Options page → **Import** → pick a `.json` file (`src/options/Options.tsx`). Only the envelope is accepted; a bare rule or bare array is rejected:

```json
{ "version": 1, "rules": [ { "name": "…", "urlPattern": "…", "enabled": true, "fields": [ … ] } ] }
```

- `version` must be `1`.
- Rule and field `id`s are regenerated on import, so any string works. Post-action `id`s are kept, so make them unique.
- Leave `collectionId` out; the rule lands in "Default".
- Unknown keys (`repeatGroups`, `createdAt`, …) are silently dropped.

## Schema

Slime validates imports with a Zod schema (`src/storage/rules.ts`). `scripts/validate.mjs` mirrors it.

- **Rule:** `name`, `urlPattern`, `fields`, `enabled`; optional `incrementCounter`, `postActions`, `closeTabOnSuccess`.
- **Field:** `id`, `selector`, `matchType` (`id` | `name` | `querySelector`), `valueType` (`static` | `template` | `title` | `desc` | `image`), `value` (string, may be `""`); optional `postActions`, `minLength`, `maxLength`, `imageId`.
- **Post-action:** `id`, `type` (`click` | `focus` | `pressKey` | `wait`), plus `selector` (click/focus), `key` (pressKey) or `delay` in ms (wait).

## Runtime behaviour

Source: `src/content/content-script.ts` (`fillForm`, `findElement`, `setElementValue`, `executePostAction`).

- **URL match:** `*` matches everything. `/re/` is a regex. Otherwise it's a whole-URL wildcard, case-insensitive, so add trailing `*`.
- **Finding:**
  - `querySelector` returns the first match only.
  - `id` / `name` accept `/re/`, but then search only `input`, `textarea`, `select`.
  - Slime never waits or retries for an element.
- **Writing a value:**
  - Native select: matched by option value or text.
  - Checkbox: checked when the value is `true` / `1` / `yes`.
  - Radio: `checked = el.value === value`.
  - Anything else: `el.value = value`.
  - It then dispatches bubbling `input`, `change`, `blur`.
  - A framework that tracks input values internally (e.g. React controlled inputs) may not register a value set this way. Try it on the page.
- **Order:** each field in turn (find → set → its post-actions), then rule-level post-actions — those run only if no field errored.
  - A missing element logs an error and the loop moves on.
  - A failing post-action stops the rest of that field's chain.
- **Post-actions:**
  - `click` is `element.click()`.
  - `pressKey` sets only `key` / `code` (no `keyCode`), so widgets that read `keyCode` ignore it.
- **Placeholders** (`src/lib/value-generator.ts`) resolve in every non-image value, `static` included:
  - `{{random:N}}`: mixed-case letters and digits.
  - `{{regex:[PATTERN]}}`: the pattern is wrapped in `[ ]`, e.g. `{{regex:[[6-9][0-9]{9}]}}`.
  - `{{pick:a,b}}`
  - `{{date:YYYY-MM-DD}}`
  - `{{title}}` / `{{desc}}`
  - `{{inc}}` / `{{inc:N}}`: N + counter. The counter advances on every use, across fields too, so two fields never share one value. Use `regex` for unique-but-valid values instead.

## Recipes

**Selectors.**
- Build them from the rendered DOM, not the source template. Frameworks rename or lowercase attributes; Angular, for example, renders `formControlName` as `formcontrolname`.
- Prefer stable hooks: `id`, `name`, `data-testid`, `aria-label`, or a framework's rendered binding attribute.
- Scope by a container (`form-tag input[…]`) when names repeat.

**Carrier field.** Post-actions hang off a field. To run clicks that aren't tied to filling an input, use a field:
- whose element always exists,
- with `value: ""`,
- with the clicks in its `postActions`.

Setting `.value` on a non-input element (a widget's host element, a heading, `body`) is a harmless no-op. Use `body` when the step isn't tied to any control, e.g. opening the form.

**Custom widgets** — dropdowns, radios and checkboxes built from non-native elements. Drive them with clicks on a carrier:

| Widget | Post-actions |
|---|---|
| dropdown / combobox | click its trigger → wait 400–500 → click an option by position, e.g. `[role="listbox"] [role="option"]:nth-child(N)` or the library's option class → wait 300 |
| multi-select | as above, then close it: click the overlay backdrop or the trigger again |
| radio | click the native `input` inside the chosen option, else the `[role="radio"]` element |
| checkbox | click the native `input` inside it, else the `[role="checkbox"]` element (toggles, so it assumes the box starts unchecked) |
| data that loads later (dependent dropdown, section shown after an action) | a `wait` long enough for it, on the field before the dependent one |

Notes:
- **Picking an option:** CSS can't match option text, so pick by position. Skip a leading placeholder such as "None" with `nth-child(2)`.
- **Empty lists:** a dropdown with no options may not open. Its chain then fails harmlessly and logs one error.
- **Library class names change between major versions.** Read them from the target page's DOM.
