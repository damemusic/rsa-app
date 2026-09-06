const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk').default;
const { createClient } = require('@supabase/supabase-js');
const jwtDecode = require('jwt-decode');

dotenv.config();

const app = express();
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('[Backend] SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Try to create admin client with service role key if available
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : supabase;

console.log('[Backend] Using admin client:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Configure CORS explicitly
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main Claude API endpoint
app.post('/api/claude', async (req, res) => {
  try {
    const { system, messages, max_tokens = 500 } = req.body;

    console.log('[Claude API] Received request');
    console.log('[Claude API]   system length:', system?.length);
    console.log('[Claude API]   messages count:', messages?.length);
    console.log('[Claude API]   max_tokens:', max_tokens);
    console.log('[Claude API] API key configured:', !!process.env.ANTHROPIC_API_KEY);

    if (!system || !messages) {
      return res.status(400).json({ error: 'Missing system or messages' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[Claude API] ERROR: ANTHROPIC_API_KEY is not set');
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('[Claude API] Calling Anthropic API with model claude-opus-5');
    let apiResponse;
    try {
      apiResponse = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: max_tokens,
        system: system,
        messages: messages,
      });
    } catch (apiError) {
      console.error('[Claude API] Anthropic API call failed');
      console.error('[Claude API]   Error:', apiError.message);
      console.error('[Claude API]   Error status:', apiError.status);
      console.error('[Claude API]   Full error:', apiError);
      throw apiError;
    }

    console.log('[Claude API] API response received');
    console.log('[Claude API]   response type:', typeof apiResponse);
    console.log('[Claude API]   response.id:', apiResponse?.id);
    console.log('[Claude API]   response.content type:', typeof apiResponse?.content);
    console.log('[Claude API]   response.content array length:', apiResponse?.content?.length);
    console.log('[Claude API]   response.content[0]:', apiResponse?.content?.[0]);
    console.log('[Claude API]   response.stop_reason:', apiResponse?.stop_reason);
    console.log('[Claude API]   response.usage:', apiResponse?.usage);

    // Extract text content from response
    // Note: Claude Opus 5 may return extended thinking format with thinking block first
    let content = '';
    if (apiResponse && apiResponse.content && apiResponse.content.length > 0) {
      // Find the text block (may not be first if thinking is enabled)
      const textBlock = apiResponse.content.find(block => block.type === 'text');

      if (textBlock && textBlock.text) {
        content = textBlock.text;
        console.log('[Claude API]   Extracted text content, length:', content.length);
      } else {
        console.log('[Claude API]   No text block found in response');
        console.log('[Claude API]   Content blocks:', apiResponse.content.map((b, i) => `[${i}] type=${b.type}`).join(', '));
      }
    } else {
      console.log('[Claude API]   Response has no content array or is empty');
    }

    console.log('[Claude API] Final content to return - length:', content.length);
    res.json({ content });
  } catch (error) {
    console.error('[Claude API] Fatal error:', error);
    console.error('[Claude API] Error message:', error.message);
    console.error('[Claude API] Error type:', error.constructor.name);
    console.error('[Claude API] Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to call Claude API',
    });
  }
});

// Belief suggestions endpoint
app.post('/api/suggest-beliefs', async (req, res) => {
  try {
    const { situation, stepA } = req.body;

    if (!situation || !stepA) {
      return res.status(400).json({ error: 'Missing situation or stepA' });
    }

    const systemPrompt = `You are a compassionate, non-clinical co-facilitator helping someone reflect on a difficult situation using Rational Self-Analysis (RSA). Your job is to suggest possible self-talk statements they might have had — not to diagnose, treat, or advise, but to help them recognize their own inner voice.

Respond ONLY with a JSON array of 3 strings, each a short first-person belief statement (e.g., "I'm going to fail", "Nobody likes me", "This always happens to me"). Keep each under 15 words. Do not include any other text.

Example output format:
["I always mess things up", "Everyone thinks I'm stupid", "Nothing ever works out for me"]`;

    const userPrompt = `Situation: ${situation}\n\nFactual details (Step A): ${stepA}\n\nWhat might they have been thinking?`;

    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Handle thinking blocks - find the text block (may not be first)
    const textBlock = response.content.find(block => block.type === 'text');
    const content = textBlock?.text || '';

    try {
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return res.json({ suggestions });
      }
    } catch {
      // If JSON parsing fails, return empty array
    }

    res.json({ suggestions: [] });
  } catch (error) {
    console.error('Belief suggestion error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate suggestions' });
  }
});

