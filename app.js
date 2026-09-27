/**
 * TraceLine interface layer.
 *
 * Rendering and event wiring only. All retrieval, applicability and abstention
 * decisions come from engine.js so the rules stay testable.
 */
import {
  CORPUS, buildIndex, answer, retrieve, applicability, APPLICABILITY_LABELS,
  field, isConfirmed, confirmedValue
} from './engine.js';

const INDEX = buildIndex(CORPUS);
const DEFAULT_QUERY = 'What does fault F12 mean, and what should I check first?';

const state = {
  asset: {
    model: field('AX-480', 'system'),
    id: field('00481', 'system'),
    firmware: field(null, 'unknown'),
    supply: field(null, 'unknown')
  },
  modes: { keyword: true, metadata: true },
  query: DEFAULT_QUERY,
  selectedId: 'SRC-014',
  ocr: null // { value, confidence, raw } — a suggestion, never confirmed context
};

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------ asset bar */

function renderAssetBar() {
  const fw = state.asset.firmware;
  const su = state.asset.supply;

  $('#firmware').value = fw.value || 'unknown';
  $('#supply').value = su.value || 'unknown';

  const fwState = $('#fw-provenance');
  if (isConfirmed(fw)) {
    fwState.textContent = `Confirmed · ${fw.source}`;
    fwState.className = 'prov prov-ok';
  } else if (fw.source === 'ocr') {
    fwState.textContent = `OCR suggestion · unconfirmed`;
    fwState.className = 'prov prov-warn';
  } else {
    fwState.textContent = 'Unconfirmed field';
    fwState.className = 'prov prov-warn';
  }

  const suState = $('#supply-provenance');
  suState.textContent = isConfirmed(su) ? `Confirmed · ${su.source}` : 'Unconfirmed field';
  suState.className = isConfirmed(su) ? 'prov prov-ok' : 'prov prov-warn';
}

/* -------------------------------------------------------- evidence list */

function renderSources() {
  const { results, all } = retrieve(state.query, state.asset, state.modes, CORPUS, INDEX);
  const ranked = new Map(results.map((r, i) => [r.record.id, i + 1]));

  const rows = all
    .slice()
    .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))
    .map((r) => {
      const status = r.status;
      const cls = status === 'applicable' ? 'status-applicable'
        : status.startsWith('out-of') ? 'status-out'
        : 'status-unresolved';
      const label = APPLICABILITY_LABELS[status];
      const rank = ranked.get(r.record.id);
      const obs = r.record.evidenceClass === 'observation'
        ? '<span class="tag tag-obs">Field observation</span>' : '';
      const kindTag = `<span class="tag tag-kind">${esc(r.record.kind)}</span>`;
      return `<div class="source ${state.selectedId === r.record.id ? 'active' : ''} ${r.score === 0 ? 'dim' : ''}" data-id="${esc(r.record.id)}" role="button" tabindex="0" aria-pressed="${state.selectedId === r.record.id}">
        <div class="source-top">
          <span class="source-title">${esc(r.record.title)}</span>
          <span class="source-score" title="BM25 relevance score">${r.score === 0 ? 'no match' : r.score.toFixed(2)}</span>
        </div>
        <div class="source-meta"><span>${esc(r.record.id)} · ${esc(r.record.rev)} · ${esc(r.record.model)}</span><span>${esc(r.record.date)}</span></div>
        <div class="source-sub">${esc(r.record.claim)}</div>
        <div class="source-tags">
          <span class="source-status ${cls}">${esc(label)}</span>${kindTag}${obs}
          ${rank ? `<span class="tag tag-rank">rank ${rank}</span>` : ''}
        </div>
      </div>`;
    })
    .join('');

  $('#source-list').innerHTML = rows;
  $('#source-count').textContent = `${results.length} of ${CORPUS.length} matched`;

  $('#source-list').querySelectorAll('.source').forEach((el) => {
    const open = () => showDoc(el.dataset.id);
    el.onclick = open;
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  });
}

/* -------------------------------------------------------- source viewer */

