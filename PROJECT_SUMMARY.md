# Project Summary

**TraceLine: Configuration-Aware Maintenance Evidence**
Theme 2 — Multimodal Maintenance Intelligence Agent

---

## The problem

A maintenance technician standing at a stopped machine asks what a fault code
means. Search returns a real document, with a real page number, stating a real
answer — for a different firmware revision of that machine.

This is the failure mode that documentation search cannot see and that retrieval
systems make worse. A conventional RAG assistant ranks by textual similarity, and
a legacy troubleshooting table describing the same fault code is *maximally
similar*. It gets retrieved, cited, and answered with. The citation is the
problem: it makes a wrong answer look verified. A technician who would have
double-checked an unsourced answer does not double-check a cited one.

Three things make it hard to catch in the field:

1. **Applicability is invisible in the text.** Whether a document covers this
   asset's model, firmware and supply configuration lives in metadata, headers and
   revision tables — not in the sentence that answers the question.
2. **Documents disagree and never say so.** A 2025 table and a 2026 service note
   both describe fault F12 correctly, for different releases. Neither references
   the other.
3. **The deciding field is often unknown.** The technician may not know the
   installed firmware. Any system that quietly assumes a value in order to
   produce an answer has invented the most important input.

## The solution

TraceLine treats **applicability** and **provenance** as blocking conditions
rather than metadata to display. It retrieves evidence, evaluates whether each
record's declared scope covers the confirmed asset configuration, and refuses to
resolve a disagreement it cannot resolve honestly.

Asked about fault F12 on a drive whose firmware is unconfirmed, it does not
answer. It cites both source regions, states that they disagree and why, names
firmware as the field that would settle it, and stops. Confirm 2.4.1 and it scopes
to the matching record while marking the legacy table *Different firmware scope* —
excluded with its reason visible, not hidden. Confirm 2.3.8 instead and the scope
inverts.

Four design decisions carry the idea:

- **Unconfirmed is a first-class state.** "No applicability verdict available" is
  represented distinctly from "fails the applicability check." Collapsing those
  two is what makes a system either over-cite or silently drop valid evidence.
- **A photo suggests; a technician decides.** Client-side OCR reads a nameplate
  and populates the firmware field as an `ocr`-sourced *suggestion*. The answer
  does not change. Only explicit confirmation promotes it to confirmed context and
  scopes the answer. Machine perception informs the human; it never substitutes
  for them.
- **A field note is not a document.** A technician's log entry reporting a prior
  occurrence of the same fault is shown and labelled, but excluded from both
  conflict pairing and cited support. Observation and documentation are different
  evidence classes.
- **Absence is a valid answer.** A question the corpus cannot support produces an
  abstention that names the missing evidence. Asking about a fault code absent
  from the corpus abstains rather than citing a record that merely contains the
  word "fault".

## Impact

**What it changes for the technician.** The unit of trust moves from *the answer*
to *the answer plus its scope*. Every statement is bound to a record id, revision
and page region, and every exclusion states its reason, so verification is reading
rather than re-searching. When the system cannot answer safely, it says which
single field would unblock it — turning an open-ended search into one specific
check on the machine.

**What it changes for the organization.** Wrong-revision evidence in maintenance
is a safety and downtime problem, not a search-quality problem: a procedure for
the wrong configuration can mean an unnecessary teardown, a missed root cause, or
an action that is unsafe for the installed hardware. A system that abstains and
asks is cheaper than one that answers confidently and wrongly. Because
applicability verdicts are derived from declared record metadata rather than
inferred from text, every exclusion is auditable after the fact — which is the
minimum bar for putting an assistant anywhere near regulated maintenance work.

**Why it generalizes.** Nothing in the approach is specific to drives or firmware.
The same rules apply to any domain where evidence is scoped — model, serial range,
supply class, region, effective date — and where citing out-of-scope evidence is
worse than citing nothing.

**Demonstrated, not asserted.** Turning off the metadata filter in the interface
reproduces the failure on demand: the same question then cites four records,
including a table for a different equipment platform. That is the control
condition, visible in the prototype, next to the treatment.

## What is real in this build

Working: BM25 retrieval (k₁ = 1.4, b = 0.72) over eight synthetic records with
visible per-record scores; exact-identifier handling so a named fault code
restricts citable records to carriers of that code; five-verdict applicability
(`applicable`, `out-of-model`, `out-of-firmware`, `out-of-supply`, `unresolved`);
metadata-derived conflict detection; typed field provenance; client-side OCR with
reconstruction of imperfect nameplate reads; documented claims separated from
field observations; structured abstention. 41 unit tests cover the rule set.

Not built: semantic embeddings, PDF parsing, real table and diagram extraction,
LLM generation, backend, authentication. The interface states this rather than
implying otherwise.

**All equipment identifiers, document titles, excerpts, dates and revisions are
synthetic.** Nothing is reproduced from manufacturer documentation, and no ABB
integration or endorsement is claimed or implied. TraceLine does not control
equipment, diagnose physical faults, or authorize work.

---

## Deliverable map

