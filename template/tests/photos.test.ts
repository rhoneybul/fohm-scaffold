/** Photos the app may show, their credits, and the profile photo's sums. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { creditSections } from '../src/lib/credits';
import { canShow, creditLine, firstShown, showable } from '../src/lib/photos';
import { LEVELS } from '../src/lib/progression';
import { PHOTO_PX, centreSquare, isLocalPhoto, scaleSteps } from '../src/lib/photoSize';

const photo = (licence: string, credit = 'Jane Doe / Wikimedia Commons') => ({ url: 'https://upload.wikimedia.org/x.jpg', page: 'https://commons.wikimedia.org/wiki/File:X.jpg', caption: 'A view', credit, licence });

test('only public domain, CC0, CC BY and CC BY-SA are shown, never NC or ND', () => {
  for (const l of ['Public domain', 'CC0 1.0', 'CC BY 4.0', 'CC BY-SA 3.0', 'CC BY-SA 2.0 de', 'cc by 2.5']) assert.ok(canShow(photo(l)), l);
  for (const l of ['CC BY-NC 4.0', 'CC BY-ND 4.0', 'CC BY-NC-SA 4.0', 'All rights reserved', '', 'GFDL']) assert.ok(!canShow(photo(l)), l);
});

test('an attribution licence needs a named author; public domain doesn’t', () => {
  assert.ok(!canShow(photo('CC BY-SA 4.0', '')));
  assert.ok(!canShow(photo('CC BY 4.0', 'Unknown')));
  assert.ok(canShow(photo('Public domain', '')));
});

test('a photo with the photographer’s permission is shown, credited to them', () => {
  const given = { ...photo('All rights reserved', 'Sam Lee'), permission: 'Sam Lee, by email, Nov 2026' };
  assert.ok(canShow(given));
  assert.equal(creditLine(given), 'Sam Lee · used with permission');
  assert.equal(creditLine(photo('CC BY 4.0')), 'Jane Doe / Wikimedia Commons · CC BY 4.0');
});

test('the first photo that may be shown leads', () => {
  assert.equal(firstShown([photo('CC BY-NC 4.0'), photo('CC0 1.0')])?.licence, 'CC0 1.0');
  assert.equal(firstShown(undefined), undefined);
  assert.deepEqual(showable([photo('CC BY-ND 4.0')]), []);
});

test('the credits list every photo the path shows, and nothing it doesn’t', () => {
  const shown = LEVELS.flatMap((l) => l.skills.flatMap((s) => showable(s.photos ?? [])));
  const credited = creditSections().flatMap((s) => s.photos.map((p) => p.photo));
  assert.deepEqual(credited, shown);
  assert.ok(credited.every(canShow));
});

test('a profile photo is the centre square, scaled down by halves to 256px', () => {
  assert.deepEqual(centreSquare(4000, 3000), { x: 500, y: 0, side: 3000 });
  assert.deepEqual(scaleSteps(3000), [2048, 1024, 512, PHOTO_PX]);
  assert.deepEqual(scaleSteps(200), [PHOTO_PX]);
  assert.ok(isLocalPhoto('data:image/jpeg;base64,xx') && !isLocalPhoto('abc/123.jpg'));
});
