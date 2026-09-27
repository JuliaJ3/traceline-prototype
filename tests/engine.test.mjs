/**
 * Behavior tests for the TraceLine retrieval and applicability engine.
 * Run with: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CORPUS, buildIndex, tokenize, faultCodes, score, field, isConfirmed,
  applicability, retrieve, detectConflicts, answer
} from '../engine.js';

const INDEX = buildIndex(CORPUS);

/** Asset context helper: AX-480 asset 00481 with optional confirmed fields. */
function asset({ firmware = null, supply = null, fwSource = 'user', supplySource = 'user' } = {}) {
  return {
    model: field('AX-480', 'system'),
    id: field('00481', 'system'),
    firmware: field(firmware, firmware ? fwSource : 'unknown'),
    supply: field(supply, supply ? supplySource : 'unknown')
  };
}

const ask = (q, a, modes) => answer(q, a, modes, CORPUS, INDEX);
const F12 = 'What does fault F12 mean, and what should I check first?';

/* ------------------------------------------------------------- tokenizing */

test('shouldTokenizeVersionStringsIntoMatchablePrefixes', () => {
  assert.ok(tokenize('firmware 2.4.x').includes('2.4'), 'expected 2.4 prefix token');
  assert.ok(tokenize('release 2.4.1').includes('2.4'), 'expected 2.4 prefix from 2.4.1');
});

test('shouldDropStopwordsFromQueryTerms', () => {
  assert.ok(!tokenize('what does the fault mean').includes('the'));
});

test('shouldExtractFaultCodesInSeveralWrittenForms', () => {
  assert.deepEqual(faultCodes('fault F12 reported'), ['f12']);
  assert.deepEqual(faultCodes('codes F12 and F-27'), ['f12', 'f27']);
  assert.deepEqual(faultCodes('no codes here'), []);
});

/* --------------------------------------------------------------- scoring */

test('shouldScoreZeroWhenNoQueryTermAppearsInRecord', () => {
  const rec = CORPUS.find((d) => d.id === 'SRC-014');
  assert.equal(score(rec, 'hydraulic accumulator bladder', INDEX), 0);
});

test('shouldRankRecordContainingQueryTermsAboveUnrelatedRecord', () => {
  const table = CORPUS.find((d) => d.id === 'SRC-021');
  const drawing = CORPUS.find((d) => d.id === 'SRC-033');
  const q = 'supply input below configured threshold';
  assert.ok(score(table, q, INDEX) > score(drawing, q, INDEX));
});

/* ---------------------------------------------------------- provenance */

test('shouldNotTreatOcrSuggestionAsConfirmedContext', () => {
  assert.equal(isConfirmed(field('2.4.1', 'ocr')), false);
  assert.equal(isConfirmed(field('2.4.1', 'user')), true);
  assert.equal(isConfirmed(field('2.4.1', 'system')), true);
});

test('shouldIgnoreUnconfirmedOcrFirmwareWhenScopingAnswer', () => {
  const ocrAsset = {
    model: field('AX-480', 'system'),
    firmware: field('2.4.1', 'ocr'),
    supply: field(null, 'unknown')
  };
  const res = ask(F12, ocrAsset);
  assert.equal(res.kind, 'conflict', 'OCR value must not resolve the conflict on its own');
  assert.equal(res.needed, 'firmware');
});

/* ------------------------------------------------------- applicability */

test('shouldMarkRecordOutOfModelWhenPlatformDiffers', () => {
  const ax320 = CORPUS.find((d) => d.id === 'SRC-052');
  assert.equal(applicability(ax320, asset({ firmware: '2.4.1' })), 'out-of-model');
});

test('shouldMarkRecordOutOfFirmwareWhenReleaseScopeExcludesConfirmedValue', () => {
  const legacy = CORPUS.find((d) => d.id === 'SRC-021');
  assert.equal(applicability(legacy, asset({ firmware: '2.4.1' })), 'out-of-firmware');
});

test('shouldMarkRecordOutOfSupplyWhenSupplyClassConflicts', () => {
  const checklist = CORPUS.find((d) => d.id === 'SRC-060');
  assert.equal(applicability(checklist, asset({ firmware: '2.4.1', supply: '480V' })), 'out-of-supply');
  assert.equal(applicability(checklist, asset({ firmware: '2.4.1', supply: '400V' })), 'applicable');
});

