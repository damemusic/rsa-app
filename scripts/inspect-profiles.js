#!/usr/bin/env node

/**
 * Inspect script: View all profiles in database
 * Usage: node scripts/inspect-profiles.js
 */

async function inspectProfile(userId) {
  const debugUrl = `https://rsa-backend-production-7b95.up.railway.app/api/debug/profile?userId=${userId}`;

  try {
    const response = await fetch(debugUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return { error: error.message, userId };
  }
}

async function inspectProfiles() {
  try {
    console.log('[Inspect] Checking test users for profile data...\n');

    // Test user IDs from the error logs
    const testUserIds = [
      'a40c5430-4973-465e-a262-66dd7e7b6bf6', // testuser+clean@example.com
      '2ccca693-b94e-48a8-a955-09ca69638eb9', // testuser+persist@example.com
      '41077430-190e-471c-a79a-f7c066d01b17', // testuser+persistence@example.com
      'cd1fff4e-9a2d-4893-bb2f-f0b299cf16f5', // testuser+final@example.com
    ];

    for (const userId of testUserIds) {
      const result = await inspectProfile(userId);
      console.log(`\n[Inspect] User: ${userId}`);

      if (result.error) {
        console.log(`  ✗ Error: ${result.error}`);
      } else if (result.found) {
        const ed = result.encrypted_data;
        console.log(`  ✓ Profile found!`);
        console.log(`    - encrypted_data length: ${ed.length}`);
        console.log(`    - starts with quote: ${ed.startsWithQuote}`);
        console.log(`    - ends with quote: ${ed.endsWithQuote}`);
        console.log(`    - valid base64: ${ed.base64Pattern}`);
        console.log(`    - first chars: ${ed.firstChars}`);
        console.log(`    - created: ${result.created_at}`);
        console.log(`    - updated: ${result.updated_at}`);
      } else {
        console.log(`  - No profile found`);
      }
    }

  } catch (error) {
    console.error('[Inspect] Error:', error.message);
    process.exit(1);
  }
}

inspectProfiles();
