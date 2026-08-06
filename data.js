/* ------------------------------------------------------------------
   Scenario 41 — synthetic pilot world.
   20 B2B accounts x 52 weeks = 1,040 weekly observations, ~$1.55M spend,
   ~70% organic baseline. Data is fully synthetic, so the TRUE answer is
   known and hidden from the model.
   Account names are illustrative only.
   ------------------------------------------------------------------ */

const SCENARIO = {
  name: "Scenario 41",
  accounts: 20,
  weeks: 52,
  observations: 1040,
  totalSpend: 1550000,
  organicShare: 0.70,
  seed: 42,
  draws: 4000,
  chains: 4,
};

const CHANNELS = ["LinkedIn Ads", "Search", "Display"];

const CURRENT_SPEND = {
  "LinkedIn Ads": 511500,
  "Search": 511500,
  "Display": 527000,
};

const CURRENT_SHARE = {
  "LinkedIn Ads": 0.33,
  "Search": 0.33,
  "Display": 0.34,
};

/* The planted answer key — the model never sees this. */
const ANSWER_KEY = {
  "LinkedIn Ads": { roi: 4.2, rank: 1, note: "best" },
  "Search":       { roi: 3.7, rank: 2, note: "middle" },
  "Display":      { roi: 1.8, rank: 3, note: "weakest" },
};

/* ------------------------------------------------------------------
   Four outcome types. Same posterior, same engine — different scoreboard.
   ------------------------------------------------------------------ */

