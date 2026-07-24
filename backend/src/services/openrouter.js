import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
const OPENROUTER_BASE_URL = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');

export async function callAI(systemPrompt, userMessage) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Freelancer Business Manager',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'AI request failed');
  return data.choices[0].message.content;
}

function parseJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {}
  return null;
}

export async function analyzeProject(project) {
  const systemPrompt = `You are a freelance project analyst AI. Analyze the project and return a JSON object with:
{
  "risk_score": 0.0-1.0,
  "risk_level": "low/medium/high",
  "scope_summary": "brief scope analysis",
  "timeline_assessment": "on track/at risk/behind",
  "budget_health": "healthy/warning/critical",
  "recommendations": ["actionable recommendation 1", "recommendation 2", "recommendation 3"],
  "key_risks": ["risk 1", "risk 2"],
  "overall_assessment": "2-3 sentence overall project health assessment"
}`;
  const result = await callAI(systemPrompt, JSON.stringify(project));
  return parseJSON(result) || { overall_assessment: result, risk_score: 0.5 };
}

export async function scoreClientHealth(client, projects, invoices) {
  const systemPrompt = `You are a client relationship analyst AI. Analyze the client data and return JSON:
{
  "health_score": 0.0-1.0,
  "health_level": "excellent/good/fair/poor",
  "churn_risk": "low/medium/high",
  "communication_quality": "excellent/good/needs improvement",
  "payment_reliability": "excellent/good/poor",
  "relationship_tips": ["tip 1", "tip 2", "tip 3"],
  "suggested_cadence": "weekly/biweekly/monthly",
  "overall_notes": "2-3 sentence client relationship summary"
}`;
  const data = { client, projects: projects?.slice(0, 5), invoices: invoices?.slice(0, 5) };
  const result = await callAI(systemPrompt, JSON.stringify(data));
  return parseJSON(result) || { overall_notes: result, health_score: 0.5 };
}

export async function predictPayment(invoice, client) {
  const systemPrompt = `You are a payment prediction AI. Analyze the invoice and client data. Return JSON:
{
  "payment_probability": 0.0-1.0,
  "predicted_days_to_payment": number,
  "risk_factors": ["factor 1", "factor 2"],
  "recommendations": ["action 1", "action 2"],
  "confidence": "high/medium/low",
  "suggested_followup_date": "YYYY-MM-DD",
  "notes": "brief payment prediction analysis"
}`;
  const result = await callAI(systemPrompt, JSON.stringify({ invoice, client }));
  return parseJSON(result) || { notes: result, payment_probability: 0.5 };
}

export async function reviewContract(contract) {
  const systemPrompt = `You are a contract review AI for freelancers. Analyze the contract. Return JSON:
{
  "risk_level": "low/medium/high",
  "risk_score": 0.0-1.0,
  "key_terms_summary": "summary of key terms",
  "risk_flags": ["flag 1", "flag 2"],
  "missing_clauses": ["clause 1", "clause 2"],
  "suggested_amendments": ["amendment 1", "amendment 2"],
  "favorable_terms": ["term 1", "term 2"],
  "overall_assessment": "2-3 sentence contract assessment"
}`;
  const result = await callAI(systemPrompt, JSON.stringify(contract));
  return parseJSON(result) || { overall_assessment: result, risk_score: 0.5 };
}

export async function analyzeProductivity(timeEntries, projects) {
  const systemPrompt = `You are a productivity analyst AI for freelancers. Analyze time tracking data. Return JSON:
{
  "productivity_score": 0.0-1.0,
  "avg_hours_per_day": number,
  "billable_ratio": 0.0-1.0,
  "most_productive_day": "day of week",
  "peak_hours": "morning/afternoon/evening",
  "underpriced_projects": ["project name"],
  "efficiency_tips": ["tip 1", "tip 2", "tip 3"],
  "weekly_summary": "2-3 sentence productivity summary",
  "estimated_remaining_effort": "estimate for active projects"
}`;
  const result = await callAI(systemPrompt, JSON.stringify({ timeEntries: timeEntries?.slice(0, 20), projects: projects?.slice(0, 10) }));
  return parseJSON(result) || { weekly_summary: result, productivity_score: 0.5 };
}

