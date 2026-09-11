'use strict';

/**
 * Tests for the suppression rules. Run with: npm run test:analytics
 *
 * A k-anonymity bug is silent — the report looks fine and quietly describes
 * four people — so the thresholds are asserted rather than eyeballed.
 */

const assert = require('assert');
const analytics = require('./analytics');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${err.message}`);
    process.exitCode = 1;
  }
}

/** n rows in one cell, each from a distinct contributor. */
function rows(need, n, startAt = 0) {
  return Array.from({ length: n }, (_, i) => ({
    contributor_key: `c${startAt + i}`,
    period_month: '2026-09-01',
    region: null,
    need_category: need,
    support_accessed: 'none',
    outcome_signal: 'plan_made',
  }));
}

console.log('analytics suppression');

test('a dataset below k publishes nothing at all', () => {
  const out = analytics.aggregate(rows('housing', 19), ['need_category'], 20);
  assert.strictEqual(out.suppressed, true);
  assert.strictEqual(out.totalContributors, null);
  assert.deepStrictEqual(out.cells, []);
});

test('a cell at exactly k is published', () => {
  const out = analytics.aggregate(rows('housing', 20), ['need_category'], 20);
  assert.strictEqual(out.suppressed, false);
  assert.strictEqual(out.cells.length, 1);
  assert.strictEqual(out.cells[0].withheld, false);
  assert.strictEqual(out.cells[0].contributors, 20);
});

test('a thin cell is withheld while fat ones publish', () => {
  const data = [
    ...rows('housing', 40, 0),
    ...rows('employment', 30, 100),
    ...rows('legal', 25, 200),
    ...rows('substance_use', 3, 300), // thin
  ];
  const out = analytics.aggregate(data, ['need_category'], 20);
  const bySlug = Object.fromEntries(out.cells.map((c) => [c.need_category, c]));

  assert.strictEqual(bySlug.substance_use.withheld, true);
  assert.strictEqual(bySlug.substance_use.contributors, null);
  assert.strictEqual(bySlug.housing.withheld, false);
});

test('the withheld count is never leaked in the payload', () => {
  const data = [...rows('housing', 40), ...rows('substance_use', 3, 100)];
  const out = analytics.aggregate(data, ['need_category'], 20);
  const hidden = out.cells.find((c) => c.withheld);

  assert.strictEqual(hidden.contributors, null);
  assert.strictEqual(hidden.checkIns, null);
  assert.ok(
    !JSON.stringify(hidden).includes('3'),
    'the suppressed magnitude must not survive anywhere in the cell'
  );
});

test('secondary suppression hides a lone hole', () => {
  // One thin cell plus a published total would give the thin count by
  // subtraction, so a second cell has to go with it.
  const data = [
    ...rows('housing', 40, 0),
    ...rows('employment', 30, 100),
    ...rows('substance_use', 2, 200), // the only thin cell
  ];
  const out = analytics.aggregate(data, ['need_category'], 20);
  const withheld = out.cells.filter((c) => c.withheld);

  assert.strictEqual(withheld.length, 2, 'a single hole must be widened');
  // The smallest visible neighbour is the one that joins it.
  assert.ok(withheld.some((c) => c.need_category === 'substance_use'));
  assert.ok(withheld.some((c) => c.need_category === 'employment'));
});

test('two holes already need no widening', () => {
  const data = [
    ...rows('housing', 40, 0),
    ...rows('employment', 30, 100),
    ...rows('substance_use', 2, 200),
    ...rows('childcare', 4, 300),
  ];
  const out = analytics.aggregate(data, ['need_category'], 20);
  assert.strictEqual(out.cells.filter((c) => c.withheld).length, 2);
});

test('many check-ins from one person do not clear the threshold', () => {
  // 50 rows, one contributor: counting rows instead of people would publish it.
  const data = Array.from({ length: 50 }, () => ({
    contributor_key: 'the-same-person',
    period_month: '2026-09-01',
    region: null,
    need_category: 'housing',
    support_accessed: 'none',
    outcome_signal: 'resolved',
  }));
  const out = analytics.aggregate(data, ['need_category'], 20);
  assert.strictEqual(out.suppressed, true);
});

test('slicing finer does not slip under the threshold', () => {
  // Plenty of people overall, but thin once split by outcome.
  const data = [
    ...rows('housing', 40, 0).map((r) => ({ ...r, outcome_signal: 'resolved' })),
    ...rows('housing', 3, 100).map((r) => ({ ...r, outcome_signal: 'escalated' })),
  ];
  const out = analytics.aggregate(data, ['need_category', 'outcome_signal'], 20);
  const escalated = out.cells.find((c) => c.outcome_signal === 'escalated');
  assert.strictEqual(escalated.withheld, true);
});

test('contributor_key is rejected as a reporting dimension', () => {
  assert.throws(
    () => analytics.aggregate(rows('housing', 40), ['contributor_key'], 20),
    /Not a reportable dimension/
  );
});

test('validateFact refuses free text', () => {
  const bad = analytics.validateFact({
    need_category: 'my brother Marcus keeps asking for money',
    support_accessed: 'none',
    outcome_signal: 'resolved',
  });
  assert.strictEqual(bad.ok, false);
  assert.match(bad.error, /Invalid need_category/);
});

test('validateFact drops unknown keys rather than storing them', () => {
  const out = analytics.validateFact({
    need_category: 'housing',
    support_accessed: 'family',
    outcome_signal: 'resolved',
    situation: 'free text that must never reach the table',
  });
  assert.strictEqual(out.ok, true);
  assert.deepStrictEqual(Object.keys(out.fact).sort(), [
    'need_category',
    'outcome_signal',
    'support_accessed',
  ]);
});

test('contributorKey is stable, distinct, and not the user id', () => {
  const secret = 'test-secret';
  const a = analytics.contributorKey('user-a', secret);
  const b = analytics.contributorKey('user-b', secret);

  assert.strictEqual(a, analytics.contributorKey('user-a', secret));
  assert.notStrictEqual(a, b);
  assert.ok(!a.includes('user-a'));
  // A different secret yields a different key, so the mapping cannot be
  // rebuilt without it.
  assert.notStrictEqual(a, analytics.contributorKey('user-a', 'other-secret'));
});

test('contributorKey refuses to run without a secret', () => {
  assert.throws(() => analytics.contributorKey('user-a', ''), /not configured/);
});

console.log(`\n${passed} passed`);
