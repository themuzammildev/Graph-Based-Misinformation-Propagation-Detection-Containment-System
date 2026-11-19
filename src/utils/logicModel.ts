import { InformationMessage, PropositionalRiskResult } from '../types';

export function evaluatePropositionalRisk(message: InformationMessage): PropositionalRiskResult {
  const V = Boolean(message.verified);
  const S = message.shares >= 50;
  const I = message.independentSources >= 2;
  const U = !V;

  // Numerical Credibility Calculation
  let credibility = 50; // Neutral baseline
  const scoringBreakdown: { label: string; delta: number; reason: string }[] = [
    { label: 'Initial Baseline Credibility', delta: 50, reason: 'Starting neutral academic reference value' }
  ];

  if (V) {
    credibility += 30;
    scoringBreakdown.push({
      label: 'Verified Source (V)',
      delta: +30,
      reason: 'Author identity confirmed by institutional or platform badge (+30)',
    });
  } else {
    credibility -= 30;
    scoringBreakdown.push({
      label: 'Unverified Source (U = ¬V)',
      delta: -30,
      reason: 'Unverified origin increases uncertainty and dissemination velocity (-30)',
    });
  }

  if (I) {
    credibility += 25;
    scoringBreakdown.push({
      label: 'Independent Sources (I)',
      delta: +25,
      reason: `Corroborated by ${message.independentSources} independent source(s) (+25)`,
    });
  } else {
    scoringBreakdown.push({
      label: 'Lack of Independent Sources (¬I)',
      delta: 0,
      reason: 'No secondary corroboration available (+0)',
    });
  }

  if (S) {
    credibility -= 20;
    scoringBreakdown.push({
      label: 'High Share Count (S)',
      delta: -20,
      reason: `High sharing count (${message.shares} shares ≥ 50 threshold) correlates with uncritical viral forwarding (-20)`,
    });
  } else {
    scoringBreakdown.push({
      label: 'Controlled Share Count (¬S)',
      delta: 0,
      reason: `Moderate share count (${message.shares} < 50) (+0)`,
    });
  }

  // Clamping to [0, 100]
  credibility = Math.max(0, Math.min(100, credibility));
  const riskScore = 100 - credibility;

  // Propositional logic rule evaluation
  const satisfiedRules: string[] = [];

  const isHighRiskRule = U && S;
  const isMediumRiskRule = U && !S;
  const isLowRiskRule = V && I;
  const isModerateAlternative = V && !I;

  if (isHighRiskRule) {
    satisfiedRules.push('High Risk: Unverified Source with High Viral Sharing');
  }
  if (isMediumRiskRule) {
    satisfiedRules.push('Moderate Risk: Unverified Source with Controlled Sharing');
  }
  if (isLowRiskRule) {
    satisfiedRules.push('Low Risk: Verified Source with Independent Corroboration');
  }
  if (isModerateAlternative) {
    satisfiedRules.push('Moderate Credibility: Verified Source with Single Corroboration');
  }

  // Risk Categorization (based on credibility scale: 0-30 = High Risk, 31-60 = Moderate Risk, 61-100 = Lower Risk)
  let riskCategory: 'High' | 'Moderate' | 'Lower';
  if (credibility <= 30) {
    riskCategory = 'High';
  } else if (credibility <= 60) {
    riskCategory = 'Moderate';
  } else {
    riskCategory = 'Lower';
  }

  const formulaExplanation = `Calculated Risk Score: ${riskScore}% (Credibility: ${credibility}%)`;

  return {
    credibilityScore: credibility,
    riskScore,
    riskCategory,
    formulaExplanation,
    propositionStates: { V, S, I, U },
    satisfiedRules,
    scoringBreakdown,
  };
}