test('shouldLeaveApplicabilityUnresolvedWhileFirmwareUnconfirmed', () => {
  const note = CORPUS.find((d) => d.id === 'SRC-014');
  assert.equal(applicability(note, asset()), 'unresolved');
});

/* ------------------------------------------- BUG 1: off-script questions */

test('shouldAbstainOnQuestionWithNoSupportingRecord', () => {
  const res = ask('What color is the enclosure paint?', asset({ firmware: '2.4.1' }));
  assert.equal(res.kind, 'abstain');
  assert.equal(res.claims.length, 0, 'abstention must cite nothing');
});

test('shouldAbstainOnTorqueQuestionWithoutRelyingOnKeywordBlocklist', () => {
  const res = ask('What is the safe torque value for this motor?', asset({ firmware: '2.4.1' }));
  assert.equal(res.kind, 'abstain');
  assert.equal(res.claims.length, 0);
});

test('shouldNotReturnF12AnswerWhenAskedAboutUnrelatedFaultCode', () => {
  const res = ask('What is fault F91?', asset({ firmware: '2.4.1' }));
  assert.equal(res.claims.length, 0, 'F91 is absent from the corpus; nothing may be cited');
  assert.ok(res.kind === 'abstain' || res.kind === 'model-scoped-abstain');
});

test('shouldAnswerF18FromTheRecordThatActuallyCarriesThatCode', () => {
  const res = ask('What is fault F18?', asset({ firmware: '2.3.8' }));
  assert.equal(res.kind, 'scoped');
  assert.deepEqual(res.claims.map((c) => c.record.id), ['SRC-021']);
});

test('shouldAnswerF27WithoutSurfacingF12Records', () => {
  const res = ask('What does fault F27 indicate?', asset({ firmware: '2.4.1' }));
  assert.equal(res.kind, 'scoped');
  const ids = res.claims.map((c) => c.record.id);
  assert.ok(ids.includes('SRC-047'), 'expected the F27 bulletin');
  assert.ok(!ids.includes('SRC-021'), 'F12 legacy table must not be cited for F27');
});

/* ------------------------------ BUG 2: firmware 2.3.8 self-contradiction */

test('shouldNotExcludeTheSameRecordItSelectsAsApplicable', () => {
  for (const firmware of ['2.4.1', '2.3.8']) {
    const res = ask(F12, asset({ firmware }));
    assert.equal(res.kind, 'scoped', `expected scoped answer for ${firmware}`);
    const cited = res.claims.map((c) => c.record.id);
    const excluded = res.outOfScope.map((c) => c.record.id);
    for (const id of cited) {
      assert.ok(!excluded.includes(id), `${id} appears as both applicable and out of scope on ${firmware}`);
    }
  }
});

test('shouldScopeToLegacyTableWhenLegacyFirmwareConfirmed', () => {
  const res = ask(F12, asset({ firmware: '2.3.8' }));
  assert.deepEqual(res.claims.map((c) => c.record.id), ['SRC-021']);
  assert.ok(res.decision.includes('Troubleshooting table · legacy release'));
  assert.ok(!/does not apply to 2\.3\.8/.test(res.decision), 'must not exclude the record it just selected');
});

test('shouldScopeToServiceNoteWhenCurrentFirmwareConfirmed', () => {
  const res = ask(F12, asset({ firmware: '2.4.1' }));
  const ids = res.claims.map((c) => c.record.id);
  assert.ok(ids.includes('SRC-014'));
  assert.ok(!ids.includes('SRC-021'), 'legacy table is out of scope on 2.4.1');
  assert.ok(res.outOfScope.some((c) => c.record.id === 'SRC-021'));
});

/* ------------------------- BUG 3: citation text/link must not decouple */

test('shouldKeepEveryCitedClaimBoundToItsOwnRecordId', () => {
  const queries = [
    F12,
    'supply input threshold table legacy',
    'drawing nameplate configuration',
    'startup diagnostics supply class',
    'fieldbus timeout'
  ];
  for (const q of queries) {
    for (const firmware of [null, '2.4.1', '2.3.8']) {
      const res = ask(q, asset({ firmware }));
      for (const c of [...res.claims, ...res.observations, ...res.outOfScope]) {
        const source = CORPUS.find((d) => d.id === c.record.id);
        assert.ok(source, `unknown record id ${c.record.id}`);
        assert.equal(c.record.claim, source.claim, `claim text/id mismatch for ${c.record.id} on "${q}"`);
        assert.equal(c.record.page, source.page, `page/id mismatch for ${c.record.id} on "${q}"`);
      }
    }
  }
});

