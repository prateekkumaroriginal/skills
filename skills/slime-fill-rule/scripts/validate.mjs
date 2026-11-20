// Validates a Slime import file and previews placeholder output.
// Usage: node validate.mjs <rule.json>
// No dependencies. Mirrors Slime's import schema (src/storage/rules.ts) and
// placeholder syntax (src/lib/value-generator.ts); re-sync if those change.
import { readFileSync } from 'fs';

const errors = [];
const isStr = (v) => typeof v === 'string';
const isNum = (v) => typeof v === 'number';
const isBool = (v) => typeof v === 'boolean';
const oneOf = (list) => (v) => list.includes(v);

function check(obj, path, required, optional = {}) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    errors.push(`${path}: expected an object`);
    return false;
  }
  for (const [key, test] of Object.entries(required)) {
    if (!(key in obj)) errors.push(`${path}.${key}: required`);
    else if (!test(obj[key])) errors.push(`${path}.${key}: invalid value ${JSON.stringify(obj[key])}`);
  }
  for (const [key, test] of Object.entries(optional)) {
    if (key in obj && obj[key] !== undefined && !test(obj[key])) {
      errors.push(`${path}.${key}: invalid value ${JSON.stringify(obj[key])}`);
    }
  }
  return true;
}

const postActionIds = new Set();
function checkPostActions(list, path) {
  if (list === undefined) return;
  if (!Array.isArray(list)) return errors.push(`${path}: expected an array`);
  list.forEach((pa, i) => {
    const p = `${path}[${i}]`;
    if (!check(pa, p, { id: isStr, type: oneOf(['click', 'focus', 'pressKey', 'wait']) }, { selector: isStr, key: isStr, delay: isNum })) return;
    if (postActionIds.has(pa.id)) errors.push(`${p}.id: duplicate "${pa.id}" (post-action ids are kept on import)`);
    postActionIds.add(pa.id);
    if ((pa.type === 'click' || pa.type === 'focus') && !pa.selector) errors.push(`${p}: ${pa.type} needs a selector`);
    if (pa.type === 'pressKey' && !pa.key) errors.push(`${p}: pressKey needs a key`);
    if (pa.type === 'wait' && !isNum(pa.delay)) errors.push(`${p}: wait needs a delay`);
  });
}

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (check(data, '$', { version: (v) => v === 1, rules: Array.isArray }, { exportedAt: isNum }) && Array.isArray(data.rules)) {
  data.rules.forEach((rule, r) => {
    const rp = `rules[${r}]`;
    if (!check(rule, rp, { name: isStr, urlPattern: isStr, fields: Array.isArray, enabled: isBool }, { incrementCounter: isNum, collectionId: isStr, closeTabOnSuccess: isBool })) return;
    checkPostActions(rule.postActions, `${rp}.postActions`);
    (rule.fields ?? []).forEach((f, i) => {
      const fp = `${rp}.fields[${i}]`;
      if (!check(f, fp,
        { id: isStr, selector: isStr, matchType: oneOf(['id', 'name', 'querySelector']), valueType: oneOf(['static', 'template', 'title', 'desc', 'image']), value: isStr },
        { minLength: isNum, maxLength: isNum, imageId: isStr })) return;
      checkPostActions(f.postActions, `${fp}.postActions`);
    });
  });
}

if (errors.length) {
  console.log(errors.join('\n'));
  process.exit(1);
}
console.log('VALID');

// Preview: regex placeholders are checked for syntax and shown as <regex:...>.
const P = /\{\{regex:\[(.+?)\]\}\}|\{\{(\w+)(?::([^}]+))?\}\}/gi;
for (const rule of data.rules) for (const f of rule.fields) {
  if (!f.value) continue;
  const v = f.value.replace(P, (m, re, type, param) => {
    if (re) {
      try { new RegExp(re); return `<regex:${re}>`; } catch { return `<INVALID regex: ${re}>`; }
    }
    if (type === 'pick') return (param ?? '').split(',')[0];
    if (type === 'random') return 'x'.repeat(Number(param) || 8);
    if (type === 'inc') return String((Number(param) || 0) + (rule.incrementCounter ?? 1));
    return m;
  });
  console.log(f.selector.slice(-45).padEnd(47), v);
}
