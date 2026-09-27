# Demo walkthrough

**Runtime: 3:51 as written. 4:01 with the optional beat. Ceiling 4:15.**

The timings below are not aspirational — they are computed from the word count of
each narration block at 145 words per minute, plus the seconds each click needs
to land on screen. If you speak at a normal pace and do not improvise, the
recording comes in at 3:51. Narration totals 472 words, and no beat asks for
more than 145 words per minute of actual speaking time.

**The spine.** One idea per beat, in one direction: *a citation can be real and
still wrong → TraceLine refuses to pick → a photo suggests but does not decide →
the technician confirms and the scope resolves → when nothing applies it says so
→ and here is the failure it prevents.* The opening earns the viewer's attention
before any interface appears; the closing states what the prototype argues, not
what it contains. Nothing asks the viewer to hold two threads at once.

Record against the live URL: <https://juliaj3.github.io/traceline-prototype/>

Every control name below appears on screen exactly as written. Say "synthetic
corpus" once, in the opening, and never again — the header chip carries it.

---

## Opening · 0:00–0:37 | Earn the attention before showing the tool

**On screen:** default state, untouched. Badge reads **Clarification needed**.
**Do:** nothing at all. No cursor movement. Let the still frame hold.

> "A technician is standing at a machine that has stopped. The panel shows a
> fault code. The answer is somewhere in the documentation — and what decides
> whether it is the right answer is not the sentence that answers the question.
> It is the revision table on the front page.
>
> This is TraceLine: a maintenance assistant whose job is not to answer faster,
> but to refuse to answer when it cannot do it honestly. It runs in the browser,
> on a synthetic corpus."

---

## Beat 1 · 0:37–0:55 | Name the failure mode

**Do:** point the cursor at the badge and leave it there.

> "The failure it targets is not a missing answer. It is a citation that is real,
> from a real page, and wrong — because the document covers a different revision
> of the machine. That looks identical to a correct answer."

---

## Beat 2 · 0:55–1:29 | It cites both and picks neither

**On screen:** the two rows under **Source-supported statements**.
**Do:** point at each row in turn, then at the **Needed to resolve** line at the
bottom of the ledger.

> "Fault F12 on this drive. Two records match and they disagree — one scoped to
> firmware 2.4.1, one to 2.3.8, mapping F12 to different things. The firmware is
> unconfirmed, so TraceLine cites both, selects neither, and names the field that
> would settle it."

**Do:** point at the row under **Technician observations · not
document-supported**.

> "A maintenance log also mentions F12. It is shown and labelled — but excluded
> from the disagreement and from cited support. A field note is not a controlled
> document."

---

## Beat 3 · 1:29–1:50 | Every claim opens its region

**Do:** click **Inspect SRC-014 · p. 4 · region 2**, then **Inspect SRC-021**,
then click the wiring drawing in **Retrieved evidence**. Three clicks, evenly
paced.

> "Each statement opens the region it came from — an excerpt, a table row, a
> diagram callout — with the record id, revision and page attached. The scores on
> the left are BM25, per record, shown rather than hidden."

---

## Beat 4 · 1:50–2:26 | A photo suggests

**Do:** click **Use synthetic nameplate**. Wait for the read to finish before
speaking — the six-second pause is budgeted.

> "The technician photographs the nameplate. OCR reads it and suggests firmware
> 2.4.1, with the confidence it got. If the read is dirty the panel marks the
> value *reconstructed* — TraceLine matches the digits against known releases
> rather than inventing a version that does not exist."

**Do:** move the cursor to the badge. It still reads **Clarification needed**.
Hold there.

> "The suggestion is on screen. The answer has not moved. An unconfirmed value
> cannot scope anything. Machine perception informs the technician; it does not
> stand in for them."

---

## Beat 5 · 2:26–2:45 | The technician decides

**Do:** click **Confirm 2.4.1** in the nameplate panel.

> "Now a human confirms it."

**On screen:** badge flips to **Context applied · scoped answer**; firmware
provenance reads **Confirmed · user**.

> "The ledger scopes to the 2.4.1 note. The legacy table moves under *Retrieved
> but out of scope*, marked *Different firmware scope* — excluded with its reason
> visible, not quietly dropped."

### Optional · +0:10

**Do:** switch the asset-bar **Firmware** select to **2.3.8**.

> "Confirm the other release and the scope inverts. No record is ever both cited
> and excluded."

This is the first thing to cut if you are running long. It strengthens the point
but does not carry it.

---

## Beat 6 · 2:45–3:06 | Two ways to have no answer

**Do:** click **Ask about F18** while firmware is still 2.4.1. Then, after the
second sentence, click **Ask something unsupported**.

> "F18 is in the corpus, but only in the 2.3.8 table. Confirm 2.4.1 and TraceLine
> abstains: *Insufficient evidence*. The record exists, its scope does not match,
> and it stays on screen. When nothing matches at all, it abstains and names what
> is missing."

---

## Beat 7 · 3:06–3:25 | The control condition

**Do:** click **Reset scenario**, set **Firmware** to **2.4.1**, then click
**Metadata filter** to turn it off.

> "And here is the failure this prevents, on demand. With the applicability check
> off, the same question cites four records — top-ranked is a table for the AX-320
> platform, on an AX-480 asset."

---

## Closing · 3:25–3:51 | State the argument, not the feature list

**Do:** click **Metadata filter** back on. The badge returns to **Context
applied · scoped answer** with the legacy table excluded and its reason shown.
Stop moving the cursor. Hold this frame to the end of the recording.

> "Forty-one unit tests cover these rules, and none of the logic is specific to
> drives or firmware. The same discipline applies anywhere evidence is scoped.
>
> The argument is narrow. An assistant that says *I need one more fact* is worth
> more than one that answers everything confidently and is occasionally,
> invisibly wrong. Thank you."

The last frame is the treatment condition, not the failure — end on what the
system does right, immediately after showing what it prevents.

---

## Optional extra shot · +0:06

Terminal: `node --test tests/engine.test.mjs` → 41 pass. No narration. Place it
after the closing, never inside it.

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
- Leave two seconds of silence at the head and tail. The opening and closing both
  need a still frame to land on.
- **Cut order if you run past 4:15:** the optional beat in 5, then the second
  half of beat 6, then the middle paragraph of the opening. Never cut beat 7 or
  the closing — they are the argument.
- Do not imply measured accuracy, ABB integration, or a real maintenance
  recommendation. The footer disclaimer does not cover a spoken claim.
- Upload with link access enabled, then paste the URL into the **Video link**
  field in `PROJECT_SUMMARY.md`.