function renderRegion(record) {
  if (record.kind === 'table') {
    const rows = (record.faults || []).map((code) => {
      const hot = code === 'f12';
      const desc = code === 'f12' ? 'Supply input below configured threshold' : 'Reference entry';
      return `<tr>
        <td>${hot ? `<mark>${code.toUpperCase()}</mark>` : code.toUpperCase()}</td>
        <td>${hot ? `<mark>${desc}</mark>` : desc}</td>
        <td>${esc((record.firmware || []).join(', '))}</td>
      </tr>`;
    }).join('');
    return `<p class="doc-note">Extracted table region · synthetic fixture</p>
      <table class="doc-table"><thead><tr><th>Code</th><th>Description</th><th>Release scope</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="doc-body">${esc(record.text)}</p>`;
  }
  if (record.kind === 'diagram') {
    return `<p class="doc-note">Human-reviewed synthetic diagram region</p>
      <div class="diagram">
        <span class="dnode">Drive asset<br><b>${esc(record.model)}</b></span>
        <span class="dedge">links to</span>
        <span class="dnode hot">Nameplate<br><b>Supply class</b></span>
        <span class="dedge">and</span>
        <span class="dnode hot">Controller<br><b>Release record</b></span>
      </div>
      <p class="doc-body">${esc(record.text)}</p>`;
  }
  if (record.kind === 'record') {
    return `<p class="doc-note">Field observation · not a controlled document</p>
      <p class="doc-body"><mark>${esc(record.text)}</mark></p>`;
  }
  return `<p class="doc-body"><mark>${esc(record.text)}</mark></p>`;
}

function showDoc(id) {
  const record = CORPUS.find((d) => d.id === id);
  if (!record) return;
  state.selectedId = id;
  const status = applicability(record, state.asset);

  $('#doc-title').textContent = record.title;
  $('#doc-page').textContent = record.page;
  $('#doc-body').innerHTML = `
    <div class="doc-kicker">${esc(record.sourceNote)} · ${esc(record.page)}</div>
    <h3>${esc(record.heading)}</h3>
    ${renderRegion(record)}
    <div class="doc-foot">
      <span class="source-status ${status === 'applicable' ? 'status-applicable' : status.startsWith('out-of') ? 'status-out' : 'status-unresolved'}">${esc(APPLICABILITY_LABELS[status])}</span>
      <span class="region">Highlighted evidence region</span>
    </div>`;
  renderSources();
}

/* --------------------------------------------------------------- answer */

function claimRow(entry, i, opts = {}) {
  const r = entry.record;
  const badge = opts.observation ? '<span class="tag tag-obs">Technician observation</span>'
    : opts.excluded ? `<span class="tag tag-out">${esc(APPLICABILITY_LABELS[entry.status])}</span>`
    : '<span class="tag tag-src">Source-supported</span>';
  return `<div class="claim">
    <span class="claim-icon">${opts.label || i + 1}</span>
    <div>
      <div class="claim-text">${esc(r.claim)}</div>
      <div class="claim-foot">
        ${badge}
        <button class="claim-source" data-id="${esc(r.id)}">Inspect ${esc(r.id)} · ${esc(r.page)}</button>
      </div>
    </div>
  </div>`;
}