const OUTCOMES = {
  qualified_leads: {
    id: "qualified_leads",
    label: "Qualified Leads",
    short: "Leads",
    question: "How many good raised hands did we get?",
    plain: "Someone filled in a form or asked for a conversation.",
    unit: "count",
    unitLabel: "leads",
    likelihood: "NegativeBinomial",
    likelihoodWhy:
      "Leads are whole numbers that clump — some weeks nothing, some weeks a burst. A negative binomial handles counts that are more spread out than a simple Poisson would allow.",
    speed: "Fast, noisy",
    speedNote: "You see this within days. It moves quickly — but leads aren't money.",
    metric: "cost_per_outcome_usd",
    metricLabel: "Cost per lead",
    metricWhy:
      "Raw ROI here is 0.00000038 leads per dollar, which is meaningless to read. Inverting it gives cost per lead — and the interval flips with it, so the low end is the best efficiency.",
    verdict: "PASS",
    headline: "Shift ~36 pts from LinkedIn Ads to Search",
    headlineDollars: 558000,
    verb: "SHIFT",
    narrative:
      "Search generates far more raw leads per dollar than LinkedIn Ads. If leads are what you are steering by, money should move toward Search.",
    caution:
      "Note this points the opposite way from the revenue outcomes. Both are true — Search brings volume, LinkedIn brings bigger deals.",
    roi: [
      { channel: "Search",       point: 42.10, lo: 36.40, hi: 49.80, inverted: true },
      { channel: "LinkedIn Ads", point: 61.30, lo: 51.90, hi: 74.20, inverted: true },
      { channel: "Display",      point: 118.40, lo: 92.10, hi: 158.60, inverted: true },
    ],
    proposed: { "LinkedIn Ads": 0.15, "Search": 0.62, "Display": 0.23 },
    diagnostics: { rhat: 1.004, ess: 1820, divergences: 0, stability: 0.94 },
    curves: {
      "LinkedIn Ads": [0.30, 0.55, 0.76, 0.90, 1.00, 1.07, 1.11, 1.14],
      "Search":       [0.26, 0.50, 0.72, 0.89, 1.00, 1.14, 1.25, 1.33],
      "Display":      [0.42, 0.68, 0.86, 0.95, 1.00, 1.02, 1.03, 1.04],
    },
  },

  pipeline_usd: {
    id: "pipeline_usd",
    label: "Pipeline Revenue",
    short: "Pipeline",
    question: "How much potential revenue did we create?",
    plain: "Deals that opened and have a dollar value attached — not yet won.",
    unit: "usd",
    unitLabel: "USD",
    likelihood: "LogNormal",
    likelihoodWhy:
      "Deal sizes are continuous and heavily right-skewed — most are modest, a few are enormous. A log-normal fits that shape; a normal distribution would allow negative revenue.",
    speed: "Medium",
    speedNote: "Weeks to months. The usual compromise between fast and real.",
    metric: "expected_roi",
    metricLabel: "Return multiple",
    metricWhy: "Dollars in, dollars out — a straight multiple is readable as-is.",
    verdict: "INCONCLUSIVE",
    headline: "No recommendation emitted",
    headlineDollars: null,
    verb: "REFUSED",
    narrative:
      "The channel ranking did not survive perturbation. Nudge the inputs slightly and the top three reorder — which means the ranking was never real. No allocation was produced.",
    caution:
      "This is the system working, not failing. A tool that always returns a confident number gives you no way to tell knowing from guessing.",
    roi: [
      { channel: "LinkedIn Ads", point: 4.81, lo: 2.10, hi: 9.44 },
      { channel: "Search",       point: 3.02, lo: 1.44, hi: 7.91 },
      { channel: "Display",      point: 2.04, lo: 0.62, hi: 6.88 },
    ],
    proposed: null,
    diagnostics: { rhat: 1.009, ess: 412, divergences: 0, stability: 0.41 },
    curves: {
      "LinkedIn Ads": [0.28, 0.53, 0.75, 0.90, 1.00, 1.09, 1.15, 1.19],
      "Search":       [0.31, 0.57, 0.78, 0.91, 1.00, 1.06, 1.10, 1.12],
      "Display":      [0.45, 0.71, 0.88, 0.96, 1.00, 1.01, 1.02, 1.02],
    },
  },

  stage_transition_events: {
    id: "stage_transition_events",
    label: "Stage Transitions",
    short: "Funnel movement",
    question: "How many deals moved forward a step?",
    plain: "A deal changed CRM stage — discovery to demo, demo to proposal.",
    unit: "count",
    unitLabel: "transitions",
    likelihood: "NegativeBinomial",
    likelihoodWhy:
      "Same shape as leads — whole numbers, bursty. Deals move in clusters, often at quarter end.",
    speed: "Medium",
    speedNote: "An early-warning metric. Movement stalls before revenue does.",
    metric: "cost_per_outcome_usd",
    metricLabel: "Cost per transition",
    metricWhy:
      "Raw ROI here is transitions per dollar — about 0.0012, which nobody can read. Inverting gives cost per transition, and the interval flips with it, so the low end is the best efficiency.",
    verdict: "PASS",
    headline: "Move ~$236K out of Display, mostly into LinkedIn Ads",
    headlineDollars: 236000,
    verb: "SHIFT",
    narrative:
      "LinkedIn Ads moves deals forward at $827 per transition against Display's $2,273. Display is the clear payer here, and the money it frees up mostly goes to LinkedIn.",
    caution:
      "This counts moves, not money. A step toward closed-won and a step toward closed-lost both count as one — which is exactly why per-stage value exists alongside it.",
    roi: [
      { channel: "LinkedIn Ads", point: 827.05,  lo: 396.2, hi: 3755.6,  inverted: true },
      { channel: "Search",       point: 1214.24, lo: 423.5, hi: 6739.1,  inverted: true },
      { channel: "Display",      point: 2272.53, lo: 699.6, hi: 10958.9, inverted: true },
    ],
    proposed: { "LinkedIn Ads": 0.471264, "Search": 0.339323, "Display": 0.189413 },
    diagnostics: { rhat: 1.006, ess: 1140, divergences: 0, stability: 1.00 },
    curves: {
      "LinkedIn Ads": [0.25, 0.50, 0.73, 0.89, 1.00, 1.11, 1.19, 1.24],
      "Search":       [0.33, 0.59, 0.80, 0.92, 1.00, 1.05, 1.08, 1.10],
      "Display":      [0.61, 0.82, 0.94, 0.98, 1.00, 1.00, 1.01, 1.01],
    },
    blindSpot:
      "Summing the transition tensor over both stage axes discards direction and value. An account that moved opportunity \u2192 closed_won and one that moved opportunity \u2192 closed_lost each contribute exactly 1.",
  },

  closed_won_usd: {
    id: "closed_won_usd",
    label: "Closed-Won Revenue",
    short: "Revenue",
    question: "How much money actually landed?",
    plain: "Signed, invoiced, real. The only outcome finance recognises.",
    unit: "usd",
    unitLabel: "USD",
    likelihood: "LogNormal",
    likelihoodWhy:
      "Same as pipeline — continuous, right-skewed, strictly positive. This is where the 44x spread between a typical deal and the largest one bites hardest.",
    speed: "Slow (60-90d), real",
    speedNote:
      "The truest metric and the least usable for steering — by the time it moves, the quarter is over. That is why the layer speaks all four.",
    metric: "expected_roi",
    metricLabel: "Return multiple",
    metricWhy: "Dollars in, dollars out.",
    verdict: "PASS",
    headline: "Shift $520K from Display to LinkedIn Ads",
    headlineDollars: 520000,
    verb: "SHIFT",
    narrative:
      "LinkedIn Ads returns roughly 4.8x on revenue that actually closed, against 2.0x for Display. Same total budget — this is a better split, not a request for more money.",
    caution:
      "The recommendation stays inside the observed spend range. Anything past that is labelled extrapolation, not evidence.",
    roi: [
      { channel: "LinkedIn Ads", point: 4.83, lo: 3.91, hi: 5.94 },
      { channel: "Search",       point: 3.04, lo: 2.44, hi: 3.81 },
      { channel: "Display",      point: 1.97, lo: 1.42, hi: 2.71 },
    ],
    proposed: { "LinkedIn Ads": 0.49, "Search": 0.30, "Display": 0.22 },
    diagnostics: { rhat: 1.003, ess: 2140, divergences: 0, stability: 0.91 },
    curves: {
      "LinkedIn Ads": [0.27, 0.52, 0.74, 0.89, 1.00, 1.10, 1.17, 1.21],
      "Search":       [0.30, 0.56, 0.78, 0.91, 1.00, 1.07, 1.11, 1.14],
      "Display":      [0.48, 0.73, 0.89, 0.96, 1.00, 1.02, 1.03, 1.03],
    },
  },
};