// Rewrite check endpoint
app.post('/api/check-rewrite', async (req, res) => {
  try {
    const { originalBelief, failedRuleIds, rewrite, ruleDescriptions } = req.body;

    if (!originalBelief || !failedRuleIds || !rewrite) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ruleHints = {
      reality: 'Look for proof. Can you point to facts that show this is true?',
      health: 'Does this thought help keep you safe? Does it make you feel calmer?',
      goals: 'Ask yourself: does this get me closer to what I want? Or further away?',
      conflict: 'Will this thought help me get along with people? Or cause problems?',
      emotion: 'Does this thought make you feel better and less stressed?',
    };

    const systemPrompt = `You are a caring helper working with someone who is stressed. Use VERY simple, 5th-grade level language. Your job is to check if their rewrite is better than their original belief.

For each rule they FAILED, check if their new version passes that rule. Be specific and kind.

If the rewrite doesn't pass a rule, give ONE clear tip on how to fix it — like you're talking to a friend.

Keep total response to 2-3 sentences max.`;

    const failedRuleDetails = failedRuleIds
      .map(id => `Rule: "${ruleDescriptions[id] || id}"\nTip: ${ruleHints[id] || 'Think about this rule.'}`)
      .join('\n\n');

    const userPrompt = `Original belief: "${originalBelief}"

They rewrote it to: "${rewrite}"

Rules it needs to fix:
${failedRuleDetails}

Is the new version better? Which rules still need work?`;

    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Handle thinking blocks - find the text block (may not be first)
    const textBlock = response.content.find(block => block.type === 'text');
    const feedback = textBlock?.text || '';
    res.json({ feedback });
  } catch (error) {
    console.error('Rewrite check error:', error);
    res.status(500).json({ error: error.message || 'Failed to check rewrite' });
  }
});

// ===== User Setup & Profile Endpoints =====

// POST /api/user/setup - Create new user with recovery code
app.post('/api/user/setup', async (req, res) => {
  try {
    const { userId, recoveryCode } = req.body;

    if (!userId || !recoveryCode) {
      return res.status(400).json({ error: 'Missing userId or recoveryCode' });
    }

    console.log('[Setup] Using supabaseAdmin (service role key):', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('[Setup] Creating user:', userId);

    const { data, error } = await supabaseAdmin
      .from('rsa_users')
      .upsert(
        {
          id: userId,
          recovery_code_hash: Buffer.from(recoveryCode).toString('base64'),
          created_at: new Date().toISOString(),
          last_check_in: null,
        },
        { onConflict: 'id' }
      )
      .select();

    if (error) {
      console.error('[Setup] Supabase error:', error);
      throw error;
    }

    console.log('[Setup] User created successfully:', data);
    res.json({ user: data[0] });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: error.message || 'Failed to setup user' });
  }
});