function renderAnswer() {
  const res = answer(state.query, state.asset, state.modes, CORPUS, INDEX);

  const badge = $('#ledger-badge');
  const badgeText = {
    conflict: 'Clarification needed',
    abstain: 'Insufficient evidence',
    'model-scoped-abstain': 'Out of model scope',
    scoped: 'Context applied · scoped answer'
  }[res.kind];
  badge.textContent = badgeText;
  badge.className = 'ledger-badge ' + (res.kind === 'scoped' ? 'badge-ok' : 'badge-warn');

  let html = `<p class="answer-summary">${esc(res.summary)}</p>
    <div class="decision ${res.kind === 'scoped' ? 'decision-ok' : ''}">${esc(res.decision)}</div>`;

  if (res.claims.length) {
    html += `<div class="section-label">Source-supported statements</div>`;
    html += res.claims.map((c, i) => claimRow(c, i)).join('');
  }

  if (res.observations.length) {
    html += `<div class="section-label">Technician observations · not document-supported</div>`;
    html += res.observations.map((c, i) => claimRow(c, i, { observation: true, label: 'O' })).join('');
  }

  if (res.outOfScope.length) {
    html += `<div class="section-label">Retrieved but out of scope</div>`;
    html += res.outOfScope.map((c, i) => claimRow(c, i, { excluded: true, label: '!' })).join('');
  }

  if (res.missing.length) {
    html += `<div class="section-label">Missing context</div>`;
    html += `<ul class="missing-list">${res.missing.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`;
  }

  if (res.needed === 'firmware') {
    html += `<div class="resolve">
      <b>Needed to resolve:</b>
      <span>confirm controller firmware from the asset or release record.</span>
      <select id="fw-inline" aria-label="Confirm firmware">
        <option value="unknown">Choose firmware</option>
        <option value="2.4.1">2.4.1</option>
        <option value="2.3.8">2.3.8</option>
      </select>
      <button class="small-btn" id="fw-confirm">Confirm</button>
    </div>`;
  }

  html += `<div class="answer-actions">
      <button class="secondary" id="copy-ledger">Copy evidence summary</button>
      <button class="secondary" id="try-unanswerable">Ask something unsupported</button>
      <button class="secondary" id="try-f18">Ask about F18</button>
    </div>
    <div class="tech-note">Not a diagnosis, a safety assessment, or authorization to perform work.</div>`;

  $('#answer-body').innerHTML = html;

  $('#answer-body').querySelectorAll('.claim-source').forEach((b) => { b.onclick = () => showDoc(b.dataset.id); });

  const confirmBtn = $('#fw-confirm');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const v = $('#fw-inline').value;
      if (v === 'unknown') { toast('Select a firmware value first.'); return; }
      setFirmware(v, 'user');
      toast(`Firmware ${v} confirmed by technician.`);
    };
  }

  $('#copy-ledger').onclick = () => {
    const lines = [
      `TraceLine evidence summary (synthetic demo corpus)`,
      `Asset: ${state.asset.model.value} · ${state.asset.id.value}`,
      `Firmware: ${confirmedValue(state.asset.firmware) || 'unconfirmed'}`,
      `Supply class: ${confirmedValue(state.asset.supply) || 'unconfirmed'}`,
      `Question: ${state.query}`,
      ``,
      res.summary,
      res.decision,
      ``,
      ...res.claims.map((c) => `[${c.record.id} · ${c.record.page}] ${c.record.claim}`),
      ...res.observations.map((c) => `[observation · ${c.record.id}] ${c.record.claim}`),
      ...res.outOfScope.map((c) => `[out of scope · ${c.record.id}] ${APPLICABILITY_LABELS[c.status]}`),
      ...res.missing.map((m) => `[missing] ${m}`),
      ``,
      `Synthetic sources. Not a diagnosis or authorization to perform work.`
    ];
    navigator.clipboard?.writeText(lines.join('\n'))
      .then(() => toast('Evidence summary copied'))
      .catch(() => toast('Clipboard unavailable in this browser'));
  };

  $('#try-unanswerable').onclick = () => { setQuery('What is the safe torque value for this motor?'); };
  $('#try-f18').onclick = () => { setQuery('What is fault F18?'); };

  renderGraph(res);
}

/* ---------------------------------------------------------------- graph */

function renderGraph(res) {
  const fw = confirmedValue(state.asset.firmware);
  const cited = res.claims.map((c) => c.record.id);
  const rows = [
    ['node red', state.asset.model.value, 'has asset', 'node', `Asset ${state.asset.id.value}`],
    ['node', `Firmware ${fw || 'unknown'}`, fw ? 'scopes' : 'blocks scoping', cited.length ? 'node red' : 'node', cited.length ? cited.join(' / ') : 'no scoped source'],
    ['node red', (res.codes[0] || 'topic').toUpperCase(), 'mentioned by', 'node', `${res.claims.length + res.outOfScope.length} source regions`]
  ];
  $('#graph-rows').innerHTML = rows.map(([c1, a, edge, c2, b]) =>
    `<div class="graph-row"><span class="${c1}">${esc(a)}</span><span class="edge">${esc(edge)}</span><span class="${c2}">${esc(b)}</span></div>`
  ).join('');
}

