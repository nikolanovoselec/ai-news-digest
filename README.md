# news-digest

A personalized daily tech news digest. Sign in with GitHub, pick your interests as hashtags, and get an AI-curated digest at the time you choose. No feeds to manage — hashtags drive discovery.

## Documentation

| Document | Purpose |
|---|---|
| [Product Specification](sdd/README.md) | Requirements, acceptance criteria, design intent |
| [Documentation Index](documentation/README.md) | Architecture, API, configuration, deployment |
| [Architecture Decisions](documentation/decisions/README.md) | Trade-offs and rationale |

## Quick Start

```bash
npm install
npx wrangler d1 migrations apply DB --local
npm run dev
```

The dev server runs at `http://localhost:4321`.

## Project Structure

```
sdd/             # Product specification (single source of truth)
documentation/   # Implementation docs (architecture, API, config, deployment)
src/             # Source code (created during implementation)
tests/           # Tests (each test references a REQ ID)
migrations/      # D1 schema migrations
pending.md       # In-flight work and known gaps
requirements.md  # Historical product brief that seeded the spec (reference only)
```

## License

MIT
