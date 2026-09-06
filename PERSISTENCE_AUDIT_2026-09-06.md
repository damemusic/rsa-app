# Persistence Audit — 2026-09-06

Scope: "family members are not saving", plus every related defect in the class
*should save / should stay available to the AI / should display as saved*.

Tested live against https://harmonious-cassata-9d5220.netlify.app as
`damemusic@icloud.com` (user `79332ac5-8c87-476f-bd19-fe50a5d017f3`), with every
result confirmed against Supabase (`wthlnrogmwodfbekghsj`) rather than console
logs alone.

## Root cause

The Zustand store had no setter for the AI profile. Two consequences flowed from
that single gap and produced every reported symptom:

1. Hydration replayed **append-only** mutators, so each page load duplicated the
   family members and scenario answers already stored.
2. `FamilyProfile` blind-saved on mount, so a not-yet-hydrated (empty) local
   profile overwrote the stored one.

That is also why the same bug kept "coming back" after each point fix: the fixes
were downstream of the cause.

A second, independent cluster sat in the entries layer: the Decision Log read the
wrong endpoint, never decrypted ciphertext rows, spread the ciphertext string
into `{"0":"r",...}` on resume, minted a new row on every save, and deleted
entries only from the local store.

## Defects and status

| # | Defect | Status |
|---|--------|--------|
| A–J, L | Profile duplication on hydration, blind-save overwrite, questionnaire reappearing | Fixed, live-verified |
| K | `clearUser` leaked `aiProfile` across users | Fixed in code — **not** live-verified (needs a second account) |
| M | Onboarding saved the AI profile before the row existed | Fixed in code — **not** live-verified (needs a fresh signup) |
| N | `clearUser` leaked `entries` / `currentEntry` | Fixed, verified by sign-out/sign-in |
| O | Journal showed every real check-in blank | Fixed, live-verified |
| P | Completed check-ins never appeared (wrong endpoint) | Fixed, live-verified |
| Q | Check-ins never reached the AI | Fixed, live-verified |
| R | Resume loaded ciphertext garbage | Fixed, live-verified |
| S | Journal delete was local-only, entry returned on reload | Fixed, live-verified |
| T | Save-Progress-then-complete created duplicate rows | Fixed, verified by SQL |
| U | `DELETE` reported success when it matched zero rows | Fixed, 404 verified at API level |

## Evidence

- **Family members save.** Added a member through the UI → `✓ Saved` →
  Supabase `familyMembers` went 1 → 2 with the new name present, and
  `scenarioResponses` stayed at 12. Reload hydrated *2 family members, 12
  scenario responses*. Removing it returned the profile to 1 member / 12
  responses / `enc_len` 1076, unchanged from baseline.
- **No duplication.** 12 responses, 12 distinct ids, 12 distinct scenarios.
- **Entries persist and decrypt.** Both encrypted and legacy-plaintext rows load
  and display real text; the resumed entry opened cleanly with no ciphertext.
- **Save updates in place.** After Save Progress on a resumed entry:
  `created_at` unchanged, `updated_at` new, `enc_len` 294 → 414, row count still 2.
- **Delete is real.** Throwaway row `65c97969-…` removed from the UI, gone from
  the database, and absent after reload; the two real rows survived.
- **The AI sees the data.** Asked without prompting, it returned both check-ins
  by content plus Marcus (brother, strained, monthly, money-in-front-of-others
  trigger) and the Reaction Assessment answers.
- Zero console errors on a clean load; the questionnaire does not reappear.

## Known gaps

`K` and `M` are fixed in code but cannot be proven live from here — one needs a
second user account and the other a fresh signup, and account creation is
something you have to do yourself. Everything else in the table was verified
against the database.

## Test-harness note (not an app bug)

The browser automation auto-dismisses native `confirm()` dialogs (returns
`false`), so Delete appears to do nothing under automation. Both delete tests
required `window.confirm = () => true` in the console first. Deleting by hand in
a real browser works normally.
