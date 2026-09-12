'use strict';

const crypto = require('crypto');

/**
 * De-identified analytics: the taxonomy, the contributor key, and the
 * k-anonymity suppression that every published number passes through.
 *
 * The functions here are pure apart from `contributorKey`, so the suppression
 * rules can be exercised directly — see `npm run test:analytics`.
 */

// The only values a fact row may carry. These mirror the CHECK constraints in
// migration 014: the database rejects anything else, and so does this file, so
// a caller cannot smuggle narrative text into the analytics store through
// either door.
const TAXONOMY = {
  need_category: [
    'housing', 'employment', 'transportation', 'family_conflict',
    'substance_use', 'mental_health', 'finances', 'legal', 'healthcare',
    'childcare', 'education', 'food_security', 'social_isolation', 'other',
  ],
  support_accessed: [
    'none', 'family', 'friend', 'counselor', 'faith_community',
    'program_staff', 'probation_officer', 'peer_support', 'hotline', 'other',
  ],
  outcome_signal: ['resolved', 'plan_made', 'still_stuck', 'escalated'],
};

const FACT_FIELDS = Object.keys(TAXONOMY);

// Dimensions a report may group by. `contributor_key` is deliberately absent:
// it is an internal join key, never a reporting dimension.
const REPORT_DIMENSIONS = ['period_month', 'region', ...FACT_FIELDS];

/**
 * Minimum distinct people behind any published number.
 *
 * 20 is a deliberate floor rather than the 5 that shows up in a lot of
 * public-health reporting: some of these users are under criminal supervision
 * and some of the buyers supervise them, so a cell that narrows to a handful of
 * people stops being "where is the need" and becomes "who is struggling". The
 * floor protects everyone rather than only that group, since the app cannot
 * tell which users are in it.
 */
const DEFAULT_K = 20;

/**
 * Current terms version. Accepting these gates the app.
 * Bump when the terms or privacy policy change materially.
 */
const TERMS_VERSION = '2026-09-12.2';

/**
 * Current data-contribution disclosure version. Bump when that text changes
 * materially: consent to the old wording is not consent to the new one, and a
 * mismatch stops contributions until the user agrees again.
 */
const ANALYTICS_POLICY_VERSION = '2026-09-12.2';

/**
 * Stable pseudonym for a contributor.
 *
 * HMAC rather than a plain hash so the mapping cannot be rebuilt with a
 * rainbow table over the (small, enumerable) space of UUIDs. It is still
 * reversible by anyone holding the secret — it buys deletion and distinct
 * counting, not anonymity, and nothing here pretends otherwise.
 */
function contributorKey(userId, secret) {
  if (!secret) {
    throw new Error('ANALYTICS_CONTRIBUTOR_SECRET is not configured');
  }
  return crypto.createHmac('sha256', secret).update(String(userId)).digest('hex');
}

/**
 * Validate a submitted fact. Returns { ok: true, fact } or { ok: false, error }.
 *
 * Anything not in the taxonomy is rejected outright. No field is coerced or
 * defaulted from free input, and unknown keys are dropped rather than stored.
 */
function validateFact(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Missing fact body' };
  }

  const fact = {};
  for (const field of FACT_FIELDS) {
    const value = input[field];
    if (typeof value !== 'string') {
      return { ok: false, error: `Missing ${field}` };
    }
    if (!TAXONOMY[field].includes(value)) {
      return { ok: false, error: `Invalid ${field}` };
    }
    fact[field] = value;
  }
  return { ok: true, fact };
}

/** First day of the month, as YYYY-MM-DD. Coarse by design. */
function periodMonth(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Aggregate fact rows into published cells, suppressing anything that would
 * describe too few people.
 *
 * Two passes of suppression, because one is not enough:
 *
 *   Primary — a cell backed by fewer than k distinct contributors is withheld.
 *
 *   Secondary — if exactly one cell within a slice is withheld, the slice total
 *   minus the visible cells reveals it. So the next-smallest cell is withheld
 *   too. A "slice" is the set of cells sharing every dimension but the last.
 *
 * The overall total is published only if it too clears k, so a dataset of
 * fifteen people yields nothing at all rather than one aggregate number.
 */
function aggregate(rows, dimensions, k = DEFAULT_K) {
  for (const dim of dimensions) {
    if (!REPORT_DIMENSIONS.includes(dim)) {
      throw new Error(`Not a reportable dimension: ${dim}`);
    }
  }
  if (dimensions.length === 0) {
    throw new Error('At least one dimension is required');
  }

  // cellKey -> { dims, contributors:Set, checkIns:number }
  const cells = new Map();
  const allContributors = new Set();

  for (const row of rows) {
    const dims = {};
    for (const dim of dimensions) dims[dim] = row[dim] ?? null;
    const key = JSON.stringify(dimensions.map((d) => dims[d]));

    if (!cells.has(key)) {
      cells.set(key, { dims, contributors: new Set(), checkIns: 0 });
    }
    const cell = cells.get(key);
    cell.contributors.add(row.contributor_key);
    cell.checkIns += 1;
    allContributors.add(row.contributor_key);
  }

  // Nothing is publishable if the whole dataset is below the threshold.
  if (allContributors.size < k) {
    return {
      k,
      suppressed: true,
      reason: `Fewer than ${k} contributors in the dataset`,
      totalContributors: null,
      cells: [],
    };
  }

  const entries = [...cells.values()].map((cell) => ({
    dims: cell.dims,
    contributors: cell.contributors.size,
    checkIns: cell.checkIns,
    withheld: cell.contributors.size < k,
  }));

  // Secondary suppression, slice by slice. The slice key is every dimension
  // except the last, so cells that sum to a visible subtotal are considered
  // together.
  const leading = dimensions.slice(0, -1);
  const slices = new Map();
  for (const entry of entries) {
    const sliceKey = JSON.stringify(leading.map((d) => entry.dims[d]));
    if (!slices.has(sliceKey)) slices.set(sliceKey, []);
    slices.get(sliceKey).push(entry);
  }

  for (const slice of slices.values()) {
    const withheld = slice.filter((e) => e.withheld);
    if (withheld.length !== 1) continue;

    // Exactly one hole: widen it to the smallest visible neighbour, so the
    // subtraction no longer resolves.
    const visible = slice
      .filter((e) => !e.withheld)
      .sort((a, b) => a.contributors - b.contributors);
    if (visible.length > 0) visible[0].withheld = true;
  }

  return {
    k,
    suppressed: false,
    totalContributors: allContributors.size,
    cells: entries.map((entry) =>
      entry.withheld
        ? { ...entry.dims, contributors: null, checkIns: null, withheld: true }
        : {
            ...entry.dims,
            contributors: entry.contributors,
            checkIns: entry.checkIns,
            withheld: false,
          }
    ),
  };
}

module.exports = {
  TAXONOMY,
  FACT_FIELDS,
  REPORT_DIMENSIONS,
  DEFAULT_K,
  TERMS_VERSION,
  ANALYTICS_POLICY_VERSION,
  contributorKey,
  validateFact,
  periodMonth,
  aggregate,
};
