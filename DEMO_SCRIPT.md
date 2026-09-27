# Demo walkthrough

**Target length: 2:20. Hard ceiling 2:30.**

One idea per beat, in one direction: *a citation can be real and still wrong →
TraceLine refuses to pick → a photo suggests but does not decide → the technician
confirms and the scope resolves → when nothing applies it says so → and here is
the failure it prevents.* Nothing in the script asks the viewer to hold two
threads at once.

Record against the live URL: <https://juliaj3.github.io/traceline-prototype/>

Every control name below appears on screen exactly as written. Say "synthetic
corpus" once, in beat 1, and never again — the header chip carries it.

---

## Beat 1 · 0:00–0:14 | The failure mode

**On screen:** default state. Badge reads **Clarification needed**.
**Do:** nothing. Let the ledger sit.

> "This is a citation that is real, from a real page, and wrong — because the
> document covers a different revision of the machine. That failure looks
> identical to a correct answer. TraceLine exists to catch it. Every record here
> is synthetic."

---

## Beat 2 · 0:14–0:42 | It cites both and picks neither

**On screen:** the two rows under **Source-supported statements**.
**Do:** point at the badge, then at each row, then at the **Needed to resolve**
line at the bottom of the ledger.

> "Fault F12 on this drive. Two records match and they disagree — a service note
> scoped to firmware 2.4.1, a troubleshooting table scoped to 2.3.8, mapping F12
> to different things. The asset firmware is unconfirmed, so TraceLine cites both
> and selects neither. And it names the one field that would settle it:
> firmware."

**Do:** point at the row under **Technician observations · not
document-supported**.

> "A maintenance log on this same asset also mentions F12. It is shown, and it is
> labelled — but it is excluded from the disagreement and from cited support. A
> field note is not a controlled document."

---

## Beat 3 · 0:42–1:00 | Every claim opens its region

**Do:** click **Inspect SRC-014 · p. 4 · region 2**, then **Inspect SRC-021**, then
click the wiring drawing in **Retrieved evidence**.

> "Each statement opens the region it came from — a text excerpt, an extracted
> table row, a diagram callout — with the record id, revision and page attached.
> The numbers on the left are BM25 scores, per record, shown rather than hidden."

---

## Beat 4 · 1:00–1:26 | A photo suggests

**Do:** click **Use synthetic nameplate**. Wait for the read.

> "The technician photographs the nameplate. OCR suggests firmware 2.4.1 — and
> it says *reconstructed*, because the read was imperfect. TraceLine matched the
> digits against known releases instead of guessing a version that does not
> exist."

**Do:** move the cursor back to the badge. It still reads **Clarification
needed**. Hold for two seconds.

> "The suggestion is on screen. The answer has not moved. The firmware field
> reads *OCR suggestion · unconfirmed*, and an unconfirmed value cannot scope
> anything. Machine perception informs the technician; it does not stand in for
> them."

---

## Beat 5 · 1:26–1:50 | The technician decides

**Do:** click **Confirm 2.4.1** in the nameplate panel.

> "Now a human confirms it."

**On screen:** badge flips to **Context applied · scoped answer**; the firmware
provenance reads **Confirmed · user**.

> "The ledger scopes to the 2.4.1 service note. The legacy table moves under
> *Retrieved but out of scope*, marked *Different firmware scope* — excluded with
> its reason visible, not quietly dropped."

**Do:** in the asset bar, switch **Firmware** to **2.3.8**.

> "Confirm the other release and the scope inverts. No record is ever both cited
> and excluded."

---

## Beat 6 · 1:50–2:06 | Two ways to have no answer

**Do:** click **Ask about F18** while firmware is still 2.3.8, then switch
**Firmware** to **2.4.1**.

> "F18 is in the corpus — but only in the 2.3.8 table. Confirm 2.4.1 and
> TraceLine abstains: *Insufficient evidence*. The record exists, its scope does
> not match, and it stays on screen as out of scope."

**Do:** click **Ask something unsupported**.

> "And when nothing in the corpus addresses the question at all, it abstains and
> names what is missing instead of citing the nearest paragraph."

---

## Beat 7 · 2:06–2:20 | The control condition

**Do:** click **Reset scenario**, set **Firmware** to **2.4.1**, then click
**Metadata filter** to turn it off.

> "Here is the failure this prevents, reproduced on demand. With the
> applicability check off, the same question cites four records — top-ranked is a
> troubleshooting table for the AX-320 platform, on an AX-480 asset. Turn the
> check back on and it is excluded with the reason stated. Forty-one unit tests
> cover these rules. Next step is running the workflow against approved
> documents with engineers reviewing the applicability labels."

---

## Optional closing shot · +0:06

Terminal: `node --test tests/engine.test.mjs` → 41 pass. No narration.

---

## What must appear on camera

Non-negotiable, in this order:

1. The conflict, with both records cited and neither selected.
2. A citation opening its own source region.
3. The OCR suggestion **with the badge unchanged**.
4. The confirmed-and-scoped state, with the excluded record and its reason.
5. An abstention.
6. **Metadata filter** off, citing the AX-320 record.

## Recording checklist

- Record against <https://juliaj3.github.io/traceline-prototype/>. No local
  server needed; if you prefer local, `python3 -m http.server 8000` first.
- **Warm the OCR engine before you record.** Open the page, click **Use
  synthetic nameplate**, wait for the read, then click **Reset scenario**. The
  Tesseract WASM bundle is fetched from a CDN on first use and will stall on
  camera otherwise.
- Browser at 100% zoom, window wide enough that the three columns stay side by
  side. Close extra tabs and hide bookmarks.
- Narrate at a normal pace. If you run past 2:30, cut the firmware-inversion
  sentence in beat 5 and the second half of beat 6 — not beat 7.
- Do not imply measured accuracy, ABB integration, or a real maintenance
  recommendation. The footer disclaimer does not cover a spoken claim.
- Upload with link access enabled, then paste the URL into the **Video link**
  field in `PROJECT_SUMMARY.md`.
