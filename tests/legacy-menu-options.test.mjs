import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('menu uses database identities for legacy options, not invented IDs',()=>{
 const source=readFileSync(new URL('../src/routes/s.$store_slug.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('opt.id ?? opt.title ?? ""'));
 assert.ok(source.includes('c.id ?? c.name ?? c.label ?? ""'));
 assert.ok(!source.includes('`choice_${i}_${j}`'));
});
