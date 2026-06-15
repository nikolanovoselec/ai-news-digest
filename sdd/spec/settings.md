# Onboarding & Settings

A single `/settings` route handles both first-run onboarding and steady-state configuration. Covers hashtag curation, schedule (HH:MM + IANA timezone), model selection, email notification toggle, and the middleware gate that keeps un-configured users on the settings page.

---

### REQ-SET-001: Unified first-run and edit flow

**Intent:** A new user configures their first digest in one place without a multi-step wizard, and the same form handles every subsequent edit. The save endpoint's transport contract and native-form UX live in [REQ-SET-009](#req-set-009-save-endpoint-transports-and-native-form-ux).

**Applies To:** User

**Acceptance Criteria:**
1. Users landing without `hashtags_json` or `digest_hour` set are redirected to `/settings?first_run=1`. <!-- @impl: src/pages/api/settings.ts::validateHashtags -->
2. First-run mode shows a "Welcome" hero and the primary button reads "Generate my first digest". <!-- @impl: src/pages/api/settings.ts::validateHashtags -->
3. Edit mode (after configuration is complete) shows the same form with the primary button reading "Save" and additional controls for logout, account deletion, and the install-app prompt. <!-- @impl: src/pages/settings.astro::submitSettings -->
4. A successful first-run save redirects the user to `/digest`, where the shared article pool is already populated so real cards render immediately. <!-- @impl: src/pages/api/settings.ts::validateHashtags -->
5. The first-run save also kicks the global scrape pipeline as a best-effort nudge so any tags newly added during onboarding can begin discovery on the next cron tick. <!-- @impl: src/pages/settings.astro::teardownScrapeProgress -->

**Constraints:** None

**Priority:** P0

