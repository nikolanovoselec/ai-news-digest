# Reading Experience

The heart of the product. Overview grid of the freshest articles read from the shared pool filtered by the user's active tags, detail view per article with long-form reading prose and a prominent source link, the shared tag railing with reorder cascade, the dedicated starred-articles surface, calm error/empty/offline pages, and read-tracking on the article detail page.

---

### REQ-READ-001: Overview grid of today's digest

**Intent:** Today's digest is a scannable grid of article cards read from the shared article pool filtered by the user's active tags. The grid composition (which articles, in what order, capped at how many) is the contract of this REQ; the page header showing freshness state lives in [REQ-READ-011](#req-read-011-digest-header-freshness-state).

**Applies To:** User

**Acceptance Criteria:**
1. `/digest` reads articles from the global article pool filtered by the user's active tags; articles whose tag list does not intersect the user's tag list are excluded. <!-- @impl: src/pages/digest.astro::env -->
2. When the user has no tag filters selected, the grid shows every article whose tags intersect the user's full tag list; when one or more filter tags are selected, the grid narrows to articles matching those filters. <!-- @impl: src/pages/digest.astro::env -->
3. The grid shows the 29 articles with the most recent first ingestion matching the user's active tags, ordered by first-ingestion descending with published-at as a tiebreaker. <!-- @impl: src/pages/digest.astro::env -->
4. `first_ingested_at` is when a story first entered the pool; later re-discoveries append sources without restamping it, so rebroadcast older stories cannot displace fresher arrivals. <!-- @impl: src/pages/digest.astro::env -->
5. Articles roll off the 29-card window as newer arrivals push them out. <!-- @impl: src/lib/digest-today.ts::loadTodayPayload -->
6. Slot 30 is a `see all today's articles in Search & History` tile with a centered list icon that links to today's local date; wider per-tag filtering lives on Search & History. <!-- @impl: src/pages/digest.astro::isCardHidden -->
7. Multi-source cards show primary publisher plus `+N` additional sources; single-source cards show only the publisher. The same attribution format is used on digest, Search & History, and starred grids. <!-- @impl: src/lib/alt-source-label.ts::formatAltSourceLabel -->

**Constraints:** [CON-A11Y-001](constraints.md#con-a11y-001-accessibility-minimum)

**Priority:** P0

**Dependencies:** [REQ-PIPE-001](generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence), [REQ-SET-002](settings.md#req-set-002-hashtag-curation-strip-ux)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-READ-011: Digest header freshness state

**Intent:** The top of `/digest` shows when the article pool was last refreshed and when the next refresh is due. When a scrape run is mid-flight at first paint, the countdown gives way to an in-progress indicator so the user sees the live state instead of a misleading static countdown.

**Applies To:** User

**Acceptance Criteria:**
1. `/digest` shows `Last updated at HH:MM` plus a live countdown to the next scrape tick, formatted `Xh Ym` above one hour and `Xm` otherwise. <!-- @impl: src/pages/digest.astro::data-digest-page -->
2. When a scrape run is currently in flight at first paint, the countdown is replaced by an "Update in progress…" indicator until the run completes, so a reader landing mid-run sees the live state immediately rather than a misleading countdown to the next tick. <!-- @impl: src/pages/digest.astro::data-digest-page -->
3. No manual Refresh button is rendered and no live-state skeleton cards are shown; the pool is always populated so the grid renders directly under the header. <!-- @impl: src/pages/digest.astro::data-digest-page -->

**Notes:** Automated verification does not currently cite this REQ ID, so the shipped behavior stays Partial until a test is renamed or added to reference it.

**Constraints:** [CON-A11Y-001](constraints.md#con-a11y-001-accessibility-minimum)

**Priority:** P0

**Dependencies:** [REQ-READ-001](#req-read-001-overview-grid-of-todays-digest), [REQ-PIPE-001](generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence)

**Verification:** Integration test

**Status:** Partial

---

### REQ-READ-002: Article detail view rendering

**Intent:** Each article gets a focused detail page that renders the long-form summary, a small-caps metadata line in the user's local time, and a prominent link to the original source. The page is laid out as long-form reading prose with a drop-cap first paragraph, a hyphenated 62-character column, and every text node rendered via `textContent` so untrusted LLM output cannot execute or inject markup.

**Applies To:** User

**Acceptance Criteria:**
1. `/digest/:id/:slug` renders the article title, the detail paragraphs as long-form reading prose, a small-caps metadata line (source · publish date · ingestion time), and a prominent "Read at source" affordance. <!-- @impl: src/pages/digest/[id]/[slug].astro::formatDate -->
2. The ingestion time in the metadata line is wall-clock only (hour:minute, no date) rendered in the user's IANA timezone, with the publish date right beside it in the same line so a duplicate ingestion date would read as redundant noise. <!-- @impl: src/pages/digest/[id]/[slug].astro::formatDate -->
3. The first paragraph carries a drop-cap initial and the reading column is capped around 62 characters with hyphenation. <!-- @impl: src/pages/digest/[id]/[slug].astro::session -->
4. All text is rendered with `textContent` — no markdown parsing, no HTML sanitizer, no `innerHTML`. <!-- @impl: src/components/DigestCard.astro::stagger -->
5. The slug is derived from the title and enforced unique per article. <!-- @impl: src/components/DigestCard.astro::stagger -->

**Constraints:** [CON-SEC-003](constraints.md#con-sec-003-plaintext-only-llm-output), [CON-A11Y-001](constraints.md#con-a11y-001-accessibility-minimum)

**Priority:** P0

**Dependencies:** [REQ-READ-001](#req-read-001-overview-grid-of-todays-digest)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-READ-009: Article detail return navigation and source affordance

**Intent:** From the article detail view, the user can return to the page they came from (with the shared-element morph playing in reverse), and the "Read at source" affordance either links directly to a single source or opens a modal listing every known source for multi-source articles. Direct-link visitors land on `/digest` when there is no prior in-app page to return to.

**Applies To:** User

**Acceptance Criteria:**
1. The back control returns to the in-app origin page across fresh or client-side navigations; direct-link visitors without same-tab app history fall back to `/digest`. <!-- @impl: src/pages/digest/[id]/[slug].astro::formatDate -->
2. Reverse shared-element morphs restore the source page scroll before snapshot capture, so returning to a below-fold origin card lands on that card instead of a root cross-fade. <!-- @impl: src/components/AltSourcesModal.astro::MONTHS -->
3. When the article has at least one alternative source, activating "Read at source" opens a modal listing every known source (primary + alternatives) with each source's name and per-source timestamp. <!-- @impl: src/components/AltSourcesModal.astro::formatPublished -->
4. When the article has only one source, "Read at source" links directly to that source in a new tab with `rel="noopener noreferrer"` rather than opening the modal. <!-- @impl: src/components/AltSourcesModal.astro::formatPublished -->
5. The source-list modal closes on Escape and on backdrop click. <!-- @impl: src/scripts/alt-sources-modal.ts::positionAnchored -->

**Notes:** Automated verification does not currently cite this REQ ID, so the shipped behavior stays Partial until a test is renamed or added to reference it.

**Constraints:** [CON-A11Y-001](constraints.md#con-a11y-001-accessibility-minimum)

**Priority:** P0

**Dependencies:** [REQ-READ-002](#req-read-002-article-detail-view-rendering)

**Verification:** Integration test

**Status:** Partial

---

### REQ-READ-003: Read tracking

**Intent:** The product can tell whether the user engaged with an article (not just clicked the source link) so the stats widget reflects real reading.

**Applies To:** User

**Acceptance Criteria:**
1. On first view of an article's detail page, the page loader atomically records that this user has read this article. Articles are global and shared across users; the read mark is scoped per (user, article) pair, never per digest. <!-- @impl: src/pages/digest/[id]/[slug].astro::env -->
2. A user can only mark their own reads — one user's read activity never appears under another user's account, and one user cannot cause another user's article to be marked read. <!-- @impl: src/pages/digest/[id]/[slug].astro::formatDate -->
3. Clicking the source link does not record a read; only opening the detail view counts. <!-- @impl: src/pages/digest/[id]/[slug].astro::env -->
4. Re-visiting an already-read detail page is idempotent — the original read timestamp is preserved and no duplicate read is recorded. <!-- @impl: src/pages/digest/[id]/[slug].astro::env -->

**Constraints:** [CON-DATA-001](constraints.md#con-data-001-strong-consistency-in-d1-edge-cache-in-kv)

**Priority:** P1

**Dependencies:** [REQ-READ-002](#req-read-002-article-detail-view)

**Verification:** Integration test

**Status:** Implemented

---
### REQ-READ-005: Empty dashboard state

**Intent:** When the global pool contains no articles matching the user's tags, the dashboard communicates that clearly and nudges the user toward broadening their interests.

**Applies To:** User

**Acceptance Criteria:**
1. When the filtered article grid is empty, `/digest` shows exactly the copy "No news for you today, try adding additional tags." and no other body content. <!-- @impl: src/pages/digest.astro::env -->
2. The empty state does not include a link or redirect to the settings page. <!-- @impl: src/pages/digest.astro::env -->
3. The countdown header continues to render above the empty-state copy so users still see when the pool will next refresh. <!-- @impl: src/pages/digest.astro::env -->

**Constraints:** None

**Priority:** P1

**Dependencies:** [REQ-READ-001](#req-read-001-overview-grid-of-todays-digest)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-READ-006: Empty, error, and offline pages

**Intent:** Every failure mode has a calm, informative page rather than a broken or blank screen.

**Applies To:** User

**Acceptance Criteria:**
1. Low-yield or empty digest states use the `/digest` empty-state contract from [REQ-READ-005](#req-read-005-empty-dashboard-state), not a separate LLM-failure page. <!-- @impl: src/pages/digest.astro::digest-page__empty -->
2. When the digest has `status='failed'`, the page shows "We couldn't build your digest" with a Try-again control and a Go-to-settings link; the raw `error_code` appears in a muted monospace footer, never prose from the error. <!-- @impl: src/pages/404.astro::error-page__code -->
3. Try-again submits in place and updates an inline status (`Retrying…`, rate-limit countdown, or network error). The failure page remains until a new generation is accepted. <!-- @impl: src/pages/rate-limited.astro::url -->
4. When `navigator.onLine` is false, a top-of-page banner reads "You're offline — showing the last digest you viewed"; the Refresh button is disabled with a tooltip. <!-- @impl: src/pages/offline.astro::offline-page__banner -->
5. 404 and 500 responses have dedicated pages with a calm headline and at least one clear action. <!-- @impl: src/pages/404.astro::error-page -->

**Constraints:** [CON-SEC-001](constraints.md#con-sec-001-strict-content-security-policy)

**Priority:** P1

**Dependencies:** [REQ-READ-001](#req-read-001-overview-grid-of-todays-digest)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-READ-007: Tag railing reorder animation

**Intent:** When the user taps a chip in the shared tag railing on the dashboard or Search & History, the chip animates into its new sort position and the chips between its old and new positions cascade to fill the slot it left. The visual confirms what the user just did and no chip ever vanishes mid-motion.

**Applies To:** User

**Acceptance Criteria:**
1. Tapping a chip plays an immediate scale-bounce pop on that chip so the user has unmistakable visual confirmation of the input before any other motion begins. <!-- @impl: src/lib/tag-railing-flip.ts::flipChipToFront -->
2. After the pop, the railing holds for roughly one second with the tapped chip visually elevated above its neighbours, so the user's eye lands on the chip about to move before the cascade starts. <!-- @impl: src/lib/tag-railing-flip.ts::flipChipToFront -->
3. After the hold completes, the tapped chip slides along a smooth path to its new sort position governed by [REQ-READ-010](#req-read-010-tag-railing-slide-destination-and-duration-policy). <!-- @impl: src/lib/tag-railing-flip.ts::flipChipToPosition -->
4. Chips between the tapped chip's old and new positions slide in the opposite direction on a faster fixed-duration curve so the gap closes promptly even while the tapped chip's full journey is still in flight. <!-- @impl: src/lib/tag-railing-flip.ts::flipChipToPosition -->
5. No chip is hidden, removed, or repainted mid-flight; every chip remains visible and identifiable throughout the pop, hold, and cascade. <!-- @impl: src/lib/tag-railing-flip.ts::flipChipToFront -->
6. While the pop, hold, or cascade is in flight, additional taps on any chip are ignored until the motion settles, so a rapid double-tap never desynchronises the data order from the visual order. <!-- @impl: src/lib/tag-railing-flip.ts::flipChipToFront -->
7. When the tapped chip is already at its destination slot (e.g., the leftmost chip is tapped to select), only the pop plays; there is no hold, no cascade, and no trailing motion, so the chip never appears to "pulse twice". <!-- @impl: src/lib/tag-railing-flip.ts::flipChipToFront -->

**Constraints:** [CON-SEC-001](constraints.md#con-sec-001-strict-content-security-policy)

**Priority:** P2

**Dependencies:** [REQ-READ-001](#req-read-001-overview-grid-of-todays-digest), [REQ-HIST-001](history.md#req-hist-001-day-grouped-article-history)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-READ-010: Tag railing slide destination and duration policy

**Intent:** The slide phase of the tag railing reorder animation (REQ-READ-007 AC 3) has a deterministic destination per direction and a duration profile that keeps far-travelling chips comfortably trackable rather than a blur.

**Applies To:** User

**Acceptance Criteria:**
1. On SELECT, the slide destination is the leftmost slot so active filters cluster at the front of the railing. <!-- @impl: src/lib/tag-railing-flip.ts::first -->
2. On UN-SELECT, the slide destination is the chip's natural sort position among non-selected chips (sorted by article count descending, with alphabetical tie-break), so the chip rejoins the count hierarchy. <!-- @impl: src/lib/tag-railing-flip.ts::MIN_VISIBLE_FRACTION -->
3. The slide duration is shaped so the on-screen portion of the chip's journey takes roughly the same wall time whether the chip travels a short visible hop or a long mostly-off-screen one, giving far chips a comfortably trackable visible window instead of a blur. <!-- @impl: src/lib/tag-railing-flip.ts::on -->

**Notes:** Automated verification does not currently cite this REQ ID, so the shipped behavior stays Partial until a test is renamed or added to reference it.

**Constraints:** [CON-SEC-001](constraints.md#con-sec-001-strict-content-security-policy)

**Priority:** P2

**Dependencies:** [REQ-READ-007](#req-read-007-tag-railing-reorder-animation)

**Verification:** Integration test

**Status:** Partial

---

### REQ-READ-008: Tag railing scroll, wrap, and fallback

**Intent:** The tag railing's scroll position, multi-row wrap behaviour, and no-animation fallback keep the reorder coherent across viewports and runtimes, so taps never produce a disorienting scroll jump or leave the data and visual orders out of sync.

**Applies To:** User

**Acceptance Criteria:**
1. On horizontally scrolling railings, tapping preserves scroll position and never auto-scrolls; the chip moves to its destination and may exit either edge, leaving manual railing navigation. <!-- @impl: src/components/TagStrip.astro::selected -->
2. After a SELECT cascade to slot 0, the next page-down scroll reveals the selected chip by smoothly scrolling the railing left once, unless the user manually swipes first. <!-- @impl: src/components/TagStrip.astro::data-tag-chip -->
3. Unselect cascades do not arm the convenience scroll, because the chip lands mid-railing rather than at slot 0. <!-- @impl: src/components/TagStrip.astro::data-tag-chip -->
4. On a viewport that wraps the railing into multiple rows, the railing does not scroll at all; the user sees the entire cascade play out across whatever rows the chips occupy. <!-- @impl: src/components/TagStrip.astro::data-tag-chip -->
5. Without animation primitives, data reorder still completes to the correct slot/order, while pop, hold, and cascade motion are skipped. <!-- @impl: src/components/TagStrip.astro::is -->

**Constraints:** [CON-SEC-001](constraints.md#con-sec-001-strict-content-security-policy)

**Priority:** P2

**Dependencies:** [REQ-READ-007](#req-read-007-tag-railing-reorder-animation)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-STAR-001: Star and unstar articles

**Intent:** Users can mark articles worth keeping by starring them from the dashboard grid or the article detail page, and remove the star with the same affordance.

**Applies To:** User

**Acceptance Criteria:**
1. Every card that lists an article — the dashboard grid, the article detail page, the starred-articles page, and the day-expanded and search-result grids on `/history` — shows a star toggle; activating it stars the article when unstarred and unstars it when starred. <!-- @impl: src/scripts/card-interactions.ts::bindStarDelegation -->
2. Starring POSTs to the article-star endpoint; unstarring DELETEs the same endpoint; both flip the icon optimistically on click before the server response returns. <!-- @impl: src/pages/api/articles/[id]/star.ts::readArticleId -->
3. Star state is user-scoped — starring an article in one account never reveals the star in any other account's view. <!-- @impl: src/pages/api/articles/[id]/star.ts::readArticleId -->
4. State-changing star requests are protected by the Origin check from REQ-AUTH-003; unauthenticated requests receive HTTP 401. <!-- @impl: src/pages/api/articles/[id]/star.ts::readArticleId -->
5. A successful star/unstar response confirms the new state and the UI reconciles with the server value if the optimistic flip disagreed. <!-- @impl: src/scripts/card-interactions.ts::bindStarDelegation -->
6. On every page that lists articles, each card renders its initial starred / unstarred state on first paint — articles the user has already starred appear filled and `aria-pressed` from the server-rendered HTML, without needing a hard refresh after a toggle on another page. <!-- @impl: src/pages/digest/[id]/[slug].astro::formatIngestedAt -->

**Constraints:** [CON-SEC-001](constraints.md#con-sec-001-strict-content-security-policy), [CON-DATA-001](constraints.md#con-data-001-strong-consistency-in-d1-edge-cache-in-kv)

**Priority:** P1

**Dependencies:** [REQ-AUTH-002](authentication.md#req-auth-002-access-token-refresh-token-instant-revocation), [REQ-AUTH-003](authentication.md#req-auth-003-csrf-defense-for-state-changing-endpoints)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-STAR-002: Starred articles page

**Intent:** A dedicated page lists the articles the user has starred so they can return to items of lasting interest without digging through history.

**Applies To:** User

**Acceptance Criteria:**
1. `/starred` renders the same card grid as `/digest` but shows only articles the user has starred. <!-- @impl: src/pages/starred.astro::env -->
2. Articles are ordered by the time they were starred, most recent first. <!-- @impl: src/pages/api/starred.ts::loadStarredPayload -->
3. When the user has starred no articles, the page shows exactly the copy "No starred articles yet." with no countdown header. <!-- @impl: src/pages/api/starred.ts::loadStarredPayload -->
4. The countdown header from `/digest` does not appear on `/starred`. <!-- @impl: src/pages/starred.astro::env -->

**Constraints:** [CON-A11Y-001](constraints.md#con-a11y-001-accessibility-minimum)

**Priority:** P1

**Dependencies:** [REQ-STAR-001](#req-star-001-star-and-unstar-articles)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-STAR-003: Starred entry in the user menu

**Intent:** The user menu exposes a first-class entry point to the starred-articles page so users can find their saved items quickly.

**Applies To:** User

**Acceptance Criteria:**
1. The avatar user menu includes an entry labelled "Starred" linking to the starred-articles page. <!-- @impl: src/components/UserMenu.astro::sha256Hex -->
2. The entry shows a star-outline glyph aligned to the right side of the row. <!-- @impl: src/components/UserMenu.astro::sha256Hex -->
3. The entry is placed between the existing History and Settings entries in the menu order. <!-- @impl: src/components/UserMenu.astro::sha256Hex -->

**Constraints:** [CON-A11Y-001](constraints.md#con-a11y-001-accessibility-minimum)

**Priority:** P2

**Dependencies:** [REQ-STAR-002](#req-star-002-starred-articles-page)

**Verification:** Integration test

**Status:** Implemented
