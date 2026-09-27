# Technical documentation

TraceLine is a static browser prototype that tests one claim: a troubleshooting
answer becomes safer to inspect when the system checks document scope against
*confirmed* asset metadata, and shows disagreement instead of resolving it
silently.

It is not a production RAG system, a validated industrial tool, or an ABB product
integration. Every record in the corpus is synthetic.

Contents: [Solution architecture](#solution-architecture) ·
[Technologies used](#technologies-used) ·
[Implementation approach](#implementation-approach) ·
[Setup instructions](#setup-instructions) ·
[Security boundary](#security-and-safety-boundaries) ·
[Known limits](#known-limits) · [Next engineering steps](#next-engineering-steps)

---

# Solution architecture

## Shape

Three files, no build step, no backend, no server-side state. The browser is the
whole runtime.

```
index.html   markup, styles, module entry point
engine.js    retrieval + applicability + conflict + abstention   (no DOM, no network)
app.js       rendering, event wiring, OCR intake, firmware parsing
tests/       41 unit tests over engine.js and parseFirmware
```

## The one architectural decision that matters

**Every rule that decides what TraceLine may say lives in `engine.js` as a pure
function.** `engine.js` imports nothing, touches no DOM node, and makes no network
call. `app.js` composes no prose of its own — it renders the claims that
`engine.js` selected, in the verdict shape `engine.js` returned.

Two consequences:

1. The safety rules are testable without a browser, so they are actually tested.
2. A rendering change cannot quietly weaken them. There is no path by which a
   display tweak lets an out-of-scope record become cited evidence.

`engine.js` exports 13 symbols: `CORPUS`, `tokenize`, `faultCodes`, `buildIndex`,
`score`, `field`, `isConfirmed`, `confirmedValue`, `applicability`,
`APPLICABILITY_LABELS`, `retrieve`, `detectConflicts`, `answer`. The interface
consumes 9 of them. The tests consume 11.

## Data flow

```
                  ┌──────────────── index.html ────────────────┐
                  │ asset bar · evidence list · ledger · source │
                  └───────────────────┬────────────────────────┘
                                      │ events
                                      ▼
   nameplate image ──► runOcr() ──► parseFirmware() ──► state.asset.firmware
   (file or canvas)    Tesseract.js   digit-run match      source: 'ocr'
                                                                │
                                              technician confirms│  source: 'user'
                                                                ▼
                            state = { asset, modes, query, selectedId, ocr }
                                      │
                                      │  app.js render()
                                      ▼
                      engine.answer(query, asset, modes, corpus, index)
                                      │
             ┌────────────────────────┼────────────────────────┐
             ▼                        ▼                        ▼
       retrieve()              applicability()          detectConflicts()
       BM25 + code hit         5 verdicts               metadata-derived
             └────────────────────────┼────────────────────────┘
                                      ▼
                     verdict: conflict | scoped | abstain | model-scoped-abstain
                                      │
                                      ▼
                        renderAnswer() · renderSources() · renderGraph()
```

The state object is the only mutable thing in the application. Every render is a
full recomputation from `state` — there is no incremental DOM diffing and no
cached answer, so the displayed ledger cannot drift out of sync with the confirmed
asset context.

## Retrieval

BM25 over each record's title, type, heading, claim and excerpt text:

```
score(t) = idf(t) · ( tf · (k₁+1) ) / ( tf + k₁ · (1 − b + b · len/avglen) )
k₁ = 1.4   b = 0.72   idf(t) = ln(1 + (N − n + 0.5)/(n + 0.5))
```

`buildIndex()` returns inert data — term frequencies, document lengths, the idf
map, average length — so tests assert on the statistics directly. Retrieval never
sorts the corpus in place; it returns new arrays, so ranking state cannot leak
between queries.

Tokenization preserves version and code shapes and emits a two-part prefix for
dotted versions, so an asset on `2.4.1` matches a document scoped to `2.4.x`. A
small stopword set removes question scaffolding ("what", "does", "mean") that
would otherwise contribute score.

**Fault codes are identifiers, not terms.** `faultCodes()` normalizes `F-27`,
`F 27` and `f27` to one form. A record carrying a queried code receives a fixed
score bonus, and — more importantly — when a query names any code, only records
carrying one of those codes may be cited at all. Without that rule, asking about a
code absent from the corpus produced cited claims, because records matching only
the generic word "fault" cleared the relevance threshold.

## Applicability

`applicability(record, asset)` evaluates in a fixed order and returns one of five
verdicts:

| Order | Condition | Verdict |
|---|---|---|
| 1 | Confirmed model differs from the record's model | `out-of-model` |
| 2 | Record declares a supply class that differs from the confirmed one | `out-of-supply` |
| 3 | Firmware is not confirmed | `unresolved` |
| 4 | Confirmed firmware is not in the record's declared scope | `out-of-firmware` |
| 5 | — | `applicable` |

`unresolved` means **no verdict was available**, not that the record failed the
check. Conflating those two produced the original build's worst defect: a record
appearing simultaneously as cited evidence and as out-of-scope evidence. The
answer builder treats `unresolved` as citable-pending-confirmation and excludes a
record only on an explicit `out-of-*` verdict.

## Provenance

Every asset field carries a source: `system`, `user`, `ocr` or `unknown`. Only
`system` and `user` are confirmed. An OCR reading populates the firmware field and
is displayed, but `confirmedValue()` returns null for it, so the applicability
check still reports `unresolved` and the ledger still asks for confirmation. That
boundary is the point of the prototype, and it is asserted in
`shouldIgnoreUnconfirmedOcrFirmwareWhenScopingAnswer`.

## Conflict detection

Two records conflict when they name the same fault code, declare disjoint firmware
scopes, and state different claims. This is computed from record metadata; no pair
is hardcoded. Records marked `evidenceClass: 'observation'` are excluded from
pairing, so a technician's field note can never be presented as one side of a
documentation conflict.

## Answer verdicts

`answer()` returns one of four structured outcomes, never free prose:

| Kind | When |
|---|---|
| `conflict` | A conflict exists and the deciding field is unconfirmed. Both sides cited, neither chosen. |
| `scoped` | One or more records are applicable. Excluded records are listed with the reason. |
| `abstain` | Nothing citable, or the confirmed context excludes everything that matched. Names what is missing. |
| `model-scoped-abstain` | Matching evidence exists but declares a different equipment model. |

The abstention paths name missing context explicitly rather than returning empty.

---

# Technologies used

| Layer | Technology | Version / config | Why this and not something else |
|---|---|---|---|
| Markup & styling | HTML5, hand-written CSS | single `<style>` block, CSS custom properties | No framework: the whole point is that a judge can read every line that produces the interface. No build output to audit. |
| Application code | JavaScript, native ES modules | `<script type="module">`, no transpile | Browsers run the source as written. The file on GitHub is the file that executes. |
| Retrieval | BM25, implemented from scratch | k₁ = 1.4, b = 0.72 | A hosted embedding API would add a key, a network dependency and an unauditable ranking. BM25 is ~30 lines and every score in the interface is reproducible by hand. |
| OCR | Tesseract.js 5.1.0 | loaded from cdnjs, runs in-browser (WASM) | Client-side keeps equipment photographs off any server — a real constraint on a plant floor, not a convenience. |
| Demo image source | HTML5 Canvas 2D | `synthesizeNameplate()` | Generates the nameplate at runtime, so the multimodal path demonstrates without shipping a photograph of real equipment. |
| Tests | `node:test` + `node:assert/strict` | Node 18+; no dependencies | Zero install. `engine.js` is importable by Node because it has no DOM coupling. |
| Local server | `python3 -m http.server` | any static server works | ES modules require an HTTP origin; `file://` will not load them. |
| Accessibility | ARIA live regions, `aria-pressed`, skip link, keyboard-operable evidence list | — | The ledger updates without a page change, so screen readers need the announcement. |

**Total third-party runtime dependencies: one** (Tesseract.js, and only on the OCR
path — the rest of the application works with the network off).

**There is no `package.json`, no lockfile, no `node_modules`, no bundler, no
transpiler, no CSS preprocessor, no backend, no database, no API key, and no
environment variable.** Nothing to install; nothing to configure.

---

# Implementation approach

## Sequence the work followed

1. **Write the corpus as the specification.** Eight synthetic records were
   authored first, with the *disagreement built into their metadata* — `SRC-014`
   scoped to firmware 2.4.1 and `SRC-021` to 2.3.8, both describing fault F12,
   with claims that genuinely differ. The conflict the prototype detects is a
   property of the data, so the detection code had something real to find rather
   than a flag to read.
2. **Implement the rules as pure functions, DOM-free.** `engine.js` was written
   and tested before any interface existed.
3. **Write the tests against the failure, not the feature.** Each test names the
   specific wrong behavior it forbids, not the feature it covers:
   `shouldNotExcludeTheSameRecordItSelectsAsApplicable`,
   `shouldNotAcceptDigitRunThatMatchesNoKnownRelease`,
   `shouldAbstainOnTorqueQuestionWithoutRelyingOnKeywordBlocklist`.
4. **Build the interface as a pure function of state.** Every render recomputes
   from scratch.
5. **Verify in a real browser, not by inspection.** The prototype was driven
   headless over the Chrome DevTools Protocol and the resulting DOM asserted
   against — see `EVALUATION.md` for the states checked and the verbatim OCR
   trace.

## Design rules applied throughout

**Absence of a value is represented, never defaulted.** `field(value, source)`
wraps every asset field. There is no code path where a missing firmware becomes a
guessed firmware in order to produce an answer. This is enforced at the type
boundary rather than by discipline: `confirmedValue()` returns `null` for anything
not sourced `system` or `user`, so a filter written by a future contributor
inherits the rule for free.

**Verdicts, not prose.** `answer()` returns a tagged object. The interface owns
all wording; the engine owns all decisions. Neither can drift into the other's
job, and a new verdict kind cannot be rendered by accident because the renderer
switches on `kind` explicitly.

**Exclusion is visible, never silent.** A record ruled out of scope is rendered
with its verdict label — `Different firmware scope`, `Different equipment model`,
`Different supply class`. Hiding it would make the system's reasoning
unfalsifiable; showing it is what makes the applicability check auditable.

**The failure mode is reproducible on demand.** Both retrieval toggles change real
behavior rather than annotating it:

- **BM25 keyword** off — every record scores equally; ranking disappears.
- **Metadata filter** off — every verdict becomes `unresolved` and no
  applicability check applies. With firmware confirmed as 2.4.1, the same F12
  question then cites four records *including an AX-320 platform table, on an
  AX-480 asset.* That is the exact failure this project targets, shown next to the
  treatment as a control condition.

## Handling imperfect machine perception

Real OCR of a metal plate loses separators. On the synthetic plate, Tesseract
returned `FWREV 24.1` at 92% confidence — the decimal point dropped — so a strict
`\d+\.\d+\.\d+` match found nothing and the confirm control never appeared.

`parseFirmware()` therefore:

1. Prefers a value that follows a firmware-ish label (`FW`, `FIRMWARE`, `REV`,
   `RELEASE`) over any other number on the plate.
2. Accepts a clean dotted version that matches a known release as
   `{ exact: true }`.
3. Otherwise strips non-digits and compares the digit run against known releases,
   returning `{ exact: false }` — surfaced in the interface as *reconstructed*,
   with an instruction to check the plate.
4. **Refuses a digit run that matches no known release** rather than inventing a
   version.

The verbatim garbled string is committed as a test fixture, so the reconstruction
path is tested against what OCR actually produced rather than against what a
clean plate would produce.

## Testing approach

41 tests, `node --test`, ~120 ms total, every test well under one second. Naming
convention `shouldDoXyz`. Coverage is organized by the property under protection,
not by function: tokenization and scoring, provenance, the five applicability
verdicts, abstention paths, conflict detection from metadata, the
observation/document separation, mode toggles, invariants (no record both cited
and excluded; corpus order never mutated; every claim bound to its own record id),
and `parseFirmware` including the noisy-OCR fixture.

```
node --test tests/engine.test.mjs
# 41 passing
```

---

# Setup instructions

## Requirements

- Any modern browser (Chrome, Edge, Firefox, Safari).
- Python 3 **or** Node 18+ — only to serve static files. Anything that serves a
  directory over HTTP works.
- Node 18+ additionally if you want to run the tests.
- Network access is needed **once**, and only for the OCR path: Tesseract.js loads
  from a CDN. Everything else runs offline.

No API keys. No accounts. No package installation. No environment file.

## Run it

```bash
git clone https://github.com/JuliaJ3/traceline-prototype.git
cd traceline-prototype
python3 -m http.server 8000
```

Open <http://localhost:8000>.

Node alternative, if Python is not present:

```bash
npx --yes serve -l 8000 .
```

> **Do not open `index.html` directly from the filesystem.** ES modules are
> blocked over `file://` and the page will load empty. It must be served over
> HTTP.

## Run the tests

```bash
node --test tests/engine.test.mjs
```

Expect 41 passing in roughly 120 ms. No install step — the tests import
`engine.js` and `app.js` directly.

## Publish it as a live demo

The application is fully static with relative paths only, so GitHub Pages serves
the repository as-is — no build, no workflow file:

1. Repository → **Settings** → **Pages**
2. **Source:** Deploy from a branch · **Branch:** `main` · **Folder:** `/ (root)`
3. **Save.** The URL appears within a minute at
   `https://juliaj3.github.io/traceline-prototype/`

## Verify the build in about 60 seconds

| Step | Expected |
|---|---|
| 1. Load the page | Firmware reads **Unknown**, ledger badge reads **Clarification needed** |
| 2. Click **Ask** on the default F12 question | Two records cited, stated as disagreeing; firmware named as the deciding field; the technician log entry shown separately under observations |
| 3. Set firmware to **2.4.1** in the asset bar | Badge changes to a scoped answer; the legacy table is listed as **Different firmware scope** rather than disappearing |
| 4. Set firmware to **2.3.8** | The scope inverts; no record is ever both cited and excluded |
| 5. Click **Use synthetic nameplate** | OCR suggests firmware, marked **unconfirmed**; **the ledger does not change** |
| 6. Click **Confirm** | Now the answer scopes, and the firmware field reads **Confirmed · user** |
| 7. Ask about fault **F91** | Abstention naming what is missing — not a citation of a record that merely contains the word "fault" |
| 8. Turn off **Metadata filter** with firmware confirmed | Four records cited including an AX-320 table for an AX-480 asset — the failure this project prevents |

Step 5 is the one to watch. If the ledger changes before confirmation, the central
guarantee is broken.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Blank page, console shows a module or CORS error | Opened over `file://` | Serve over HTTP as above |
| "OCR engine did not load" | No network on first use, or the CDN is blocked | Set firmware manually in the asset bar; every other path still works |
| First nameplate read hangs several seconds | Tesseract WASM and language data downloading | Wait once; it is cached afterwards. Load the page before recording a demo. |
| Tests fail with an import error | Node older than 18 | Upgrade Node; `node:test` and top-level `await` are required |

---

# Security and safety boundaries

- No equipment command interface of any kind. No maintenance action is
  recommended, and nothing here authorizes work.
- Source statements are labelled synthetic and claim no manufacturer authority.
- Confirmed fields are visually and structurally distinct from unconfirmed ones.
- All interpolated text is escaped at the render boundary (`esc()` in `app.js`).
- OCR runs entirely client-side; no image leaves the browser.
- Questions outside the corpus abstain rather than extrapolate.
- Future ingestion must treat text inside documents as untrusted data: a retrieved
  excerpt must never be able to change system behavior.
- A production pilot would require site approval, role-based access, audit trails,
  retention controls and qualified engineering review.

# Known limits

- Eight synthetic records. No manufacturer documentation or real equipment data.
- No semantic embeddings or vector store. Retrieval is lexical only.
- No PDF parsing. Table and diagram regions are human-authored fixtures, not
  extraction output. OCR is applied to nameplate images only.
- No LLM, backend, database, authentication or persisted session state.
- Known releases for OCR reconstruction are a fixed two-value list, not a release
  catalogue.
- No measured time savings or citation accuracy. Idea-phase evaluation targets
  remain untested hypotheses.

# Next engineering steps

1. Select one equipment family and obtain documents whose access and reuse terms
   permit testing.
2. Define the authority, revision, configuration, component and region schema with
   maintenance engineers.
3. Implement PDF text extraction and OCR preserving page coordinates; review table
   and diagram links manually.
4. Establish an exact-search and BM25 baseline, then add embeddings and evaluate
   the retrieval change in isolation.
5. Label test cases across ordinary lookup, table lookup, diagram reference,
   revision conflict, missing context, and adversarial instructions embedded in
   documents.
6. Measure claim support, applicability errors, abstention quality, coverage and
   task time against PDF search and text-only RAG.
7. Add access control, audit logging and deployment review before any read-only
   pilot.
