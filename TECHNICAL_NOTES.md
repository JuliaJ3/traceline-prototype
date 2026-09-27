# Technical notes

## What this build tests

One claim: a troubleshooting answer becomes safer to inspect when the system
checks document scope against *confirmed* asset metadata and shows disagreement
instead of resolving it silently.

The implementation is a static browser prototype. It is not a production RAG
system, a validated industrial tool, or an ABB product integration.

## Structure

```
index.html            markup, styles, module entry point
engine.js             retrieval + applicability + abstention (no DOM, no network)
app.js                rendering, event wiring, OCR intake, firmware parsing
tests/engine.test.mjs 41 unit tests over engine.js and parseFirmware
```

The split is deliberate. Every rule that decides what TraceLine may say lives in
`engine.js` as pure functions, so the rules are testable without a browser and
cannot be quietly weakened by a rendering change. `app.js` composes no prose of
its own: it renders claims that `engine.js` selected.

## Retrieval

BM25 over the record's title, type, heading, claim and excerpt text:

```
score(t) = idf(t) · ( tf · (k₁+1) ) / ( tf + k₁ · (1 − b + b · len/avglen) )
k₁ = 1.4   b = 0.72   idf(t) = ln(1 + (N − n + 0.5)/(n + 0.5))
```

`buildIndex()` returns inert data — term frequencies, document lengths, idf map,
average length — so tests can assert on the statistics directly. Retrieval never
sorts the corpus in place; it returns new arrays, so ranking state cannot leak
between queries.

Tokenization keeps version and code shapes intact and emits a two-part prefix for
dotted versions, so an asset on `2.4.1` matches a document scoped to `2.4.x`. A
small stopword set removes question scaffolding ("what", "does", "mean") that
would otherwise contribute score.

**Fault codes are identifiers, not terms.** `faultCodes()` normalizes `F-27`,
`F 27` and `f27` to one form. A record carrying a queried code receives a fixed
score bonus, and — more importantly — when a query names any code, only records
carrying one of those codes may be cited at all. Without that rule, asking about
a code absent from the corpus produced cited claims, because records matching
only the generic word "fault" cleared the relevance threshold.

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
answer builder now treats `unresolved` as citable-pending-confirmation and
excludes a record only on an explicit `out-of-*` verdict.

## Provenance

Every asset field carries a source: `system`, `user`, `ocr` or `unknown`. Only
`system` and `user` are confirmed. An OCR reading populates the firmware field
and is displayed, but `confirmedValue()` returns null for it, so the applicability
check still reports `unresolved` and the ledger still asks for confirmation. That
boundary is the point of the prototype, and it is asserted in
`shouldIgnoreUnconfirmedOcrFirmwareWhenScopingAnswer`.

## Conflict detection

Two records conflict when they name the same fault code, declare disjoint
firmware scopes, and state different claims. This is computed from record
metadata; no pair is hardcoded. Records marked `evidenceClass: 'observation'` are
excluded from pairing, so a technician's field note can never be presented as one
side of a documentation conflict.

## Answer verdicts

`answer()` returns one of four structured outcomes, never free prose:

| Kind | When |
|---|---|
| `conflict` | A conflict exists and the deciding field is unconfirmed. Both sides cited, neither chosen. |
| `scoped` | One or more records are applicable. Excluded records are listed with the reason. |
| `abstain` | Nothing citable, or the confirmed context excludes everything that matched. Names what is missing. |
| `model-scoped-abstain` | Matching evidence exists but declares a different equipment model. |

The abstention paths name missing context explicitly rather than returning empty.

## Multimodal path

`synthesizeNameplate()` draws a nameplate to a canvas and hands the resulting PNG
to Tesseract.js, so the image path is demonstrable offline without shipping a
photograph. Uploading a real photo uses the same code path.

Real OCR of a metal plate loses separators. On the synthetic plate, Tesseract
returned `FWREV 24.1` at 92% confidence — the decimal point was dropped — so a
strict `\d+\.\d+\.\d+` match found nothing and the confirm control never
appeared. `parseFirmware()` now prefers a value following a firmware-ish label,
then normalizes the digit run and compares it against known releases, returning
`{ value, exact }`. A reconstructed match is labelled *reconstructed* in the
interface with an instruction to check the plate. It refuses digit runs that
match no known release rather than inventing a version. The verbatim garbled
string is a test fixture.

## Retrieval mode toggles

Both toggles change real behavior and exist to make the failure visible:

- **BM25 keyword** off — every record scores equally, so ranking disappears.
- **Metadata filter** off — every verdict becomes `unresolved` and no
  applicability check is applied. With firmware confirmed as 2.4.1, the answer
  then cites four records including an AX-320 platform table, for an AX-480
  asset. That is the failure mode this project targets, reproduced on demand.

## Safety and security boundaries

- No equipment command interface of any kind. No maintenance action is
  recommended.
- Source statements are labelled synthetic and claim no manufacturer authority.
- Confirmed fields are visually and structurally distinct from unconfirmed ones.
- All interpolated text is escaped at the render boundary.
- Questions outside the corpus abstain rather than extrapolate.
- Future ingestion must treat text inside documents as untrusted data: a
  retrieved excerpt must never be able to change system behavior.
- A production pilot would require site approval, role-based access, audit
  trails, retention controls and qualified engineering review.

## Known limits

- Eight synthetic records. No manufacturer documentation or real equipment data.
- No semantic embeddings or vector store. Retrieval is lexical only.
- No PDF parsing. Table and diagram regions are human-authored fixtures, not
  extraction output. OCR is applied to nameplate images only.
- No LLM, backend, database, authentication or persisted session state.
- Known releases for OCR reconstruction are a fixed two-value list, not a
  release catalogue.
- No measured time savings or citation accuracy. Idea-phase evaluation targets
  remain untested hypotheses.

## Next engineering steps

1. Select one equipment family and obtain documents whose access and reuse terms
   permit testing.
2. Define the authority, revision, configuration, component and region schema
   with maintenance engineers.
3. Implement PDF text extraction and OCR preserving page coordinates; review
   table and diagram links manually.
4. Establish an exact-search and BM25 baseline, then add embeddings and evaluate
   the retrieval change in isolation.
5. Label test cases across ordinary lookup, table lookup, diagram reference,
   revision conflict, missing context, and adversarial instructions embedded in
   documents.
6. Measure claim support, applicability errors, abstention quality, coverage and
   task time against PDF search and text-only RAG.
7. Add access control, audit logging and deployment review before any read-only
   pilot.