// POST /api/user/profile - Save encrypted profile
app.post('/api/user/profile', async (req, res) => {
  try {
    console.log('[Profile] Raw req.body:', JSON.stringify(req.body).substring(0, 200));
    console.log('[Profile] Raw req.body keys:', Object.keys(req.body));

    const { userId, encryptedProfile } = req.body;

    if (!userId || !encryptedProfile) {
      console.log('[Profile] ERROR: Missing userId or encryptedProfile');
      console.log('[Profile]   userId exists:', !!userId, 'type:', typeof userId);
      console.log('[Profile]   encryptedProfile exists:', !!encryptedProfile, 'type:', typeof encryptedProfile);
      return res.status(400).json({ error: 'Missing userId or encryptedProfile' });
    }

    console.log('[Profile] Received save request:');
    console.log('[Profile]   userId:', userId);
    console.log('[Profile]   encryptedProfile type:', typeof encryptedProfile);
    console.log('[Profile]   encryptedProfile length:', encryptedProfile.length);
    console.log('[Profile]   encryptedProfile first 100 chars:', encryptedProfile.substring(0, 100));
    console.log('[Profile]   encryptedProfile last 100 chars:', encryptedProfile.substring(Math.max(0, encryptedProfile.length - 100)));

    // Ensure user exists in rsa_users table (required for foreign key)
    console.log('[Profile] Creating user in rsa_users if not exists:', userId);
    const { error: userError } = await supabaseAdmin
      .from('rsa_users')
      .upsert({ id: userId }, { onConflict: 'id' })
      .select();

    if (userError) {
      console.error('[Profile] Error creating user:', userError);
      throw userError;
    }
    console.log('[Profile] User ensured in rsa_users');

    const { data, error } = await supabaseAdmin
      .from('rsa_profiles')
      .upsert(
        {
          user_id: userId,
          encrypted_data: encryptedProfile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select();

    if (error) throw error;

    console.log('[Profile] Saved successfully');
    console.log('[Profile]   returned data:', data[0]);
    console.log('[Profile]   returned encrypted_data length:', data[0]?.encrypted_data?.length);
    console.log('[Profile]   returned encrypted_data first 50 chars:', data[0]?.encrypted_data?.substring(0, 50));
    console.log('[Profile]   Match - sent length:', encryptedProfile.length, 'returned length:', data[0]?.encrypted_data?.length, 'match:', encryptedProfile === data[0]?.encrypted_data);
    res.json({ profile: data[0] });
  } catch (error) {
    console.error('Profile save error:', error);
    res.status(500).json({ error: error.message || 'Failed to save profile' });
  }
});

// GET /api/user/profile - Retrieve encrypted profile
app.get('/api/user/profile', async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }

    console.log('[Profile] Received fetch request for userId:', userId);

    const { data, error } = await supabaseAdmin
      .from('rsa_profiles')
      .select('encrypted_data')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      console.log('[Profile] No profile found');
      return res.json({ encryptedProfile: null });
    }

    const encrypted = data.encrypted_data;
    console.log('[Profile] Fetched profile:');
    console.log('[Profile]   encrypted_data type:', typeof encrypted);
    console.log('[Profile]   encrypted_data length:', encrypted?.length);
    console.log('[Profile]   encrypted_data first 100 chars:', encrypted?.substring(0, 100));
    console.log('[Profile]   encrypted_data last 100 chars:', encrypted?.substring(Math.max(0, (encrypted?.length || 0) - 100)));

    res.json({ encryptedProfile: encrypted });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch profile' });
  }
});

// DEBUG: GET /api/debug/profile - Inspect raw encrypted profile
app.get('/api/debug/profile', async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }

    console.log('[DebugProfile] Inspecting userId:', userId);

    const { data, error } = await supabaseAdmin
      .from('rsa_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      return res.json({ found: false, message: 'No profile found' });
    }

    const encrypted = data.encrypted_data;
    const analysisResult = {
      found: true,
      encrypted_data: {
        type: typeof encrypted,
        length: encrypted?.length,
        isNull: encrypted === null,
        isUndefined: encrypted === undefined,
        isEmpty: encrypted === '',
        firstChars: encrypted ? encrypted.substring(0, 50) : null,
        lastChars: encrypted ? encrypted.substring(Math.max(0, encrypted.length - 50)) : null,
        startsWithQuote: encrypted ? encrypted.startsWith('"') : null,
        endsWithQuote: encrypted ? encrypted.endsWith('"') : null,
        base64Pattern: encrypted ? /^[A-Za-z0-9+/=]*$/.test(encrypted) : null,
        hexDump: encrypted ? Buffer.from(encrypted.substring(0, 48)).toString('hex') : null,
      },
      ai_profile: {
        type: typeof data.ai_profile,
        isObject: data.ai_profile && typeof data.ai_profile === 'object',
        length: typeof data.ai_profile === 'string' ? data.ai_profile.length : 'N/A (not a string)',
        preview: typeof data.ai_profile === 'string' ? data.ai_profile.substring(0, 100) : JSON.stringify(data.ai_profile).substring(0, 100),
      },
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    console.log('[DebugProfile] Analysis:', JSON.stringify(analysisResult, null, 2));
    res.json(analysisResult);
  } catch (error) {
    console.error('Debug profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to inspect profile' });
  }
});

