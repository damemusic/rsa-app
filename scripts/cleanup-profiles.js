#!/usr/bin/env node

/**
 * Cleanup script: Call backend endpoint to remove malformed profile data
 * Usage: node scripts/cleanup-profiles.js
 */

async function cleanupProfiles() {
  const backendUrl = 'https://rsa-backend-production-7b95.up.railway.app/api/admin/cleanup-profiles';

  try {
    console.log('[Cleanup] Calling backend cleanup endpoint...');
    console.log(`[Cleanup] URL: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP ${response.status}: ${error.error || 'Unknown error'}`);
    }

    const result = await response.json();

    console.log('[Cleanup] ✓ Success!');
    console.log(`[Cleanup] Message: ${result.message}`);
    console.log(`[Cleanup] Cleaned user IDs:`, result.cleanedUserIds || '(none)');
    console.log(`[Cleanup] Timestamp: ${result.timestamp}`);

  } catch (error) {
    console.error('[Cleanup] ✗ Error:', error.message);
    process.exit(1);
  }
}

cleanupProfiles();
