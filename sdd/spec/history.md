# History & Stats

Past digests paginated on `/history`, 30 per page. A four-tile stats widget on `/settings` shows digests generated, articles read / total, tokens consumed, and cost to date — pulled from D1 with user-scoped SQL (IDOR-safe by construction through JOINs).

---

### REQ-HIST-001: Day-grouped article history

**Intent:** Users can browse how the global pool has grown over time, grouped by day of publication, and expand any day to see the articles it produced. The day-grouped view is the default landing surface on `/history` and matches the article retention window so users never see empty rows beyond what's still in the pool.

**Applies To:** User

**Acceptance Criteria:**
1. `/history` renders a day-grouped list of days on which articles were published, newest day first. <!-- @impl: src/pages/api/history.ts::GET -->
2. Each day row shows the date (user-local), the story count for that day, the aggregated cost for that day, and the aggregated token count for that day. <!-- @impl: src/pages/api/history.ts::GET -->
3. Clicking a day row expands inline to reveal the articles published that day; clicking again collapses the row. No per-scrape-run breakdown is shown; the summary row already carries cumulative tokens and cost for the day. <!-- @impl: src/pages/history.astro::env -->
4. Per-day aggregates are read from the scrape-run aggregation rather than re-derived from article rows. <!-- @impl: src/pages/api/history.ts::GET -->
5. The history window matches the article retention window (REQ-PIPE-005), both are 14 days. Extending one without the other would either show empty rows beyond the retention boundary or hide ingested data still in the pool. <!-- @impl: src/pages/api/history.ts::WINDOW_SECONDS -->

**Constraints:** [CON-DATA-001](constraints.md#con-data-001-strong-consistency-in-d1-edge-cache-in-kv)

**Priority:** P1

**Dependencies:** [REQ-PIPE-006](generation.md#req-pipe-006-scrape_runs-aggregation-surfaces-stats-history-and-in-flight-progress)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-HIST-003: Search, tag filter, and deep-link on /history

**Intent:** Users who remember a keyword or a tag rather than a date can search and filter the 14-day pool from `/history`, with the active query and tag selections reflected in the URL so navigating from an opened article and back restores the exact filtered view.

**Applies To:** User

**Acceptance Criteria:**
1. Search input with 3+ characters switches from day groups to a flat dashboard-style result grid. Clearing restores grouped view and scroll position; URL `q` preserves results when returning from an article. <!-- @impl: src/components/AltSourcesModal.astro::MONTHS -->
2. A tag railing between search and days mirrors dashboard chips: counts cover the 14-day window, add/remove affordances persist to hashtags, and URL `tags` pre-selects chips. <!-- @impl: src/pages/history.astro::rawTagsParam -->
3. Selecting a tag hides the day-grouped list and renders matching articles in the same flat grid the search uses. <!-- @impl: src/components/DigestCard.astro::data-vt-slug -->
4. Search and tag selections combine with AND logic (both must match), and both states are reflected in the URL so the browser back button from an opened article restores the exact filtered view. <!-- @impl: src/components/TagStrip.astro::selected -->
5. `/history?date=` renders only the matching local day pre-expanded, suppressing search and other days, with a `Back to all days` control. Unknown or malformed dates fall back to the full list. <!-- @impl: src/pages/history.astro::env -->

**Constraints:** [CON-DATA-001](constraints.md#con-data-001-strong-consistency-in-d1-edge-cache-in-kv)

**Priority:** P1

**Dependencies:** [REQ-HIST-001](#req-hist-001-day-grouped-article-history)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-HIST-002: User stats widget

**Intent:** Users see at-a-glance metrics of how much the global pipeline has cost overall and how much of the pool they have personally engaged with.

**Applies To:** User

**Acceptance Criteria:**
1. `/settings` displays a compact widget with four tiles: Digests generated, Articles read / total, Tokens consumed, Cost to date. <!-- @impl: src/pages/api/stats.ts::accepting -->
2. Tokens-consumed and Cost-to-date tiles read from the scrape-run aggregation, reflecting the global pipeline's totals rather than any per-user generation cost. <!-- @impl: src/pages/api/stats.ts::accepting -->
3. Articles-total counts pool articles intersecting the user's active tags; articles-read counts that user's reads in the same pool, so the ratio reflects only currently visible articles. <!-- @impl: src/pages/api/stats.ts::accepting -->
4. "Articles read / total" shows both numbers as `{read} of {total}`. <!-- @impl: src/pages/api/stats.ts::accepting -->
5. Cost is displayed in USD with 2-4 significant figures, e.g., `$0.14` or `$2.37`. <!-- @impl: src/components/StatsWidget.astro::formatCostUsd -->
6. The widget refreshes on every page load; no cache layer is involved. <!-- @impl: src/components/StatsWidget.astro::loadFailed -->

**Constraints:** [CON-DATA-001](constraints.md#con-data-001-strong-consistency-in-d1-edge-cache-in-kv)

**Priority:** P2

**Dependencies:** [REQ-HIST-001](#req-hist-001-day-grouped-article-history), [REQ-READ-003](reading.md#req-read-003-read-tracking), [REQ-PIPE-006](generation.md#req-pipe-006-scrape_runs-aggregation-surfaces-stats-history-and-in-flight-progress)

**Verification:** Integration test

**Status:** Implemented