// ===== Entry Endpoints =====

// POST /api/entries - Save or update an RSA entry
app.post('/api/entries', async (req, res) => {
  try {
    const { userId, encryptedData, status } = req.body;

    if (!userId || !encryptedData) {
      return res.status(400).json({ error: 'Missing userId or encryptedData' });
    }

    if (typeof encryptedData !== 'string') {
      return res.status(400).json({ error: 'encryptedData must be a base64-encoded string' });
    }

    console.log('[Entries] Saving encrypted entry for userId:', userId);
    console.log('[Entries] Entry status:', status);
    console.log('[Entries] Encrypted data length:', encryptedData.length);

    // Generate a UUID for the entry using SHA256 hash of userId + timestamp
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256').update(userId + timestamp).digest();
    const entryId = [
      hash.slice(0, 4).toString('hex'),
      hash.slice(4, 6).toString('hex'),
      hash.slice(6, 8).toString('hex'),
      hash.slice(8, 10).toString('hex'),
      hash.slice(10, 16).toString('hex'),
    ].join('-');

    console.log('[Entries] Generated entry ID:', entryId);

    const { data, error } = await supabaseAdmin
      .from('rsa_entries')
      .upsert(
        {
          id: entryId,
          user_id: userId,
          encrypted_data: encryptedData,
          status: status || 'completed',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select();

    if (error) {
      console.error('[Entries] Supabase error:', error);
      throw error;
    }

    console.log('[Entries] Entry saved successfully:', data[0]?.id);
    res.json({ entry: data[0] });
  } catch (error) {
    console.error('Entry save error:', error);
    res.status(500).json({ error: error.message || 'Failed to save entry' });
  }
});

// GET /api/entries/in-progress/:userId - Get all in-progress entries for a user
app.get('/api/entries/in-progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('[Entries] Fetching in-progress entries for userId:', userId);

    const { data, error } = await supabaseAdmin
      .from('rsa_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Entries] Supabase error:', error);
      throw error;
    }

    console.log('[Entries] Found', data?.length || 0, 'in-progress entries');
    res.json({ entries: data || [] });
  } catch (error) {
    console.error('In-progress entries fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch in-progress entries' });
  }
});

// GET /api/entries/:entryId - Get a specific entry for resuming
app.get('/api/entries/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;

    console.log('[Entries] Fetching entry:', entryId);

    const { data, error } = await supabaseAdmin
      .from('rsa_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Entries] Supabase error:', error);
      throw error;
    }

    if (!data) {
      console.log('[Entries] Entry not found:', entryId);
      return res.status(404).json({ error: 'Entry not found' });
    }

    console.log('[Entries] Entry fetched:', data.id);
    res.json({ ...data.encrypted_data, id: data.id });
  } catch (error) {
    console.error('Entry fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch entry' });
  }
});

// DELETE /api/entries/:entryId - Delete an entry
app.delete('/api/entries/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    console.log('[Entries] Deleting entry:', entryId, 'for userId:', userId);

    const { error } = await supabaseAdmin
      .from('rsa_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      console.error('[Entries] Supabase error:', error);
      throw error;
    }

    console.log('[Entries] Entry deleted:', entryId);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    console.error('Entry delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete entry' });
  }
});

// ===== Check-in Endpoints =====

