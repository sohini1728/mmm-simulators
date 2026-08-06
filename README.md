# MMM Simulators

Five interactive explainers for how a marketing mix model reaches a budget
recommendation. Plain static HTML — no build step, no framework, no backend.
Everything computes in the browser.

| # | Page | The question it answers |
|---|---|---|
| 01 | `mmm_pipeline_simulator.html` | Why ROI is a difference, not a share |
| 02 | `response_curves_simulator.html` | Where your data ends and guessing starts |
| 03 | `outcome_types_simulator.html` | Why a count ROI can't be compared to a dollar ROI |
| 04 | `budget_mix_simulator.html` | Where the next dollar should go |
| 05 | `reconciliation_stability_simulator.html` | Whether the result should ship at all |

`index.html` is a landing page linking all five.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works.

## Deploy

Any static host. On Vercel: import the repo, framework preset **Other**, leave
build and output settings empty.

## Note

All parameters are illustrative and no real campaign data is included.
