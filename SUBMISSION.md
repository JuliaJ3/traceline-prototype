# TraceLine: Configuration-Aware Maintenance Evidence

**Theme 2 — Multimodal Maintenance Intelligence Agent**

## Project summary

Maintenance teams search across manuals, tables, drawings and service records. A
search result can cite a real document and still mislead, because the document's
model, configuration or revision does not match the asset in front of the
technician. The citation looks like evidence. It is evidence — for a different
machine.

TraceLine treats *applicability* as a first-class check rather than a footnote. It
retrieves evidence, evaluates whether each record's declared scope covers the
confirmed asset configuration, and refuses to resolve a disagreement it cannot
resolve honestly.

The prototype demonstrates a firmware conflict on a synthetic AX-480 drive. Two
records map fault F12 differently — one scoped to firmware 2.4.x, one to 2.3.x.
With firmware unconfirmed, TraceLine cites both source regions, states that they
disagree, names firmware as the deciding field, and stops. After the technician
confirms 2.4.1 it scopes to the matching record and marks the legacy table
*Different firmware scope*. Confirm 2.3.8 instead and the scope inverts.

Three behaviors matter as much as the conflict itself:

- **A technician's field note is not a document.** A maintenance log entry
  reporting a prior F12 is shown, labelled *Technician observation*, and excluded
  from both conflict pairing and cited support.
- **OCR suggests; it never decides.** Reading a nameplate populates the firmware
  field as an `ocr`-sourced suggestion. The ledger stays at *Clarification
  needed*. Only explicit technician confirmation changes the scope.
- **Absence is an answer.** A question the corpus cannot support produces an
  abstention naming the missing evidence. Asking about a fault code absent from
  the corpus abstains rather than citing a record that merely contains the word
  "fault".

Turning off the metadata filter reproduces the failure on demand: the same
question then cites an AX-320 platform table for an AX-480 asset.

**All equipment identifiers, document titles, excerpts, dates and revisions are
synthetic.** Nothing is reproduced from manufacturer documentation, and no ABB
integration or endorsement is claimed or implied.

## Copy-ready HackerEarth fields

**Project title**
TraceLine: Configuration-Aware Maintenance Evidence

**Project description**
TraceLine helps maintenance engineers check whether troubleshooting evidence
actually applies to the equipment in front of them before relying on it. The
prototype demonstrates a documentation failure that hides behind a convincing
citation: two references describe the same fault code differently because they
cover different firmware releases. With the asset firmware unconfirmed, TraceLine
cites both source regions, states that they disagree, and names the field that
would settle it. Once the release is confirmed it scopes the interpretation to the
matching reference and keeps the out-of-scope document visible with the reason it
was excluded. A nameplate photo can be read by client-side OCR, but an OCR
reading is treated as an unconfirmed suggestion and never scopes an answer until a
technician confirms it. A technician's field note is shown separately from
documented claims. For questions the evidence cannot answer, TraceLine abstains
and names what is missing. Retrieval is BM25 over eight synthetic records with
applicability verdicts derived from record metadata, and the whole rule set is
covered by 41 unit tests. Synthetic corpus; not a diagnosis and not an
authorization to perform work.

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
See `DEMO_SCRIPT.md` for the timed walkthrough. Paste the hosted recording URL
here before submitting.

**Demo link**
Runs locally with the instructions above; a hosted live demo is not included.

## Focus area fit

Theme 2 asks for multimodal maintenance intelligence. This build covers:

| Theme element | In this build |
|---|---|
| Multimodal input | Client-side OCR of a nameplate image feeding the asset context, with an in-canvas synthetic plate so the path runs offline |
| Multiple evidence types | Text excerpt, extracted table region, diagram callout region, and a service-record field note, each rendered in its own form |
| Multi-document reasoning | Metadata-derived conflict detection across records that disagree |
| Retrieval | BM25 with visible per-record scores and a toggle to disable it |
| Equipment-document linking | Typed applicability view connecting model, firmware, fault code, document revision and cited region |
| Grounding discipline | Every statement bound to a record id, page and region; abstention when support is absent |

Not in this build: semantic embeddings, PDF parsing, real table and diagram
extraction, and any LLM call. The interface states this rather than implying
otherwise.

## Judging criteria alignment

- **Innovation & creativity (20%)** — the novel move is treating *applicability*
  and *provenance* as blocking conditions rather than metadata. Unconfirmed is a
  first-class state; an OCR reading cannot scope an answer; "no verdict available"
  is distinguished from "fails the check".
- **Technical excellence (25%)** — BM25 with exact-identifier semantics,
  metadata-derived conflict detection, five-verdict applicability, typed field
  provenance, noisy-OCR reconstruction that refuses unknown releases, and 41 unit
  tests over a DOM-free engine module.
- **Problem–solution fit (20%)** — targets wrong-model and wrong-revision evidence
  during troubleshooting, and reproduces that exact failure on demand by
  disabling the filter.
- **Scalability & feasibility (15%)** — the rules are pure functions over record
  metadata, so the same logic holds when the corpus is an ingestion pipeline
  rather than a fixture array. `TECHNICAL_NOTES.md` states the production path and
  the security boundary. No equipment control is contemplated.
- **User experience (10%)** — asset context, ranked evidence, ledger and source
  viewer visible together; every exclusion carries its reason;
  keyboard-operable evidence list, `aria-pressed` toggles, live regions, and a
  layout that holds at 400px.
- **Presentation & demo (10%)** — `DEMO_SCRIPT.md` is a timed walkthrough; the
  conflict-to-confirmation flow is the demo's spine.