// POST /api/check-in - Log a check-in
app.post('/api/check-in', async (req, res) => {
  try {
    const { userId, stepCompleted } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const { data, error } = await supabaseAdmin
      .from('rsa_check_ins')
      .insert({
        user_id: userId,
        checked_in_at: new Date().toISOString(),
        step_completed: stepCompleted || null,
      })
      .select();

    if (error) throw error;

    // Update last check-in on user
    await supabaseAdmin
      .from('rsa_users')
      .update({ last_check_in: new Date().toISOString() })
      .eq('id', userId);

    res.json({ checkIn: data[0] });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: error.message || 'Failed to log check-in' });
  }
});

// GET /api/check-in/schedule/:userId - Get next check-in date
app.get('/api/check-in/schedule/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('rsa_users')
      .select('created_at, last_check_in')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      return res.json({ schedule: null });
    }

    const createdDate = new Date(data.created_at);
    const lastCheckIn = data.last_check_in ? new Date(data.last_check_in) : null;
    const daysActive = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    let frequency = 'daily'; // daily first week
    let nextCheckInDate = new Date();

    if (daysActive > 7) {
      frequency = 'weekly';
      nextCheckInDate = new Date(lastCheckIn || createdDate);
      nextCheckInDate.setDate(nextCheckInDate.getDate() + 7);
    } else {
      nextCheckInDate = new Date(lastCheckIn || createdDate);
      nextCheckInDate.setDate(nextCheckInDate.getDate() + 1);
    }

    res.json({
      schedule: {
        frequency,
        nextCheckInDate: nextCheckInDate.toISOString(),
        daysActive,
        lastCheckIn: lastCheckIn?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Schedule fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch schedule' });
  }
});

// GET /api/check-in/history/:userId - Get check-in history
app.get('/api/check-in/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('rsa_check_ins')
      .select('checked_in_at, step_completed')
      .eq('user_id', userId)
      .order('checked_in_at', { ascending: false })
      .limit(52); // Last 52 weeks

    if (error) throw error;

    res.json({ checkIns: data || [] });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch history' });
  }
});

// ===== PO Dashboard Endpoints =====

// POST /api/po/auth - PO login (Supabase auth)
app.post('/api/po/auth', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    res.json({ user: data.user, session: data.session });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
});

// GET /api/po/dashboard - Get assigned users for PO
app.get('/api/po/dashboard', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwtDecode(token);
    const poId = decoded.sub;

    const { data, error } = await supabase
      .from('rsa_po_assignments')
      .select(`
        user_id,
        assigned_at,
        rsa_users (
          id,
          created_at,
          last_check_in
        )
      `)
      .eq('po_id', poId);

    if (error) throw error;

    // Calculate compliance for each user
    const users = data.map(assignment => {
      const user = assignment.rsa_users;
      const createdDate = new Date(user.created_at);
      const weeksActive = Math.ceil((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      const lastCheckIn = user.last_check_in ? new Date(user.last_check_in) : null;

      return {
        userId: user.id,
        createdAt: user.created_at,
        lastCheckIn: lastCheckIn?.toISOString() || null,
        weeksActive,
        assignedAt: assignment.assigned_at,
      };
    });

    res.json({ users });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard' });
  }
});

// GET /api/po/compliance/:userId - Get compliance data for a user
app.get('/api/po/compliance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    // Verify PO has access to this user
    const token = authHeader.split(' ')[1];
    const decoded = jwtDecode(token);
    const poId = decoded.sub;

    const { error: permError } = await supabase
      .from('rsa_po_assignments')
      .select('id')
      .eq('po_id', poId)
      .eq('user_id', userId)
      .single();

    if (permError) {
      return res.status(403).json({ error: 'Not authorized to view this user' });
    }

    const { data, error } = await supabase
      .from('rsa_check_ins')
      .select('checked_in_at')
      .eq('user_id', userId)
      .order('checked_in_at', { ascending: false })
      .limit(52);

    if (error) throw error;

    const checkIns = data || [];
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentCheckIns = checkIns.filter(ci => new Date(ci.checked_in_at) >= sevenDaysAgo);

    res.json({
      compliance: {
        lastCheckIn: checkIns[0]?.checked_in_at || null,
        lastWeekCheckIns: recentCheckIns.length,
        checkInHistory: checkIns,
      },
    });
  } catch (error) {
    console.error('Compliance fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch compliance' });
  }
});