/* ------------------------------------------------------------ OCR intake */

const KNOWN_FIRMWARE = ['2.4.1', '2.3.8'];

/**
 * Parse OCR text for a firmware-shaped value near a firmware label.
 *
 * Real OCR of a metal nameplate drops and invents separators: "2.4.1" is often
 * read as "24.1", "2.41" or "2 4 1". This normalizes digit runs and matches
 * against the releases the corpus knows about, so the demo survives imperfect
 * recognition. Every result is still only a SUGGESTION — parseFirmware never
 * confirms anything, and the caller must have the technician confirm it.
 *
 * Returns { value, exact } or null.
 */
export function parseFirmware(text) {
  const flat = String(text).toUpperCase();

  // Prefer a value that follows a firmware-ish label on the same line.
  const labelled = flat.match(/(?:F\s?W|FIRMWARE|REV|RELEASE)[^0-9\n]{0,12}([0-9][0-9.\s]{2,12})/);
  const candidates = [];
  if (labelled) candidates.push(labelled[1]);
  for (const m of flat.matchAll(/\b([0-9][0-9.\s]{2,12})\b/g)) candidates.push(m[1]);

  for (const raw of candidates) {
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length < 2) continue;
    // Exact dotted match wins outright.
    const dotted = raw.trim().match(/\b\d+\.\d+\.\d+\b/);
    if (dotted && KNOWN_FIRMWARE.includes(dotted[0])) return { value: dotted[0], exact: true };
    // Otherwise compare digit sequences against known releases.
    const hit = KNOWN_FIRMWARE.find((fw) => fw.replace(/\./g, '') === digits);
    if (hit) return { value: hit, exact: false };
  }
  return null;
}

