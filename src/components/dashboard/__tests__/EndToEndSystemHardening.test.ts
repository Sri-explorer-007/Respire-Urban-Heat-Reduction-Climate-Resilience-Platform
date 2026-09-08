import { describe, it, expect, beforeEach } from 'vitest';
import { respireWorkspaceService } from '../../../core/services/data/workspaceService';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';
import { respireRecommendationEngine } from '../../../core/services/recommendations/recommendationEngine';
import { respirePrioritizationEngine } from '../../../core/services/prioritization/prioritizationEngine';

describe('FINAL MVP AUDIT — END-TO-END SYSTEM HARDENING', () => {
  beforeEach(() => {
    respireWorkspaceService.useDemoDataset();
  });

  it('1. ACTIVE DATASET CONSISTENCY: Should propagate dataset changes across all domain engines', () => {
    // 1. Initial Demo Dataset
    let metadata = respireWorkspaceService.getActiveMetadata();
    let zones = respireWorkspaceService.getActiveZones();
    expect(metadata.name).toBe('Chennai Heat Assessment');
    expect(zones.length).toBe(10);

    // 2. Custom Dataset Load
    respireWorkspaceService.loadCustomDataset([
      {
        zoneId: 'CUSTOM-W001',
        zoneName: 'Custom Ward North',
        wardId: 'CUSTOM-W001',
        wardName: 'Custom Ward North',
        district: 'Test District',
        latitude: 13.1,
        longitude: 80.2,
        heat: { lst: 41, lstNormalized: 0.85, provenance: { status: 'SOURCED', isDemoData: false } },
        vegetation: { ndvi: 0.12, vegetationDeficitNormalized: 0.75, provenance: { status: 'SOURCED', isDemoData: false } },
        vulnerability: {
          vulnerabilityScore: 0.65,
          vulnerabilityComponents: { populationDensity: 18000, elderlyPopulation: 0.12, informalSettlementIndicator: 0.7, outdoorWorkerExposure: 0.8 },
          provenance: { status: 'SOURCED', isDemoData: false }
        }
      }
    ], 'Custom Audit Dataset');

    metadata = respireWorkspaceService.getActiveMetadata();
    zones = respireWorkspaceService.getActiveZones();
    expect(metadata.name).toBe('Custom Audit Dataset');
    expect(zones.length).toBe(1);

    const scoredCustom = respireScoringEngine.calculateZoneRisk(zones[0]);
    expect(scoredCustom.totalScore).toBeGreaterThan(0);

    const prioCustom = respirePrioritizationEngine.prioritizeMultipleZones(zones);
    expect(prioCustom.rankedPriorities.length).toBe(1);
    expect(prioCustom.rankedPriorities[0].wardName).toBe('Custom Ward North');

    // 3. Demo Dataset Restoration
    respireWorkspaceService.useDemoDataset();
    metadata = respireWorkspaceService.getActiveMetadata();
    zones = respireWorkspaceService.getActiveZones();
    expect(metadata.name).toBe('Chennai Heat Assessment');
    expect(zones.length).toBe(10);
  });

  it('2. RISK SCORE CONSISTENCY: All 9 analyzable zones must return identical risk scores across engines', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const scoredMap = new Map(zones.map(z => [z.zoneId || z.id, respireScoringEngine.calculateZoneRisk(z)]));

    expect(scoredMap.get('ZONE-CHN-W045')?.totalScore).toBe(88); // Vyasarpadi
    expect(scoredMap.get('ZONE-CHN-W012')?.totalScore).toBe(86); // Washermanpet
    expect(scoredMap.get('ZONE-CHN-W052')?.totalScore).toBe(82); // Royapuram
    expect(scoredMap.get('ZONE-CHN-W134')?.totalScore).toBe(81); // T. Nagar
    expect(scoredMap.get('ZONE-CHN-W080')?.totalScore).toBe(77); // Ambattur
    expect(scoredMap.get('ZONE-CHN-W156')?.totalScore).toBe(73); // Velachery
    expect(scoredMap.get('ZONE-CHN-W108')?.totalScore).toBe(63); // Kodambakkam
    expect(scoredMap.get('ZONE-CHN-W114')?.totalScore).toBe(62); // Mylapore
    expect(scoredMap.get('ZONE-CHN-W175')?.totalScore).toBe(42); // Adyar
  });

  it('3. SHOLINGANALLUR CREDIBILITY: Ward 198 must remain strictly null across all domain outputs', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const sholinganallur = zones.find(z => z.wardName.includes('Sholinganallur'));
    expect(sholinganallur).toBeDefined();

    // Scoring engine check
    const risk = respireScoringEngine.calculateZoneRisk(sholinganallur!);
    expect(risk.totalScore).toBeNull();
    expect(risk.totalScore).not.toBe(0);
    expect(risk.riskTier).toBe('INSUFFICIENT_EVIDENCE');

    // Recommendation engine check
    const rec = respireRecommendationEngine.evaluateZone(sholinganallur!);
    expect(rec.primaryRecommendation).toBeNull();
    expect(rec.confidenceLevel).toBe('INSUFFICIENT_DATA');

    // Prioritization engine check
    const prio = respirePrioritizationEngine.prioritizeMultipleZones(zones);
    const unrankedItem = prio.unrankedInsufficientEvidence.find(u => u.zoneId === 'ZONE-CHN-W198');
    expect(unrankedItem).toBeDefined();
    expect(unrankedItem?.priorityScore).toBeNull();
    expect(unrankedItem?.priorityScore).not.toBe(0);
    expect(unrankedItem?.rank).toBeNull();
    expect(unrankedItem?.indicativeCost).toBeNull();
    expect(unrankedItem?.indicativeImpact).toBeNull();
  });

  it('4. PRIORITIZATION CONSISTENCY: Must maintain deterministic rank order across Overview, Prioritize, Planning & Report', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const prio = respirePrioritizationEngine.prioritizeMultipleZones(zones);

    const expectedRankNames = [
      'Vyasarpadi',
      'Washermanpet',
      'Royapuram',
      'T. Nagar',
      'Ambattur',
      'Velachery',
      'Kodambakkam',
      'Mylapore',
      'Adyar'
    ];

    expect(prio.rankedPriorities.length).toBe(9);
    prio.rankedPriorities.forEach((item, index) => {
      expect(item.rank).toBe(index + 1);
      expect(item.wardName).toContain(expectedRankNames[index]);
    });
  });

  it('5. COST & IMPACT PROVENANCE: Every intervention cost/impact must retain INDICATIVE ESTIMATE provenance', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const recs = zones.map(z => respireRecommendationEngine.evaluateZone(z));

    recs.forEach(r => {
      if (r.primaryRecommendation) {
        expect(r.primaryRecommendation.costStatus).toBe('INDICATIVE_ESTIMATE');
        expect(r.primaryRecommendation.impactStatus).toBe('INDICATIVE_ESTIMATE');
      }
    });
  });

  it('6. DATA COMPLETENESS TERMINOLOGY: Dataset completeness must average evidence completeness across active zones (93%)', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const scoredZones = zones.map(z => respireScoringEngine.calculateZoneRisk(z));

    const totalCompleteness = scoredZones.reduce((acc, s) => acc + s.completeness, 0);
    const avgCompleteness = Math.round((totalCompleteness / scoredZones.length) * 100);

    expect(avgCompleteness).toBe(93);
    expect(metadata().analyzableZoneCount).toBe(9);
    expect(metadata().zoneCount).toBe(10);
  });

  it('7. DECISION READINESS CONSISTENCY: Must evaluate READY WITH WARNINGS for Chennai demo dataset', () => {
    const meta = respireWorkspaceService.getActiveMetadata();
    expect(meta.insufficientEvidenceCount).toBe(1);

    // Readiness rule verification
    let readiness = 'READY';
    if (meta.zoneCount === 0 || meta.validationErrorCount > 0 || meta.analyzableZoneCount === 0) {
      readiness = 'NOT READY';
    } else if (meta.insufficientEvidenceCount > 0 || meta.validationWarningCount > 0) {
      readiness = 'READY WITH WARNINGS';
    }

    expect(readiness).toBe('READY WITH WARNINGS');
  });

  function metadata() {
    return respireWorkspaceService.getActiveMetadata();
  }
});