// ADMIN: POST /api/admin/cleanup-profiles - Remove malformed profile data
app.post('/api/admin/cleanup-profiles', async (req, res) => {
  try {
    console.log('[CleanupProfiles] Starting cleanup of malformed profiles');

    // Fetch all profiles and filter for malformed data
    const { data: allProfiles, error: fetchError } = await supabaseAdmin
      .from('rsa_profiles')
      .select('user_id, encrypted_data');

    if (fetchError) {
      console.error('[CleanupProfiles] Error fetching profiles:', fetchError);
      throw fetchError;
    }

    const malformedUserIds = allProfiles
      .filter(profile => {
        const ed = profile.encrypted_data;
        return !ed || ed === '' || ed.length < 20 || (ed && ed.startsWith('"') && ed.endsWith('"'));
      })
      .map(p => p.user_id);

    console.log('[CleanupProfiles] Found', malformedUserIds.length, 'malformed profiles:', malformedUserIds);

    // Delete malformed profiles
    if (malformedUserIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('rsa_profiles')
        .delete()
        .in('user_id', malformedUserIds);

      if (deleteError) {
        console.error('[CleanupProfiles] Error deleting profiles:', deleteError);
        throw deleteError;
      }
    }

    console.log('[CleanupProfiles] Cleanup complete, deleted', malformedUserIds.length, 'profiles');
    res.json({
      success: true,
      message: `Removed ${malformedUserIds.length} malformed profiles`,
      cleanedUserIds: malformedUserIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message || 'Failed to cleanup profiles' });
  }
});

// ===== AI Profile Endpoints (Family Members & Reaction Assessment) =====

// POST /api/ai-profile/:userId - Save AI Profile
app.post('/api/ai-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { familyMembers, scenarioResponses, reactionPatterns } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    console.log('[AIProfile] Saving AI profile for userId:', userId);
    console.log('[AIProfile] familyMembers count:', familyMembers?.length || 0);
    console.log('[AIProfile] scenarioResponses count:', scenarioResponses?.length || 0);
    console.log('[AIProfile] reactionPatterns count:', reactionPatterns?.length || 0);

    // Save AI profile to rsa_profiles table
    const aiProfileData = {
      familyMembers: familyMembers || [],
      scenarioResponses: scenarioResponses || [],
      reactionPatterns: reactionPatterns || [],
      lastUpdated: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('rsa_profiles')
      .upsert(
        {
          user_id: userId,
          ai_profile: aiProfileData,
          encrypted_data: JSON.stringify({}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select();

    if (error) {
      console.error('[AIProfile] Supabase error:', error);
      throw error;
    }

    console.log('[AIProfile] AI profile saved successfully');
    res.json({ success: true, profile: aiProfileData });
  } catch (error) {
    console.error('[AIProfile] Save error:', error);
    res.status(500).json({ error: error.message || 'Failed to save AI profile' });
  }
});

// GET /api/ai-profile/:userId - Load AI Profile
app.get('/api/ai-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    console.log('[AIProfile] Fetching AI profile for userId:', userId);

    const { data, error } = await supabaseAdmin
      .from('rsa_profiles')
      .select('ai_profile')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[AIProfile] Supabase error:', error);
      throw error;
    }

    if (!data || !data.ai_profile) {
      console.log('[AIProfile] No AI profile found for userId:', userId);
      return res.status(404).json({ error: 'AI profile not found' });
    }

    console.log('[AIProfile] AI profile fetched');
    const profile = typeof data.ai_profile === 'string'
      ? JSON.parse(data.ai_profile)
      : data.ai_profile;
    res.json({ profile });
  } catch (error) {
    console.error('[AIProfile] Fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch AI profile' });
  }
});

