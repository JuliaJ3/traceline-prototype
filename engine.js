/**
 * TraceLine retrieval and applicability engine.
 *
 * Pure logic: no DOM, no network. Imported by index.html and exercised by
 * tests/engine.test.mjs so the retrieval and abstention rules can be verified
 * independently of the interface.
 *
 * Every record below is synthetic. No manufacturer documentation is reproduced.
 */

/* ------------------------------------------------------------------ corpus */

export const CORPUS = [
  {
    id: 'SRC-014',
    title: 'Service note · firmware 2.4 series',
    type: 'Service note',
    kind: 'text',
    rev: 'Draft 02',
    date: '2026-06-14',
    model: 'AX-480',
    firmware: ['2.4.1'],
    supply: null,
    faults: ['f12'],
    page: 'p. 4 · region 2',
    heading: 'Fault code F12',
    claim: 'On firmware 2.4.x, F12 is recorded when the controller cannot confirm the configured supply class during startup diagnostics.',
    text: 'For AX-480 firmware 2.4.x, F12 is recorded when the controller cannot confirm the configured supply class during startup diagnostics. This note describes the code context only. Confirm the installed firmware and supply class against the asset record before using this note.',
    sourceNote: 'Synthetic service note · revision 02'
  },
  {
    id: 'SRC-021',
    title: 'Troubleshooting table · legacy release',
    type: 'Troubleshooting table',
    kind: 'table',
    rev: 'Rev C',
    date: '2025-10-03',
    model: 'AX-480',
    firmware: ['2.3.8'],
    supply: null,
    faults: ['f12', 'f18'],
    page: 'p. 11 · table 3',
    heading: 'Fault lookup table',
    claim: 'On firmware 2.3.x, the table maps F12 to supply input below a configured threshold.',
    text: 'F12 | Supply input below configured threshold | Applies to controller firmware 2.3.x. If the firmware revision is unknown, use the equipment nameplate and release record to identify the applicable table before interpreting the code.',
    sourceNote: 'Synthetic troubleshooting table · revision C'
  },
  {
    id: 'SRC-033',
    title: 'Configuration drawing · supply classes',
    type: 'Diagram region',
    kind: 'diagram',
    rev: 'Issue A',
    date: '2026-02-20',
    model: 'AX-480',
    firmware: ['2.4.1', '2.3.8'],
    supply: null,
    faults: [],
    page: 'p. 2 · callout A',
    heading: 'Configuration overview',
    claim: 'The drawing identifies nameplate supply class and controller release record as the two configuration fields needed to select a reference.',
    text: 'The drawing links each AX-480 asset record to a nameplate supply class and a controller release record. Callout A marks the two fields required to select a firmware-specific troubleshooting reference.',
    sourceNote: 'Synthetic configuration drawing · issue A'
  },
  {
    id: 'SRC-047',
    title: 'Service bulletin · cooling feedback',
    type: 'Service bulletin',
    kind: 'text',
    rev: 'Rev B',
    date: '2026-04-11',
    model: 'AX-480',
    firmware: ['2.4.1'],
    supply: null,
    faults: ['f27'],
    page: 'p. 2 · region 1',
    heading: 'Fault code F27',
    claim: 'On firmware 2.4.x, F27 is recorded when cooling fan feedback is absent for a sustained interval.',
    text: 'For AX-480 firmware 2.4.x, F27 is recorded when the controller receives no cooling fan feedback signal for a sustained interval. The bulletin describes the code context and does not define a corrective procedure.',
    sourceNote: 'Synthetic service bulletin · revision B'
  },
  {
    id: 'SRC-052',
    title: 'Troubleshooting table · AX-320 platform',
    type: 'Troubleshooting table',
    kind: 'table',
    rev: 'Rev F',
    date: '2026-05-22',
    model: 'AX-320',
    firmware: ['1.9.4'],
    supply: null,
    faults: ['f12'],
    page: 'p. 7 · table 1',
    heading: 'Fault lookup table',
    claim: 'On the AX-320 platform, the table maps F12 to a communication timeout on the fieldbus interface.',
    text: 'F12 | Fieldbus communication timeout | Applies to AX-320 controllers, firmware 1.9.x. This table does not cover the AX-480 platform.',
    sourceNote: 'Synthetic troubleshooting table · revision F'
  },
  {
    id: 'SRC-060',
    title: 'Commissioning checklist · 400 V configuration',
    type: 'Commissioning checklist',
    kind: 'text',
    rev: 'Rev A',
    date: '2026-01-09',
    model: 'AX-480',
    firmware: ['2.4.1', '2.3.8'],
    supply: '400V',
    faults: [],
    page: 'p. 1 · region 3',
    heading: 'Supply class configuration field',
    claim: 'The checklist records that the configured supply class parameter is set during commissioning for 400 V installations.',
    text: 'For AX-480 assets commissioned as a 400 V installation, the configured supply class parameter is recorded on the commissioning sheet. This checklist does not apply to 480 V installations.',
    sourceNote: 'Synthetic commissioning checklist · revision A'
  },
  {
    id: 'SRC-088',
    title: 'Control wiring drawing · supply sensing',
    type: 'Diagram region',
    kind: 'diagram',
    rev: 'Issue C',
    date: '2026-03-30',
    model: 'AX-480',
    firmware: ['2.4.1'],
    supply: null,
    faults: ['f12'],
    page: 'p. 5 · callout B',
    heading: 'Supply sensing callout',
    claim: 'The drawing marks the supply sensing input referenced by the firmware 2.4.x startup diagnostic.',
    text: 'Callout B marks the supply sensing input associated with the startup diagnostic described for firmware 2.4.x. The drawing identifies the signal path only and does not describe a measurement procedure.',
    sourceNote: 'Synthetic control wiring drawing · issue C'
  },
  {
    id: 'SRE-071',
    title: 'Maintenance log · asset 00481',
    type: 'Service record',
    kind: 'record',
    rev: 'Entry 14',
    date: '2026-08-02',
    model: 'AX-480',
    asset: '00481',
    firmware: ['2.4.1', '2.3.8'],
    supply: null,
    faults: ['f12'],
    page: 'entry 14 · field note',
    heading: 'Prior F12 occurrence',
    claim: 'A technician recorded a prior F12 event on this asset and noted that it cleared after a site power interruption.',
    text: 'Entry 14: F12 observed on asset 00481. Note from attending technician: code cleared following a site power interruption. No parameter change recorded. This entry is a field observation and was not reviewed against a controlled document.',
    sourceNote: 'Synthetic maintenance log · entry 14',
    evidenceClass: 'observation'
  }
];

