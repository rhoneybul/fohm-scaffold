/** Research the API reads, generated into TypeScript (scripts/research.ts). Plain Node: npm test. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { dataFile, generated, renderResearch } from '../scripts/research';

test('every generated research file is the research as it is (run npx tsx scripts/research.ts <name> after changing it)', () => {
  for (const name of generated()) assert.equal(fs.readFileSync(dataFile(name), 'utf8'), renderResearch(name), `src/lib/${name}.data.ts is out of date`);
});