async function runOcr(file) {
  const panel = $('#ocr-result');
  if (!window.Tesseract) {
    panel.innerHTML = `<div class="ocr-warn">OCR engine did not load. It is fetched from a CDN and needs network access on first run. Enter firmware manually instead.</div>`;
    return;
  }
  panel.innerHTML = `<div class="ocr-busy">Reading nameplate image…</div>`;
  const url = URL.createObjectURL(file);
  $('#ocr-preview').innerHTML = `<img src="${url}" alt="Uploaded nameplate image">`;
  try {
    const { data } = await window.Tesseract.recognize(url, 'eng');
    const raw = (data.text || '').trim();
    const guess = parseFirmware(raw);
    const conf = Math.round(data.confidence || 0);
    if (guess) {
      state.ocr = { value: guess.value, confidence: conf, raw, exact: guess.exact };
      state.asset.firmware = field(guess.value, 'ocr');
      const recon = guess.exact
        ? ''
        : `<div class="ocr-note">The image text did not contain a clean version string. TraceLine matched the digits it read against known releases and reconstructed <b>${esc(guess.value)}</b>. Check this against the nameplate before confirming.</div>`;
      panel.innerHTML = `<div class="ocr-hit">
          <div><b>Suggested firmware ${esc(guess.value)}</b> · OCR confidence ${conf}%${guess.exact ? '' : ' · reconstructed'}</div>
          ${recon}
          <div class="ocr-actions">
            <button class="primary" id="ocr-accept">Confirm ${esc(guess.value)}</button>
            <button class="secondary" id="ocr-reject">Discard suggestion</button>
          </div>
          <details class="ocr-raw"><summary>Raw OCR text</summary><pre>${esc(raw || '(empty)')}</pre></details>
        </div>`;
      $('#ocr-accept').onclick = () => { setFirmware(guess.value, 'user'); toast(`Firmware ${guess.value} confirmed by technician.`); };
      $('#ocr-reject').onclick = () => { state.ocr = null; state.asset.firmware = field(null, 'unknown'); panel.innerHTML = ''; $('#ocr-preview').innerHTML = ''; render(); };
      render();
    } else {
      panel.innerHTML = `<div class="ocr-warn">No firmware-shaped value found in the image. Confidence ${conf}%. Enter firmware manually.
        <details class="ocr-raw"><summary>Raw OCR text</summary><pre>${esc(raw || '(empty)')}</pre></details></div>`;
    }
  } catch (err) {
    panel.innerHTML = `<div class="ocr-warn">OCR failed: ${esc(err.message)}. Enter firmware manually.</div>`;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Build a synthetic nameplate image in-canvas so the OCR path is demoable offline. */
function synthesizeNameplate(firmware = '2.4.1') {
  const c = document.createElement('canvas');
  c.width = 620; c.height = 300;
  const g = c.getContext('2d');
  g.fillStyle = '#e8e8e4'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#4a4a46'; g.lineWidth = 4; g.strokeRect(12, 12, c.width - 24, c.height - 24);
  g.fillStyle = '#1b1b19';
  g.font = 'bold 34px Helvetica, Arial, sans-serif';
  g.fillText('AX-480 DRIVE', 40, 70);
  g.font = '25px Helvetica, Arial, sans-serif';
  g.fillText('ASSET NO  00481', 40, 125);
  g.fillText('SUPPLY    400 V', 40, 168);
  g.fillText('FW REV    ' + firmware, 40, 211);
  g.font = '17px Helvetica, Arial, sans-serif';
  g.fillText('SYNTHETIC DEMO NAMEPLATE - NOT A REAL PRODUCT LABEL', 40, 262);
  return new Promise((resolve) => c.toBlob((b) => resolve(new File([b], 'synthetic-nameplate.png', { type: 'image/png' })), 'image/png'));
}

/* ------------------------------------------------------------ state ops */

function setFirmware(value, source) {
  state.asset.firmware = value && value !== 'unknown' ? field(value, source) : field(null, 'unknown');
  render();
}

function setQuery(q) {
  state.query = q;
  $('#query').value = q;
  render();
}

function render() {
  renderAssetBar();
  renderSources();
  renderAnswer();
  showDocIfMissing();
}

function showDocIfMissing() {
  const record = CORPUS.find((d) => d.id === state.selectedId);
  if (record) {
    const status = applicability(record, state.asset);
    const el = $('#doc-body').querySelector('.doc-foot .source-status');
    if (el) {
      el.textContent = APPLICABILITY_LABELS[status];
      el.className = 'source-status ' + (status === 'applicable' ? 'status-applicable' : status.startsWith('out-of') ? 'status-out' : 'status-unresolved');
    }
  }
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ------------------------------------------------------------- wiring */

export function init() {
  $('#ask').onclick = () => { state.query = $('#query').value.trim() || DEFAULT_QUERY; $('#query').value = state.query; render(); };
  $('#query').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $('#ask').click(); }
  });

  $('#firmware').onchange = (e) => setFirmware(e.target.value, 'user');
  $('#supply').onchange = (e) => {
    const v = e.target.value;
    state.asset.supply = v && v !== 'unknown' ? field(v, 'user') : field(null, 'unknown');
    render();
  };

  // Search-mode toggles now actually change retrieval behavior.
  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.onclick = () => {
      const key = btn.dataset.mode;
      state.modes[key] = !state.modes[key];
      btn.classList.toggle('on', state.modes[key]);
      btn.setAttribute('aria-pressed', String(state.modes[key]));
      if (!state.modes.keyword && !state.modes.metadata) toast('All retrieval modes off: ranking and applicability are both disabled.');
      render();
    };
  });

  $('#ocr-file').onchange = (e) => { if (e.target.files[0]) runOcr(e.target.files[0]); };
  $('#ocr-sample').onclick = async () => { runOcr(await synthesizeNameplate('2.4.1')); };

  $('#reset').onclick = () => {
    state.asset.firmware = field(null, 'unknown');
    state.asset.supply = field(null, 'unknown');
    state.ocr = null;
    state.modes = { keyword: true, metadata: true };
    state.selectedId = 'SRC-014';
    document.querySelectorAll('[data-mode]').forEach((b) => { b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); });
    $('#ocr-result').innerHTML = '';
    $('#ocr-preview').innerHTML = '';
    $('#ocr-file').value = '';
    setQuery(DEFAULT_QUERY);
    showDoc('SRC-014');
    toast('Scenario reset.');
  };

  render();
  showDoc('SRC-014');
}