const OUTCOME_ORDER = [
  "qualified_leads",
  "pipeline_usd",
  "stage_transition_events",
  "closed_won_usd",
];

const SPEND_MULTIPLIERS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

/* Per-segment ROI, closed-won. Illustrates the three grains. */
const SEGMENTS = [
  { name: "Enterprise",  spend: 682000, roi: 6.12, lo: 4.90, hi: 7.61 },
  { name: "Mid-Market",  spend: 511500, roi: 4.21, lo: 3.36, hi: 5.28 },
  { name: "SMB",         spend: 356500, roi: 2.08, lo: 1.51, hi: 2.86 },
];

/* Per-account ROI, closed-won. Illustrative names, synthetic data. */
const ACCOUNTS = [
  { name: "Acme Corp",       segment: "Enterprise", spend: 214000, roi: 6.19, lo: 4.88, hi: 7.82 },
  { name: "Globex",          segment: "Enterprise", spend: 186000, roi: 4.30, lo: 3.41, hi: 5.44 },
  { name: "Initech",         segment: "Mid-Market", spend: 142000, roi: 5.02, lo: 3.90, hi: 6.48 },
  { name: "Stark Industries",segment: "Enterprise", spend: 138000, roi: 3.88, lo: 2.97, hi: 5.09 },
  { name: "Umbrella Co",     segment: "Mid-Market", spend: 121000, roi: 3.41, lo: 2.62, hi: 4.44 },
  { name: "Soylent",         segment: "SMB",        spend:  96000, roi: 2.44, lo: 1.72, hi: 3.47 },
  { name: "Hooli",           segment: "Mid-Market", spend:  88000, roi: 2.11, lo: 1.48, hi: 3.02 },
  { name: "Vandelay",        segment: "SMB",        spend:  61000, roi: 1.62, lo: 1.03, hi: 2.55 },
];

/* ==================================================================
   EGRESS — everything the insights layer actually emits.
   Structures below mirror the real code:
     export/excel.py       -> workbook tabs + table schemas
     export/charts.py      -> the 8 Report-tab chart tiles + captions
     analyze/analyzer.py   -> confidence deduction ladder
     api/to_json.py        -> canonical JSON top-level keys
   ================================================================== */

