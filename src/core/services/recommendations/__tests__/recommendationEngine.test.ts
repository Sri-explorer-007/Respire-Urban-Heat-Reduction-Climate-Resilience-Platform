import { describe, it, expect } from 'vitest';
import { RespireRecommendationEngine } from '../recommendationEngine';
import { WardZone } from '../../../types/zone';
import { DEMO_CHENNAI_ZONES } from '../../../../data/demo/chennaiDemoData';

describe('RESPIRE Explainable Recommendation Engine', () => {
  const engine = new RespireRecommendationEngine();

  const createTestZone = (
    heatNorm: number | null,
    vegDeficitNorm: number | null,
    outdoorWorker: number | null,
    builtEnv: number | null
  ): WardZone => ({
    zoneId: 'ZONE-REC-TEST-001',
    zoneName: 'Test Recommendation Ward',
    wardId: 'WARD-REC-TEST',
    wardName: 'Ward Rec Test',
    district: 'Test District',
    latitude: 13.0827,
    longitude: 80.2707,
    heat: {
      lst: heatNorm !== null ? 25 + heatNorm * 20 : null,
      lstNormalized: heatNorm,
      provenance: { status: 'SOURCED', isDemoData: false }
    },
    vegetation: {
      ndvi: vegDeficitNorm !== null ? 1.0 - (vegDeficitNorm * 2.0 - 1.0) : null,
      vegetationDeficitNormalized: vegDeficitNorm,
      provenance: { status: 'SOURCED', isDemoData: false }
    },
    vulnerability: {
      vulnerabilityScore: 0.5,
      vulnerabilityComponents: {
        populationDensity: 15000,
        elderlyPopulation: 0.2,
        informalSettlementIndicator: builtEnv,
        outdoorWorkerExposure: outdoorWorker
      },
      provenance: { status: 'SOURCED', isDemoData: false }
    },
    builtEnvironment: {
      coolRoofPercentage: 10,
      imperviousSurfaceRatio: builtEnv,
      provenance: { status: 'SOURCED', isDemoData: false }
    }
  });

  // Test 1: High heat + low vegetation -> Targeted tree planting
  it('1. should recommend targeted tree planting when high heat and low vegetation coincide', () => {
    // Heat 0.85 (High), VegDeficit 0.85 (High), Worker 0.2 (Low), Built 0.3 (Low)
    const zone = createTestZone(0.85, 0.85, 0.2, 0.3);
    const result = engine.evaluateZone(zone);

    expect(result.status).toBe('RECOMMENDATIONS_FOUND');
    expect(result.primaryRecommendation).not.toBeNull();
    expect(result.primaryRecommendation?.category).toBe('VEGETATION_SHADE');
    expect(result.primaryRecommendation?.explanation).toContain('significant vegetation canopy deficit');
  });

  // Test 2: High heat + dense built environment -> Cool roof
  it('2. should recommend cool roof installation when high heat and high built environment coincide', () => {
    // Heat 0.85 (High), VegDeficit 0.3 (Low), Worker 0.2 (Low), Built 0.88 (High)
    const zone = createTestZone(0.85, 0.3, 0.2, 0.88);
    const result = engine.evaluateZone(zone);

    expect(result.status).toBe('RECOMMENDATIONS_FOUND');
    expect(result.primaryRecommendation).not.toBeNull();
    expect(result.primaryRecommendation?.category).toBe('BUILT_SURFACE_COOLING');
    expect(result.primaryRecommendation?.explanation).toContain('dense built environment');
  });

  // Test 3: High heat + outdoor worker exposure -> Shaded cooling shelter
  it('3. should recommend shaded cooling shelters when high heat and outdoor worker exposure coincide', () => {
    // Heat 0.85 (High), VegDeficit 0.3 (Low), Worker 0.75 (High), Built 0.3 (Low)
    const zone = createTestZone(0.85, 0.3, 0.75, 0.3);
    const result = engine.evaluateZone(zone);

    expect(result.status).toBe('RECOMMENDATIONS_FOUND');
    expect(result.primaryRecommendation).not.toBeNull();
    expect(result.primaryRecommendation?.category).toBe('SOCIAL_PROTECTION');
    expect(result.primaryRecommendation?.explanation).toContain('elevated outdoor-worker exposure');
  });

  // Test 4: Moderate heat + vegetation deficit -> Targeted greening corridor
  it('4. should recommend targeted greening for moderate heat and vegetation deficit', () => {
    // Heat 0.55 (Moderate), VegDeficit 0.55 (Moderate), Worker 0.2 (Low), Built 0.3 (Low)
    const zone = createTestZone(0.55, 0.55, 0.2, 0.3);
    const result = engine.evaluateZone(zone);

    expect(result.status).toBe('RECOMMENDATIONS_FOUND');
    expect(result.primaryRecommendation).not.toBeNull();
    expect(result.primaryRecommendation?.category).toBe('URBAN_GREENING');
    expect(result.primaryRecommendation?.explanation).toContain('moderate vegetation deficit');
  });

  // Test 5: Multiple matching rules -> Deterministic primary recommendation ordering
  it('5. should prioritize outdoor worker shelters over cool roofs and tree planting when multiple rules match', () => {
    // All conditions High: Heat 0.85, VegDeficit 0.85, Worker 0.80, Built 0.85
    const zone = createTestZone(0.85, 0.85, 0.80, 0.85);
    const result = engine.evaluateZone(zone);

    expect(result.status).toBe('RECOMMENDATIONS_FOUND');
    expect(result.recommendedInterventions.length).toBeGreaterThan(1);
    // Priority 1 rule (Worker Shelter) must be primary
    expect(result.primaryRecommendation?.category).toBe('SOCIAL_PROTECTION');
    expect(result.secondaryRecommendations.length).toBeGreaterThan(0);
  });

  // Test 6: Missing heat -> high-heat rules do not match
  it('6. should not match high-heat rules if heat input is missing (null)', () => {
    const zone = createTestZone(null, 0.85, 0.85, 0.85);
    const result = engine.evaluateZone(zone);

    expect(result.status).toBe('NO_CONFIDENT_RECOMMENDATION');
    expect(result.primaryRecommendation).toBeNull();
    expect(result.missingEvidence).toContain('HEAT_EXPOSURE');
  });

  // Test 7: Missing vegetation -> vegetation-based rules do not match
  it('7. should not match vegetation rules if vegetation deficit input is missing (null)', () => {
    // Heat High (0.85), VegDeficit null, Worker Low (0.2), Built Low (0.2)
    const zone = createTestZone(0.85, null, 0.2, 0.2);
    const result = engine.evaluateZone(zone);

    expect(result.primaryRecommendation).toBeNull();
    expect(result.missingEvidence).toContain('VEGETATION_DEFICIT');
  });

  // Test 8: Missing outdoor worker exposure -> worker rule does not match
  it('8. should not match worker shelter rule if outdoor worker ratio is missing (null)', () => {
    // Heat High (0.85), VegDeficit Low (0.2), Worker null, Built Low (0.2)
    const zone = createTestZone(0.85, 0.2, null, 0.2);
    const result = engine.evaluateZone(zone);

    // Rule 1 (Worker) cannot match because worker ratio is null
    const workerRuleEval = result.ruleEvaluations.find(r => r.ruleId === 'RULE_SHADED_COOLING_REST_AREA');
    expect(workerRuleEval?.matched).toBe(false);
    expect(workerRuleEval?.missingIndicators).toContain('outdoorWorkerExposure');
  });

  // Test 9: Insufficient evidence -> NO_CONFIDENT_RECOMMENDATION
  it('9. should return NO_CONFIDENT_RECOMMENDATION when inputs are missing or low', () => {
    const zone = createTestZone(null, null, null, null);
    const result = engine.evaluateZone(zone);

    expect(result.status).toBe('NO_CONFIDENT_RECOMMENDATION');
    expect(result.primaryRecommendation).toBeNull();
    expect(result.explanation).toContain('No confident intervention recommendation available');
  });

  // Test 10: Recommendation reason is generated from matched conditions
  it('10. should generate dynamic explanation based on actual matched conditions', () => {
    const zone = createTestZone(0.85, 0.85, 0.2, 0.2);
    const result = engine.evaluateZone(zone);

    expect(result.explanation).toContain('Targeted Tree Planting');
    expect(result.explanation).toContain('Ward Rec Test');
  });

  // Test 11: Cost provenance is preserved
  it('11. should preserve cost provenance status as INDICATIVE_ESTIMATE or ASSUMPTION', () => {
    const zone = createTestZone(0.85, 0.85, 0.2, 0.2);
    const result = engine.evaluateZone(zone);

    expect(result.primaryRecommendation?.cost.costStatus).toBe('INDICATIVE_ESTIMATE');
    expect(result.primaryRecommendation?.cost.provenance.isDemoData).toBe(true);
  });

  // Test 12: Impact provenance is preserved
  it('12. should preserve impact provenance status as INDICATIVE_ESTIMATE or ASSUMPTION', () => {
    const zone = createTestZone(0.85, 0.85, 0.2, 0.2);
    const result = engine.evaluateZone(zone);

    expect(result.primaryRecommendation?.impact.impactStatus).toBe('INDICATIVE_ESTIMATE');
    expect(result.primaryRecommendation?.impact.provenance.isDemoData).toBe(true);
  });

  // Test 13: Same input produces same recommendation repeatedly (Determinism)
  it('13. should produce identical recommendations for repeated calls with same input', () => {
    const zone = createTestZone(0.88, 0.72, 0.65, 0.80);
    const run1 = engine.evaluateZone(zone);
    const run2 = engine.evaluateZone(zone);

    expect(run1.primaryRecommendation?.interventionId).toEqual(run2.primaryRecommendation?.interventionId);
    expect(run1.explanation).toEqual(run2.explanation);
    expect(run1.matchedRules.length).toEqual(run2.matchedRules.length);
  });

  // Test 14: Existing 10-zone demo dataset evaluated without crashing
  it('14. should evaluate all 10 demo Chennai zones without crashing', () => {
    expect(DEMO_CHENNAI_ZONES.length).toBe(10);
    DEMO_CHENNAI_ZONES.forEach(zone => {
      const res = engine.evaluateZone(zone);
      expect(res).toBeDefined();
      expect(res.zoneId).toBeDefined();
      expect(res.status).toBeDefined();
    });
  });
});
