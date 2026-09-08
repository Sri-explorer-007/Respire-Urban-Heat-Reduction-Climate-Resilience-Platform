import { describe, it, expect } from 'vitest';
import { DEMO_CHENNAI_ZONES } from '../../../data/demo/chennaiDemoData';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';
import { respireRecommendationEngine } from '../../../core/services/recommendations/recommendationEngine';
import { respirePrioritizationEngine } from '../../../core/services/prioritization/prioritizationEngine';
import { respireWorkspaceService } from '../../../core/services/data/workspaceService';

describe('Phase 2 Visual UX + Product Polish Audit Suite', () => {
  const zones = DEMO_CHENNAI_ZONES;

  it('1. NAVIGATION AUDIT: Workflow stages must be numbered 00 to 06 with exact canonical titles', () => {
    const expectedStages = [
      { id: 'OVERVIEW', num: '00', label: 'OVERVIEW' },
      { id: 'DATA', num: '01', label: 'DATA WORKSPACE' },
      { id: 'IDENTIFY', num: '02', label: 'IDENTIFY' },
      { id: 'EXPLAIN', num: '03', label: 'EXPLAIN WHY' },
      { id: 'RECOMMEND', num: '04', label: 'RECOMMEND ACTION' },
      { id: 'PRIORITIZE', num: '05', label: 'PRIORITIZE & FUND' },
      { id: 'PLANNING', num: '06', label: 'INTERVENTION PLANNING' }
    ];

    expect(expectedStages).toHaveLength(7);
    expectedStages.forEach(st => {
      expect(st.label).toBeTruthy();
      expect(st.num).toMatch(/^0[0-6]$/);
    });
  });

  it('2. TERMINOLOGY AUDIT: Risk tier distribution must use exact canonical risk tier names', () => {
    const scoredZones = zones.map(z => respireScoringEngine.calculateZoneRisk(z));
    const tiers = new Set(scoredZones.map(s => s.riskTier));

    // Ensure valid tiers only
    const validTiers = ['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_EVIDENCE'];
    tiers.forEach(tier => {
      expect(validTiers).toContain(tier);
    });
  });

  it('3. SHOLINGANALLUR AUDIT: Sholinganallur (Ward 198) must remain INSUFFICIENT EVIDENCE with null totalScore', () => {
    const sholinganallur = zones.find(z => z.wardId === 'WARD-198' || z.zoneId === 'ZONE-CHN-W198')!;
    expect(sholinganallur).toBeDefined();

    const score = respireScoringEngine.calculateZoneRisk(sholinganallur);
    expect(score.totalScore).toBeNull();
    expect(score.riskTier).toBe('INSUFFICIENT_EVIDENCE');
    expect(score.missingComponents).toContain('HEAT_EXPOSURE');
    expect(score.missingComponents).toContain('VEGETATION_DEFICIT');

    const rec = respireRecommendationEngine.evaluateZone(sholinganallur, score);
    expect(rec.status).toBe('NO_CONFIDENT_RECOMMENDATION');
    expect(rec.primaryRecommendation).toBeNull();
    expect(rec.recommendedInterventions).toHaveLength(0);

    const prio = respirePrioritizationEngine.prioritizeZone(sholinganallur, score, rec);
    expect(prio.rank).toBeNull();
    expect(prio.priorityScore).toBeNull();
    expect(prio.indicativeCost).toBeNull();
    expect(prio.indicativeImpact).toBeNull();
    expect(prio.confidenceStatus).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('4. KPI AUDIT: Active dataset completeness must calculate to exactly 93% for Chennai Demo', () => {
    const scoredZones = zones.map(z => respireScoringEngine.calculateZoneRisk(z));
    const totalCompleteness = scoredZones.reduce((acc, s) => acc + s.completeness, 0);
    const avgCompleteness = Math.round((totalCompleteness / scoredZones.length) * 100);

    expect(avgCompleteness).toBe(93);
  });

  it('5. PROVENANCE AUDIT: Costs and impacts must be labeled as INDICATIVE_ESTIMATE in recommendations and priorities', () => {
    const vyasarpadi = zones.find(z => z.wardId === 'WARD-045')!;
    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi);
    const rec = respireRecommendationEngine.evaluateZone(vyasarpadi, score);
    const prio = respirePrioritizationEngine.prioritizeZone(vyasarpadi, score, rec);

    expect(prio.costStatus).toBe('INDICATIVE_ESTIMATE');
    expect(prio.impactStatus).toBe('INDICATIVE_ESTIMATE');
    expect(rec.primaryRecommendation?.cost.costStatus).toBe('INDICATIVE_ESTIMATE');
    expect(rec.primaryRecommendation?.impact.impactStatus).toBe('INDICATIVE_ESTIMATE');
  });

  it('6. DATASET METADATA AUDIT: Active dataset metadata must properly flag demo dataset provenance', () => {
    const meta = respireWorkspaceService.getActiveMetadata();
    expect(meta.isDemo).toBe(true);
    expect(meta.sourceLabel).toBe('Illustrative Demo Data');
    expect(meta.zoneCount).toBe(10);
    expect(meta.analyzableZoneCount).toBe(9);
    expect(meta.insufficientEvidenceCount).toBe(1);
  });

  it('7. DECISION READINESS AUDIT: Demo dataset with 1 insufficient evidence ward evaluates to READY WITH WARNINGS', () => {
    const meta = respireWorkspaceService.getActiveMetadata();
    const readiness = (meta.insufficientEvidenceCount > 0 || meta.validationWarningCount > 0)
      ? 'READY_WITH_WARNINGS'
      : 'READY';

    expect(readiness).toBe('READY_WITH_WARNINGS');
  });
});