// POST /api/scenario-questions/generate - Generate follow-up questions
app.post('/api/scenario-questions/generate', async (req, res) => {
  try {
    const { userId, userResponse, triggeredByQuestionId, userProfile } = req.body;

    if (!userId || !userResponse || !triggeredByQuestionId) {
      return res.status(400).json({ error: 'Missing userId, userResponse, or triggeredByQuestionId' });
    }

    console.log('[GenQuestions] Generating follow-up for question:', triggeredByQuestionId);

    // Prepare context for Claude
    const systemPrompt = `You are an RSA (Rational Self-Analysis) coach. Generate 1-2 follow-up questions that deepen self-reflection and explore patterns in the user's response.

IMPORTANT: Return ONLY a valid JSON array. Do not include any other text or explanation.
Format: [{"title": "5-8 word title", "description": "1-2 sentence description", "category": "follow_up"}]

Guidelines:
- Titles: short, specific, under 8 words
- Descriptions: open-ended, reference specific details from their response, encourage honest reflection
- category: always "follow_up"`;

    const userPrompt = `User's response to the scenario question:

"${userResponse}"

${userProfile ? `Context about the user: ${JSON.stringify(userProfile)}` : ''}

Generate 1-2 follow-up questions to deepen their reflection on this response.`;

    console.log('[GenQuestions] Calling Claude for generation');
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (!response.content || response.content.length === 0) {
      throw new Error('Empty response from Claude');
    }

    console.log('[GenQuestions] Claude response blocks:', response.content.map((b, i) => `[${i}] type=${b.type}, length=${b.text?.length || 0}`).join(', '));

    // Handle thinking blocks - find the text block (may not be first)
    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock) {
      console.error('[GenQuestions] No text block found in response. Only blocks:', response.content.map(b => `type=${b.type}`).join(', '));
      // Return empty array instead of erroring
      console.log('[GenQuestions] Generated 0 questions (no text block)');
      res.json({ questions: [] });
      return;
    }

    console.log('[GenQuestions] Claude text response (first 500 chars):', textBlock.text.substring(0, 500));

    let generatedQuestions;
    try {
      const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('[GenQuestions] No JSON array found in Claude response. Full text:', textBlock.text);
      }
      generatedQuestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (parseErr) {
      console.error('[GenQuestions] Failed to parse Claude response:', parseErr, 'Text:', textBlock.text);
      generatedQuestions = [];
    }

    console.log('[GenQuestions] Generated', generatedQuestions.length, 'questions');

    // Save generated questions to database
    const savedQuestions = [];
    for (const q of generatedQuestions) {
      const { data, error } = await supabaseAdmin
        .from('scenario_questions_generated')
        .insert({
          scope: 'user',
          user_id: userId,
          title: q.title,
          description: q.description,
          category: q.category || 'follow_up',
          triggered_by_question_id: triggeredByQuestionId,
          triggered_by_user_response: userResponse.substring(0, 500), // Limit to 500 chars
        })
        .select();

      if (!error && data && data[0]) {
        savedQuestions.push(data[0]);
      }
    }

    console.log('[GenQuestions] Saved', savedQuestions.length, 'questions to database');

    // DEBUG: Return raw Claude response as well for troubleshooting
    res.json({
      questions: savedQuestions,
      ...(generatedQuestions.length === 0 && { debug: { claudeText: textBlock.text.substring(0, 300) } })
    });
  } catch (error) {
    console.error('[GenQuestions] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate questions' });
  }
});

// GET /api/scenario-questions/cached - Get previously generated questions
app.get('/api/scenario-questions/cached', async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }

    console.log('[CachedQuestions] Fetching cached questions for user:', userId);

    // Fetch recent generated questions for this user
    const { data, error } = await supabaseAdmin
      .from('scenario_questions_generated')
      .select('*')
      .eq('user_id', userId)
      .eq('scope', 'user')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit) || 10);

    if (error) throw error;

    console.log('[CachedQuestions] Found', data?.length || 0, 'cached questions');
    res.json({ questions: data || [] });
  } catch (error) {
    console.error('[CachedQuestions] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch cached questions' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
