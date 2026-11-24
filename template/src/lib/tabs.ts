/**
 * The member's main tabs, in one place: which routes they are and when the
 * floating tab bar shows (src/components/tab-bar.tsx). Only on these routes,
 * only for a signed-in member: never on sign-in, onboarding, a full-screen
 * flow (a check-in, the game) or the dashboard. Screens pad their foot for it
 * (`useFootRoom` in src/components/ui.tsx). Pure, tested in tests/tabs.test.ts.
 */
export type Kind = 'coaching' | 'app' | 'game';

export interface Tab {
  href: string;
  label: string;
  /** A Feather icon's name (@expo/vector-icons): drawn icons, never emoji or glyphs. */
  icon: 'home' | 'trending-up' | 'book-open' | 'play' | 'user';
  /** Other routes that sit under this tab. */
  also?: string[];
}

/** Every tab, by kind: four at most, so each label fits on a phone. Add yours here. */
export const TAB_ROUTES: Record<Kind, Tab[]> = {
  coaching: [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/path', label: 'Path', icon: 'trending-up' },
    { href: '/library', label: 'Library', icon: 'book-open' },
    { href: '/account', label: 'You', icon: 'user', also: ['/credits'] },
  ],
  app: [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/account', label: 'You', icon: 'user', also: ['/credits'] },
  ],
  game: [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/account', label: 'You', icon: 'user', also: ['/credits'] },
  ],
};

const clean = (pathname: string) => pathname.replace(/\/+$/, '') || '/';

/** The tab a path belongs to: its own, or one it sits under. */
export function tabOf(kind: Kind, pathname: string): Tab | undefined {
  const path = clean(pathname);
  return TAB_ROUTES[kind].find((t) => t.href === path || t.also?.includes(path));
}

/** Whether the tab bar shows: a signed-in member, on one of their main tabs, with more than one tab to switch between. */
export function showsTabBar(kind: Kind, pathname: string, member: boolean): boolean {
  return member && TAB_ROUTES[kind].length > 1 && !!tabOf(kind, pathname);
}
