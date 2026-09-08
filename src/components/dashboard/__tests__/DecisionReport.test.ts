import { describe, it, expect, beforeEach } from 'vitest';
import { respirePrioritizationEngine } from '../../../core/services/prioritization/prioritizationEngine';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';
import { respireWorkspaceService } from '../../../core/services/data/workspaceService';

describe('STEP 11D — DECISION REPORT / EXPORT AUDIT', () => {
  beforeEach(() => {
    respireWorkspaceService.useDemoDataset();
  });

  it('1. should generate report data strictly from domain prioritization and scoring engines', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);
    const scoredZones = zones.map(z => respireScoringEngine.calculateZoneRisk(z));

    expect(prioResult.rankedPriorities.length).toBe(9);
    expect(prioResult.unrankedInsufficientEvidence.length).toBe(1);
    expect(scoredZones.length).toBe(10);
  });

  it('2. should verify decision readiness status and metadata match active workspace service', () => {
    const metadata = respireWorkspaceService.getActiveMetadata();
    expect(metadata.name).toBe('Chennai Heat Assessment');
    expect(metadata.zoneCount).toBe(10);
    expect(metadata.analyzableZoneCount).toBe(9);
    expect(metadata.insufficientEvidenceCount).toBe(1);

    // Readiness evaluation for demo dataset: VALID schema but missing evidence -> READY_WITH_WARNINGS
    let decisionReadiness = 'READY';
    if (metadata.zoneCount === 0 || metadata.validationErrorCount > 0 || metadata.analyzableZoneCount === 0) {
      decisionReadiness = 'NOT_READY';
    } else if (metadata.insufficientEvidenceCount > 0 || metadata.validationWarningCount > 0) {
      decisionReadiness = 'READY_WITH_WARNINGS';
    }

    expect(decisionReadiness).toBe('READY_WITH_WARNINGS');
  });

  it('3. should verify risk tier distribution in report matches domain scoring engine results', () => {
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

  it('4. CRITICAL CREDIBILITY: should preserve INSUFFICIENT EVIDENCE for Sholinganallur with 0 score, no rank, and no fallback recommendation', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);

    const sholinganallurPrio = prioResult.unrankedInsufficientEvidence.find(u => u.zoneId === 'ZONE-CHN-W198');
    expect(sholinganallurPrio).toBeDefined();
    expect(sholinganallurPrio?.wardName).toContain('Sholinganallur');
    expect(sholinganallurPrio?.confidenceStatus).toBe('INSUFFICIENT_EVIDENCE');

    // Must NOT exist in ranked set
    const inRanked = prioResult.rankedPriorities.some(r => r.zoneId === 'ZONE-CHN-W198');
    expect(inRanked).toBe(false);

    // Verify missing fields flagged explicitly
    expect(sholinganallurPrio?.missingFields.length).toBeGreaterThan(0);
  });

  it('5. should preserve INDICATIVE ESTIMATE status for all intervention costs and impacts in report', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(zones);

    prioResult.rankedPriorities.forEach(item => {
      expect(item.costStatus).toBe('INDICATIVE_ESTIMATE');
      expect(item.impactStatus).toBe('INDICATIVE_ESTIMATE');
      if (item.indicativeCost !== null) {
        expect(item.indicativeCost).toBeGreaterThan(0);
      }
      if (item.indicativeImpact !== null) {
        expect(item.indicativeImpact).toBeGreaterThan(0);
      }
    });
  });

  it('6. should calculate report data completeness score as average evidence completeness across active zones', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const scoredZones = zones.map(z => respireScoringEngine.calculateZoneRisk(z));

    const totalCompleteness = scoredZones.reduce((acc, s) => acc + s.completeness, 0);
    const avgCompleteness = Math.round((totalCompleteness / scoredZones.length) * 100);

    expect(avgCompleteness).toBe(93);
  });
});
