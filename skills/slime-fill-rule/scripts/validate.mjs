// Validates a Slime import file against the import schema and previews
// placeholder output. Usage: node validate.mjs <rule.json>
// Mirrors the Zod schema in /home/prateekkumar/slime/src/storage/rules.ts and
// PLACEHOLDER_REGEX in src/lib/value-generator.ts; re-sync if those change.
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire('/home/prateekkumar/slime/package.json');
const { z } = require('zod');
const RandExp = require('randexp');

const PA = z.object({ id: z.string(), type: z.enum(['click', 'focus', 'pressKey', 'wait']), selector: z.string().optional(), key: z.string().optional(), delay: z.number().optional() });
const FM = z.object({ id: z.string(), selector: z.string(), matchType: z.enum(['id', 'name', 'querySelector']), valueType: z.enum(['static', 'template', 'title', 'desc', 'image']), value: z.string(), minLength: z.number().optional(), maxLength: z.number().optional(), imageId: z.string().optional(), postActions: z.array(PA).optional() });
const FR = z.object({ name: z.string(), urlPattern: z.string(), fields: z.array(FM), enabled: z.boolean(), incrementCounter: z.number().optional(), collectionId: z.string().optional(), postActions: z.array(PA).optional(), closeTabOnSuccess: z.boolean().optional() });
const S = z.object({ version: z.literal(1), rules: z.array(FR), exportedAt: z.number().optional() });

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const r = S.safeParse(data);
if (!r.success) { console.log(JSON.stringify(r.error.issues, null, 1)); process.exit(1); }
console.log('VALID');
const P = /\{\{regex:\[(.+?)\]\}\}|\{\{(\w+)(?::([^}]+))?\}\}/gi;
for (const rule of data.rules) for (const f of rule.fields) {
  if (!f.value) continue;
  const v = f.value.replace(P, (m, re, t, p) => re ? new RandExp(re).gen() : t === 'pick' ? p.split(',')[0] : m);
  console.log(f.selector.slice(-45).padEnd(47), v);
}
