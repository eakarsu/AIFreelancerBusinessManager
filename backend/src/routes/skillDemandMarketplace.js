// Skill-demand marketplace integration aggregating Upwork/Toptal/LinkedIn
// postings to surface emerging skill rates.
// Audit: batch_04.md / AIFreelancerBusinessManager / Custom Feature Suggestions #3
// TODO: configure credentials UPWORK_API_KEY, TOPTAL_API_KEY, LINKEDIN_API_KEY
import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { callAI } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

function safeJSON(text, fallback = 'notes') {
  if (!text) return { [fallback]: '' };
  try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (_) {}
  return { [fallback]: text };
}

// Stub fetcher — would call live marketplace APIs.
async function fetchMarketplaceSnapshot(skill) {
  const sources = {
    upwork: !!process.env.UPWORK_API_KEY,
    toptal: !!process.env.TOPTAL_API_KEY,
    linkedin: !!process.env.LINKEDIN_API_KEY
  };
  // TODO: configure credentials and replace with real fetch.
  return {
    skill,
    sources_configured: sources,
    sample_postings: [],
    note: 'Stub snapshot. Set UPWORK_API_KEY/TOPTAL_API_KEY/LINKEDIN_API_KEY for live data.'
  };
}

// POST /api/skill-demand/scan { skill?, region? }
router.post('/scan', aiRateLimiter, async (req, res) => {
  try {
    const { skill, region } = req.body || {};
    const userId = req.user.id;

    let mySkills = { rows: [] };
    try {
      mySkills = await pool.query(
        `SELECT skill, SUM(hours) AS hours, AVG(hourly_rate) AS avg_rate
         FROM time_entries WHERE user_id = $1 AND skill IS NOT NULL
         GROUP BY skill ORDER BY hours DESC LIMIT 20`,
        [userId]
      );
    } catch (_) {}

    const targetSkill = skill || (mySkills.rows[0] && mySkills.rows[0].skill) || 'general';
    const snapshot = await fetchMarketplaceSnapshot(targetSkill);

    const systemPrompt = `You are a freelance skill-demand analyst. Aggregate marketplace signals (Upwork/Toptal/LinkedIn)
to surface emerging skill rates, demand trends, and recommended rate adjustments. Return STRICT JSON only.`;
    const userPrompt = `Target skill: ${targetSkill}
Region: ${region || 'global'}
Freelancer's current skill profile: ${JSON.stringify(mySkills.rows)}
Marketplace snapshot: ${JSON.stringify(snapshot)}

Return JSON:
{
  "summary": "...",
  "skill_rate_estimates": [{ "skill": "string", "region": "string", "median_hourly_usd": 0, "p75_hourly_usd": 0, "demand_trend": "rising|stable|falling" }],
  "emerging_skills": [{ "skill": "string", "rationale": "string", "expected_rate_uplift_pct": 0 }],
  "skills_at_risk": ["..."],
  "actions_for_freelancer": ["..."],
  "data_freshness_note": "string",
  "disclaimer": "Marketplace data is approximate; verify on each platform."
}`;
    const raw = await callAI(systemPrompt, userPrompt);
    res.json({ skill: targetSkill, region: region || null, snapshot, ai_analysis: safeJSON(raw) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/skill-demand/configured
router.get('/configured', (_req, res) => {
  res.json({
    upwork: !!process.env.UPWORK_API_KEY,
    toptal: !!process.env.TOPTAL_API_KEY,
    linkedin: !!process.env.LINKEDIN_API_KEY
  });
});

export default router;
