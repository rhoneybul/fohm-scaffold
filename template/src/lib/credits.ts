/**
 * Every photo the app shows, for /credits, grouped by where it appears. A new
 * kind of photo (a goal's, a place's, a session's still) gets its section here
 * in the same change, so the credits never miss one. Plain, tested in
 * tests/photos.test.ts.
 */
import { APP } from './brand';
import { showable, type CreditedPhoto } from './photos';
import { LEVELS } from './progression';

export interface CreditSection {
  title: string;
  photos: { label: string; photo: CreditedPhoto }[];
}

export function creditSections(): CreditSection[] {
  const sections: CreditSection[] = [
    { title: 'The landing page', photos: showable(APP.heroPhoto ? [APP.heroPhoto] : []).map((photo) => ({ label: APP.name, photo })) },
    { title: 'The path', photos: LEVELS.flatMap((l) => l.skills.flatMap((s) => showable(s.photos ?? []).map((photo) => ({ label: s.title, photo })))) },
  ];
  return sections.filter((s) => s.photos.length);
}