/* ---- Canonical JSON contract: the 10 top-level keys ---------------- */
const EGRESS_KEYS = [
  { key: "schema_version",    type: "semver string", note: "Contract version. Consumers check compatibility before reading." },
  { key: "outcome_type",      type: "string",        note: "Which of the four scoreboards this payload describes." },
  { key: "time_grain",        type: "string",        note: "Daily or weekly — the grain the model was fit at." },
  { key: "roi",               type: "list",          note: "Per channel: expected_roi and a 90% credible interval." },
  { key: "budget_mix",        type: "object",        note: "Current vs recommended shares and dollars, confidence, tiers." },
  { key: "response_curves",   type: "list",          note: "Per channel: outcome at each spend multiple, with intervals." },
  { key: "reconciliation",    type: "list",          note: "Model ROI against any real lift test, per channel." },
  { key: "stability",         type: "list",          note: "Rank preservation under perturbation, per channel." },
  { key: "methodology_refs",  type: "list",          note: "Provenance labels for the methods behind each number." },
  { key: "warnings",          type: "list",          note: "Level, code, message. Empty is a valid, meaningful answer." },
];

/* ---- Excel workbook: 3 tabs ---------------------------------------- */
const WORKBOOK_TABS = [
  { name: "Report",     state: "visible", note: "Opens here. KPI cards, eight charts in four sections, a warning strip." },
  { name: "Results",    state: "visible", note: "Ten numeric tables. Every figure behind the charts, unrounded." },
  { name: "ReportData", state: "hidden",  note: "Backs the chart series. Hidden so nobody edits it by accident." },
];

/* ---- The 10 tables on the Results tab, with real column headers ----- */
const RESULT_TABLES = [
  { name: "Metadata", why: "What contract version produced this, and for which outcome.",
    cols: ["schema_version", "outcome_type", "time_grain"] },
  { name: "ROI", why: "The headline return per channel, with its uncertainty.",
    cols: ["channel", "expected_roi", "ci_lower", "ci_upper"] },
  { name: "Budget Summary", why: "The optimizer's answer plus its own confidence self-report.",
    cols: ["confidence_level", "confidence_score", "confidence_reasons", "expected_pipeline",
           "expected_pipeline_ci_lower", "expected_pipeline_ci_upper", "resolved_total_budget",
           "resolved_multiplier", "training_spend_usd", "in_modeled_range",
           "modeled_budget_min", "modeled_budget_max"] },
  { name: "Budget by Channel", why: "The actual reallocation call, in shares and dollars.",
    cols: ["channel", "current_share", "recommended_share", "delta_share",
           "current_spend_usd", "recommended_spend_usd", "channel_multiplier"] },
  { name: "Budget Tiers", why: "The same optimization at several total budgets — what if the pot grows or shrinks.",
    cols: ["tier", "resolved_multiplier", "resolved_total_budget", "expected_pipeline",
           "expected_pipeline_ci_lower", "expected_pipeline_ci_upper", "training_spend_usd",
           "modeled_budget_min", "modeled_budget_max", "in_modeled_range", "confidence_level",
           "confidence_score", "confidence_reasons", "channel", "current_share",
           "recommended_share", "delta_share", "current_spend_usd", "recommended_spend_usd",
           "channel_multiplier"] },
  { name: "Response Curves", why: "Every point on every curve, so the shape can be re-plotted anywhere.",
    cols: ["channel", "outcome_unit", "spend_multiplier", "absolute_spend_usd",
           "expected_outcome", "ci_lower", "ci_upper"] },
  { name: "Reconciliation", why: "Where a real experiment exists, does the model agree with it.",
    cols: ["channel", "lift_test_observed_roi", "model_fitted_roi", "status"] },
  { name: "Stability", why: "Does the ranking survive a nudge to the inputs.",
    cols: ["channel", "baseline_rank", "median_rank", "top3_preservation_rate",
           "top3_preserved", "n_perturbations", "stability_status"] },
  { name: "Methodology References", why: "Provenance. Which method produced which number.",
    cols: ["index", "reference"] },
  { name: "Warnings", why: "Anything the run wants you to know before you act on it.",
    cols: ["level", "code", "message"] },
];

