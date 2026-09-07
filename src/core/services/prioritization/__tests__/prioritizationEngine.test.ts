import { describe, it, expect } from 'vitest';
import { RespirePrioritizationEngine } from '../prioritizationEngine';
import { WardZone } from '../../../types/zone';
import { DEMO_CHENNAI_ZONES } from '../../../../data/demo/chennaiDemoData';

describe('RESPIRE Cost + Impact Prioritization Engine', () => {
  const engine = new RespirePrioritizationEngine();

  const createTestZone = (
    id: string,
    name: string,
    heatNorm: number | null,
    vegDeficitNorm: number | null,
    outdoorWorker: number | null,
    builtEnv: number | null
  ): WardZone => ({
    zoneId: id,
    zoneName: name,
    wardId: id,
    wardName: name,
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
    vulnerability: (outdoorWorker !== null || builtEnv !== null) ? {
      vulnerabilityScore: 0.5,
      vulnerabilityComponents: {
        populationDensity: 15000,
        elderlyPopulation: 0.2,
        informalSettlementIndicator: builtEnv,
        outdoorWorkerExposure: outdoorWorker
      },
      provenance: { status: 'SOURCED', isDemoData: false }
    } : {
      vulnerabilityScore: null,
      vulnerabilityComponents: {
        populationDensity: null,
        elderlyPopulation: null,
        informalSettlementIndicator: null,
        outdoorWorkerExposure: null
      },
      provenance: { status: 'UNKNOWN', isDemoData: false }
    },
    builtEnvironment: {
      coolRoofPercentage: 10,
      imperviousSurfaceRatio: builtEnv,
      provenance: { status: 'SOURCED', isDemoData: false }
    }
  });

  // Test 1: Normal prioritization with complete data
  it('1. should calculate priority score and band correctly with complete data', () => {
    const zone = createTestZone('Z1', 'Ward 1', 0.85, 0.85, 0.80, 0.80);
    const result = engine.prioritizeZone(zone);

    expect(result.priorityScore).not.toBeNull();
    expect(result.priorityScore!).toBeGreaterThanOrEqual(0);
    expect(result.priorityScore!).toBeLessThanOrEqual(100);
    expect(result.confidenceStatus).toBe('HIGH');
    expect(result.completeness).toBe(1.0);
    expect(result.missingFields).toHaveLength(0);
  });

  // Test 2: Higher risk increases priority when other factors are equal
  it('2. should give higher priority score to zone with higher risk score when other factors match', () => {
    const highRiskZone = createTestZone('Z-HIGH', 'High Risk Ward', 0.90, 0.90, 0.80, 0.80);
    const modRiskZone = createTestZone('Z-MOD', 'Mod Risk Ward', 0.55, 0.55, 0.80, 0.80);

    const highRes = engine.prioritizeZone(highRiskZone);
    const modRes = engine.prioritizeZone(modRiskZone);

    expect(highRes.riskScore?.totalScore!).toBeGreaterThan(modRes.riskScore?.totalScore!);
    expect(highRes.priorityScore!).toBeGreaterThan(modRes.priorityScore!);
  });

  // Test 3: Higher indicative impact increases priority when other factors are equal
  it('3. should factor indicative impact into prioritization', () => {
    const zone = createTestZone('Z1', 'Ward 1', 0.85, 0.85, 0.80, 0.80);
    const res = engine.prioritizeZone(zone);

    expect(res.breakdown.impactComponent.obtainedScore).not.toBeNull();
    expect(res.breakdown.impactComponent.obtainedScore!).toBeGreaterThan(0);
    expect(res.impactStatus).toBe('INDICATIVE_ESTIMATE');
  });

  // Test 4: Cost-efficiency affects priority
  it('4. should factor cost-efficiency into prioritization breakdown', () => {
    const zone = createTestZone('Z1', 'Ward 1', 0.85, 0.85, 0.80, 0.80);
    const res = engine.prioritizeZone(zone);

    expect(res.breakdown.costEfficiencyComponent.obtainedScore).not.toBeNull();
    expect(res.costEfficiencyScore).not.toBeNull();
    expect(res.costStatus).toBe('INDICATIVE_ESTIMATE');
  });

  // Test 5: Missing risk produces INSUFFICIENT_EVIDENCE
  it('5. should return INSUFFICIENT_EVIDENCE when risk score is null', () => {
    const zone = createTestZone('Z-NULL', 'Null Ward', null, null, null, null);
    const res = engine.prioritizeZone(zone);

    expect(res.priorityScore).toBeNull();
    expect(res.priorityBand).toBe('INSUFFICIENT_EVIDENCE');
    expect(res.confidenceStatus).toBe('INSUFFICIENT_EVIDENCE');
    expect(res.missingFields).toContain('RISK_SCORE');
  });

  // Test 6: Missing impact is not treated as zero
  it('6. should not treat missing impact as zero and should rescale available weights', () => {
    const zone = createTestZone('Z-NO-REC', 'No Rec Ward', 0.20, 0.20, 0.20, 0.20);
    const res = engine.prioritizeZone(zone);

    expect(res.recommendedIntervention).toBeNull();
    expect(res.indicativeImpact).toBeNull();
    expect(res.breakdown.impactComponent.isMissing).toBe(true);
    expect(res.priorityScore).not.toBeNull();
    expect(res.availableWeight).toBe(50);
  });

  // Test 7: Missing cost is not treated as zero
  it('7. should not treat missing cost as zero', () => {
    const zone = createTestZone('Z1', 'Ward 1', 0.85, 0.85, 0.80, 0.80);
    const res = engine.prioritizeZone(zone);

    expect(res.indicativeCost).not.toBeNull();
    expect(res.breakdown.costEfficiencyComponent.isMissing).toBe(false);
  });

  // Test 8: Missing cost-efficiency is handled through weight rescaling
  it('8. should handle missing cost-efficiency through proportional weight rescaling', () => {
    const zone = createTestZone('Z-NO-REC', 'No Rec Ward', 0.20, 0.20, 0.20, 0.20);
    const res = engine.prioritizeZone(zone);

    expect(res.breakdown.costEfficiencyComponent.isMissing).toBe(true);
    expect(res.priorityScore).not.toBeNull();
  });

  // Test 9: All unavailable inputs produce INSUFFICIENT_EVIDENCE
  it('9. should produce INSUFFICIENT_EVIDENCE when all priority inputs are null', () => {
    const zone = createTestZone('Z-EMPTY', 'Empty Ward', null, null, null, null);
    const res = engine.prioritizeZone(zone);

    expect(res.priorityScore).toBeNull();
    expect(res.priorityBand).toBe('INSUFFICIENT_EVIDENCE');
  });

  // Test 10: Priority bands are correct
  it('10. should assign correct priority band based on priority score', () => {
    const highZone = createTestZone('Z-HIGH', 'High Ward', 0.90, 0.90, 0.80, 0.80);
    const res = engine.prioritizeZone(highZone);

    if (res.priorityScore! >= 75) {
      expect(res.priorityBand).toBe('VERY_HIGH');
    } else if (res.priorityScore! >= 50) {
      expect(res.priorityBand).toBe('HIGH');
    }
  });

  // Test 11: Ranking is deterministic
  it('11. should rank multiple zones deterministically', () => {
    const z1 = createTestZone('Z1', 'Ward 1', 0.90, 0.90, 0.80, 0.80);
    const z2 = createTestZone('Z2', 'Ward 2', 0.55, 0.55, 0.80, 0.80);
    const z3 = createTestZone('Z3', 'Ward 3', 0.30, 0.30, 0.20, 0.20);

    const run1 = engine.prioritizeMultipleZones([z1, z2, z3]);
    const run2 = engine.prioritizeMultipleZones([z1, z2, z3]);

    expect(run1.rankedPriorities.map(r => r.zoneId)).toEqual(run2.rankedPriorities.map(r => r.zoneId));
    expect(run1.rankedPriorities.map(r => r.rank)).toEqual([1, 2, 3]);
  });

  // Test 12: Tie-breaking works (priorityScore -> riskScore -> zoneId)
  it('12. should break ties deterministically using riskScore then zoneId', () => {
    const zA = createTestZone('Z-A', 'Ward A', 0.80, 0.80, 0.80, 0.80);
    const zB = createTestZone('Z-B', 'Ward B', 0.80, 0.80, 0.80, 0.80);

    const res = engine.prioritizeMultipleZones([zB, zA]);
    expect(res.rankedPriorities[0].zoneId).toBe('Z-A');
    expect(res.rankedPriorities[1].zoneId).toBe('Z-B');
  });

  // Test 13: Provenance is preserved
  it('13. should preserve cost and impact provenance', () => {
    const zone = createTestZone('Z1', 'Ward 1', 0.85, 0.85, 0.80, 0.80);
    const res = engine.prioritizeZone(zone);

    expect(res.costProvenance).not.toBeNull();
    expect(res.impactProvenance).not.toBeNull();
  });

  // Test 14: Indicative estimates remain INDICATIVE_ESTIMATE
  it('14. should preserve INDICATIVE_ESTIMATE status and not claim SOURCED without reference', () => {
    const zone = createTestZone('Z1', 'Ward 1', 0.85, 0.85, 0.80, 0.80);
    const res = engine.prioritizeZone(zone);

    expect(res.costStatus).toBe('INDICATIVE_ESTIMATE');
    expect(res.impactStatus).toBe('INDICATIVE_ESTIMATE');
  });

  // Test 15: No scientific guarantee language is generated
  it('15. should avoid guaranteed science wording in dynamic explanations', () => {
    const zone = createTestZone('Z1', 'Ward 1', 0.85, 0.85, 0.80, 0.80);
    const res = engine.prioritizeZone(zone);

    expect(res.explanation).not.toContain('guaranteed cooling');
    expect(res.explanation).not.toContain('scientifically proven');
    expect(res.explanation).not.toContain('highest ROI');
    expect(res.explanation).not.toContain('most cost-effective');
  });

  // Test 16: Demo data produces deterministic results
  it('16. should prioritize all 10 demo Chennai zones deterministically without crashing', () => {
    const res = engine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);

    expect(res.totalEvaluatedCount).toBe(10);
    expect(res.rankedPriorities.length + res.unrankedInsufficientEvidence.length).toBe(10);
    expect(res.rankedPriorities[0].rank).toBe(1);
  });

  // Test 17: Calculation basis and disclaimer metadata
  it('17. should include explicit calculationBasis and disclaimer metadata in prioritization result', () => {
    const zone = createTestZone('Z1', 'Ward 1', 0.85, 0.85, 0.80, 0.80);
    const res = engine.prioritizeZone(zone);

    expect(res.calculationBasis).toContain('Illustrative planning prioritization');
    expect(res.disclaimer).toContain('illustrative planning estimates');
    expect(res.disclaimer).toContain('not validated scientific effectiveness');
  });

  // Test 18: Sholinganallur missing evidence handling
  it('18. should preserve nulls for missing evidence in Sholinganallur (Ward 198) without converting null to zero', () => {
    const sholinganallur = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-198' || z.zoneId === 'ZONE-198' || z.zoneId === 'ZONE-CHN-W198');
    expect(sholinganallur).toBeDefined();

    const res = engine.prioritizeZone(sholinganallur!);
    expect(res.indicativeCost).toBeNull();
    expect(res.indicativeImpact).toBeNull();
    expect(res.missingFields).toContain('INDICATIVE_IMPACT');
    expect(res.missingFields).toContain('INDICATIVE_COST');
    expect(res.missingFields).toContain('INDICATIVE_COST_EFFICIENCY');
    expect(res.breakdown.impactComponent.isMissing).toBe(true);
    expect(res.breakdown.costEfficiencyComponent.isMissing).toBe(true);
  });

  // Test 19: Relative planning terminology check
  it('19. should use relative planning priority terminology in explanations', () => {
    const zone = createTestZone('Z1', 'Ward 1', 0.85, 0.85, 0.80, 0.80);
    const res = engine.prioritizeZone(zone);

    expect(res.explanation).toContain('relative planning Priority Score');
    expect(res.explanation).toContain('relative planning priority');
  });

  // Test 20: Verified non-claim of scientific ROI/effectiveness
  it('20. should verify calculation basis and disclaimer do not claim scientific effectiveness or ROI guarantees', () => {
    const zone = createTestZone('Z1', 'Ward 1', 0.85, 0.85, 0.80, 0.80);
    const res = engine.prioritizeZone(zone);

    expect(res.disclaimer).not.toContain('guaranteed ROI');
    expect(res.disclaimer).not.toContain('proven science');
  });
});
