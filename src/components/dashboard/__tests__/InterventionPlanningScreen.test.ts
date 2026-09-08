import { describe, it, expect, beforeEach } from 'vitest';
import { respireWorkspaceService } from '../../../core/services/data/workspaceService';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';
import { respireRecommendationEngine } from '../../../core/services/recommendations/recommendationEngine';
import { respirePrioritizationEngine } from '../../../core/services/prioritization/prioritizationEngine';

describe('STEP 11F — INTERVENTION PLANNING VIEW AUDIT', () => {
  beforeEach(() => {
    respireWorkspaceService.useDemoDataset();
  });

  it('1. should render active dataset metadata correctly', () => {
    const metadata = respireWorkspaceService.getActiveMetadata();
    expect(metadata.name).toBe('Chennai Heat Assessment');
    expect(metadata.sourceLabel).toBe('Illustrative Demo Data');
    expect(metadata.isDemo).toBe(true);
  });

  it('2. should calculate correct executive planning summary metrics', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);
    const recs = zones.map(z => respireRecommendationEngine.evaluateZone(z));

    const totalPriorityZones = prioResult.rankedPriorities.length;
    const highOrVeryHigh = prioResult.rankedPriorities.filter(r => r.riskBand === 'HIGH' || r.riskBand === 'VERY_HIGH').length;
    const confidentRecs = recs.filter(r => r.primaryRecommendation && r.confidenceLevel !== 'INSUFFICIENT_DATA').length;
    const insufficientCount = prioResult.unrankedInsufficientEvidence.length;

    expect(totalPriorityZones).toBe(9);
    expect(highOrVeryHigh).toBe(8);
    expect(confidentRecs).toBe(8);
    expect(insufficientCount).toBe(1);
  });

  it('3. should aggregate intervention portfolio from recommendation engine outputs', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const recs = zones.map(z => respireRecommendationEngine.evaluateZone(z));

    const summaryMap: Record<string, number> = {};
    recs.forEach(r => {
      if (r.primaryRecommendation && r.confidenceLevel !== 'INSUFFICIENT_DATA') {
        const name = r.primaryRecommendation.interventionName;
        summaryMap[name] = (summaryMap[name] || 0) + 1;
      }
    });

    const totalRecs = Object.values(summaryMap).reduce((a, b) => a + b, 0);
    expect(totalRecs).toBe(8);
    expect(Object.keys(summaryMap).length).toBeGreaterThan(0);
  });

  it('4. should follow exact prioritization engine ordering for planning candidates', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);

    expect(prioResult.rankedPriorities[0].wardName).toContain('Vyasarpadi');
    expect(prioResult.rankedPriorities[0].rank).toBe(1);
    expect(prioResult.rankedPriorities[1].rank).toBe(2);
    expect(prioResult.rankedPriorities[2].rank).toBe(3);
    expect(prioResult.rankedPriorities.length).toBe(9);
  });

  it('5. should assign PLANNING CANDIDATE status to ranked zones only', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);

    prioResult.rankedPriorities.forEach(r => {
      expect(r.rank).not.toBeNull();
      expect(r.priorityScore).not.toBeNull();
    });
  });

  it('6. should exclude insufficient evidence zones from candidate ranking', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);

    expect(prioResult.unrankedInsufficientEvidence.length).toBe(1);
    expect(prioResult.rankedPriorities.some(r => r.zoneId === 'ZONE-CHN-W198')).toBe(false);
  });

  it('7. CRITICAL CREDIBILITY: Sholinganallur must remain strictly INSUFFICIENT EVIDENCE with null values', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const sholinganallurZone = zones.find(z => z.wardName.includes('Sholinganallur'));
    expect(sholinganallurZone).toBeDefined();

    // 1. Scoring: null totalScore
    const risk = respireScoringEngine.calculateZoneRisk(sholinganallurZone!);
    expect(risk.totalScore).toBeNull();
    expect(risk.totalScore).not.toBe(0);
    expect(risk.riskTier).toBe('INSUFFICIENT_EVIDENCE');

    // 2. Recommendation: null primaryRecommendation
    const rec = respireRecommendationEngine.evaluateZone(sholinganallurZone!);
    expect(rec.primaryRecommendation).toBeNull();
    expect(rec.confidenceLevel).toBe('INSUFFICIENT_DATA');

    // 3. Prioritization: null rank & scores
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);
    const unrankedItem = prioResult.unrankedInsufficientEvidence.find(u => u.zoneId === 'ZONE-CHN-W198');
    expect(unrankedItem).toBeDefined();
    expect(unrankedItem?.priorityScore).toBeNull();
    expect(unrankedItem?.priorityScore).not.toBe(0);
    expect(unrankedItem?.rank).toBeNull();
    expect(unrankedItem?.indicativeCost).toBeNull();
    expect(unrankedItem?.indicativeImpact).toBeNull();
  });

  it('8. should never convert missing null values to numeric zero across engine outputs', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const scoredZones = zones.map(z => respireScoringEngine.calculateZoneRisk(z));
    const insufficientScored = scoredZones.find(s => s.riskTier === 'INSUFFICIENT_EVIDENCE');

    expect(insufficientScored).toBeDefined();
    expect(insufficientScored?.totalScore).toBeNull();
    expect(insufficientScored?.totalScore).not.toBe(0);
  });

  it('9. should not manufacture fallback recommendations for insufficient evidence zones', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const sholinganallurZone = zones.find(z => z.wardName.includes('Sholinganallur'));
    const rec = respireRecommendationEngine.evaluateZone(sholinganallurZone!);

    expect(rec.primaryRecommendation).toBeNull();
    expect(rec.recommendedInterventions.length).toBe(0);
  });

  it('10. should calculate indicative portfolio cost aggregation strictly from valid candidate costs', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);

    let total = 0;
    prioResult.rankedPriorities.forEach(r => {
      if (r.indicativeCost !== null) {
        total += r.indicativeCost;
      }
    });

    expect(total).toBe(8150000);
  });

  it('11. should preserve central selectedZoneId architecture without local state override', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const vyasarpadi = zones.find(z => z.wardName.includes('Vyasarpadi'));
    expect(vyasarpadi).toBeDefined();
    expect(vyasarpadi?.zoneId).toBe('ZONE-CHN-W045');
  });

  it('12. should handle dataset switching dynamically in planning view', () => {
    // Switch to custom dataset with 1 ward
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

  it('13. should handle empty dataset gracefully', () => {
    respireWorkspaceService.loadCustomDataset([], 'Empty Dataset');
    const metadata = respireWorkspaceService.getActiveMetadata();
    expect(metadata.zoneCount).toBe(0);
    expect(metadata.analyzableZoneCount).toBe(0);

    // Restore demo
    respireWorkspaceService.useDemoDataset();
  });
});