const EXCEL_FORMATS = [
  { fmt: '$#,##0',    applies: "Money columns", example: "$511,500" },
  { fmt: '0.0%',      applies: "Share columns", example: "33.0%" },
  { fmt: '0.00"x"',   applies: "Multiples",     example: "4.83x" },
];

/* ---- Report tab: 8 chart tiles in 4 section groups ------------------
   Titles and captions are the real strings from export/charts.py.      */
const CHART_TILES = [
  { id: "roi_ci", group: "Return & efficiency", label: "ROI + CI",
    title: "ROI by channel (90% credible interval)",
    caption: "Incremental outcome per dollar; whiskers are the 90% credible interval. Taller bars pay back more — wider whiskers mean the estimate is less certain.",
    kind: "bar-ci" },
  { id: "cpik", group: "Return & efficiency", label: "CPIK + CI",
    title: "Cost per incremental outcome",
    caption: "CPIK = 1 / ROI, the price of one more unit of outcome. Lower is cheaper; whiskers show the credible range.",
    kind: "bar-ci-inv" },
  { id: "roi_mroi", group: "Saturation & contribution", label: "ROI vs mROI",
    title: "Average vs marginal ROI",
    caption: "Average ROI against the return on the next dollar (mROI). Where mROI sits well below ROI the channel is saturating.",
    kind: "bar-pair" },
  { id: "spend_contrib", group: "Saturation & contribution", label: "Spend vs Contribution",
    title: "Spend vs contribution",
    caption: "Each channel's cost against the outcome it drives. Contribution outpacing spend flags a channel that looks underfunded.",
    kind: "bar-pair-share" },
  { id: "contrib_pie", group: "Saturation & contribution", label: "Contribution Share",
    title: "Contribution share",
    caption: "Each channel's share of the modeled media-driven outcome (baseline excluded) — where results concentrate today.",
    kind: "pie" },
  { id: "curves", group: "Response curves & saturation", label: "Response Curves",
    title: "Response curves",
    caption: "Outcome vs spend per channel; the diamond marks where you sit now. Steep stretches still have room to grow, flat stretches are saturated.",
    kind: "lines" },
  { id: "curve_ci", group: "Response curves & saturation", label: "Response Curve CI",
    title: "Response curve with 90% credible interval",
    caption: "The highest-spend channel's curve with its dashed credible band. A wide band means the shape past today's spend is uncertain — scale with care.",
    kind: "line-band" },
  { id: "cur_rec", group: "Budget allocation", label: "Current vs Recommended",
    title: "Current vs recommended spend by channel",
    caption: "The optimizer's reallocation call: bars rising to recommended should grow, bars falling should be trimmed.",
    kind: "bar-pair-usd" },
];

const CHART_GROUP_ORDER = [
  "Return & efficiency",
  "Saturation & contribution",
  "Response curves & saturation",
  "Budget allocation",
];

/* ---- Marginal ROI + contribution, closed-won ------------------------
   mROI is the slope of the response curve at today's spend; ROI is the
   average over all spend so far. The gap is the saturation story.      */
const MARGINAL = [
  { channel: "LinkedIn Ads", roi: 4.83, mroi: 3.10, contribution: 0.47, spendShare: 0.330 },
  { channel: "Search",       roi: 3.04, mroi: 2.55, contribution: 0.31, spendShare: 0.330 },
  { channel: "Display",      roi: 1.97, mroi: 0.62, contribution: 0.22, spendShare: 0.340 },
];

/* ---- Budget tiers: same optimizer, different total pot -------------- */
const BUDGET_TIERS = [
  { tier: 1, multiplier: 0.75, total: 1162500, pipeline: 4980000, lo: 3910000, hi: 6310000,
    inRange: true,  confidence: "high",   score: 0.90, shares: { "LinkedIn Ads": 0.52, "Search": 0.31, "Display": 0.17 } },
  { tier: 2, multiplier: 1.00, total: 1550000, pipeline: 6240000, lo: 4880000, hi: 7960000,
    inRange: true,  confidence: "high",   score: 0.90, shares: { "LinkedIn Ads": 0.49, "Search": 0.30, "Display": 0.21 } },
  { tier: 3, multiplier: 1.25, total: 1937500, pipeline: 7180000, lo: 5490000, hi: 9370000,
    inRange: true,  confidence: "medium", score: 0.70, shares: { "LinkedIn Ads": 0.46, "Search": 0.31, "Display": 0.23 } },
  { tier: 4, multiplier: 1.50, total: 2325000, pipeline: 7840000, lo: 5720000, hi: 10650000,
    inRange: false, confidence: "medium", score: 0.55, shares: { "LinkedIn Ads": 0.44, "Search": 0.32, "Display": 0.24 } },
];

