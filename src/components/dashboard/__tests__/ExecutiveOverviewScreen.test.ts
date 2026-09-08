import { describe, it, expect, beforeEach } from 'vitest';
import { respireWorkspaceService } from '../../../core/services/data/workspaceService';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';
import { respireRecommendationEngine } from '../../../core/services/recommendations/recommendationEngine';
import { respirePrioritizationEngine } from '../../../core/services/prioritization/prioritizationEngine';

describe('STEP 11E — EXECUTIVE OVERVIEW / MUNICIPAL COMMAND CENTER AUDIT', () => {
  beforeEach(() => {
    respireWorkspaceService.useDemoDataset();
  });

  it('1. should render active dataset metadata correctly', () => {
    const metadata = respireWorkspaceService.getActiveMetadata();
    expect(metadata.name).toBe('Chennai Heat Assessment');
    expect(metadata.sourceLabel).toBe('Illustrative Demo Data');
    expect(metadata.isDemo).toBe(true);
  });

  it('2. should calculate correct total zone count', () => {
    const zones = respireWorkspaceService.getActiveZones();
    expect(zones.length).toBe(10);
  });

  it('3. should calculate correct analyzable ward count', () => {
    const metadata = respireWorkspaceService.getActiveMetadata();
    expect(metadata.analyzableZoneCount).toBe(9);
    expect(metadata.insufficientEvidenceCount).toBe(1);
  });

  it('4. should calculate data completeness score as average evidence completeness across active zones (93%)', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const scoredZones = zones.map(z => respireScoringEngine.calculateZoneRisk(z));
    const totalCompleteness = scoredZones.reduce((acc, s) => acc + s.completeness, 0);
    const avgCompleteness = Math.round((totalCompleteness / scoredZones.length) * 100);

    expect(avgCompleteness).toBe(93);
  });

  it('5. should calculate risk tier distribution dynamically from scoring engine', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const scoredZones = zones.map(z => respireScoringEngine.calculateZoneRisk(z));

    const distribution = {
      veryHigh: scoredZones.filter(s => s.riskTier === 'VERY_HIGH').length,
      high: scoredZones.filter(s => s.riskTier === 'HIGH').length,
      moderate: scoredZones.filter(s => s.riskTier === 'MODERATE').length,
      low: scoredZones.filter(s => s.riskTier === 'LOW').length,
      insufficient: scoredZones.filter(s => s.riskTier === 'INSUFFICIENT_EVIDENCE').length
    };

    expect(distribution.veryHigh).toBe(5);
    expect(distribution.high).toBe(3);
    expect(distribution.moderate).toBe(1);
    expect(distribution.low).toBe(0);
    expect(distribution.insufficient).toBe(1);
  });

  it('6. CRITICAL CREDIBILITY: should exclude insufficient evidence zones from numerical risk tiers and ranking with strict null semantics', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const sholinganallurZone = zones.find(z => z.wardName.includes('Sholinganallur'));
    expect(sholinganallurZone).toBeDefined();

    // 1. Scoring Engine: totalScore MUST BE STRICTLY NULL (never 0)
    const riskScore = respireScoringEngine.calculateZoneRisk(sholinganallurZone!);
    expect(riskScore.totalScore).toBeNull();
    expect(riskScore.totalScore).not.toBe(0);
    expect(riskScore.riskTier).toBe('INSUFFICIENT_EVIDENCE');

    // 2. Recommendation Engine: primaryRecommendation MUST BE NULL
    const recResult = respireRecommendationEngine.evaluateZone(sholinganallurZone!);
    expect(recResult.primaryRecommendation).toBeNull();
    expect(recResult.confidenceLevel).toBe('INSUFFICIENT_DATA');

    // 3. Prioritization Engine: priorityScore, rank, cost, impact MUST BE NULL (never 0)
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);
    expect(prioResult.rankedPriorities.some(r => r.zoneId === 'ZONE-CHN-W198')).toBe(false);

    const sholinganallurPrio = prioResult.unrankedInsufficientEvidence.find(u => u.zoneId === 'ZONE-CHN-W198');
    expect(sholinganallurPrio).toBeDefined();
    expect(sholinganallurPrio?.wardName).toContain('Sholinganallur');
    expect(sholinganallurPrio?.confidenceStatus).toBe('INSUFFICIENT_EVIDENCE');
    expect(sholinganallurPrio?.priorityScore).toBeNull();
    expect(sholinganallurPrio?.rank).toBeNull();
    expect(sholinganallurPrio?.indicativeCost).toBeNull();
    expect(sholinganallurPrio?.indicativeImpact).toBeNull();
  });

  it('7. should render top 3 prioritization results matching prioritization engine order', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);

    const top3 = prioResult.rankedPriorities.slice(0, 3);
    expect(top3.length).toBe(3);
    expect(top3[0].rank).toBe(1);
    expect(top3[0].wardName).toContain('Vyasarpadi');
    expect(top3[1].rank).toBe(2);
    expect(top3[2].rank).toBe(3);
  });

  it('8. should aggregate recommended cooling interventions across analyzable zones', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const recs = zones.map(z => respireRecommendationEngine.evaluateZone(z));

    const summaryMap: Record<string, number> = {};
    recs.forEach(r => {
      if (r.primaryRecommendation && r.confidenceLevel !== 'INSUFFICIENT_DATA') {
        const name = r.primaryRecommendation.interventionName;
        summaryMap[name] = (summaryMap[name] || 0) + 1;
      }
    });

    // Total aggregated recommendation count across active demo dataset (8 valid recommendations)
    const totalRecCount = Object.values(summaryMap).reduce((a, b) => a + b, 0);
    expect(totalRecCount).toBe(8);
    expect(Object.keys(summaryMap).length).toBeGreaterThan(0);
  });

  it('9. should trigger data quality warning when insufficient evidence zones exist', () => {
    const metadata = respireWorkspaceService.getActiveMetadata();
    expect(metadata.insufficientEvidenceCount).toBe(1);
    expect(metadata.validationWarningCount).toBeGreaterThan(0);
  });

  it('10. should handle dataset switching dynamically without stale data', () => {
    // Switch to custom dataset with 1 zone
    respireWorkspaceService.loadCustomDataset([
      {
        zoneId: 'CUSTOM-1',
        zoneName: 'Custom Ward 1',
        wardId: 'CUSTOM-1',
        wardName: 'Custom Ward 1',
        district: 'Test',
        latitude: 13.0,
        longitude: 80.0,
        heat: { lst: 42, lstNormalized: 0.9, provenance: { status: 'SOURCED', isDemoData: false } },
        vegetation: { ndvi: 0.1, vegetationDeficitNormalized: 0.8, provenance: { status: 'SOURCED', isDemoData: false } },
        vulnerability: {
          vulnerabilityScore: 0.7,
          vulnerabilityComponents: { populationDensity: 20000, elderlyPopulation: 0.15, informalSettlementIndicator: 0.8, outdoorWorkerExposure: 0.9 },
          provenance: { status: 'SOURCED', isDemoData: false }
        }
      }
    ], 'Custom Upload Dataset');

    let metadata = respireWorkspaceService.getActiveMetadata();
    let zones = respireWorkspaceService.getActiveZones();

    expect(metadata.name).toBe('Custom Upload Dataset');
    expect(zones.length).toBe(1);
    expect(metadata.analyzableZoneCount).toBe(1);
    expect(metadata.insufficientEvidenceCount).toBe(0);

    // Restore demo dataset
    respireWorkspaceService.useDemoDataset();
    metadata = respireWorkspaceService.getActiveMetadata();
    zones = respireWorkspaceService.getActiveZones();

    expect(metadata.name).toBe('Chennai Heat Assessment');
    expect(zones.length).toBe(10);
    expect(metadata.insufficientEvidenceCount).toBe(1);
  });

  it('11. should preserve single source of truth for selectedZoneId architecture', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const vyasarpadi = zones.find(z => z.wardName.includes('Vyasarpadi'));
    expect(vyasarpadi).toBeDefined();
    expect(vyasarpadi?.zoneId).toBe('ZONE-CHN-W045');
  });

  it('12. should evaluate decision readiness status as READY_WITH_WARNINGS for active demo dataset', () => {
    const metadata = respireWorkspaceService.getActiveMetadata();
    let status = 'READY';
    if (metadata.zoneCount === 0 || metadata.validationErrorCount > 0 || metadata.analyzableZoneCount === 0) {
      status = 'NOT_READY';
    } else if (metadata.insufficientEvidenceCount > 0 || metadata.validationWarningCount > 0) {
      status = 'READY_WITH_WARNINGS';
    }
    expect(status).toBe('READY_WITH_WARNINGS');
  });
});
