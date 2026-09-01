const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Anthropic = require('@anthropic-ai/sdk').default;
const { createClient } = require('@supabase/supabase-js');
const jwtDecode = require('jwt-decode');

dotenv.config();

const app = express();
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

    if (!system || !messages) {
      return res.status(400).json({ error: 'Missing system or messages' });
    }

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: max_tokens,
      system: system,
      messages: messages,
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    res.json({ content });
  } catch (error) {
    console.error('Claude API error:', error);
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
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

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
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const feedback = response.content[0]?.type === 'text' ? response.content[0].text : '';
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

    const { data, error } = await supabase
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

    if (error) throw error;

    res.json({ user: data[0] });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: error.message || 'Failed to setup user' });
  }
});

// POST /api/user/profile - Save encrypted profile
app.post('/api/user/profile', async (req, res) => {
  try {
    const { userId, encryptedProfile } = req.body;

    if (!userId || !encryptedProfile) {
      return res.status(400).json({ error: 'Missing userId or encryptedProfile' });
    }

    const { data, error } = await supabase
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

    res.json({ profile: data[0] });
  } catch (error) {
    console.error('Profile save error:', error);
    res.status(500).json({ error: error.message || 'Failed to save profile' });
  }
});

// GET /api/user/profile/:userId - Retrieve encrypted profile
app.get('/api/user/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('rsa_profiles')
      .select('encrypted_data')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ profile: data || null });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch profile' });
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

    const { data, error } = await supabase
      .from('rsa_check_ins')
      .insert({
        user_id: userId,
        checked_in_at: new Date().toISOString(),
        step_completed: stepCompleted || null,
      })
      .select();

    if (error) throw error;

    // Update last check-in on user
    await supabase
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

    const { data, error } = await supabase
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
