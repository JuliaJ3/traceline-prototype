# Verification and evaluation

## Automated tests

```
node --test tests/engine.test.mjs
```

**41 tests, 41 passing, ~120 ms total.** Each test completes well under a second;
one asserts that bound directly.

`engine.js` contains no DOM or network access, so the rules that decide what
TraceLine may say are tested without a browser. `app.js` defers all DOM access
into `init()`, which makes `parseFirmware()` importable and testable too.

Tests are named for the behavior they pin down. The ones worth knowing about:

| Test | Guards against |
|---|---|
| `shouldNotReturnF12AnswerWhenAskedAboutUnrelatedFaultCode` | Citing a record because it contains the generic word "fault" |
| `shouldNotExcludeTheSameRecordItSelectsAsApplicable` | A record appearing as both cited and out-of-scope. Loops both firmware values. |
| `shouldKeepEveryCitedClaimBoundToItsOwnRecordId` | Claim text rendered against another record's id, page or region. Five queries × three firmware states. |
| `shouldNotMutateCorpusOrderDuringRetrieval` | Ranking state leaking between queries |
| `shouldIgnoreUnconfirmedOcrFirmwareWhenScopingAnswer` | An OCR reading scoping an answer without confirmation |
| `shouldReconstructFirmwareWhenOcrDropsADecimalPoint` | Regression on real garbled Tesseract output, used verbatim as the fixture |
| `shouldNotAcceptDigitRunThatMatchesNoKnownRelease` | Inventing a firmware version from noise |
| `shouldCompleteAnswerCallWellUnderFiveSeconds` | Performance regression; 400 iterations |

Plus coverage of BM25 ranking order and index statistics, fault-code
normalization (`F-27` / `F 27` / `f27`), model scoping, supply-class scoping,
observation-class exclusion from conflict pairing, abstention content, and
metadata-filter on/off behavior.

## Behavior verified in a browser

Driven through the Chrome DevTools Protocol against headless Chrome, asserting on
live DOM state, with **zero console errors**:

| Scenario | Verified result |
|---|---|
| F12, firmware unconfirmed | `conflict` · cites SRC-014 + SRC-021 · SRE-071 separated as an observation |
| F12, firmware confirmed 2.4.1 | `scoped` · cites SRC-014 + SRC-088 · SRC-021 excluded *Different firmware scope* |
| F12, firmware confirmed 2.3.8 | Scope inverts; no record is both cited and excluded |
| Fault F18 | `scoped` to SRC-021, the only carrier |
| Fault F91 (absent from corpus) | `abstain` · 0 claims · 2 missing items named |
| "Safe torque value" | `abstain` · 0 claims · 2 missing items named |
| Fieldbus timeout query | `model-scoped-abstain` · evidence exists but declares the AX-320 platform |
| Firmware present but `ocr`-sourced | Still `conflict`, still requests confirmation |
| Metadata filter off, firmware 2.4.1 | Cites 4 records including the AX-320 table — the failure reproduced |
| All three citation links | Each opens the correct source region |
| Metadata toggle | Out-of-scope count 1 → 0 and `aria-pressed` flips |

OCR path, end to end on the synthetic nameplate:

```
ocr panel      : Suggested firmware 2.4.1 · OCR confidence 92% · reconstructed
fw provenance  : OCR suggestion · unconfirmed
badge          : Clarification needed        ← unchanged by the suggestion
after confirm  : Context applied · scoped answer
after confirm  : Confirmed · user
```

Also checked: keyboard operation of the evidence list (Enter and Space), skip
link, `aria-live` ledger updates, and layout at 400px width.

These are behavior checks. They are **not** an industrial accuracy evaluation, and
nothing here measures whether a real technician is faster or safer.

## Proposed benchmark

Not run. Recorded so the claim stays honest about what would be required.

The idea phase proposed 60 cases — 20 development, 40 held out — spanning ordinary
lookup, table lookup, diagram reference, revision conflict, unanswerable
questions, and adversarial instructions embedded in source documents. Compare PDF
search, text-only RAG and TraceLine over the same permitted corpus.

Report with case counts and confidence intervals where practical:

- Claim-level citation support
- Applicability errors, separated into wrong-model and wrong-revision
- Correct abstention on unanswerable questions
- Answer coverage and clarification rate
- Median evidence-finding time on matched tasks
- Table and diagram region retrieval accuracy
- Behavior on adversarial instructions embedded in documents

The idea-phase targets — 90% claim-level citation support and a 25% reduction in
median evidence-finding time — are **hypotheses to test, not results.** This build
measures neither.
