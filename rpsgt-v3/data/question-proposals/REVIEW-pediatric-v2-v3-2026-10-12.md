# RPSGT V2/V3 pediatric scoring and MSLT — targeted editorial review

**October 12, 2026 • Guild library-first audit • No learner release / no automatic retirement**

## Indexed BRPT reading foundation

- Guild [BRPT v4 Master Library Command Center](https://docs.google.com/spreadsheets/d/11KL3BVbdQhIley-qx7vKp2zeWqrVBB58/edit): pediatric scoring, CO₂ and hypoventilation identified as **Critical** priority, with existing-bank repair and QA required before adding basic questions. Adult/pediatric MSLT separation is likewise a Critical concept-family priority.
- BRPT current RPSGT Exam Blueprint: D3B for pediatric/infant scoring; D2B for pediatric MSLT preparation. BRPT Candidate Handbook controls exam format, not clinical scoring definitions.
- BRPT-listed *Fundamentals of Sleep Technology* (3rd ed.): Chapter 61, `Fundamentalssleep(4).PDF` local PDF pages **35–40**. The chapter discusses central apneas and hypoventilation; page 40 specifies pediatric sleep CO₂ **greater than 50 mm Hg for more than 25%** of TST. **Currency boundary:** the table is reprinted from an earlier AASM manual and must not be mistaken for a direct check of the current licensed Version 3 scoring manual.
- *Pediatric Sleep Pearls* (2017), Guild index Section 2: pediatric PSG and scoring context; Section 3: normal/developmental PSG findings; Section 7: pediatric hypersomnolence. Topic/section references are indexed only; no direct source-page claim made here.
- *A Clinical Guide to Pediatric Sleep* (3rd ed.), Guild index Chapter 4 and Chapter 17: PSG and excessive daytime sleepiness study support. Modern protocols override 2015 procedure details.
- **Direct primary article:** Maski et al. (2024), *Recommended protocols for the Multiple Sleep Latency Test and Maintenance of Wakefulness Test in children*, `2024 - Pediatric MSLT and MWT Protocols - Maski et al AASM.pdf`, PDF page **4**, **Box 2 item 2**: preceding attended pediatric PSG should allow **at least eight hours time in bed** with **at least seven hours total sleep**, and MSLT should **not** follow a night with PAP pressure changes, including split-night/initial PAP titration. This is a current pediatric protocol, not infant/pediatric overnight respiratory scoring authority.

## Verified existing-bank duplication

In the original D3B module (**113** records), `v1264-0161`, `-0162`, `-0163`, `-0164`, and `-0165` are **literal duplicates**: same 5-year-old pediatric-scoring prompt, same four choices, same selected answer and same rationale. Each is currently considered eligible. This is educational redundancy rather than five independent skills. **Proposal only:** retain the oldest item (`v1264-0161`) as a candidate and evaluate the other four for owner-approved retirement or replacement with differentiated, original application cases. Do not delete or reuse the four IDs; progress and history may reference them. Test V2 and V3 report/mock effects before changing pools.

## Source distinction verified directly — diagnostic criteria versus scoring

The previously proposed numerical change for `mb-pediatric-mixed-4` **must not be applied**. Two sources use different, noninterchangeable definitions:

1. **Current pediatric OSA diagnostic criterion:** The user-provided *International Classification of Sleep Disorders, Third Edition, Text Revision (ICSD-3-TR)* 2023 **supplemental correction** PDF, `732473293-ICSD-3-Text-Revision-Supplemental-Material.pdf`, **PDF page 3**, corrects the pediatric OSA criteria. Its criterion B(2) recognizes an **obstructive hypoventilation pattern** with CO₂ above 50 mm Hg for **at least 25%** of total sleep time, accompanied by one or more obstructive indicators (e.g., snoring, flow flattening, or paradoxical thoracoabdominal movement). The PDF includes the criteria organization/correction; do not teach that the pattern alone establishes pediatric OSA without the complete diagnostic criteria. **This directly supports the current question's at-least wording and obstructive context.**
2. **Separate respiratory event *scoring* rule:** The user-provided BRPT-listed textbook *Fundamentals of Sleep Technology* (3rd ed.), Chapter 61, split PDF volume 4 **PDF page 40**, prints the pediatric PSG hypoventilation scoring threshold of CO₂ above 50 mm Hg for **more than 25%** of sleep time, explicitly crediting **AASM Version 2.5**. The historical scoring threshold was also described in the AASM 2012 respiratory definitions article, but these **do not** establish the content of the current licensed AASM Version 3 scoring rule.

The uploaded `333828895-Sleep-Stage-Scoring-c3-version.pdf` is a **2015 slide deck**, and its reference slide cites AASM **Version 2.1**, not Version 3. **It does not substitute for the current licensed manual.**

**Corrected decision:** Preserve `mb-pediatric-mixed-4`'s answer, option and ID. Consider a diagnosis-specific stem/rationale clarifying the complete ICSD-3-TR context, subject to clinical/editorial approval. Continue to hold the two other scoring-rule explanations until Version 3 rule text is verified. Do not conflate ICSD diagnosis with AASM event scoring; ensure student-facing references are APA only.

## Three source-mapped existing-question repair proposals

| ID | Finding | Recommended held action | Readiness |
|---|---|---|---|
| `mb-pediatric-mixed-4` | **The original “at least 25%” answer is supported for the ICSD-3-TR pediatric OSA *obstructive hypoventilation diagnostic pattern*.** This differs from a standalone pediatric PSG hypoventilation *scoring rule* printed as “more than 25%” in *Fundamentals* Ch. 61 (reprinting AASM v2.5). Earlier review incorrectly mixed those contexts. | **Keep the existing answer/choice unchanged.** Stage a more explicit ICSD-3-TR diagnostic stem and rationale; do not call the old answer erroneous. Review independent AASM v3 scoring items separately using the licensed current manual. | **Direct diagnostic source checked; clinical/editorial review pending.** |
| `imp-050` | Best answer “3%” addresses desaturation, but stem/rationale could imply that ≥30% flow reduction with associated arousal/desaturation alone is sufficient regardless of pediatric event duration. | Retain best answer; propose more precise rationale about breath-based duration and full rule criteria. AASM v3 licensed check first. | **Held rationale revision.** |
| `boost-039` | Case states a central event is “less than 20 seconds” but does not specify **at least two missed breaths**. As written, “may still meet” is cautious, yet the stem does not force the age-appropriate duration assessment. | Specify ≥two missed breaths and a qualifying arousal; keep same best-answer meaning. Compare with `src32-026` and `case-d3-010`, which ask substantially the same central-apnea decision. | **Held stem + rationale revision; duplicate-family review.** |

The companion JSON contains the exact current and proposed wording, original answers, BRPT task mapping, page locations, source-control warnings and outstanding approvals: [Pediatric repair-review proposals](pediatric-v2-v3-repair-review-2026-10-12.json).

## V2/V3 implementation guardrails

- **Do not edit** `RPSGTv2.2026.html`, `rpsgt-v3/data/question-bank/d3b.json`, `rpsgt-v3/data/question-bank/manifest.json`, `data/owner-approved-question-release.json`, live mock eligibility, or learner storage until the licensed scoring-rule check, clinician/editorial QA, and owner approval.
- A future question revision must preserve stable progress/history identity through the established approved-revision path. Where the answer text changes, update the answer and its corresponding choice atomically and test resulting scoring. For duplicate retirement, preserve old IDs in historical report mapping and test both V2 and V3.
- The pediatric MSLT candidate `SPG-SPRIGGS-2026-005` remains held with explicit, locally verified 2024 protocol evidence.
- **No textbook-review question, original proprietary chart or figure was copied.** Every learner-facing reference should be APA formatted with no internal “mapped reference” labels.

## Repeatable audit

`rpsgt-v3/scripts/test-rpsgt-pediatric-cross-version-review-2026.mjs` verifies original V2 and V3 records, exactly five literal duplicate identities, three source-specific proposed revisions, live-bank preservation and the original 2024 MSLT passage-location metadata; it produces a JSON/Markdown artifact. Source metadata validation does not confer clinical approval.
