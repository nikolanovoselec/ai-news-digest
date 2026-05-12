// Implements REQ-PWA-001 AC 4
//
// Pure iOS detection. Lifted out of `src/scripts/install-prompt.ts`
// so the unit test can exercise the UA matrix without spinning up a
// DOM and without re-mirroring the regex in the test file (which was
// text-matching theater per tdd-discipline).

const IOS_UA_PATTERN = /iPad|iPhone|iPod/;

export interface IosNavigatorLike {
  userAgent: string;
  standalone?: boolean;
  platform?: string;
  maxTouchPoints?: number;
}

/** True when the browser is iOS Safari in a regular browser tab.
 *  Returns false when:
 *   - the UA does not contain iPad/iPhone/iPod
 *   - the page is already installed as a PWA (`navigator.standalone`)
 *  iPadOS 13+ with desktop UA + `maxTouchPoints > 1` is also treated
 *  as iOS so iPads in "request desktop site" mode still see the
 *  install hint. */
export function isIos(nav: IosNavigatorLike): boolean {
  if (nav.standalone === true) return false;
  if (IOS_UA_PATTERN.test(nav.userAgent)) return true;
  const isMacUA = /Macintosh/.test(nav.userAgent);
  const hasTouch = (nav.maxTouchPoints ?? 0) > 1;
  return isMacUA && hasTouch;
}