export async function categorizeExpense(expense) {
  const systemPrompt = `You are a business expense categorization AI. Analyze the expense. Return JSON:
{
  "suggested_category": "category name",
  "tax_deductible": true/false,
  "deduction_percentage": 0-100,
  "tax_category": "IRS category if applicable",
  "reasoning": "why this category",
  "similar_expenses_tip": "tip about managing similar expenses",
  "annual_impact": "estimated annual impact if recurring",
  "notes": "brief analysis"
}`;
  const result = await callAI(systemPrompt, JSON.stringify(expense));
  return parseJSON(result) || { notes: result, suggested_category: 'other' };
}

export async function improveProposal(proposal) {
  const systemPrompt = `You are a proposal optimization AI for freelancers. Analyze and improve the proposal. Return JSON:
{
  "win_probability": 0.0-1.0,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "improvements": ["specific improvement 1", "improvement 2", "improvement 3"],
  "pricing_assessment": "competitive/high/low",
  "suggested_value_adds": ["value add 1", "value add 2"],
  "executive_summary_draft": "improved summary paragraph",
  "overall_assessment": "2-3 sentence proposal assessment"
}`;
  const result = await callAI(systemPrompt, JSON.stringify(proposal));
  return parseJSON(result) || { overall_assessment: result, win_probability: 0.5 };
}

export async function prioritizeTasks(tasks) {
  const systemPrompt = `You are a task prioritization AI. Analyze all tasks and rank them. Return JSON:
{
  "prioritized_tasks": [{"id": id, "title": "title", "priority_score": 0.0-1.0, "reason": "why"}],
  "bottlenecks": ["bottleneck 1"],
  "quick_wins": ["task that can be done quickly"],
  "blocked_items": ["items that may be blocked"],
  "focus_recommendation": "what to focus on first and why",
  "daily_plan": "suggested order of tasks for today"
}`;
  const result = await callAI(systemPrompt, JSON.stringify(tasks?.slice(0, 20)));
  return parseJSON(result) || { focus_recommendation: result };
}

export async function estimateTaskEffort(task) {
  const systemPrompt = `You are a task effort estimation AI for freelance developers. Return JSON:
{
  "estimated_hours": number,
  "confidence": "high/medium/low",
  "complexity": "simple/moderate/complex",
  "breakdown": [{"subtask": "name", "hours": number}],
  "risk_factors": ["factor 1"],
  "similar_task_benchmark": "typical hours for similar tasks",
  "notes": "brief estimation reasoning"
}`;
  const result = await callAI(systemPrompt, JSON.stringify(task));
  return parseJSON(result) || { notes: result, estimated_hours: 4 };
}

export async function analyzeCommunication(communication) {
  const systemPrompt = `You are a communication analysis AI. Analyze the message/email. Return JSON:
{
  "sentiment": "positive/neutral/negative",
  "sentiment_score": 0.0-1.0,
  "urgency": "low/medium/high",
  "key_points": ["point 1", "point 2"],
  "action_items": ["action 1", "action 2"],
  "suggested_reply": "professional reply draft",
  "tone_assessment": "formal/casual/concerned/enthusiastic",
  "relationship_impact": "positive/neutral/concerning",
  "summary": "1-2 sentence summary"
}`;
  const result = await callAI(systemPrompt, JSON.stringify(communication));
  return parseJSON(result) || { summary: result, sentiment: 'neutral' };
}

export async function forecastRevenue(reports, projects, invoices) {
  const systemPrompt = `You are a financial forecasting AI for freelancers. Analyze revenue data. Return JSON:
{
  "forecast_next_month": number,
  "forecast_next_quarter": number,
  "forecast_confidence": "high/medium/low",
  "trend": "growing/stable/declining",
  "growth_rate": "percentage",
  "top_revenue_sources": ["source 1", "source 2"],
  "risk_factors": ["factor 1", "factor 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "cash_flow_warning": "any concerns about cash flow",
  "summary": "2-3 sentence financial outlook"
}`;
  const data = { reports: reports?.slice(0, 12), projects: projects?.slice(0, 10), invoices: invoices?.slice(0, 10) };
  const result = await callAI(systemPrompt, JSON.stringify(data));
  return parseJSON(result) || { summary: result };
}

