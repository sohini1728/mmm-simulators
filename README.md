# Insights Layer — B2B Marketing Mix Modeling

An interactive walkthrough of how a Bayesian marketing mix model gets from a fitted
posterior to a budget recommendation — and when it should decline to make one.

Plain static HTML. No build step, no framework, no backend. Everything computes in
the browser.

## Structure

| File | What it is |
|---|---|
| `index.html` | The whole site — 21 pages in a single-page app |
| `app.js` | Rendering, navigation, and every interactive simulator |
| `data.js` | Scenario 41 pilot results and the funnel/stage tables |
| `style.css` | Theme |
| `assets/` | Generated deliverables |

## Contents

**How it works** — six steps, five of them interactive:

1. The core idea — turn a channel off, see what breaks
2. Trace one dollar — spend → adstock → saturation
3. Read the curve — where your data ends and guessing starts
4. Pick an outcome — one decision, four different answers
5. Split the budget — equalise what the next dollar returns
6. Decide if it ships — the three release gates

**Under the hood** — how the posterior is sampled, and the single JSON contract
every renderer reads from.

**The pilot result** — a synthetic $1.55M / three-channel scenario, including one
outcome where the system refuses to make a recommendation because the channel
ranking did not survive perturbation.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Static — point any host at the repo root with `index.html` as the entry point.
No build command, no output directory.
