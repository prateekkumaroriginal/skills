---
name: slime-fill-rule
description: Slime form-fill rules — writing, fixing or explaining an importable rule JSON for the Slime Chrome extension, including Angular Material forms (mat-select, radio, checkbox).
---

# Slime fill rules

Slime is the user's Chrome extension (repo `/home/prateekkumar/slime`, built copy `~/Downloads/slime/dist`) that fills forms from rules. This file is a cache of that repo — the repo is the source of truth. Re-read the cited function when a fact here looks wrong, and fix this file.

## Steps

1. **Map the target form.** Read the page's template and list every control: tag, `formControlName` / `id` / `name`, required or optional, validators, and which controls load data asynchronously. Done when every required control has a selector and a value that passes its validators.
2. **Write the rule.** Done when the JSON uses the envelope below.
3. **Validate**: `node ~/.agents/skills/slime-fill-rule/scripts/validate.mjs <file.json>`. Done when it prints `VALID` and every previewed value fits its field.
4. **Hand over** the file path, the import steps, and each wait/position assumption the user may need to tune. Say it is untested in a browser unless you ran it.

## Import

Options page → **Import** → pick a `.json` file (`handleImportFile`, `src/options/Options.tsx`). Only the envelope is accepted; a bare rule or bare array is rejected:

```json
{ "version": 1, "rules": [ { "name": "…", "urlPattern": "…", "enabled": true, "fields": [ … ] } ] }
```

- `version` must be `1`.
- Rule and field `id`s are regenerated on import, so any string works. Post-action `id`s are kept, so make them unique.
- Leave `collectionId` out; the rule lands in "Default".
- Unknown keys (`repeatGroups`, `createdAt`, …) are silently dropped.
- `.cursor/skills/create-fill-rule/SKILL.md` in the Slime repo has wrong examples (bare rule objects, regex without brackets, `{{random}}` described as digits). Trust this file and the code.

## Schema

The Zod schema is in `src/storage/rules.ts` (`FillRuleSchema` and siblings). `scripts/validate.mjs` mirrors it.

- **Rule:** `name`, `urlPattern`, `fields`, `enabled`; optional `incrementCounter`, `postActions`, `closeTabOnSuccess`.
- **Field:** `id`, `selector`, `matchType` (`id` | `name` | `querySelector`), `valueType` (`static` | `template` | `title` | `desc` | `image`), `value` (string, may be `""`); optional `postActions`, `minLength`, `maxLength`, `imageId`.
- **Post-action:** `id`, `type` (`click` | `focus` | `pressKey` | `wait`), plus `selector` (click/focus), `key` (pressKey) or `delay` in ms (wait).

## Runtime behaviour

See `src/content/content-script.ts`: `fillForm`, `findElement`, `setElementValue`, `executePostAction`.

- **URL match** (`matchesUrl`): `*` matches everything. `/re/` is a regex. Otherwise it's a whole-URL wildcard, case-insensitive, so add trailing `*`.
- **Finding:**
  - `querySelector` returns the first match only.
  - `id` / `name` accept `/re/`, but then search only `input`, `textarea`, `select`.
  - Slime never waits or retries for an element.
- **Writing a value:**
  - Native select: matched by option value or text.
  - Checkbox: checked when the value is `true` / `1` / `yes`.
  - Radio: `checked = el.value === value`.
  - Anything else: `el.value = value`.
  - It then dispatches bubbling `input`, `change`, `blur`. Angular's reactive and template-driven inputs pick this up.
- **Order:** each field in turn (find → set → its post-actions), then rule-level post-actions — those run only if no field errored.
  - A missing element logs an error and the loop moves on.
  - A failing post-action stops the rest of that field's chain.
- **Post-actions:**
  - `click` is `element.click()`.
  - `pressKey` sets only `key` / `code` (no `keyCode`), so Angular Material ignores Escape/Enter from it.
- **Placeholders** (`src/lib/value-generator.ts`) resolve in every non-image value, `static` included:
  - `{{random:N}}`: mixed-case letters and digits.
  - `{{regex:[PATTERN]}}`: the pattern is wrapped in `[ ]`, e.g. `{{regex:[[6-9][0-9]{9}]}}`.
  - `{{pick:a,b}}`
  - `{{date:YYYY-MM-DD}}`
  - `{{title}}` / `{{desc}}`
  - `{{inc}}` / `{{inc:N}}`: N + counter. The counter advances on every use, across fields too, so two fields never share one value. Use `regex` for unique-but-valid values instead.

## Angular Material recipes

Angular renders `formControlName` as a lowercase `formcontrolname` attribute; values keep their case. Inputs get no `name`, so match with `querySelector`: `input[formcontrolname="email"]`. Scope by component tag (`app-foo-form input[…]`) or `[formgroupname="address"]` when names repeat.

**Carrier field.** Material widgets can't take a value, so drive them with clicks. Since post-actions hang off a field, use a field whose element always exists, give it `value: ""`, and put the clicks in its `postActions`. Setting `.value` on a non-input (a `mat-select` host, an `h4`, `body`) is a harmless no-op. Use `body` as the carrier when the step isn't tied to any control (e.g. opening the form).

| Widget | Post-actions on the carrier |
|---|---|
| `mat-select` (MDC, Material 15+) | click `mat-select[formcontrolname="x"] .mat-mdc-select-trigger` → wait 400–500 → click `.mat-mdc-select-panel mat-option:nth-child(N)` → wait 300 |
| multi-select | as above, then click `.cdk-overlay-backdrop` to close |
| `mat-radio-button` | click `mat-radio-button[value="V"] input` |
| `mat-checkbox` | click `mat-checkbox … input` (toggles, so it assumes the box starts unchecked) |
| async data (dependent dropdown, form shown by `*ngIf`) | a `wait` long enough for the API, on the field before the dependent one |

Notes:
- **Picking an option:** CSS can't match option text, so pick by position. Skip a leading "None" option with `nth-child(2)`.
- **Empty lists:** a `mat-select` with zero options won't open. Its chain fails harmlessly and logs one error.
- **Legacy Material** (`material/legacy-*` imports) uses `.mat-select-trigger` / `.mat-select-panel` instead.
