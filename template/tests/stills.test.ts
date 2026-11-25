import assert from 'node:assert/strict';
import test from 'node:test';

import { STILL_FRAMES, letterboxCrop, stillFrameOf, stillOf, videoStill, youtubeId } from '../src/lib/stills';

const ID = 'dQw4w9WgXcQ';

test('a video link gives its id, whatever form it takes', () => {
  for (const url of [`https://www.youtube.com/watch?v=${ID}`, `https://youtube.com/watch?feature=share&v=${ID}`, `https://youtu.be/${ID}`, `https://www.youtube.com/embed/${ID}`, `https://www.youtube-nocookie.com/embed/${ID}?rel=0`, `https://youtube.com/shorts/${ID}`, `https://m.youtube.com/watch?v=${ID}`])
    assert.equal(youtubeId(url), ID, url);
  for (const url of [undefined, '', 'https://vimeo.com/1234', 'https://example.com/watch?v=dQw4w9WgXcQ']) assert.equal(youtubeId(url), undefined, String(url));
});

test('a still is a frame from mid-video, never the thumbnail with its title card', () => {
  assert.deepEqual([...STILL_FRAMES], ['hq2', 'hq1', 'hq3']);
  assert.equal(videoStill(ID), `https://i.ytimg.com/vi/${ID}/hq2.jpg`, 'the middle frame first');
  for (const f of STILL_FRAMES) assert.doesNotMatch(videoStill(ID, f), /default/, `${f} is a frame, not the thumbnail`);
  assert.equal(stillOf(`https://youtu.be/${ID}`), `https://i.ytimg.com/vi/${ID}/hq2.jpg`);
  assert.equal(stillOf('https://example.com/notes'), undefined, 'not a video: the row keeps its icon');
});

test('a video checked by eye uses the frame that carries no caption', () => {
  assert.equal(stillFrameOf(ID, { [ID]: 'hq3' }), 'hq3');
  assert.equal(videoStill(ID, stillFrameOf(ID, { [ID]: 'hq3' })), `https://i.ytimg.com/vi/${ID}/hq3.jpg`);
  assert.equal(stillFrameOf('another-one', { [ID]: 'hq3' }), 'hq2');
});

test('the crop covers the box with the picture alone: the bars and a seventh of each edge fall outside', () => {
  const pct = (s: string) => Number(s.replace('%', '')) / 100;
  for (const ratio of [1, 4 / 5, 16 / 9, 4 / 3]) {
    const c = letterboxCrop(ratio);
    const [left, width, top, height] = [pct(c.left), pct(c.width), pct(c.top), pct(c.height)];
    assert.ok(left <= -1 / 7 + 1e-3 && left + width >= 1 + 1 / 7 - 1e-3, `${ratio}: the sides are cut`);
    // The picture is the middle three quarters of the frame's height.
    assert.ok(top + height / 8 <= 1e-3 && top + (height * 7) / 8 >= 1 - 1e-3, `${ratio}: the bars fall outside, top and bottom`);
  }
});

test('a large slot tries the same frame sharpest first: maxres, then sd, then the 480 every video has', async () => {
  const { videoStillsLarge, videoStill } = await import('../src/lib/stills');
  const chain = videoStillsLarge('abc123XYZ_-');
  assert.deepEqual(chain.map((s) => s.uri.split('/').pop()), ['maxres2.jpg', 'sd2.jpg', 'hq2.jpg']);
  assert.equal(chain[2].uri, videoStill('abc123XYZ_-'), 'it ends on the frame every video has');
  assert.deepEqual(chain.map((s) => s.letterboxed), [false, true, true], 'only the 16:9 maxres frame has no bars to crop');
});