/* -------------------------------------------------------------- tokenizing */

const STOPWORDS = new Set([
  'the', 'and', 'for', 'what', 'does', 'mean', 'should', 'check', 'first',
  'this', 'that', 'with', 'from', 'are', 'was', 'you', 'can', 'how', 'why',
  'when', 'which', 'its', 'has', 'have', 'been', 'will', 'would', 'about',
  'there', 'their', 'then', 'than', 'into', 'any', 'all', 'but', 'not'
]);

/** Tokenize text into comparable terms, preserving version and code shapes. */
export function tokenize(text) {
  const raw = String(text).toLowerCase().match(/[a-z0-9]+(?:\.[a-z0-9]+)*/g) || [];
  const out = [];
  for (const t of raw) {
    if (t.length < 2 || STOPWORDS.has(t)) continue;
    out.push(t);
    // "2.4.x" also contributes "2.4" so a 2.4.1 asset matches a 2.4.x document.
    const parts = t.split('.');
    if (parts.length > 2) out.push(parts.slice(0, 2).join('.'));
  }
  return out;
}

/** Extract normalized fault codes ("f12") mentioned in free text. */
export function faultCodes(text) {
  const hits = String(text).toLowerCase().match(/\bf\s?-?\d{1,3}\b/g) || [];
  return [...new Set(hits.map((h) => 'f' + h.replace(/[^0-9]/g, '')))];
}

/* ------------------------------------------------------------- BM25 scoring */

const K1 = 1.4;
const B = 0.72;

function docTerms(d) {
  return tokenize([d.title, d.type, d.heading, d.text, d.claim].join(' '));
}

/**
 * Build a BM25 index over a corpus. Returned index is inert data so tests can
 * assert on idf and length statistics directly.
 */
export function buildIndex(corpus = CORPUS) {
  const docs = corpus.map((d) => {
    const terms = docTerms(d);
    const tf = new Map();
    for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
    return { id: d.id, tf, len: terms.length };
  });
  const N = docs.length;
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const idf = new Map();
  for (const [t, n] of df) idf.set(t, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
  const avglen = docs.reduce((s, d) => s + d.len, 0) / (N || 1);
  return { docs: new Map(docs.map((d) => [d.id, d])), idf, avglen, N };
}

/** BM25 score of one record against a query. Returns 0 when nothing matches. */
export function score(record, query, index) {
  const entry = index.docs.get(record.id);
  if (!entry) return 0;
  let total = 0;
  for (const t of new Set(tokenize(query))) {
    const tf = entry.tf.get(t);
    if (!tf) continue;
    const idf = index.idf.get(t) || 0;
    total += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (entry.len / index.avglen))));
  }
  return Number(total.toFixed(4));
}

