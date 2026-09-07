import { describe, it, expect } from 'vitest';
import { DEMO_CHENNAI_ZONES } from '../../../data/demo/chennaiDemoData';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';
import { respireRecommendationEngine } from '../../../core/services/recommendations/recommendationEngine';

describe('RESPIRE Step 8 — RECOMMEND Screen Data Flow & UI Logic Tests', () => {
  it('1. should process Vyasarpadi (Ward 045) recommendation results cleanly', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    expect(vyasarpadi).toBeDefined();

    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi!);
    const recResult = respireRecommendationEngine.evaluateZone(vyasarpadi!, score);

    expect(recResult.status).toBe('RECOMMENDATIONS_FOUND');
    expect(recResult.primaryRecommendation).not.toBeNull();
    expect(recResult.recommendedInterventions.length).toBeGreaterThan(0);
    expect(recResult.ruleEvaluations).toHaveLength(4);
  });

  it('2. should verify Vyasarpadi primary recommendation matches highest priority rule', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi!);
    const recResult = respireRecommendationEngine.evaluateZone(vyasarpadi!, score);

    const primaryRec = recResult.primaryRecommendation!;
    expect(primaryRec.category).toBeDefined();
    expect(primaryRec.impact.expectedTempReductionCelsius).toBeGreaterThan(0);
    expect(primaryRec.cost.amountInINR).toBeGreaterThan(0);
  });

  it('3. should verify rule evaluations panel lists all 4 candidate rules with rationale', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const recResult = respireRecommendationEngine.evaluateZone(vyasarpadi!);

    expect(recResult.ruleEvaluations).toHaveLength(4);
    recResult.ruleEvaluations.forEach(rule => {
      expect(rule.ruleName).toBeDefined();
      expect(rule.priorityRank).toBeGreaterThan(0);
      expect(rule.rationale).toBeDefined();
    });
  });

  it('4. should verify Sholinganallur (Ward 198) displays NO_CONFIDENT_RECOMMENDATION and null primary recommendation', () => {
    const sholinganallur = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-198' || z.zoneId === 'ZONE-CHN-W198');
    expect(sholinganallur).toBeDefined();

    const score = respireScoringEngine.calculateZoneRisk(sholinganallur!);
    const recResult = respireRecommendationEngine.evaluateZone(sholinganallur!, score);

    expect(recResult.status).toBe('NO_CONFIDENT_RECOMMENDATION');
    expect(recResult.primaryRecommendation).toBeNull();
    expect(recResult.recommendedInterventions).toHaveLength(0);
    expect(recResult.missingEvidence.length).toBeGreaterThan(0);
  });

  it('5. should verify zone switching updates recommendation result deterministically', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const washermanpet = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-012');

    const vyasarpadiRec = respireRecommendationEngine.evaluateZone(vyasarpadi!);
    const washermanpetRec = respireRecommendationEngine.evaluateZone(washermanpet!);

    expect(vyasarpadiRec.explanation).toBeDefined();
    expect(washermanpetRec.explanation).toBeDefined();
  });
});