/* ---- Confidence: a deduction ladder, not a vibe --------------------- */
const CONFIDENCE_LADDER = [
  { code: "FALLBACK_USED",                penalty: 0.35, meaning: "The posterior fell back to a simpler fit than requested." },
  { code: "SOLVER_NONCONVERGED",          penalty: 0.30, meaning: "The optimizer never settled on a stable split." },
  { code: "RECONCILIATION_CONFLICT",      penalty: 0.25, meaning: "A real lift test disagrees with the model outright." },
  { code: "STABILITY_SENSITIVE",          penalty: 0.20, meaning: "The ranking shifts when the inputs are nudged." },
  { code: "RUNTIME_BUDGET_EXCEEDED",      penalty: 0.20, meaning: "The optimizer ran out of time before finishing cleanly." },
  { code: "RECONCILIATION_TENSION",       penalty: 0.15, meaning: "Model and lift test are in the same direction but not close." },
  { code: "BUDGET_OUT_OF_RANGE",          penalty: 0.15, meaning: "The requested budget sits outside the spend range ever observed." },
  { code: "RECONCILIATION_NOT_CALIBRATED",penalty: 0.10, meaning: "No lift test exists for this channel, so nothing checks it." },
  { code: "GUARDRAIL_CAP_HIT",            penalty: 0.10, meaning: "A channel pinned against a planner-set floor or ceiling. Per cap." },
];

const CONFIDENCE_BANDS = [
  { level: "high",   min: 0.75, note: "Ship it." },
  { level: "medium", min: 0.45, note: "Usable, but read the reasons first." },
  { level: "low",    min: 0.00, note: "Treat as directional only." },
];

/* ---- Reconciliation vocabulary -------------------------------------- */
const RECON_STATUSES = [
  { status: "AGREE",          tone: "pass",  meaning: "The model's ROI lands inside the lift test's interval. Independent confirmation." },
  { status: "TENSION",        tone: "warn",  meaning: "Same direction, but the two don't overlap comfortably. Worth a look." },
  { status: "CONFLICT",       tone: "fail",  meaning: "The model and the experiment disagree. The experiment wins — and confidence drops." },
  { status: "NOT_CALIBRATED", tone: "muted", meaning: "No lift test was ever run on this channel. Nothing external is checking it." },
];

const RECONCILIATION = [
  { channel: "LinkedIn Ads", lift: 4.40, model: 4.83, status: "AGREE" },
  { channel: "Search",       lift: null, model: 3.04, status: "NOT_CALIBRATED" },
  { channel: "Display",      lift: 2.90, model: 1.97, status: "TENSION" },
];

/* ---- Warnings emitted by this run ----------------------------------- */
const RUN_WARNINGS = [
  { level: "info", code: "RECONCILIATION_NOT_CALIBRATED", message: "No lift test available for channel 'Search'." },
  { level: "warn", code: "RECONCILIATION_TENSION",        message: "Display: model ROI 1.97x vs lift-observed 2.90x." },
];

const METHODOLOGY_REFS = [
  "Counterfactual ROI: posterior replay with channel spend zeroed, differenced against observed.",
  "Adstock: geometric decay, Beta prior on the retention rate.",
  "Saturation: Hill curve, per channel.",
  "Partial pooling: three-level hierarchy over global, segment, account.",
  "Budget optimization: constrained on shares summing to one, within planner floors and ceilings.",
  "Stability: rank preservation across perturbed refits.",
];

