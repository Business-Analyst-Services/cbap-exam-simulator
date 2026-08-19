# CBAP® Exam Simulator

A single-file, offline practice exam for the **CBAP®** certification, aligned to the
**BABOK® Guide v3** and weighted to the published exam blueprint. Sit the full 120-item paper under
timed conditions, run a coached study session over the knowledge areas you choose, or work the
50 BABOK techniques one at a time in the technique lab.

**▶ [Open it](https://business-analyst-services.github.io/cbap-exam-simulator/) —** no install, no sign-up, nothing leaves your browser.

---

## What it is

One self-contained HTML file, holding 120 scenario-based items across all six Knowledge Areas and
every task in scope. The first screen asks how you want to run it.

**Exam sitting** — all 120 items, blueprint-weighted, 3 hours 30 minutes on the clock, pausable,
auto-submitting at zero. Nothing is revealed until you submit. Closest to the real thing.

**Study session** — choose your knowledge areas and a length (10, 25, 50, or everything selected).
Each item is marked the moment you answer, with a verdict on all four options, the reasoning behind
the best answer, the BABOK v3 task it comes from and the trap it tests. The set is drawn in
blueprint proportion across the areas you picked, and both questions and options are shuffled, so
retaking a set is not a memory test. Untimed, with the clock counting up.

**Technique lab** — the 50 BABOK v3 techniques, in two halves. *Learn* gives you a card per
technique: what it is for, when to reach for it, the technique it is most often confused with, and
the tasks that use it — and, above all, **the artefact it produces, filled in**. A data dictionary
is shown as a populated dictionary; decision modelling as a real decision tree; SWOT as a completed
2×2 with the internal/external axis corrected. Financial Analysis goes further again, breaking into
eight worked concepts — one idea at a time, each with a short plain-English line, a data table and a
dashboard showing what the numbers do. *Drill* runs technique-filtered items with feedback after every question,
drawn from a dedicated technique bank plus every item in the main 120 that turns on a named
technique. Financial Analysis, Estimation, Risk and KPI items carry **data exhibits** — tables and
dashboards you work from rather than prose you recognise — and the summary scores you by technique
and by technique group.

All three modes end on the same diagnostic: score by Knowledge Area, task-level gaps and a
prioritised study plan; the technique lab adds a per-technique and per-group breakdown.

| | |
|---|---|
| **Items** | 120-item exam bank · 61-item technique bank · 133-item technique drill pool |
| **Coverage** | All 6 Knowledge Areas, all 30 tasks, all 50 techniques |
| **Modes** | Timed exam sitting · filtered study session · technique lab (learn + drill) |
| **Exhibits** | 11 items carry a data table or dashboard, 8 of them financial |
| **Storage** | None. No accounts, no cookies, no analytics, no network calls |

### Blueprint weighting

| Knowledge Area | Blueprint weight | Items |
|---|---:|---:|
| 3 · Business Analysis Planning and Monitoring | 14% | 17 |
| 4 · Elicitation and Collaboration | 12% | 14 |
| 5 · Requirements Life Cycle Management | 15% | 18 |
| 6 · Strategy Analysis | 15% | 18 |
| 7 · Requirements Analysis and Design Definition | 30% | 36 |
| 8 · Solution Evaluation | 14% | 17 |
| **Total** | **100%** | **120** |

## Features

- **Exam-realistic sitting** — countdown clock, flag-for-review, 120-cell question navigator,
  keyboard answering (`A`–`D` to answer, `←`/`→` to move, `F` to flag, `G` for the grid).
- **Deferred feedback** — no hints, no running score, no knowledge-area labels during the sitting.
- **Study mode with feedback after every question** — right or wrong called immediately, a verdict on
  each of the four options, why the best answer wins, the BABOK v3 task cited, and the trap named.
  Answers lock once revealed, so you cannot quietly change your mind. Running score in the header,
  navigator cells coloured right/wrong as you go.
- **Knowledge-area filtering** — pick one area to drill or any combination; the session is drawn in
  blueprint proportion across what you selected, and the summary tells you which areas it skipped.
- **Technique filtering** — the 50 techniques grouped into six families, selectable individually or
  by group, with a live count of available items against each. Shortcuts for the numeric techniques
  and for items carrying a data exhibit. The drill draws evenly across the techniques you picked
  rather than by blueprint weight, because the point is coverage of your selection.
- **Data exhibits** — a question can carry a table or a small dashboard. Financial items give you
  cash flows, discount factors, break-even volumes and total cost of ownership to work with, so the
  arithmetic is part of the question rather than a phrase to pattern-match.
- **Full review after submission** — every option gets a verdict, not just the correct one, plus the
  discriminating detail in the scenario, the BABOK task reference and the named trap.
- **Diagnostic study plan** — per-Knowledge-Area performance against blueprint weights with a 70%
  threshold (short sets are marked as thin samples rather than treated as verdicts), task-level gaps, key terms you misread, behavioural error patterns (including how long
  you spent on wrong answers versus right ones), and prioritised actions ranked by weight × gap.
- **Light and dark**, responsive, and printable to PDF for your records.

## Question design

These are interpretation questions, not recall questions. Every item is written to the same rules:

- A concrete scenario of 40–110 words with an organisation, a role and a tension — and at least one
  deliberately irrelevant detail.
- Four options of comparable length and grammatical form, exactly one best answer. The correct
  option is never the conspicuously longest.
- At least two distractors are legitimate BABOK actions that are simply wrong for *this* stage,
  *this* stakeholder or *this* constraint.
- Each item names the trap it tests — jumping to solution, right action at the wrong lifecycle
  stage, confusing a task with a technique, doing project management instead of business analysis,
  treating a stated want as the requirement, and so on.

Technique items add one more rule: the item must turn on *choosing or applying the right technique*,
not on recalling its definition. Each one puts a plausible neighbouring technique in the option set —
the pairing named in that technique's `confused` field — so the discrimination is what is being
tested. Items with a data exhibit go further and require the figures to be worked: the distractors
are the answers you reach by comparing undiscounted totals, reading a ratio as a size, treating a
sunk cost as live, or stopping at the licence price.

**Answer key integrity.** The key was generated before the questions were written: exactly 30 each
of A/B/C/D, no two consecutive items sharing a letter, and no cyclic pattern. Knowledge Areas are
interleaved so no two consecutive questions come from the same area. There is no letter to guess.

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire application — open it in any browser |
| `questions.json` | The 120-item exam bank as data, if you want to build your own front end |
| `technique-questions.json` | The technique drill bank, including the items that carry data exhibits |
| `techniques.json` | The 50 BABOK v3 techniques used by the learn view |
| `build.js` | Validates the data, embeds it, and rebuilds every download |
| `scenario.json` | One engagement worked across 16 techniques, with the hand-offs between them |
| `make-files.js` | Worked example and blank template, per technique, per format — 300 files plus a zip |
| `make-scenario.js` | The scenario walkthrough in all three formats |
| `ooxml.js` | Shared ZIP and escaping for all three writers |
| `docx-lib.js` / `xlsx-lib.js` | Minimal Word and Excel writers, no dependencies |
| `artefact-grid.js` | Turns any artefact into a grid, so Word and Excel can carry the diagrams |
| `make-pptx.js` | Generates the PowerPoint pack from `techniques.json` |
| `pptx-lib.js` | Minimal OOXML writer — emits native shapes and tables, no dependencies |
| `pptx-template/` | The PowerPoint chassis the generator builds on (master, layouts, theme) |
| `CBAP-Technique-Pack.pptx` | The generated pack, 102 slides |

### `questions.json` shape

```json
{
  "n": 1,
  "ka": 7,
  "kaName": "Requirements Analysis and Design Definition",
  "task": "7.6 Analyze Potential Value and Recommend Solution",
  "techniques": ["10.20 Financial Analysis"],
  "trap": "Doing project management work instead of business analysis work",
  "stem": "A local council is deciding between two designs for …",
  "why": "Work breakdown structures and resourcing profiles are project management products …",
  "options": [{ "text": "…", "verdict": "…" }],
  "answer": 3
}
```

`answer` is the zero-based index of the correct option. `techniques` is optional on exam items and
required on technique items; each entry must match a `"<n> <name>"` key in `techniques.json`.

### Data exhibits

An item may carry an `exhibit`, rendered under the stem and repeated in the review pane. Techniques
use the same shapes for their worked artefact (`visual`) and for the Financial Analysis explainers.
Six types are available:

| Type | Shape | Used for |
|---|---|---|
| `table` | Column grid | Data dictionaries, interface registers, three-point estimates, cash flows |
| `dashboard` | Stat tiles and bars | Anything where the reading is a comparison of magnitudes |
| `tree` | Indented hierarchy | KPI trees, decomposition, decision logic, five whys, mind maps |
| `matrix` | Labelled grid with axes | 2×2 prioritisation, SWOT, risk exposure, permissions |
| `flow` | Ordered steps with branches | Staged activities: brainstorming rounds, workshop phases |
| `canvas` | Labelled panels | Scorecard perspectives, scope in/out/adjacent, lessons learned |
| `swimlane` | SVG process diagram | Actor bands, cross-lane hand-off arrows, exception routes |
| `usecase` | SVG use case diagram | Actors, system boundary, goal ovals, `«include»` |
| `state` | SVG state machine | States, labelled transitions, illegal ones marked |
| `sequence` | SVG sequence diagram | Lifelines, ordered messages, blocking vs async |
| `dfd` | SVG data flow diagram | External / process / data store, each its own shape |

**Why the SVG types exist.** Five techniques are separated in the exam largely by their notation —
Process Modelling, Data Flow Diagrams, Sequence Diagrams, State Modelling and Use Cases. Drawing
them all as boxes in a row teaches that they are interchangeable, which is the opposite of what is
being tested. Each now draws in its own notation, so the discrimination is visible rather than only
asserted in prose. All of it is hand-built SVG: no libraries, themed through the same CSS variables,
laid out from the data at render time.

`canvas` also accepts `"layout": "bmc"`, which lays the nine blocks out the way the Business Model
Canvas actually is — partners tall on the left, value proposition through the centre, segments tall
on the right, cost and revenue across the foot — rather than as a uniform grid.

Wide exhibits scroll inside their own box; the page itself never scrolls horizontally.

The on-screen artefacts are styled to match the PowerPoint pack — filled header band, banded rows,
the same spacing — so a technique reads the same whether you meet it in the browser or on a slide.
The artefact is shown on its own, without a prose lead: the whole point is that the artefact
explains itself.

```json
"exhibit": {
  "type": "table",
  "title": "Net cash flow by year (AUD)",
  "cols": ["Year", "Option A", "Option B"],
  "align": ["left", "num", "num"],
  "rows": [["1", "100,000", "300,000"]],
  "note": "Discount rate 10%."
}
```

```json
"exhibit": {
  "type": "dashboard",
  "title": "Benefit realisation, first six months",
  "tiles": [{ "label": "Gross benefit", "value": "$742,000", "delta": "+6% vs plan", "dir": "up" }],
  "bars":  [{ "label": "Rework reduction", "value": 71, "max": 100, "note": "71% of target" }],
  "note": "All tiles are gross of cost."
}
```

`dir` is **sentiment, not arrow direction**: `up` renders favourable, `down` unfavourable, anything
else neutral. A falling cost is therefore `up`.

### `techniques.json` shape

```json
{
  "n": "10.20",
  "name": "Financial Analysis",
  "group": "Valuation and decision",
  "purpose": "Puts a monetary frame around a change …",
  "use": "Reach for it whenever an option has to be justified in money …",
  "confused": "Financial analysis values what is already forecast; estimation produces the forecast …",
  "tasks": ["6.4 Define Change Strategy"],
  "kas": [6, 7, 8],
  "visual":   { "type": "matrix", "title": "Which measure answers which question", … },
  "template": { "type": "matrix", "title": "Financial Analysis — blank template", … },
  "mechanics": [{ "term": "Net present value (NPV)", "formula": "…", "note": "…" }],
  "explainers": [{ "term": "…", "formula": "…", "plain": "…", "data": { … }, "chart": { … } }],
  "worked": "A change costs $400,000 up front and returns $180,000 a year …"
}
```

**Every technique carries a `visual`** — the artefact that technique actually produces, filled in
with realistic content rather than described. A data dictionary is shown as a populated dictionary;
decision modelling as a real decision tree; SWOT as a filled 2×2 with the internal/external axis
corrected. Across the 50 that is 22 tables, 7 trees, 7 matrices, 5 canvases, 4 staged flows, and one each
of swimlane, use case, state machine, sequence and data flow diagram.

**Every technique also carries a `template`** — the same artefact with the content stripped out, so
you can fill it in yourself. The learn card shows a *Worked example / Blank template* toggle. The
two are structural twins by construction: templates are derived from the worked version, so columns,
tree depth, quadrants, panels and step counts always match, and `build.js` fails the build if they
drift apart or if a template still carries figures from the example.

Scaffolding survives the blanking; findings do not. SWOT keeps *Strengths / Weaknesses /
Opportunities / Threats*, the Business Model Canvas keeps its nine panel names, a KPI tree keeps
*Objective → Strategy → Tactic → KPI* as placeholders, and a data flow keeps *External / Process /
Store*. But a process model's actor slots are emptied, because *Courier* and *Refurbisher* belong to
the worked case rather than to the technique.

`mechanics`, `explainers` and `worked` are optional and carried only by the techniques with
arithmetic to teach.

**Explainers** are the visual route: one concept per block, each with a plain-English sentence, the
formula, a `data` table and a `chart` dashboard built from the same exhibit shapes questions use.
Financial Analysis has eight — discount factor, present value, NPV, payback, ROI, IRR, break-even
and total cost of ownership — and the card opens with a jump index across them. Every figure in
them is arithmetically consistent; the NPV block deliberately shows an option with a $20,000 raw
surplus and a *negative* net present value, because that is the trap the exam sets.

## Running it

Download `index.html` and open it. That is the whole procedure — it works offline and from a file://
path. To host your own copy, enable GitHub Pages on a fork and point it at the default branch root.

> **Note:** progress is held in the browser tab only. Reloading mid-sitting starts you over.

## Downloads

| What | Where |
|---|---|
| **[Every template](https://business-analyst-services.github.io/cbap-exam-simulator/CBAP-Technique-Templates.zip)** | 300 files — worked example and blank template, each as `.pptx`, `.docx` and `.xlsx` |
| **[The 102-slide pack](https://business-analyst-services.github.io/cbap-exam-simulator/CBAP-Technique-Pack.pptx)** | All 50 techniques in one deck |
| **[Scenario walkthrough](https://business-analyst-services.github.io/cbap-exam-simulator/CBAP-Scenario-Walkthrough.pptx)** | One engagement, 16 techniques ([Word](https://business-analyst-services.github.io/cbap-exam-simulator/CBAP-Scenario-Walkthrough.docx) · [Excel](https://business-analyst-services.github.io/cbap-exam-simulator/CBAP-Scenario-Walkthrough.xlsx)) |

Every one is rebuilt by `node build.js` from the same JSON the app embeds, so nothing drifts.

### One file per technique, per half

Every technique card in the app carries its own download, and **the button follows the tab**: on the
worked example tab you get the worked example, on the blank template tab you get the blank. Named
`12-data-dictionary-example.docx` and `12-data-dictionary-template.docx`.

Each file covers one technique only, so it can be handed to someone without the other 49.

The three formats are not the same artefact three times:

- **`.pptx`** keeps the notation. A swimlane is a swimlane, a state machine is a state machine.
- **`.docx`** is a Word table you type into, with the technique's purpose and discriminator above it.
- **`.xlsx`** — the example has an About sheet beside it; the template is the sheet alone.

**The template files carry no teaching copy.** No purpose, no when-to-use, no confused-with, no task
list, no About sheet — that material belongs on the worked example. A blank template is a header, the
form, and one line saying how to fill it in. Dropping the sidebar also hands the whole slide width to
the form, and blank tables are padded out to enough rows to be worth using.

Word and Excel cannot draw a sequence diagram usefully, and an embedded picture would be worse than
useless because you could not edit it. So the 16 diagram artefacts are expressed as the grid that
carries the same information — a swimlane becomes lanes down and steps across, a state model becomes
from/event/to with a permitted column, a sequence becomes ordered messages. That is sortable,
printable and editable; a picture of a diagram is none of those.

## Follow one scenario

The 50 worked examples are deliberately drawn from 50 different organisations, because recognising a
technique in an unfamiliar setting is what the exam tests. That variety is the wrong shape for
learning how techniques *connect*, so there is a separate thread that does the opposite.

**Fairgate Roads Authority — heavy vehicle access permits.** One engagement, 16 techniques in BABOK
order, and every step says what it takes from the step before and what it hands to the next:

| | |
|---|---|
| 4 → 5 | The four stage names in the process model become the rows of the process analysis, unchanged |
| 5 → 6 | The worst row, 19 days for 2.1 hours of work, becomes the root cause symptom |
| 5 → 7 | The $41 cost to serve becomes the baseline the options are valued against |
| 7 → 8 | B has the better NPV, C the faster payback — the weighting decides, in the open |
| 11 → 12 | The in-scope list becomes the top level of the decomposition |
| 13 → 14 | The data each rule needs becomes the data dictionary |
| 10 → 16 | The benefit claimed in the business case becomes the KPI with a threshold |

That chain is the point. On its own each technique is a drawing; in sequence they are an argument.

## The PowerPoint pack

**[Download CBAP-Technique-Pack.pptx](https://business-analyst-services.github.io/cbap-exam-simulator/CBAP-Technique-Pack.pptx)** — 102 slides, generated from `techniques.json`. There is a download button in the technique reference header, next to Print.

The pack is part of the product rather than a side artefact: `build.js` regenerates it every time, from the same data it embeds into `index.html`, so the deck cannot fall behind the app. To build it on its own:

```bash
node make-pptx.js
```

A title slide, a contents slide, then a pair per technique: the **worked example**, then the
**blank template**. Each slide carries a sidebar with what the technique is for, when to reach for
it, and what it is most often confused with, so a single slide stands alone as a one-pager.

The web app and the deck answer different questions. On screen you need to *recognise* a notation
under exam pressure; on an engagement you need to *fill one in*. You cannot type into an HTML blank,
which is why the deck exists — every diagram is a native PowerPoint shape and every table a native
table. Select it, type over it, recolour it, delete what you do not need.

Both are generated from the same `techniques.json`, so they cannot drift apart.

> **Note on the generator.** There is no dependency on python-pptx or any other library. `pptx-lib.js`
> writes the OOXML package directly. The parts under `pptx-template/` are a chassis produced by
> PowerPoint itself — hand-authoring a slide master is where a home-made .pptx usually goes wrong,
> so the generator only writes the slides and the package plumbing.

## Contributing

Corrections to keyed answers or BABOK task or technique references are welcome — open an issue
quoting the item number shown in the review pane.

Edit the JSON, never the arrays inside `index.html`. Then:

```bash
node build.js
```

That regenerates the embedded data block and refuses to write if anything is wrong: the exam bank
must be 120 items with a 30/30/30/30 answer key, no two consecutive items may share an answer letter
or a knowledge area, every item needs four options each with a verdict, every technique reference
must resolve, every table row must match its header width, and every one of the 50 techniques must
have at least one item of its own. Commit the JSON and the regenerated `index.html` together.

## Disclaimer

Not affiliated with, endorsed by, or sponsored by the International Institute of Business Analysis™
(IIBA®). **CBAP®**, **BABOK®** and **IIBA®** are registered trade marks of the International
Institute of Business Analysis. All question content here is original work written to align with the
concepts in the BABOK Guide v3; no BABOK text is reproduced. This is unofficial study material and
is no substitute for the guide itself.

## Licence

MIT — see [LICENSE](LICENSE).
