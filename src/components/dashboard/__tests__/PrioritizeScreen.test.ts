import { describe, it, expect } from 'vitest';
import { DEMO_CHENNAI_ZONES } from '../../../data/demo/chennaiDemoData';
import { respirePrioritizationEngine } from '../../../core/services/prioritization/prioritizationEngine';

describe('RESPIRE Step 9 — PrioritizeScreen & Funding Decision Tests', () => {
  it('1. should prioritize multiple zones and produce valid ranked & unranked sets', () => {
    const result = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    expect(result.rankedPriorities.length).toBeGreaterThan(0);
    expect(result.unrankedInsufficientEvidence.length).toBeGreaterThan(0);
    expect(result.totalEvaluatedCount).toBe(DEMO_CHENNAI_ZONES.length);
  });

  it('2. should verify Vyasarpadi (Ward 045) is Rank #1 with actual engine-generated priority score', () => {
    const result = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const rank1 = result.rankedPriorities[0];

    expect(rank1.wardName).toContain('Vyasarpadi');
    expect(rank1.rank).toBe(1);
    expect(rank1.priorityScore).not.toBeNull();
    expect(rank1.priorityScore).toBeGreaterThanOrEqual(90); // ~94/100
  });

  it('3. should verify ranking is strictly derived from engine sorting rules and not hardcoded', () => {
    const result = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const ranked = result.rankedPriorities;

    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].rank).toBe(i + 1);
      if (ranked[i].priorityScore !== ranked[i + 1].priorityScore) {
        expect(ranked[i].priorityScore!).toBeGreaterThanOrEqual(ranked[i + 1].priorityScore!);
      }
    }
  });

  it('4. should verify need, impact, and cost-efficiency contributions originate from engine breakdown', () => {
    const result = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const rank1 = result.rankedPriorities[0];

    expect(rank1.breakdown).toBeDefined();
    expect(rank1.breakdown.needComponent.obtainedScore).not.toBeNull();
    expect(rank1.breakdown.impactComponent.obtainedScore).not.toBeNull();
    expect(rank1.breakdown.costEfficiencyComponent.obtainedScore).not.toBeNull();

    // Verify weights: Need=50%, Impact=30%, Cost-Efficiency=20%
    expect(rank1.breakdown.needComponent.weight).toBe(50);
    expect(rank1.breakdown.impactComponent.weight).toBe(30);
    expect(rank1.breakdown.costEfficiencyComponent.weight).toBe(20);
  });

  it('5. should verify cost provenance is INDICATIVE_ESTIMATE', () => {
    const result = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const rank1 = result.rankedPriorities[0];

    expect(rank1.costStatus).toBe('INDICATIVE_ESTIMATE');
    expect(rank1.indicativeCost).toBeGreaterThan(0);
  });

  it('6. should verify impact provenance is INDICATIVE_ESTIMATE', () => {
    const result = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const rank1 = result.rankedPriorities[0];

    expect(rank1.impactStatus).toBe('INDICATIVE_ESTIMATE');
    expect(rank1.indicativeImpact).toBeGreaterThan(0);
  });

  it('7. should preserve Step 5 disclaimer and calculation basis', () => {
    const result = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const rank1 = result.rankedPriorities[0];

    expect(rank1.disclaimer).toContain('illustrative planning estimates');
    expect(rank1.disclaimer).toContain('not validated scientific effectiveness');
    expect(rank1.calculationBasis).toBeDefined();
  });

  it('8. should verify Sholinganallur (Ward 198) remains unranked with insufficient evidence', () => {
    const result = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const sholinganallur = result.unrankedInsufficientEvidence.find(
      item => item.wardName.includes('Sholinganallur') || item.zoneId === 'ZONE-CHN-W198'
    );

    expect(sholinganallur).toBeDefined();
    expect(sholinganallur?.rank).toBeNull();
    expect(sholinganallur?.priorityScore).toBeNull();
    expect(sholinganallur?.confidenceStatus).toBe('INSUFFICIENT_EVIDENCE');
    expect(sholinganallur?.missingFields).toContain('RISK_SCORE');
  });

  it('9. should verify Sholinganallur receives no fallback recommendation, cost, or impact', () => {
    const result = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const sholinganallur = result.unrankedInsufficientEvidence.find(
      item => item.wardName.includes('Sholinganallur') || item.zoneId === 'ZONE-CHN-W198'
    );

    expect(sholinganallur?.recommendedIntervention).toBeNull();
    expect(sholinganallur?.indicativeCost).toBeNull();
    expect(sholinganallur?.indicativeImpact).toBeNull();
  });

  it('10. should verify T. Nagar (Ward 134) appears as a valid ranked candidate', () => {
    const result = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const tnagar = result.rankedPriorities.find(item => item.wardName.includes('T. Nagar'));

    expect(tnagar).toBeDefined();
    expect(tnagar?.rank).not.toBeNull();
    expect(tnagar?.priorityScore).not.toBeNull();
  });
});