export async function predictGoal(goal) {
  const systemPrompt = `You are a goal tracking and prediction AI. Analyze goal progress. Return JSON:
{
  "completion_probability": 0.0-1.0,
  "predicted_completion_date": "YYYY-MM-DD or 'unlikely'",
  "on_track": true/false,
  "current_pace": "ahead/on track/behind",
  "required_daily_progress": "what's needed per day/week",
  "action_items": ["specific action 1", "action 2", "action 3"],
  "obstacles": ["potential obstacle 1"],
  "motivation_tip": "encouraging tip",
  "assessment": "2-3 sentence goal progress assessment"
}`;
  const result = await callAI(systemPrompt, JSON.stringify(goal));
  return parseJSON(result) || { assessment: result, completion_probability: 0.5 };
}

export async function businessHealthCheck(data) {
  const systemPrompt = `You are a comprehensive business health AI for freelancers. Analyze all business data. Return JSON:
{
  "overall_health": 0.0-1.0,
  "health_grade": "A/B/C/D/F",
  "revenue_health": {"score": 0.0-1.0, "note": "brief"},
  "client_health": {"score": 0.0-1.0, "note": "brief"},
  "project_health": {"score": 0.0-1.0, "note": "brief"},
  "financial_health": {"score": 0.0-1.0, "note": "brief"},
  "productivity_health": {"score": 0.0-1.0, "note": "brief"},
  "top_priorities": ["priority 1", "priority 2", "priority 3"],
  "strengths": ["strength 1", "strength 2"],
  "areas_for_improvement": ["area 1", "area 2"],
  "executive_summary": "3-4 sentence business health summary"
}`;
  const result = await callAI(systemPrompt, JSON.stringify(data));
  return parseJSON(result) || { executive_summary: result, overall_health: 0.5 };
}

export async function aiChat(message, context) {
  const systemPrompt = `You are an AI business assistant for a freelancer. You have access to their business data.
Help them with any business questions, advice, or analysis they need. Be professional, concise, and actionable.
Provide your response in this JSON format:
{
  "response": "your helpful response text",
  "suggestions": ["follow-up suggestion 1", "suggestion 2"],
  "related_features": ["feature name that might help"]
}`;
  const result = await callAI(systemPrompt, `Context: ${JSON.stringify(context || {})}\n\nUser question: ${message}`);
  return parseJSON(result) || { response: result, suggestions: [] };
}

export async function generateInvoice(projectData) {
  const systemPrompt = `You are an invoice generation AI. Generate professional invoice line items from project data. Return JSON:
{
  "line_items": [{"description": "work description", "hours": number, "rate": number, "amount": number}],
  "subtotal": number,
  "suggested_tax_rate": number,
  "total": number,
  "notes": "any notes for the invoice",
  "payment_terms": "suggested payment terms"
}`;
  const result = await callAI(systemPrompt, JSON.stringify(projectData));
  return parseJSON(result) || { notes: result };
}

export async function generateProposal(briefData) {
  const systemPrompt = `You are a proposal writing AI for freelancers. Generate a professional proposal. Return JSON:
{
  "title": "proposal title",
  "executive_summary": "compelling summary paragraph",
  "scope_of_work": ["deliverable 1", "deliverable 2", "deliverable 3"],
  "timeline": "estimated timeline",
  "pricing": {"type": "fixed/hourly", "amount": number, "breakdown": "brief breakdown"},
  "why_choose_me": ["reason 1", "reason 2"],
  "terms": "brief terms",
  "win_probability": 0.0-1.0
}`;
  const result = await callAI(systemPrompt, JSON.stringify(briefData));
  return parseJSON(result) || { executive_summary: result };
}
