const DEFAULT_WEIGHTS = {
  'security-policy': 0.04,
  'business-risk-mgmt': 0.03,
  'roles-responsibilities': 0.03,
  'asset-inventory': 0.04,
  'patch-management': 0.04,
  'third-party-risk': 0.03,
  'passwords': 0.06,
  'mfa': 0.07,
  'access-management': 0.06,
  'encryption': 0.05,
  'awareness': 0.05,
  'logging-monitoring': 0.06,
  'threat-detection': 0.05,
  'incident-response-plan': 0.06,
  'breach-notification': 0.04,
  'crisis-simulations': 0.04,
  'backups': 0.10,
  'bcp-drp': 0.08,
  'rto-rpo': 0.07,
};

function riskLevel(score) {
  if (score < 1) return 'Critique';
  if (score < 1.5) return 'Élevé';
  if (score < 2.25) return 'Modéré';
  return 'Faible';
}

function computeScores(answers, weights = DEFAULT_WEIGHTS) {
  const categories = {};
  let globalWeightedSum = 0;
  let globalWeightSum = 0;

  for (const a of answers) {
    const weight = weights[a.id] ?? 0;
    const value = a.value === null || a.value === undefined ? null : Number(a.value);

    if (!categories[a.category]) {
      categories[a.category] = { criteria: [], weightedSum: 0, weightSum: 0 };
    }
    const cat = categories[a.category];
    cat.criteria.push({ id: a.id, criterion: a.criterion, value, label: a.label, weight });

    if (value !== null && !Number.isNaN(value)) {
      cat.weightedSum += value * weight;
      cat.weightSum += weight;
      globalWeightedSum += value * weight;
      globalWeightSum += weight;
    }
  }

  const categoryResults = {};
  for (const [name, cat] of Object.entries(categories)) {
    const score = cat.weightSum > 0 ? cat.weightedSum / cat.weightSum : null;
    categoryResults[name] = {
      score: score !== null ? Number(score.toFixed(2)) : null,
      maxScore: 3,
      riskLevel: score !== null ? riskLevel(score) : null,
      criteria: cat.criteria,
    };
  }

  const globalScore = globalWeightSum > 0 ? globalWeightedSum / globalWeightSum : null;

  return {
    global: {
      score: globalScore !== null ? Number(globalScore.toFixed(2)) : null,
      maxScore: 3,
      riskLevel: globalScore !== null ? riskLevel(globalScore) : null,
    },
    categories: categoryResults,
  };
}

module.exports = { computeScores, DEFAULT_WEIGHTS, riskLevel };