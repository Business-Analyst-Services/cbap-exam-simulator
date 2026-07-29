# CBAP® Exam Simulator

A single-file, offline, 120-question practice exam for the **CBAP®** certification, aligned to the
**BABOK® Guide v3** and weighted to the published exam blueprint.

**▶ [Sit the exam](https://REPLACE_ME) —** no install, no sign-up, nothing leaves your browser.

---

## What it is

One self-contained HTML file. Open it and you are sitting a full-length, timed, scenario-based
mock exam. Feedback is withheld until you submit, then released in full alongside a diagnostic
study plan.

| | |
|---|---|
| **Items** | 120 scenario-based multiple-choice questions |
| **Coverage** | All 6 Knowledge Areas, all 30 tasks in scope |
| **Timing** | 3 hours 30 minutes, pausable, auto-submits at zero (or run untimed) |
| **Feedback** | Deferred to the end — as in the real exam |
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
- **Full review after submission** — every option gets a verdict, not just the correct one, plus the
  discriminating detail in the scenario, the BABOK task reference and the named trap.
- **Diagnostic study plan** — per-Knowledge-Area performance against blueprint weights with a 70%
  threshold, task-level gaps, key terms you misread, behavioural error patterns (including how long
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

**Answer key integrity.** The key was generated before the questions were written: exactly 30 each
of A/B/C/D, no two consecutive items sharing a letter, and no cyclic pattern. Knowledge Areas are
interleaved so no two consecutive questions come from the same area. There is no letter to guess.

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire application — open it in any browser |
| `questions.json` | The question bank as data, if you want to build your own front end |

### `questions.json` shape

```json
{
  "n": 1,
  "ka": 7,
  "kaName": "Requirements Analysis and Design Definition",
  "task": "7.6 Analyze Potential Value and Recommend Solution",
  "trap": "Doing project management work instead of business analysis work",
  "stem": "A local council is deciding between two designs for …",
  "why": "Work breakdown structures and resourcing profiles are project management products …",
  "options": [{ "text": "…", "verdict": "…" }],
  "answer": 3
}
```

`answer` is the zero-based index of the correct option.

## Running it

Download `index.html` and open it. That is the whole procedure — it works offline and from a file://
path. To host your own copy, enable GitHub Pages on a fork and point it at the default branch root.

> **Note:** progress is held in the browser tab only. Reloading mid-sitting starts you over.

## Contributing

Corrections to keyed answers or BABOK task references are welcome — open an issue quoting the item
number shown in the review pane. Edit `questions.json` rather than the HTML if you are proposing new
items; the bank is embedded into `index.html` at build time.

## Disclaimer

Not affiliated with, endorsed by, or sponsored by the International Institute of Business Analysis™
(IIBA®). **CBAP®**, **BABOK®** and **IIBA®** are registered trade marks of the International
Institute of Business Analysis. All question content here is original work written to align with the
concepts in the BABOK Guide v3; no BABOK text is reproduced. This is unofficial study material and
is no substitute for the guide itself.

## Licence

MIT — see [LICENSE](LICENSE).
