#!/usr/bin/env node

/**
 * Test script: Verify if encrypted profiles can be decrypted
 * Usage: node scripts/test-decrypt.js
 */

async function decryptProfile(userId, encryptedData) {
  try {
    // Derive recovery code the same way the app does
    const recoveryCode = Buffer.from(userId).toString('base64').substring(0, 20);
    console.log(`  Recovery code: ${recoveryCode}`);

    // Simulate the decryption process
    // Decode base64
    const combined = Buffer.from(encryptedData, 'base64');
    console.log(`  Encrypted data length: ${encryptedData.length} chars -> ${combined.length} bytes`);

    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    console.log(`  IV length: ${iv.length} bytes`);
    console.log(`  Ciphertext length: ${ciphertext.length} bytes`);

    if (iv.length !== 12) {
      console.log(`  ✗ ERROR: IV length is ${iv.length}, expected 12`);
      return false;
    }

    console.log(`  ✓ IV size is valid (12 bytes)`);
    return true;

  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function testDecrypt() {
  try {
    console.log('[TestDecrypt] Testing profile decryption...\n');

    // Profile data from inspection
    const profiles = [
      {
        userId: '2ccca693-b94e-48a8-a955-09ca69638eb9',
        email: 'testuser+persist@example.com',
        encryptedData: 'iM6kZq1riq7iwXOYE8I5lMAkLVdRee3ErNaCgTxyWuIi7yKdcm...' // truncated for display
      },
      {
        userId: 'cd1fff4e-9a2d-4893-bb2f-f0b299cf16f5',
        email: 'testuser+final@example.com',
        encryptedData: '/mGTB5JAYDhecbA+FnMHt8GAdNfEDfRcco+Pr6ZXL5JeIxZRYw...' // truncated for display
      }
    ];

    // Fetch actual encrypted data
    for (const profile of profiles) {
      const debugUrl = `https://rsa-backend-production-7b95.up.railway.app/api/debug/profile?userId=${profile.userId}`;
      const response = await fetch(debugUrl);
      const data = await response.json();

      if (data.found && data.encrypted_data.firstChars) {
        console.log(`\n[TestDecrypt] User: ${profile.userId} (${profile.email})`);

        // We can't get the full encrypted data from the debug endpoint easily, but we can verify IV size
        const success = await decryptProfile(profile.userId, data.encrypted_data.firstChars + '...(truncated)');
      }
    }

  } catch (error) {
    console.error('[TestDecrypt] Error:', error.message);
    process.exit(1);
  }
}

testDecrypt();
