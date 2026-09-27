# Demo walkthrough

**Target length: 2:00–2:20.** Keep the browser at a readable zoom. Say the corpus
is synthetic once, at the start, and let the interface carry the rest.

## Script and shot list

**0:00–0:15 | The problem**
Open on the default state, firmware Unknown.

> "A search result can cite a real document and still be wrong, because the
> document covers a different revision of the machine. That failure looks exactly
> like a good answer. TraceLine is built to catch it. Every record here is
> synthetic — no manufacturer documentation."

**0:15–0:40 | The conflict**
Point at the ledger badge reading *Clarification needed*.

> "Fault F12 on this drive. Two records match, and they disagree: one covers
> firmware 2.4.x, the other 2.3.x, and they map F12 to different things. The
> asset firmware is unconfirmed, so TraceLine cites both and picks neither. It
> names firmware as the field that would settle it."

Point at the third block, below the two cited claims.

> "A technician's log entry also mentions F12 on this asset. It's shown — but
> under *Technician observations, not document-supported*, and it's excluded from
> the conflict. A field note isn't a controlled document."

**0:40–1:00 | Inspect the evidence**
Click both citation links, then click the wiring drawing in the evidence list.

> "Each citation opens its own source region — a text excerpt, an extracted table
> row, a diagram callout. The record id, revision and page region stay attached
> to the claim. Scores on the left are BM25, per record."

**1:00–1:25 | Multimodal input, unconfirmed**
Click **Use synthetic nameplate**.

> "A technician photographs the nameplate. OCR reads it and suggests firmware
> 2.4.1 — and notice it says *reconstructed*, because the OCR dropped a decimal
> point and TraceLine matched the digits against known releases rather than
> guessing."

Point at the ledger, still reading *Clarification needed*.

> "The suggestion is on screen. The answer has not changed. OCR is marked
> unconfirmed and cannot scope anything."

**1:25–1:45 | Confirmation resolves it**
Click **Confirm 2.4.1**.

> "Now the technician confirms it. The ledger scopes to the 2.4.x record, the
> legacy table is marked *Different firmware scope* rather than hidden, and the
> firmware field now reads *Confirmed, user*."

Optionally set firmware to 2.3.8 in the asset bar.

> "Confirm the other release and the scope inverts. No record is ever both cited
> and excluded."

**1:45–2:00 | Abstention**
Click **Ask something unsupported**, then ask about fault F91.

> "When the corpus can't support the question, TraceLine abstains and names what's
> missing. Asking about a fault code that isn't in the corpus also abstains — it
> won't cite a record just because the word 'fault' appears in it."

**2:00–2:20 | The failure, on demand**
Confirm firmware 2.4.1, re-ask the F12 question, then turn off **Metadata
filter**.

> "This is the failure the project exists to prevent. With the applicability
> check off, the same question cites four records — including a table for the
> AX-320 platform, on an AX-480 asset. Turn the check back on and it's excluded
> with the reason stated. Forty-one unit tests cover these rules. Next step is
> testing the workflow against approved documents with engineers reviewing the
> applicability labels."

## Recording checklist

- Start the local server first: `python3 -m http.server 8000`.
- Load the page once before recording so the OCR engine is cached, otherwise the
  first nameplate read stalls on the CDN fetch.
- Must appear on camera: the conflict, a citation opening its source region, the
  OCR suggestion *with the ledger unchanged*, the confirmed-and-scoped state,
  an abstention, and the metadata filter off.
- State the synthetic corpus once at the start.
- Do not imply measured accuracy, ABB integration, or a real maintenance
  recommendation.
- Optionally show `node --test tests/engine.test.mjs` passing as a closing shot.
- Upload with link access enabled and paste the URL into `SUBMISSION.md`.