/* ------------------------------------------------------- asset + filtering */

/**
 * Asset field with provenance. Only 'system' and 'user' fields are treated as
 * confirmed. An 'ocr' suggestion is never used as a retrieval filter until a
 * technician confirms it — that boundary is the point of the prototype.
 */
export function field(value, source) {
  return { value: value ?? null, source: source || 'unknown' };
}

export function isConfirmed(f) {
  return !!f && f.value !== null && f.value !== 'unknown' && (f.source === 'user' || f.source === 'system');
}

export function confirmedValue(f) {
  return isConfirmed(f) ? f.value : null;
}

/**
 * Applicability of one record against confirmed asset context.
 * Returns: 'applicable' | 'out-of-model' | 'out-of-firmware' | 'out-of-supply' | 'unresolved'
 */
export function applicability(record, asset) {
  const model = confirmedValue(asset.model);
  const firmware = confirmedValue(asset.firmware);
  const supply = confirmedValue(asset.supply);

  if (model && record.model !== model) return 'out-of-model';
  if (record.supply && supply && record.supply !== supply) return 'out-of-supply';
  if (!firmware) return 'unresolved';
  if (record.firmware && !record.firmware.includes(firmware)) return 'out-of-firmware';
  return 'applicable';
}

export const APPLICABILITY_LABELS = {
  applicable: 'Applies to confirmed context',
  'out-of-model': 'Different equipment model',
  'out-of-firmware': 'Different firmware scope',
  'out-of-supply': 'Different supply class',
  unresolved: 'Applicability unresolved'
};

/* -------------------------------------------------------------- retrieval */

/**
 * Retrieve and rank records.
 * modes.keyword  — enable BM25 lexical scoring
 * modes.metadata — enable asset metadata filtering
 */
export function retrieve(query, asset, modes = { keyword: true, metadata: true }, corpus = CORPUS, index = null) {
  const idx = index || buildIndex(corpus);
  const codes = faultCodes(query);

  const scored = corpus.map((record) => {
    let s = modes.keyword ? score(record, query, idx) : 1;
    // A fault code is an exact identifier, not a bag-of-words term: boost records
    // that actually carry the code the technician asked about.
    const codeHit = codes.length > 0 && codes.some((c) => (record.faults || []).includes(c));
    if (codeHit) s += 6;
    const status = modes.metadata ? applicability(record, asset) : 'unresolved';
    return { record, score: Number(s.toFixed(4)), status, codeHit };
  });

  const matched = scored.filter((r) => r.score > 0);
  matched.sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
  return { results: matched, all: scored, codes };
}

/* ------------------------------------------------- conflict detection */

/**
 * Detect fault-code disagreement among in-scope candidates.
 * A conflict is two records that describe the same fault code for disjoint
 * firmware scopes. Derived from record metadata — never hardcoded by id.
 */
export function detectConflicts(results, asset) {
  const model = confirmedValue(asset.model);
  const usable = results.filter(
    (r) =>
      r.codeHit &&
      r.record.evidenceClass !== 'observation' &&
      r.status !== 'out-of-model' &&
      (!model || r.record.model === model)
  );

  const byCode = new Map();
  for (const r of usable) {
    for (const code of r.record.faults || []) {
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code).push(r);
    }
  }

  const conflicts = [];
  for (const [code, group] of byCode) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i].record;
        const b = group[j].record;
        const fwA = a.firmware || [];
        const fwB = b.firmware || [];
        const disjoint = !fwA.some((v) => fwB.includes(v));
        if (disjoint && a.claim !== b.claim) {
          conflicts.push({ code, a: group[i], b: group[j] });
        }
      }
    }
  }
  return conflicts;
}

/* ----------------------------------------------------- answer assembly */

const ABSTAIN_MIN_SCORE = 1.0;

/**
 * Decide what TraceLine can say. Returns a structured verdict the interface
 * renders; it never composes prose beyond the retrieved claims.
 *
 * kind: 'abstain' | 'model-scoped-abstain' | 'conflict' | 'scoped'
 */
