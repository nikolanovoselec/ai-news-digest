# Design System

Swiss-minimal aesthetic — system fonts, five type sizes, two weights, neutral palette with one accent, no gradients or drop shadows. Light and dark mode toggled with a single click, persisted for the browser, and server-rendered on every request so the first byte always carries the correct theme. Motion is deliberate, single-curve, and always respects `prefers-reduced-motion`.

---

### REQ-DES-001: Swiss-minimal visual language

**Intent:** The UI feels calm and content-first rather than decorated, so the digest content is always the focal point.

**Applies To:** User

**Acceptance Criteria:**
1. The type scale provides 5 sizes from caption to display and 2 weights (body and heading); only system fonts are used — no webfont download is required. <!-- @impl: src/styles/global.css::--font-sans --> <!-- @impl: src/styles/global.css::--text-xs --> <!-- @impl: src/styles/global.css::--text-2xl -->
2. The palette is restricted to neutral grays with a single accent color per theme; no decorative gradients or drop shadows appear on steady-state UI surfaces. Motion-driven gradients required by another REQ (e.g., transient progress affordances) are exempt. <!-- @impl: src/styles/global.css::--color-bg -->
3. Inputs render with a minimum 16 px font size to prevent iOS zoom-on-focus. <!-- @impl: src/styles/global.css::--text-base -->
4. Every interactive element shows a visible focus ring on keyboard focus. <!-- @impl: src/styles/global.css:::focus-visible -->
5. All interactive elements have a minimum 44 × 44 pixel touch target. <!-- @impl: src/styles/global.css::[role='button'], -->
6. Every page fills the mobile viewport, even when content is shorter than the viewport, so the chrome color never dominates the screen; the top of the content surface stays clear of the header and the bottom stays clear of device safe-area insets. <!-- @impl: src/styles/global.css::--surface -->

**Notes:** Exact font stacks, size values, and tokens are documented in [`documentation/lanes/architecture.md`](../../documentation/lanes/architecture.md#design-system-tokens).

**Constraints:** [CON-A11Y-001](constraints.md#con-a11y-001-accessibility-minimum)

**Priority:** P0

**Dependencies:** None

**Verification:** Integration test

**Status:** Implemented

---

### REQ-DES-002: Light and dark mode with no flash

**Intent:** Users can switch themes with one click, the choice persists across sessions, and the wrong theme never appears on first paint.

**Applies To:** User

**Acceptance Criteria:**
1. Authenticated header shows a standalone theme-toggle button immediately left of the avatar menu. Its accessible name labels the target mode (`Dark Mode` with moon, `Light Mode` with sun), and one tap switches without a menu. <!-- @impl: src/components/ThemeToggle.astro::data-theme -->
2. Anonymous (signed-out) pages expose the same single-tap theme control in the same header position with visually matching styling, so the affordance and interaction are identical before and after sign-in. <!-- @impl: src/components/ThemeToggle.astro::data-theme -->
3. Clicking the toggle toggles the theme between `light` and `dark`, persists the choice for the current browser, and propagates the choice to the server so subsequent navigations render the correct theme in the first byte. <!-- @impl: src/scripts/bundled/theme-toggle.ts::readStoredTheme -->
4. On every authenticated or anonymous request, the server renders the document root with the user's chosen theme already applied, so the first paint is never the wrong theme even on slow connections or when client-side scripts are deferred. <!-- @impl: src/layouts/Base.astro::readThemeCookie -->
5. When the user has not yet expressed a preference, the theme follows `prefers-color-scheme`. <!-- @impl: src/layouts/Base.astro::readThemeCookie -->
6. The theme system exposes a consistent set of color tokens per theme (background, surface, text, muted text, border, accent) as CSS custom properties. <!-- @impl: src/styles/global.css::--surface -->

**Constraints:** [CON-A11Y-001](constraints.md#con-a11y-001-accessibility-minimum), [CON-SEC-001](constraints.md#con-sec-001-strict-content-security-policy)

**Priority:** P0

**Dependencies:** [REQ-DES-001](#req-des-001-swiss-minimal-visual-language)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-DES-004: Mobile and PWA no-flash chrome

**Intent:** When the app runs on a mobile device or as an installed PWA, the system status bar and the document background paint the user's selected theme from the first frame — never the operating-system theme, never a transient flash to the opposite theme on toggle, and never an intermediate white frame between client-side route swaps.

**Applies To:** User

**Acceptance Criteria:**
1. The mobile system status bar (iOS / Android) matches the app's selected theme, not the operating-system theme — a user in the app's dark theme whose device is in light mode still sees a dark status bar above the dark UI, and vice versa. <!-- @impl: src/styles/global.css::view-transition -->
2. The status bar repaints immediately when the user toggles theme mid-session, and its colour persists across client-side route navigations without a transient flash to the opposite theme. <!-- @impl: src/styles/global.css::view-transition -->
3. Across client-side route swaps, including installed PWA navigation, the body paints the chosen theme on the first frame and never flashes the opposite or intermediate background. <!-- @impl: src/styles/global.css::view-transition -->

**Notes:** Automated verification does not currently cite this REQ ID, so the shipped behavior stays Partial until a test is renamed or added to reference it.

**Constraints:** [CON-A11Y-001](constraints.md#con-a11y-001-accessibility-minimum), [CON-SEC-001](constraints.md#con-sec-001-strict-content-security-policy)

**Priority:** P1

**Dependencies:** [REQ-DES-002](#req-des-002-light-and-dark-mode-with-no-flash)

**Verification:** Integration test

**Status:** Partial

---

### REQ-DES-003: Deliberate motion system

**Intent:** Animations serve comprehension (orienting, masking latency, rewarding action) and never decorate; motion-sensitive users get an instant UI with zero transitions.

**Applies To:** User

**Acceptance Criteria:**
1. A single easing curve is used everywhere, with deliberate duration bands for micro-interactions, component transitions, and page transitions. <!-- @impl: src/styles/global.css::--ease --> <!-- @impl: src/styles/global.css::--duration-fast --> <!-- @impl: src/styles/global.css::--duration-slow -->
2. Astro View Transitions handle route changes with a 250 ms cross-fade by default. <!-- @impl: src/scripts/page-effects.ts::preFilterIncomingDocument -->
3. The digest card → article detail route uses the View Transitions shared-element morph so the card expands into the detail view. <!-- @impl: src/scripts/page-effects.ts::preFilterIncomingDocument -->
4. All motion is wrapped in `@media (prefers-reduced-motion: no-preference)`; under `reduce`, transitions collapse to instant state changes. <!-- @impl: src/scripts/page-effects.ts::syncBrowserTz -->
5. Hashtag chip selection, button `:active` press, and card hover (desktop) each have a single, short transition (150–200 ms) on the relevant property only. <!-- @impl: src/layouts/Base.astro::readThemeCookie -->
6. During route transitions, the identical header remains fixed with the theme background and no animation, so outgoing body content never bleeds through the header band. <!-- @impl: src/layouts/Base.astro::readThemeCookie -->

**Notes:** Exact motion durations, easing curve, and token names are documented in [`documentation/lanes/architecture.md`](../../documentation/lanes/architecture.md#motion-tokens).

**Constraints:** [CON-A11Y-001](constraints.md#con-a11y-001-accessibility-minimum)

**Priority:** P1

**Dependencies:** [REQ-DES-001](#req-des-001-swiss-minimal-visual-language)

**Verification:** Integration test

**Status:** Implemented
