import { describe, it, expect } from 'vitest';
import { DEMO_CHENNAI_ZONES } from '../../../data/demo/chennaiDemoData';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';
import { respireRecommendationEngine } from '../../../core/services/recommendations/recommendationEngine';
import { INTERVENTION_TEMPLATES } from '../../../core/services/recommendations/recommendationConstants';

describe('RESPIRE Step 8A — Recommendation Claims & Provenance Audit Tests', () => {
  it('1. should verify Vyasarpadi recommendation results originate cleanly from domain engine', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    expect(vyasarpadi).toBeDefined();

    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi!);
    const recResult = respireRecommendationEngine.evaluateZone(vyasarpadi!, score);

    expect(recResult.status).toBe('RECOMMENDATIONS_FOUND');
    expect(recResult.primaryRecommendation).not.toBeNull();
    expect(recResult.recommendedInterventions.length).toBeGreaterThan(0);
    expect(recResult.ruleEvaluations).toHaveLength(4);
  });

  it('2. should verify all co-benefits come strictly from domain templates and match expected qualified text', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const recResult = respireRecommendationEngine.evaluateZone(vyasarpadi!);
    const primaryRec = recResult.primaryRecommendation!;

    expect(primaryRec.impact.coBenefits).toBeDefined();
    expect(primaryRec.impact.coBenefits.length).toBeGreaterThan(0);

    // Verify co-benefits match template definition exactly
    const template = INTERVENTION_TEMPLATES.OUTDOOR_WORKER_SHADE_SHELTER;
    expect(primaryRec.impact.coBenefits).toEqual(template.coBenefits);
  });

  it('3. should verify "Heatstroke prevention" is qualified as "Supports heat-exposure protection"', () => {
    const template = INTERVENTION_TEMPLATES.OUTDOOR_WORKER_SHADE_SHELTER;
    expect(template.coBenefits).toContain('Supports heat-exposure protection');
    expect(template.coBenefits).not.toContain('Heatstroke prevention');
  });

  it('4. should verify intervention description comes directly from domain template', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const recResult = respireRecommendationEngine.evaluateZone(vyasarpadi!);
    const primaryRec = recResult.primaryRecommendation!;

    const template = INTERVENTION_TEMPLATES.OUTDOOR_WORKER_SHADE_SHELTER;
    expect(primaryRec.description).toBe(template.shortDescription);
  });

  it('5. should verify priority level badge originates from domain definition', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const recResult = respireRecommendationEngine.evaluateZone(vyasarpadi!);
    const primaryRec = recResult.primaryRecommendation!;

    expect(primaryRec.priority).toBe('P1_URGENT');
  });

  it('6. should verify cost provenance is INDICATIVE_ESTIMATE and contains disclaimer notes', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const recResult = respireRecommendationEngine.evaluateZone(vyasarpadi!);
    const primaryRec = recResult.primaryRecommendation!;

    expect(primaryRec.cost.costStatus).toBe('INDICATIVE_ESTIMATE');
    expect(primaryRec.cost.provenance.status).toBe('INDICATIVE_ESTIMATE');
    expect(primaryRec.cost.provenance.isDemoData).toBe(true);
  });

  it('7. should verify impact provenance is INDICATIVE_ESTIMATE and explicitly states non-guarantee', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const recResult = respireRecommendationEngine.evaluateZone(vyasarpadi!);
    const primaryRec = recResult.primaryRecommendation!;

    expect(primaryRec.impact.impactStatus).toBe('INDICATIVE_ESTIMATE');
    expect(primaryRec.impact.provenance.status).toBe('INDICATIVE_ESTIMATE');
    expect(primaryRec.impact.provenance.notes).toContain('Not a Guaranteed Scientific Claim');
  });

  it('8. should verify Rule Traceability reflects actual engine output for all candidate rules', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const recResult = respireRecommendationEngine.evaluateZone(vyasarpadi!);

    expect(recResult.ruleEvaluations).toHaveLength(4);
    recResult.ruleEvaluations.forEach(rule => {
      expect(['RULE_SHADED_COOLING_REST_AREA', 'RULE_COOL_ROOF_INTERVENTION', 'RULE_TARGETED_SHADE_TREE_PLANTING', 'RULE_TARGETED_GREENING']).toContain(rule.ruleId);
      expect(typeof rule.matched).toBe('boolean');
      expect(rule.rationale).toBeDefined();
    });
  });

  it('9. should verify Sholinganallur (Ward 198) remains NO_CONFIDENT_RECOMMENDATION with null primary recommendation', () => {
    const sholinganallur = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-198' || z.zoneId === 'ZONE-CHN-W198');
    expect(sholinganallur).toBeDefined();

    const score = respireScoringEngine.calculateZoneRisk(sholinganallur!);
    const recResult = respireRecommendationEngine.evaluateZone(sholinganallur!, score);

    expect(recResult.status).toBe('NO_CONFIDENT_RECOMMENDATION');
    expect(recResult.primaryRecommendation).toBeNull();
    expect(recResult.recommendedInterventions).toHaveLength(0);
    expect(recResult.missingEvidence).toContain('HEAT_EXPOSURE');
    expect(recResult.missingEvidence).toContain('VEGETATION_DEFICIT');
  });

  it('10. should verify T. Nagar (Ward 134) recommendation behavior is consistent with scoring engine output', () => {
    const tnagar = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-134');
    expect(tnagar).toBeDefined();

    const score = respireScoringEngine.calculateZoneRisk(tnagar!);
    const recResult = respireRecommendationEngine.evaluateZone(tnagar!, score);

    expect(recResult.status).toBe('RECOMMENDATIONS_FOUND');
    expect(recResult.primaryRecommendation).not.toBeNull();
  });
});