**Dependencies:** [REQ-AUTH-001](authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-SET-009: Save endpoint transports and native-form UX

**Intent:** The settings save endpoint persists configuration whether the in-page JavaScript handler is bound or not, and the native-form path always returns the user to the settings page with a readable outcome inline rather than a raw JSON body or a stuck stale URL.

**Applies To:** User

**Acceptance Criteria:**
1. The save endpoint accepts both a JSON API request (used when the in-page submit handler is bound) and a native HTML form submission, so clicking the primary button always persists regardless of whether client-side JavaScript has initialised. <!-- @impl: src/pages/api/settings.ts::POST -->
2. Both transports apply identical server-side validation and the same `Origin` check from [REQ-AUTH-003](authentication.md#req-auth-003-csrf-defense-for-state-changing-endpoints). <!-- @impl: src/pages/api/settings.ts::POST -->
3. On the native-form path, the response is always a redirect back to the settings page on both success and failure, so the user never sees a raw JSON error body. <!-- @impl: src/pages/api/settings.ts::POST -->
4. After the redirect, a successful save surfaces a confirmation inline next to the Save button; a validation or server error surfaces an inline message naming what went wrong. <!-- @impl: src/pages/api/settings.ts::POST -->
5. Query parameters carrying the outcome are stripped from the URL after display so a refresh does not re-show stale text. <!-- @impl: src/pages/api/settings.ts::POST -->
6. Unauthenticated native-form POSTs redirect to the site root rather than persisting state or showing an error message. <!-- @impl: src/pages/api/settings.ts::POST -->

**Notes:** Automated verification does not currently cite this REQ ID, so the shipped behavior stays Partial until a test is renamed or added to reference it.

**Constraints:** None

**Priority:** P0

**Dependencies:** [REQ-SET-001](#req-set-001-unified-first-run-and-edit-flow), [REQ-AUTH-003](authentication.md#req-auth-003-csrf-defense-for-state-changing-endpoints)

**Verification:** Integration test

**Status:** Partial

---

### REQ-SET-002: Hashtag curation strip UX

**Intent:** Users curate their interest tags directly on the reading surface using a hashtag strip that supports add, toggle, remove, and live article filtering, rather than juggling a separate settings form.

**Applies To:** User

**Acceptance Criteria:**
1. A hashtag strip renders at the top of the reading surface and is the sole place where users add, remove, or view their tags; the settings form contains no hashtag controls. <!-- @impl: src/pages/settings.astro::submitSettings -->
2. Each tag in the strip starts in an unselected state and toggles to a selected state when clicked; any number of tags may be selected simultaneously. <!-- @impl: src/pages/settings.astro::submitSettings -->
3. In the selected state, the tag visually inverts to indicate selection and expands to reveal a red remove affordance attached to its right edge. <!-- @impl: src/pages/settings.astro::submitSettings -->
4. Clicking the body of a selected tag returns it to the unselected state. <!-- @impl: src/lib/schemas/settings.ts::SettingsPutBodySchema -->
5. Clicking the red remove affordance deletes that tag from the user's selection. <!-- @impl: src/lib/default-hashtags.ts::DEFAULT_HASHTAGS -->
6. An add affordance at the end of the strip expands inline into a single text input; submitting the input appends a new tag to the selection. <!-- @impl: src/lib/hashtags.ts::parseHashtags -->
7. When tags are selected, reading surfaces show only articles whose stored tags intersect the selection; an empty result names selected tags and invites deselection. <!-- @impl: src/lib/default-hashtags.ts::DEFAULT_HASHTAGS -->

**Constraints:** None

**Priority:** P0

**Dependencies:** [REQ-SET-001](#req-set-001-unified-first-run-and-edit-flow), [REQ-SET-008](#req-set-008-hashtag-persistence-validation-and-defaults)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-SET-008: Hashtag persistence, validation, and defaults

**Intent:** Tag changes persist immediately, hashtag values follow a normalised format, the list is bounded by an enforced cap, and new accounts start with a curated seed so the first digest is meaningful before the user has touched the strip.

**Applies To:** User

**Acceptance Criteria:**
1. Every add or remove persists immediately via the dedicated tags write endpoint with no form submit required; the user's tag list updates visibly on success. Toggling selection never writes to the server; it only affects the client-side filter state. <!-- @impl: src/pages/api/tags/delete-initial.ts::POST -->
2. Each hashtag must be 2 to 32 characters long, is normalised to lowercase with any leading `#` stripped, and may contain only characters in `[a-z0-9-]`; other characters are stripped server-side before storage. <!-- @impl: src/pages/api/tags/delete-initial.ts::POST -->
3. Server-side storage requires at least one hashtag, caps total hashtags at 25, and collapses duplicates; the cap leaves four custom slots above the 21-tag default seed. <!-- @impl: src/pages/api/tags/delete-initial.ts::POST -->
4. Brand-new accounts are seeded with a curated default hashtag list so the first digest has meaningful input before the user touches the strip. <!-- @impl: src/pages/api/tags/delete-initial.ts::POST -->
5. The settings page exposes two paired actions side-by-side: "Restore initial tags" replaces the current list with the full default seed; "Delete all tags" clears the user's tag list entirely so they can build a completely custom set without removing default chips one-by-one. <!-- @impl: src/pages/api/tags/delete-initial.ts::POST -->
6. Restore appears only when default tags are missing; Delete appears only when at least one tag exists, so no-op paired actions stay hidden. <!-- @impl: src/pages/api/tags/delete-initial.ts::POST -->

**Constraints:** None

**Priority:** P0

**Dependencies:** [REQ-SET-001](#req-set-001-unified-first-run-and-edit-flow)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-SET-003: Scheduled digest time with timezone

**Intent:** Users pick the exact local time their daily digest is generated, so the email arrives at a predictable moment in their day.

**Applies To:** User

**Acceptance Criteria:**
1. Digest time uses two dropdowns labelled from the browser's clock convention: 12-hour labels for 12-hour locales and 24-hour labels for 24-hour locales, detected without country hardcoding. <!-- @impl: src/pages/settings.astro::teardownScrapeProgress -->
2. Selectable digest-time values follow a 5-minute step (00:00, 00:05, ..., 23:55) so the picker matches the dispatcher's 5-minute cron tick. <!-- @impl: src/pages/settings.astro::teardownScrapeProgress -->
3. The browser-detected IANA timezone is displayed next to the time and auto-syncs to the server whenever it differs from the stored value; there is no manual timezone picker in the UI. <!-- @impl: src/pages/settings.astro::submitSettings -->
4. Initial timezone is populated from the browser's resolved IANA zone on first load, saved to the user row, and re-synced on every subsequent visit if it changes (e.g., travel). <!-- @impl: src/pages/settings.astro::submitSettings -->
5. The saved time is interpreted in the user's stored timezone; DST transitions are handled correctly using `Intl.DateTimeFormat`. <!-- @impl: src/lib/tz.ts::localeForTz -->
6. Changing the scheduled time never creates a duplicate digest for a day that has already generated. <!-- @impl: src/pages/api/settings.ts::isIntegerInRange -->

**Constraints:** None

**Priority:** P0

**Dependencies:** [REQ-SET-002](#req-set-002-hashtag-curation-strip-ux)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-SET-004: Model selection

**Intent:** The app has one server-side model catalog and default model for digest-generation LLM calls, with cost metadata visible anywhere model configuration is exposed.

**Applies To:** User

**Acceptance Criteria:**
1. Saving settings with an unavailable model choice is rejected before the user's stored model changes. <!-- @impl: src/pages/api/settings.ts::PUT -->
2. The model catalog carries user-facing descriptions and per-token pricing. <!-- @impl: src/lib/models.ts::MODELS -->
3. When no accepted user setting applies, inference uses the system default model route configured in the server-side catalog. <!-- @impl: src/lib/models.ts::DEFAULT_MODEL_ID --> <!-- @impl: src/lib/llm-json.ts::runJson -->
4. If a model picker is exposed, it lists accepted options with descriptions and cost categories, pre-selecting the active or default choice. <!-- @impl: src/lib/models.ts::MODELS -->
5. If model selection is hidden, the settings form preserves the active or default choice without requiring user input. <!-- @impl: src/pages/settings.astro::currentModelId = DEFAULT_MODEL_ID -->
6. Provider-backed defaults fail closed until runtime inference credentials are configured. <!-- @impl: src/lib/llm-json.ts::runModel -->
7. Cost estimates use the model catalog's pricing data. <!-- @impl: src/lib/models.ts::estimateCost -->

**Notes:** The model-selection UI is hidden from the settings form, but the settings API still accepts and persists a `model_id` field. True removal requires retiring `model_id` from the persistence contract first.

**Constraints:** [CON-LLM-001](constraints.md#con-llm-001-centralized-deterministic-prompts)

**Priority:** P1

**Dependencies:** [REQ-SET-003](#req-set-003-scheduled-digest-time-with-timezone)

**Verification:** Integration test

**Status:** Partial

---

### REQ-SET-005: Email notification preference

**Intent:** Users can receive a "your digest is ready" email on scheduled runs, or opt out without losing in-app digests.

**Applies To:** User

**Acceptance Criteria:**
1. The settings form includes a single toggle labeled "Email me when my daily digest is ready", defaulting to on for new accounts. <!-- @impl: src/pages/settings.astro::submitSettings -->
2. Toggle state persists to the `users.email_enabled` column. <!-- @impl: src/pages/settings.astro::submitSettings -->
3. When the toggle is off, scheduled digests still generate and appear in the app; no email is sent for that user. <!-- @impl: src/pages/settings.astro::submitSettings -->
4. Manual refresh never sends email, regardless of toggle state. <!-- @impl: src/pages/settings.astro::submitSettings -->

**Constraints:** None

**Priority:** P1

**Dependencies:** [REQ-SET-001](#req-set-001-unified-first-run-and-edit-flow)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-SET-006: Settings-incomplete gate

**Intent:** Users who have not yet chosen a scheduled digest time cannot navigate to the reading surface, preventing empty-state confusion. Hashtags are NOT part of the gate because they are edited on the reading surface itself — a user with no tags yet still reaches the digest page and is prompted there to add their first one.

**Applies To:** User

**Acceptance Criteria:**
1. Any authenticated request to a path other than the settings page and the authentication/settings APIs, made by a user whose scheduled-digest time is not yet set, is redirected to the first-run settings view. <!-- @impl: src/middleware/settings-gate.ts::SETTINGS_PATH -->
2. Once the scheduled-digest time is set, visiting the first-run settings view redirects to the steady-state settings view. <!-- @impl: src/middleware/settings-gate.ts::SETTINGS_PATH -->
3. The gate keys only on "scheduled time not yet set" — having no hashtags selected does NOT trip the gate, and a user whose first digest fails is not trapped. <!-- @impl: src/middleware/settings-gate.ts::is -->
4. While the gate is active, the global navigation hides entries that lead to gated routes so the user sees only the Settings destination and cannot tap into a dead-end redirect. <!-- @impl: src/middleware/settings-gate.ts::is -->
5. Discovery-progress polling is per-user rate-limited to allow normal few-second polling but bound client loops; 429 includes `Retry-After`, and settings shows the pause without blocking the form. <!-- @impl: src/middleware/settings-gate.ts::SETTINGS_PATH -->

**Constraints:** None

**Priority:** P0

**Dependencies:** [REQ-SET-001](#req-set-001-unified-first-run-and-edit-flow), [REQ-AUTH-002](authentication.md#req-auth-002-access-token-refresh-token-instant-revocation)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-SET-007: Timezone change detection

**Intent:** When a user's browser timezone differs from the stored value (e.g., they traveled, or they signed up on a device whose timezone was never set), the server-stored timezone is corrected automatically so downstream behaviour (scheduled-email dispatch, today-local date deep-links) always matches the user's real location. The manual override picker lives in [REQ-SET-010](#req-set-010-manual-timezone-picker).

**Applies To:** User

**Acceptance Criteria:**
1. On every authenticated page load *for users whose stored timezone is still the seeded default*, the browser's resolved IANA timezone is compared to the stored timezone value for the session user. <!-- @impl: src/pages/api/auth/set-tz.ts::POST -->
2. When the two differ, the browser silently posts the new timezone to the timezone-update endpoint and the server persists it; no confirmation banner or dialog is shown. <!-- @impl: src/pages/settings.astro::submitSettings -->
3. The correction runs on every route (not just the settings page), so users who sign up and go straight to the reading surface never miss the update. <!-- @impl: src/pages/settings.astro::submitSettings -->
4. A failed correction request is non-fatal: the page continues to render and the next page load retries. <!-- @impl: src/pages/settings.astro::wireScrapeProgress -->
5. Once stored timezone differs from the seeded default, silent correction stops, so manual or earlier browser choices are never overwritten by privacy-masked or stale browser zones. <!-- @impl: src/scripts/page-effects.ts::syncBrowserTz -->
6. The timezone-update endpoint is rate-limited per authenticated user per [REQ-AUTH-001](authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) AC 9a; an exhausted limit returns HTTP 429 with `Retry-After` and is non-fatal per AC 4 above. <!-- @impl: src/pages/api/auth/set-tz.ts::POST -->

**Constraints:** None

**Priority:** P2

**Dependencies:** [REQ-SET-003](#req-set-003-scheduled-digest-time-with-timezone)

**Verification:** Integration test

**Status:** Implemented

---

### REQ-SET-010: Manual timezone picker

**Intent:** Even when the silent auto-sync ([REQ-SET-007](#req-set-007-timezone-change-detection)) has been disabled by a prior explicit choice or has failed, the user can pick any valid IANA timezone from the settings page directly.

**Applies To:** User

**Acceptance Criteria:**
1. The settings page exposes a manual timezone picker that lets the user select any valid IANA zone explicitly. <!-- @impl: src/pages/api/auth/set-tz.ts::POST -->
2. The picker is pre-populated with the browser-detected zone, or with the stored zone when the browser's value is unavailable, so the most likely correct value is one click away even when the silent auto-sync has failed. <!-- @impl: src/pages/api/auth/set-tz.ts::POST -->
3. Saving the form persists the picked zone via the same timezone-update endpoint used by the silent auto-sync path. <!-- @impl: src/pages/api/auth/set-tz.ts::POST -->

**Notes:** Automated verification does not currently cite this REQ ID, so the shipped behavior stays Partial until a test is renamed or added to reference it.

**Constraints:** None

**Priority:** P2

**Dependencies:** [REQ-SET-007](#req-set-007-timezone-change-detection)

**Verification:** Integration test

**Status:** Partial
