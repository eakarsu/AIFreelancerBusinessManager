import express from 'express';

const router = express.Router();

const baseline = {
  project: 'Website relaunch retainer',
  contract_hours: 80,
  logged_hours: 67,
  pending_change_requests: 5,
  unbilled_hours: 11,
  quoted_margin_pct: 32,
};

function assessScopeCreep(input = {}) {
  const project = { ...baseline, ...input };
  const utilization = Math.round((Number(project.logged_hours || 0) / Math.max(Number(project.contract_hours || 1), 1)) * 100);
  const creepScore = Math.min(100, Math.round(
    utilization * 0.45 +
    Number(project.pending_change_requests || 0) * 9 +
    Number(project.unbilled_hours || 0) * 4 -
    Number(project.quoted_margin_pct || 0) * 0.3
  ));
  const status = creepScore >= 75 ? 'margin_at_risk' : creepScore >= 50 ? 'needs_change_order' : 'controlled';

  return {
    project,
    utilization,
    creep_score: creepScore,
    status,
    guardrails: [
      'Convert undocumented requests into a signed change order before the next milestone.',
      'Cap complimentary revision time at two hours for the current billing cycle.',
      'Send client-facing margin note when unbilled hours exceed 10% of contracted hours.',
    ],
    recommended_change_order: {
      hours: Math.max(4, Math.ceil(Number(project.unbilled_hours || 0) * 1.25)),
      priority: status === 'margin_at_risk' ? 'send_today' : 'queue_for_review',
    },
  };
}

router.get('/', (req, res) => {
  res.json(assessScopeCreep());
});

router.post('/assess', (req, res) => {
  res.json(assessScopeCreep(req.body || {}));
});

export default router;