/* ==================================================================
   PER-STAGE VALUE — analyze/funnel.py

   Why it exists: the count outcome (stage_transition_events) sums the
   transition tensor over both stage axes, so it throws away DIRECTION
   and VALUE. A move to closed_won and a move to closed_lost both count
   as exactly 1. Stage value closes that blind spot: each stage becomes
   its own monetary outcome (stage_value_usd__<stage>), so every channel
   is scored at every stage rather than through one blended number.

   An Analyzer wraps exactly one posterior, therefore one outcome_type,
   so nothing inside analyze/ could compare across stages. funnel.py
   COMPOSES analyzers rather than subclassing one — strictly additive,
   read-only over analyzer output.

   Status: open PR (sohdas/insights-funnel-per-stage-roi), not yet on
   master. The module and its tests exist; no run has been committed, so
   the per-stage figures below are ILLUSTRATIVE. They do satisfy the real
   invariants: levels are non-increasing down the funnel and every
   carry-through ratio lies in [0, 1].
   ================================================================== */

const STAGE_ORDER = ["lead", "qualified", "opportunity", "closed_won"];

const STAGE_LABEL = {
  lead: "Lead",
  qualified: "Qualified",
  opportunity: "Opportunity",
  closed_won: "Closed won",
};

/* Stages that exist but are not rungs on the ladder. */
const STAGE_EXCLUSIONS = [
  { stage: "closed_lost", kind: "Terminal", why: "An ending, not progress. Dropped silently — it is not a rung on the ladder." },
  { stage: "prospect",    kind: "Folded",   why: "The model folds it into the stage below rather than giving it dollars of its own, so no stage-value outcome is fit for it. Naming it lets the error say which stage you should have used instead of reporting a bare typo." },
];

/* Two rules that define a stage level. */
const STAGE_RULES = [
  { rule: "Credit-through (backfill)",
    body: "An account is credited at a stage once it gets that far, so a deal that jumps lead \u2192 closed_won still counts at qualified and opportunity. Skipped stages are credited because the deal demonstrably passed through that depth — dropping them would make a fast-moving deal look like it never qualified." },
  { rule: "Actual dollars, unweighted",
    body: "The deal's own amount is recorded at each stage it reached, with no probability weighting. A $100K deal sitting at opportunity contributes $100K to the opportunity level, not $100K times some win rate." },
];

/* Dollars each channel drove to each stage.
   contribution_usd = expected_roi x actual_spend_usd  (funnel.stage_levels) */
const STAGE_LEVELS = {
  "LinkedIn Ads": { lead: 3900000, qualified: 2340000, opportunity: 1280000, closed_won: 620000 },
  "Search":       { lead: 3100000, qualified: 2050000, opportunity: 1190000, closed_won: 640000 },
  "Display":      { lead: 2600000, qualified: 1180000, opportunity:  520000, closed_won: 180000 },
};

/* Per-stage, per-channel ROI — funnel.funnel_roi, long format.
   Same ROI contract as egress, repeated once per stage with a leading `stage`. */
const FUNNEL_ROI = {
  "LinkedIn Ads": {
    lead:        { roi: 7.57, mroi: 2.42, lo: 6.10, hi: 9.32 },
    qualified:   { roi: 4.54, mroi: 1.49, lo: 3.55, hi: 5.79 },
    opportunity: { roi: 2.48, mroi: 0.81, lo: 1.88, hi: 3.24 },
    closed_won:  { roi: 1.20, mroi: 0.38, lo: 0.86, hi: 1.65 },
  },
  "Search": {
    lead:        { roi: 6.10, mroi: 2.05, lo: 4.88, hi: 7.55 },
    qualified:   { roi: 4.04, mroi: 1.37, lo: 3.19, hi: 5.10 },
    opportunity: { roi: 2.34, mroi: 0.79, lo: 1.79, hi: 3.03 },
    closed_won:  { roi: 1.26, mroi: 0.44, lo: 0.93, hi: 1.70 },
  },
  "Display": {
    lead:        { roi: 4.90, mroi: 1.18, lo: 3.62, hi: 6.59 },
    qualified:   { roi: 2.23, mroi: 0.54, lo: 1.60, hi: 3.09 },
    opportunity: { roi: 0.98, mroi: 0.24, lo: 0.66, hi: 1.42 },
    closed_won:  { roi: 0.34, mroi: 0.08, lo: 0.21, hi: 0.53 },
  },
};

/* Spend base used for the per-stage figures — the real Scenario 41 spend.
   funnel.channel_spend refuses to share one stage's spend across analyzers
   that disagree on it: every analyzer must be fit on the same spend tensor. */
