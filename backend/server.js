const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Anthropic = require('@anthropic-ai/sdk').default;

dotenv.config();

const app = express();
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(cors());
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

    const rulesList = failedRuleIds
      .map(id => `- ${ruleDescriptions[id] || id}`)
      .join('\n');

    const systemPrompt = `You are a non-clinical co-facilitator helping someone rewrite unhelpful thinking patterns using the 5 Rules for Rational Thinking. Your job is to be honest (not flattering) about whether their rewrite actually addresses the rules it originally failed.

If the rewrite is just the same belief in softer language, say so plainly. If it's a genuine shift in thinking that passes the failed rules, say that. Keep your feedback to 2–3 sentences.`;

    const userPrompt = `Original belief: "${originalBelief}"\n\nIt failed these rules:\n${rulesList}\n\nTheir rewrite: "${rewrite}"\n\nDoes the rewrite actually pass the rules it failed, or is it just softer wording of the same thing?`;

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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