export function answer(query, asset, modes = { keyword: true, metadata: true }, corpus = CORPUS, index = null) {
  const { results, codes } = retrieve(query, asset, modes, corpus, index);
  const model = confirmedValue(asset.model);
  const firmware = confirmedValue(asset.firmware);

  const inModel = results.filter((r) => r.status !== 'out-of-model');
  let strong = inModel.filter((r) => r.score >= ABSTAIN_MIN_SCORE);

  // A query naming a fault code is an exact-identifier query. Generic wording
  // ("what does fault ... mean") must never carry an unrelated record over the
  // threshold, so when codes are named only records carrying one may be cited.
  if (codes.length > 0) {
    const carriers = strong.filter((r) => r.codeHit);
    strong = carriers;
  }

  // Nothing in this corpus addresses the question for this asset's model.
  if (strong.length === 0) {
    const elsewhere = results.filter((r) => r.status === 'out-of-model' && r.score >= ABSTAIN_MIN_SCORE);
    if (elsewhere.length > 0) {
      return {
        kind: 'model-scoped-abstain',
        summary: `The retrieved records that mention this topic describe the ${elsewhere[0].record.model} platform, not the confirmed asset model ${model || 'in this session'}.`,
        decision: 'TraceLine abstains. Evidence exists in the corpus but its stated equipment scope does not match this asset.',
        claims: [],
        observations: [],
        outOfScope: elsewhere,
        missing: [`An approved ${model || 'matching-model'} document covering ${codes.length ? codes.join(', ').toUpperCase() : 'this topic'}.`],
        needed: null,
        codes
      };
    }
    return {
      kind: 'abstain',
      summary: 'The demo corpus contains no record that addresses this question for the active asset.',
      decision: 'TraceLine abstains. The matching evidence is absent from the available sources.',
      claims: [],
      observations: [],
      outOfScope: [],
      missing: [
        'An approved equipment document covering the requested topic.',
        'The exact asset configuration the question depends on.'
      ],
      needed: null,
      codes
    };
  }

  const conflicts = detectConflicts(strong, asset);
  const observations = strong.filter((r) => r.record.evidenceClass === 'observation');
  const documents = strong.filter((r) => r.record.evidenceClass !== 'observation');

  // Unresolved disagreement: show both sides, choose neither.
  if (!firmware && conflicts.length > 0) {
    const c = conflicts[0];
    return {
      kind: 'conflict',
      summary: `The retrieved sources give different interpretations of ${c.code.toUpperCase()} for different firmware releases. The asset firmware is unconfirmed, so TraceLine cannot select one interpretation yet.`,
      decision: `Two source regions disagree. ${c.a.record.title} covers firmware ${(c.a.record.firmware || []).join(', ')}, while ${c.b.record.title} covers firmware ${(c.b.record.firmware || []).join(', ')}. Confirm the controller firmware before interpreting the fault.`,
      claims: [c.a, c.b],
      observations,
      outOfScope: [],
      missing: [],
      needed: 'firmware',
      conflict: c,
      codes
    };
  }

  // 'unresolved' means no applicability verdict was available (firmware not yet
  // confirmed, or metadata filtering disabled) — not that the record fails the
  // check. Only an explicit out-of-* verdict excludes a record.
  const applicable = documents.filter((r) => r.status === 'applicable' || r.status === 'unresolved');
  const excluded = documents.filter((r) => r.status.startsWith('out-of-'));

  // Firmware confirmed but nothing in scope matches.
  if (firmware && applicable.length === 0) {
    return {
      kind: 'abstain',
      summary: `No retrieved record states a scope that includes firmware ${firmware} for this question.`,
      decision: 'TraceLine abstains. The records that mention this topic declare a different configuration scope.',
      claims: [],
      observations,
      outOfScope: excluded,
      missing: [`A document whose stated firmware scope includes ${firmware}.`],
      needed: null,
      codes
    };
  }

  if (applicable.length === 0) {
    return {
      kind: 'abstain',
      summary: 'No retrieved record remains citable for this question once the confirmed context is applied.',
      decision: 'TraceLine abstains. Every record that mentions this topic declares a scope outside the confirmed context.',
      claims: [],
      observations,
      outOfScope: excluded,
      missing: ['A document whose stated scope includes this asset configuration.'],
      needed: null,
      codes
    };
  }

  const lead = applicable[0];
  const scopeConfirmed = !!firmware;
  return {
    kind: 'scoped',
    summary: firmware
      ? `The confirmed firmware is ${firmware}. ${lead.record.id} is the highest-ranked retrieved record whose stated firmware scope includes that value.`
      : `${lead.record.id} is the highest-ranked retrieved record for this question. Firmware is still unconfirmed, so the scope has not been narrowed.`,
    decision: excluded.length
      ? `Applicable source: ${lead.record.title}. Out of scope for this context: ${excluded.map((r) => `${r.record.title} (${APPLICABILITY_LABELS[r.status].toLowerCase()})`).join('; ')}.`
      : `Applicable source: ${lead.record.title}. No retrieved record was excluded by the confirmed context.`,
    claims: applicable,
    observations,
    outOfScope: excluded,
    missing: confirmedValue(asset.supply) ? [] : ['Supply class is unconfirmed. It is not required for this answer but remains unverified.'],
    needed: firmware ? null : 'firmware',
    codes
  };
}