test('shouldNotMutateCorpusOrderDuringRetrieval', () => {
  const before = CORPUS.map((d) => d.id);
  ask('supply input threshold table legacy', asset());
  ask(F12, asset({ firmware: '2.4.1' }));
  assert.deepEqual(CORPUS.map((d) => d.id), before, 'retrieval must not sort the corpus in place');
});

/* --------------------------- BUG 4: distinct applicability labels */

test('shouldDistinguishConflictingRecordFromNonConflictingContextRecord', () => {
  const res = ask(F12, asset());
  assert.equal(res.kind, 'conflict');
  const ids = res.claims.map((c) => c.record.id);
  assert.equal(ids.length, 2);
  assert.ok(ids.includes('SRC-014') && ids.includes('SRC-021'));
  assert.ok(!ids.includes('SRC-033'), 'the configuration drawing is context, not a conflicting claim');
});

/* ------------------------------------------------- conflict detection */

test('shouldDetectConflictFromMetadataRatherThanHardcodedIds', () => {
  const { results } = retrieve(F12, asset(), { keyword: true, metadata: true }, CORPUS, INDEX);
  const conflicts = detectConflicts(results, asset());
  assert.ok(conflicts.length >= 1);
  const pair = conflicts[0];
  const fwA = pair.a.record.firmware;
  const fwB = pair.b.record.firmware;
  assert.ok(!fwA.some((v) => fwB.includes(v)), 'conflicting pair must have disjoint firmware scope');
  assert.equal(pair.code, 'f12');
});

test('shouldNotReportConflictBetweenRecordsSharingFirmwareScope', () => {
  const sameScope = [
    { id: 'A', model: 'AX-480', firmware: ['2.4.1'], faults: ['f50'], claim: 'first reading' },
    { id: 'B', model: 'AX-480', firmware: ['2.4.1'], faults: ['f50'], claim: 'second reading' }
  ];
  const idx = buildIndex(sameScope);
  const { results } = retrieve('fault F50', asset(), { keyword: true, metadata: true }, sameScope, idx);
  assert.equal(detectConflicts(results, asset()).length, 0);
});

test('shouldExcludeCrossModelRecordFromConflictPairing', () => {
  const res = ask(F12, asset());
  const ids = res.claims.map((c) => c.record.id);
  assert.ok(!ids.includes('SRC-052'), 'AX-320 table must not be paired as an AX-480 conflict');
});

/* ----------------------------------------- cross-model applicability */

test('shouldAbstainWithModelScopeReasonWhenOnlyOtherPlatformMatches', () => {
  const ax999 = { model: field('AX-999', 'system'), firmware: field('9.9.9', 'user'), supply: field(null, 'unknown') };
  const res = answer('fieldbus communication timeout', ax999, undefined, CORPUS, INDEX);
  assert.equal(res.kind, 'model-scoped-abstain');
  assert.ok(res.outOfScope.length > 0);
  assert.equal(res.claims.length, 0);
});

/* --------------------------------- observations vs document evidence */

test('shouldSeparateTechnicianObservationFromDocumentedClaim', () => {
  const res = ask(F12, asset({ firmware: '2.4.1' }));
  const obsIds = res.observations.map((o) => o.record.id);
  const claimIds = res.claims.map((c) => c.record.id);
  assert.ok(obsIds.includes('SRE-071'), 'maintenance log should surface as an observation');
  assert.ok(!claimIds.includes('SRE-071'), 'field observation must not be cited as documented support');
});

test('shouldNotUseFieldObservationToCreateAConflict', () => {
  const { results } = retrieve(F12, asset(), { keyword: true, metadata: true }, CORPUS, INDEX);
  const conflicts = detectConflicts(results, asset());
  for (const c of conflicts) {
    assert.notEqual(c.a.record.evidenceClass, 'observation');
    assert.notEqual(c.b.record.evidenceClass, 'observation');
  }
});

/* --------------------------------------------- search mode behavior */

test('shouldChangeResultOrderWhenKeywordScoringDisabled', () => {
  const a = retrieve('fieldbus timeout', asset(), { keyword: true, metadata: true }, CORPUS, INDEX);
  const b = retrieve('fieldbus timeout', asset(), { keyword: false, metadata: true }, CORPUS, INDEX);
  assert.notDeepEqual(a.results.map((r) => r.record.id), b.results.map((r) => r.record.id));
});

