# HackScope

HackScope turns almost any hackathon clue—a name, official page, Devpost listing, social announcement, sponsor document, or a list of pending events—into a researched competition strategy.

It does four jobs:

1. researches the organizers, products, rules, judging incentives, infrastructure, and relevant history;
2. prioritizes a list of hackathons by urgency, agent feasibility, team fit, win opportunity, and effort-to-return;
3. generates and ranks event-specific ideas, then defends one recommendation;
4. exports a portable project dossier with the skill map, workflow, cut line, risks, and kickoff prompt.

## Run locally

HackScope has no package dependencies. Use Node.js 16 or newer:

```bash
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

Without an API key, HackScope keeps the research action disabled and explains how to enable it. It does not generate template dossiers or present guessed ideas, infrastructure, deadlines, or scores as analysis.

## Enable free live web research

Create a local `.env` file beside `server.mjs` (you can copy `.env.example`) and add:

```dotenv
GEMINI_API_KEY=your-key-here
```

The repository ignores `.env` and `.env.*`, while keeping `.env.example` as a safe template. A value already set in the shell takes precedence over the file. Never put the key in browser code or commit the real `.env` file.

Alternatively, set the key for the current PowerShell session:

```powershell
$env:GEMINI_API_KEY="your-key"
npm run dev
```

The default model is `gemini-3.6-flash`. Gemini generation uses the provider's free tier. Because Google Search grounding is not available to this free API tier, local development uses Bing's public RSS output for discovery, reads a limited set of linked pages, and sends that evidence to Gemini for schema-constrained synthesis. Bing's RSS terms limit this fallback to personal, non-commercial use; configure a dedicated search API before deploying HackScope as a public or commercial service.

Override the Gemini model if needed:

```powershell
$env:GEMINI_MODEL="gemini-3.6-flash"
```

Identical research inputs are cached under `.cache/` for 24 hours, so reopening or repeating the same query does not call Gemini again. Set `RESEARCH_CACHE_TTL_HOURS` to change that window.

OpenAI remains an optional paid fallback when no Gemini key is present:

```dotenv
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-5.5
```

The server includes consulted source URLs, requests a JSON Schema response, and reports failures without substituting fabricated preview data.

Priority and idea totals are deterministic: the model supplies the researched component scores, then the server calculates the weighted hackathon priority score and the mean idea score before returning the dossier.

## Agent-feasibility model

The score asks whether coding agents can meaningfully perform the work, not whether a hackathon idea is theoretically possible. It considers:

- software vs. physical work;
- access to APIs, accounts, credentials, and data;
- whether results can be verified with tests or a visible browser flow;
- required interviews, recruitment, approvals, travel, or other human coordination;
- regulated or high-consequence judgment.

The dossier separates work agents can execute from actions requiring a person, such as registration, accepting terms, creating credentials, user interviews, or the final submission.

## Portable skill

The reusable Codex skill is in [`portable-skill/hackathon-strategist`](portable-skill/hackathon-strategist). Copy that entire folder into another project’s `.codex/skills/` directory, or into your personal Codex skills directory, to reuse the research and decision workflow.

The skill includes:

- a compact research and handoff workflow;
- evidence rules that separate verified facts, inferences, patterns, and unknowns;
- a decision framework for event priority, agent feasibility, and idea scoring.

## Project map

- `index.html` — application and dossier structure
- `styles.css` — responsive visual system
- `app.js` — research-state handling, dossier rendering, queue comparison, saving, and export
- `server.mjs` — static server and live research API route
- `portable-skill/hackathon-strategist/` — reusable Codex skill
