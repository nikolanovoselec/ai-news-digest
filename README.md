# News Digest

Tech news for people who would rather read ten good summaries than three thousand unread RSS items.

**Live:** <https://news.graymatter.ch> · GitHub sign-in · pick your hashtags · wait for the next tick · done.

<p align="center">
  <img alt="Mobile dashboard"  src="docs/screenshots/dashboard-mobile.jpg"  height="260">
  <img alt="Desktop dashboard" src="docs/screenshots/dashboard-desktop.png" height="260">
  <img alt="Article detail"    src="docs/screenshots/article-detail.png"    height="260">
</p>

Every hour, ~50 curated sources get scraped, ~500 candidates get fed into GPT-OSS-120B running on [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/), and the output lands in a shared pool. Your dashboard is a filter over that pool. The rest expires in seven days. Your inbox is left alone.

## Features you will show your friends

- **One LLM run, every user benefits.** GPT-OSS-120B summarises the whole global pool once per hour. Each scrape costs roughly $0.07 — less than the coffee you were going to drink while ignoring Hacker News anyway.
- **Tag-driven filtering everywhere.** Type `#cloudflare`, hit enter, it's persisted. Click the chip to filter. Same component on the dashboard and Search & History. No settings form, no onboarding wizard, no "check your email for the confirmation link".
- **Composable filters.** Tag + search + date all AND together. *"cloudflare articles from this week that mention london"* is three taps and lives in the URL, so browser Back restores the exact view.
- **Multi-source dedupe.** Hacker News, the vendor blog, and three aggregators all "discovered" the same announcement at 9am. You get one card with a `(+3)` chip. Click the chip, pick your outlet.
- **Summaries that earn their word count.** 150–250 words per article, 2–3 paragraphs, structured as *what happened → how it works → why you care*. No "the article explores" filler. No "in today's rapidly evolving landscape" preamble. Just the facts and the angle.
- **Defends itself from LLM hallucinations.** Every output article must echo its input candidate's index **and** share a meaningful word with the candidate title. A reordered or fabricated summary gets dropped before it can staple itself onto the wrong URL. You will never see a SageMaker story under a Cloudflare headline. (Ask how we learned this lesson.)
- **Starred articles outlive the cron.** Retention cleanup drops anything older than seven days — unless a user starred it. Your saved pile is forever; your unread pile is a lie you're no longer telling yourself.
- **Real newspaper drop-cap.** The article detail page uses CSS `initial-letter: 2` so the lead paragraph's first letter aligns to line 1's cap-top and line 2's baseline. For Firefox (which still doesn't support the property in 2026 — we checked) there's a tuned float fallback.
- **Back-button that returns to where you were.** Opened an article from a tag filter? Back takes you back to that tag filter, not the dashboard. Opened it from Starred? Back takes you to Starred. The `document.referrer` check + `history.back()` works everywhere except on direct links, where it cleanly falls through to `/digest`.
- **One Worker. No servers. No Docker. No Nginx that decides it wants to die at 3am.** D1 for the pool, KV for discovery, Queues for the pipeline, Workers AI for inference. Deploys in 30 seconds. Rolls back in 10.
- **PWA-installable, dark mode out of the box, offline banner when the network drops, zero ads, zero cookie banners, zero newsletter pop-ups.** This is a list of things the internet convinced us to accept as inevitable. They are not inevitable.

## Why it exists

Tech news in 2026 has four shapes, all broken:

- **Newsletters** — someone else's interests, someone else's schedule, someone else's Monday-morning anxiety delivered on their clock.
- **RSS readers** — 3,218 unread items side-eyeing you from the sidebar. Each one is a tiny "I told you so".
- **Social feeds** — outrage optimised for engagement, which is not the same thing as information.
- **Asking an LLM** — requires remembering to ask. If remembering were the user's strong suit, none of this would be a problem.

News Digest hires the LLM instead. Once an hour. On its own clock.

## Built with Codeflare SDD

This repo is a test drive of [Codeflare](https://codeflare.ch)'s spec-driven development framework. Every feature travels through the same loop:

1. **Spec first.** A REQ with Intent + Acceptance Criteria lands in `sdd/{domain}.md` before any code touches `src/`.
2. **Failing test.** `tests/{domain}/*.test.ts` names the REQ ID and asserts the AC.
3. **Minimal code.** Source files carry `// Implements REQ-X-NNN` so `spec-reviewer` can grep code against spec.
4. **Review agents on every push.** `code-reviewer`, `spec-reviewer`, `doc-updater` run in the background. Findings auto-commit in `unleashed` mode.
5. **Auto-deploy on green.** PR Checks + CodeQL + Scorecard gate every commit. Deploy fires on a green `main`.

40+ REQs across 10 domains, `enforce_tdd: true`, nothing hand-waved. [Spec](sdd/README.md) · [Architecture](documentation/architecture.md) · [Changelog](sdd/changes.md)

## Stack

| Layer | Choice |
|---|---|
| Framework | [Astro 5](https://astro.build) on [Cloudflare Workers](https://workers.cloudflare.com) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) |
| Cache | [Cloudflare KV](https://developers.cloudflare.com/kv/) |
| Job queues | [Cloudflare Queues](https://developers.cloudflare.com/queues/) |
| LLM | [Workers AI](https://developers.cloudflare.com/workers-ai/) — `gpt-oss-120b` primary, `gpt-oss-20b` fallback |
| Email | [Resend](https://resend.com) |
| Auth | GitHub OAuth + HMAC-SHA256 JWT |

## Local development

```bash
npm install
npx wrangler d1 migrations apply DB --local
npm run dev
```

Dev server at <http://localhost:4321>. Copy `.dev.vars.example` to `.dev.vars`, drop in a GitHub OAuth App client ID + secret and a random `OAUTH_JWT_SECRET` (≥32 bytes).

## License

MIT.