const FUNNEL_SPEND = {
  "LinkedIn Ads": 515274,
  "Search": 507811,
  "Display": 530159,
};

/* funnel.rank_reversals — ranked on marginal_roi, because marginal is what
   drives reallocation. `credible` is true only when the swapped pair
   separates at BOTH ends. */
const RANK_REVERSALS = [
  { channel: "LinkedIn Ads", rankTop: 1, rankBottom: 2, rankDelta: -1,
    crossedWith: "Search", ciOverlapTop: false, ciOverlapBottom: false, credible: true },
  { channel: "Search", rankTop: 2, rankBottom: 1, rankDelta: 1,
    crossedWith: "LinkedIn Ads", ciOverlapTop: false, ciOverlapBottom: false, credible: true },
];

const REVERSAL_COLUMNS = [
  "rank_top", "rank_bottom", "rank_delta", "crossed_with",
  "ci_overlap_top", "ci_overlap_bottom", "credible",
];

/* Velocity is deliberately absent — named here rather than left as a silent gap. */
const VELOCITY_GAP = {
  question: "How long did a deal sit in Proposal?",
  why: "fact_outcomes_daily carries neither a deal identifier nor a record of stage changes. A row states how many deals occupy a stage on a date — not which deals moved, or when.",
  supported: "Overall time-to-close and the between-stage conversion rates above are what this grain can support.",
  fix: "Adding velocity is a data-layer change — extra transition-timestamp fields, or daily snapshots retained over time. It is not something this module can compute from what it is given.",
};

/* ==================================================================
   POWER BI — src/b2bmodeler/dashboard/powerbi.py
   Four flat tables derived with the SAME helpers the Excel report uses
   (export/charts.py), so Power BI, Excel, and the notebook agree on
   every number.
   ================================================================== */

const PBI_TABLES = [
  { file: "channels.csv", grain: "one row per channel",
    carries: "ROI (+CI), CPIK (+CI), marginal ROI, budget shares and dollars, contribution, stability, reconciliation." },
  { file: "response_curves.csv", grain: "one row per (channel, spend point)",
    carries: "Everything the curve visuals bind to." },
  { file: "kpis.csv", grain: "one row per card",
    carries: "The executive-summary cards — label, value, note." },
  { file: "meta.csv", grain: "one row",
    carries: "Schema version, outcome type, time grain, subtitle, methodology references." },
];

const PBI_PATHS = [
  { fn: "save_powerbi", out: "Four CSVs",
    who: "Power BI Desktop connects to the folder via powerbi_connector.pq and you build visuals once against stable columns." },
  { fn: "save_powerbi_workbook", out: "One .xlsx, four sheets",
    who: "The macOS-friendly path — uploads directly to the Power BI service at app.powerbi.com. No Windows needed." },
  { fn: "save_powerbi_project", out: "A PBIP project",
    who: "A ready-to-open project — a copy of the committed template with these tables as its data. A Windows user opens it already built and saves a .pbix." },
  { fn: "save_powerbi_html", out: "Self-contained HTML",
    who: "A look-preview: KPI cards plus the eight tiles via Plotly, for eyeballing the report in a browser on any OS. Preview only — it does not refresh." },
];

/* The committed .pbir template's page-1 visuals. */
const PBI_VISUALS = [
  { id: "kpis",         shows: "Executive summary cards" },
  { id: "roi",          shows: "ROI by channel, with the credible interval" },
  { id: "cpik",         shows: "Cost per incremental outcome" },
  { id: "roimroi",      shows: "Average against marginal ROI" },
  { id: "spendcontrib", shows: "Spend against contribution" },
  { id: "share",        shows: "Contribution share" },
  { id: "curves",       shows: "Response curves" },
  { id: "curveci",      shows: "Response curve with its credible band" },
  { id: "currec",       shows: "Current against recommended spend" },
  { id: "trust",        shows: "Stability, reconciliation and the confidence verdict" },
];

const PBI_BANNER = [
  { tone: "green", label: "LIVE",   when: "The payload came from a real fit." },
  { tone: "amber", label: "SAMPLE", when: "The payload is committed sample data, so nobody mistakes a demo for a run." },
];