| # | Requirement | What is submitted |
|---|---|---|
| 01 | Project summary | This file — problem, solution, impact. |
| 02 | Working prototype | The running application: live at `https://juliaj3.github.io/traceline-prototype/` (GitHub Pages, no backend), or locally in two commands — see [Setup instructions](TECHNICAL_DOCUMENTATION.md#setup-instructions). Eight-step verification walkthrough included there. |
| 03 | Demo video | Recording made from the timed shot list in `DEMO_SCRIPT.md`. Link below. |
| 04 | Source code | https://github.com/JuliaJ3/traceline-prototype — complete, 3 source files, no build artifacts. |
| 05 | Technical documentation | `TECHNICAL_DOCUMENTATION.md` — solution architecture, technologies used, implementation approach, setup instructions. |
| 06 | Presentation deck (optional) | Not submitted. `PROJECT_SUMMARY.md` and `TECHNICAL_DOCUMENTATION.md` cover the same ground. |
| — | Verification record | `EVALUATION.md` — what was tested, how, and what was not. |

**02 and 04 are different artifacts of the same code.** 04 is the source a judge
*reads*; 02 is the application a judge *operates* — the hosted URL above, which
needs no clone, no install and no toolchain.

## Copy-ready submission fields

**Project title**
TraceLine: Configuration-Aware Maintenance Evidence

**Project description**
TraceLine helps maintenance engineers check whether troubleshooting evidence
actually applies to the equipment in front of them before relying on it. It
targets a failure that hides behind a convincing citation: two references describe
the same fault code differently because they cover different firmware releases.
With the asset firmware unconfirmed, TraceLine cites both source regions, states
that they disagree, and names the field that would settle it. Once the release is
confirmed it scopes the interpretation to the matching reference and keeps the
out-of-scope document visible with the reason it was excluded. A nameplate photo
can be read by client-side OCR, but an OCR reading is an unconfirmed suggestion
that never scopes an answer until a technician confirms it. A technician's field
note is shown separately from documented claims. For questions the evidence cannot
answer, TraceLine abstains and names what is missing. Retrieval is BM25 over eight
synthetic records with applicability verdicts derived from record metadata, and
the rule set is covered by 41 unit tests. Synthetic corpus; not a diagnosis and
not an authorization to perform work.

**Built with**
HTML, CSS, JavaScript (ES modules), BM25 lexical retrieval, Tesseract.js
client-side OCR, canvas image synthesis, metadata-derived applicability filtering,
`node --test` unit tests

**Instructions**
Run `python3 -m http.server 8000` in the project directory and open
`http://localhost:8000`. Start with firmware Unknown to see the conflict, inspect
both F12 citations, then confirm firmware 2.4.1 to watch the answer scope. Click
**Use synthetic nameplate** for the OCR path, **Ask something unsupported** for
abstention, and toggle **Metadata filter** off to see the failure this project
prevents. Run the tests with `node --test tests/engine.test.mjs`. No API keys or
package installation required.

**Repository link**
https://github.com/JuliaJ3/traceline-prototype

**Video link**
Paste the hosted recording URL here before submitting.

**Demo link**
https://juliaj3.github.io/traceline-prototype/ — the prototype is fully static, so
GitHub Pages serves the repository directly. Enable it under Settings → Pages
(branch `main`, folder `/ (root)`) after the first push; the URL is live within a
minute. It also runs locally with the instructions above.

## Judging criteria alignment

- **Innovation & creativity (20%)** — treating applicability and provenance as
  blocking conditions rather than metadata. Unconfirmed is a first-class state, an
  OCR reading cannot scope an answer, and "no verdict available" is distinguished
  from "fails the check".
- **Technical excellence (25%)** — BM25 with exact-identifier semantics,
  metadata-derived conflict detection, five-verdict applicability, typed
  provenance, noisy-OCR reconstruction that refuses unknown releases, and 41 unit
  tests over a DOM-free engine module.
- **Problem–solution fit (20%)** — targets wrong-model and wrong-revision evidence
  during troubleshooting, and reproduces that exact failure on demand by disabling
  the filter.
- **Scalability & feasibility (15%)** — the rules are pure functions over record
  metadata, so they hold unchanged when the corpus becomes an ingestion pipeline
  rather than a fixture array. `TECHNICAL_DOCUMENTATION.md` states the production
  path and the security boundary. No equipment control is contemplated.
- **User experience (10%)** — asset context, ranked evidence, ledger and source
  viewer visible together; every exclusion carries its reason; keyboard-operable
  evidence list, `aria-pressed` toggles, live regions, and a layout that holds at
  400px.
- **Presentation & demo (10%)** — `DEMO_SCRIPT.md` is a timed walkthrough whose
  spine is the conflict-to-confirmation flow.

## Theme 2 focus-area fit

| Theme element | In this build |
|---|---|
| Multimodal input | Client-side OCR of a nameplate image feeding the asset context, with an in-canvas synthetic plate so the path runs offline |
| Multiple evidence types | Text excerpt, extracted table region, diagram callout region, and a service-record field note, each rendered in its own form |
| Multi-document reasoning | Metadata-derived conflict detection across records that disagree |
| Retrieval | BM25 with visible per-record scores and a toggle to disable it |
| Equipment-document linking | Typed applicability view connecting model, firmware, fault code, document revision and cited region |
| Grounding discipline | Every statement bound to a record id, page and region; abstention when support is absent |