test('shouldLeaveEveryStatusUnresolvedWhenMetadataFilterDisabled', () => {
  const { results } = retrieve(F12, asset({ firmware: '2.4.1' }), { keyword: true, metadata: false }, CORPUS, INDEX);
  assert.ok(results.every((r) => r.status === 'unresolved'));
});

test('shouldSurfaceLegacyTableAsApplicableWhenMetadataFilteringIsOff', () => {
  const on = ask(F12, asset({ firmware: '2.4.1' }), { keyword: true, metadata: true });
  assert.ok(on.outOfScope.some((r) => r.record.id === 'SRC-021'), 'filter on: legacy excluded');
  const off = ask(F12, asset({ firmware: '2.4.1' }), { keyword: true, metadata: false });
  assert.equal(off.outOfScope.length, 0, 'filter off: nothing is excluded, which is the risk being shown');
});

/* -------------------------------------------------- answer invariants */

test('shouldNeverCiteRecordThatIsOutOfConfirmedScope', () => {
  const queries = [F12, 'What is fault F18?', 'supply class commissioning', 'fieldbus timeout'];
  for (const q of queries) {
    for (const firmware of ['2.4.1', '2.3.8']) {
      for (const supply of [null, '400V', '480V']) {
        const a = asset({ firmware, supply });
        const res = ask(q, a);
        for (const c of res.claims) {
          assert.equal(applicability(c.record, a), 'applicable',
            `${c.record.id} cited but not applicable for fw=${firmware} supply=${supply} q="${q}"`);
        }
      }
    }
  }
});

test('shouldAlwaysNameMissingContextWhenAbstaining', () => {
  const res = ask('What is the vibration limit?', asset({ firmware: '2.4.1' }));
  assert.equal(res.kind, 'abstain');
  assert.ok(res.missing.length > 0, 'abstention must state what is missing');
});

test('shouldRequestFirmwareConfirmationWhileConflictUnresolved', () => {
  const res = ask(F12, asset());
  assert.equal(res.needed, 'firmware');
});

test('shouldCompleteAnswerCallWellUnderFiveSeconds', () => {
  const start = Date.now();
  for (let i = 0; i < 400; i++) ask(F12, asset({ firmware: i % 2 ? '2.4.1' : null }));
  assert.ok(Date.now() - start < 5000);
});

/* ------------------------------------------------- OCR firmware parsing */
// parseFirmware is pure (app.js touches the DOM only inside init()), so the
// noisy-OCR handling is asserted here against text a real engine produced.
const { parseFirmware } = await import('../app.js');

test('shouldParseCleanVersionStringAsExactMatch', () => {
  const r = parseFirmware('AX-480 DRIVE FW REV 2.4.1');
  assert.equal(r.value, '2.4.1');
  assert.equal(r.exact, true);
});

test('shouldReconstructFirmwareWhenOcrDropsADecimalPoint', () => {
  // Verbatim Tesseract output observed for the synthetic nameplate.
  const raw = 'AX-480 DRIVE ASSET NO 00481 SUPPLY 400V FWREV 24.1 SYNTHETIC DEMO NAMEPLATE - NOT A REAL PRODUCT LABEL';
  const r = parseFirmware(raw);
  assert.equal(r.value, '2.4.1', 'digits 241 must reconstruct to the known release');
  assert.equal(r.exact, false, 'reconstruction must be flagged as inexact');
});

test('shouldReconstructLegacyFirmwareFromRunTogetherDigits', () => {
  const r = parseFirmware('FW REV 238');
  assert.equal(r.value, '2.3.8');
  assert.equal(r.exact, false);
});

test('shouldReturnNullWhenNoFirmwareShapedValuePresent', () => {
  assert.equal(parseFirmware('AX-480 DRIVE SUPPLY 400V'), null);
  assert.equal(parseFirmware(''), null);
});

test('shouldNotAcceptDigitRunThatMatchesNoKnownRelease', () => {
  assert.equal(parseFirmware('FW REV 9.9.9'), null, 'unknown release must not be silently accepted');
});

test('shouldPreferValueFollowingFirmwareLabelOverOtherNumbers', () => {
  const r = parseFirmware('ASSET NO 00481 SUPPLY 400 V FW REV 2.4.1');
  assert.equal(r.value, '2.4.1');
});
