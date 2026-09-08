import { describe, it, expect, beforeEach } from 'vitest';
import { respireWorkspaceService } from '../../../core/services/data/workspaceService';
import { parseWardZoneCSV } from '../../../core/services/data/csvParser';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';

describe('STEP 11C — DATA ANALYSIS & PROCESSING WORKSPACE AUDIT', () => {
  beforeEach(() => {
    respireWorkspaceService.useDemoDataset();
  });

  it('1. should verify active demo dataset summary metrics (10 total, 9 analyzable, 1 insufficient, 10 mapped)', () => {
    const metadata = respireWorkspaceService.getActiveMetadata();
    const zones = respireWorkspaceService.getActiveZones();

    expect(metadata.zoneCount).toBe(10);
    expect(metadata.analyzableZoneCount).toBe(9);
    expect(metadata.insufficientEvidenceCount).toBe(1);

    const mapped = zones.filter(z => z.latitude !== null && z.longitude !== null).length;
    expect(mapped).toBe(10);
  });

  it('2. should calculate dataset completeness score correctly from domain zone completeness', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const scored = zones.map(z => respireScoringEngine.calculateZoneRisk(z));

    const totalCompleteness = scored.reduce((acc, s) => acc + s.completeness, 0);
    const avgCompleteness = Math.round((totalCompleteness / scored.length) * 100);

    // 9 zones at 1.0 (100%), 1 zone (Sholinganallur) at 0.3 (30% social vuln) -> 93% average
    expect(avgCompleteness).toBe(93);
  });

  it('3. should verify risk distribution counts originate strictly from scoring engine results', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const scored = zones.map(z => respireScoringEngine.calculateZoneRisk(z));

    const veryHigh = scored.filter(s => s.riskTier === 'VERY_HIGH').length;
    const high = scored.filter(s => s.riskTier === 'HIGH').length;
    const moderate = scored.filter(s => s.riskTier === 'MODERATE').length;
    const low = scored.filter(s => s.riskTier === 'LOW').length;
    const insufficient = scored.filter(s => s.totalScore === null).length;

    expect(veryHigh).toBe(5);
    expect(high).toBe(3);
    expect(moderate).toBe(1);
    expect(low).toBe(0);
    expect(insufficient).toBe(1);
  });

  it('4. should aggregate data gaps accurately without converting null values to zero', () => {
    const zones = respireWorkspaceService.getActiveZones();

    const missingHeat = zones.filter(z => z.heat.lstNormalized === null).length;
    const missingVeg = zones.filter(z => z.vegetation.vegetationDeficitNormalized === null).length;
    const missingVuln = zones.filter(z => z.vulnerability.vulnerabilityScore === null).length;

    expect(missingHeat).toBe(1);
    expect(missingVeg).toBe(1);
    expect(missingVuln).toBe(0);

    // Confirm Sholinganallur null values are preserved in memory
    const sholinganallur = zones.find(z => z.wardId === 'WARD-198')!;
    expect(sholinganallur.heat.lstNormalized).toBeNull();
    expect(sholinganallur.vegetation.vegetationDeficitNormalized).toBeNull();
  });

  it('5. should evaluate decision readiness state as READY_WITH_WARNINGS for demo dataset', () => {
    const metadata = respireWorkspaceService.getActiveMetadata();
    const zones = respireWorkspaceService.getActiveZones();

    const unmappedCount = zones.filter(z => z.latitude === null || z.longitude === null).length;
    let decisionReadiness = 'READY';

    if (zones.length === 0 || metadata.validationErrorCount > 0 || metadata.analyzableZoneCount === 0) {
      decisionReadiness = 'NOT_READY';
    } else if (metadata.insufficientEvidenceCount > 0 || unmappedCount > 0 || metadata.validationWarningCount > 0) {
      decisionReadiness = 'READY_WITH_WARNINGS';
    }

    expect(decisionReadiness).toBe('READY_WITH_WARNINGS');
  });

  it('6. should evaluate decision readiness state as READY for a complete 100% valid dataset', () => {
    const csv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
ZONE-FULL-01,Full Ward 1,WARD-F1,District,13.0827,80.2707,38.5,0.80,0.70
ZONE-FULL-02,Full Ward 2,WARD-F2,District,13.0900,80.2800,41.2,0.65,0.55`;

    const parsed = parseWardZoneCSV(csv);
    respireWorkspaceService.loadCustomDataset(parsed.zones, 'Complete Dataset', 'complete.csv', parsed.totalErrors, parsed.totalWarnings);

    const metadata = respireWorkspaceService.getActiveMetadata();
    const zones = respireWorkspaceService.getActiveZones();
    const unmappedCount = zones.filter(z => z.latitude === null || z.longitude === null).length;

    let decisionReadiness = 'READY';
    if (zones.length === 0 || metadata.validationErrorCount > 0 || metadata.analyzableZoneCount === 0) {
      decisionReadiness = 'NOT_READY';
    } else if (metadata.insufficientEvidenceCount > 0 || unmappedCount > 0 || metadata.validationWarningCount > 0) {
      decisionReadiness = 'READY_WITH_WARNINGS';
    }

    expect(decisionReadiness).toBe('READY');
  });

  it('7. should evaluate decision readiness as NOT_READY when structural errors exist', () => {
    const csv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
ZONE-DUP-01,Ward 1,WARD-D1,District,13.0,80.0,0.80,0.70,0.60
ZONE-DUP-01,Ward 2,WARD-D2,District,13.1,80.1,0.85,0.75,0.65`;

    const parsed = parseWardZoneCSV(csv);
    expect(parsed.totalErrors).toBeGreaterThan(0);

    let decisionReadiness = 'READY';
    if (parsed.zones.length === 0 || parsed.totalErrors > 0 || parsed.analyzableCount === 0) {
      decisionReadiness = 'NOT_READY';
    }

    expect(decisionReadiness).toBe('NOT_READY');
  });

  it('8. should update all workspace analysis metrics dynamically upon switching dataset', () => {
    const csv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
ZONE-CUST-01,Custom Zone 1,WARD-C1,District,12.9,80.1,0.50,0.40,0.30`;

    const parsed = parseWardZoneCSV(csv);
    respireWorkspaceService.loadCustomDataset(parsed.zones, 'Single Ward Dataset');

    const activeMeta = respireWorkspaceService.getActiveMetadata();
    expect(activeMeta.name).toBe('Single Ward Dataset');
    expect(activeMeta.zoneCount).toBe(1);
    expect(activeMeta.analyzableZoneCount).toBe(1);

    // Switch back to demo dataset
    respireWorkspaceService.useDemoDataset();
    const restoredMeta = respireWorkspaceService.getActiveMetadata();

    expect(restoredMeta.name).toBe('Chennai Heat Assessment');
    expect(restoredMeta.zoneCount).toBe(10);
  });

  it('9. should preserve dataset provenance labels without external API claims', () => {
    const demoMeta = respireWorkspaceService.getActiveMetadata();
    expect(demoMeta.sourceLabel).toContain('Illustrative Demo');

    const csv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
ZONE-PROV-01,Prov Ward,WARD-P1,District,13.0,80.0,0.80,0.70,0.60`;
    const parsed = parseWardZoneCSV(csv);
    respireWorkspaceService.loadCustomDataset(parsed.zones, 'Municipal Dataset');

    const customMeta = respireWorkspaceService.getActiveMetadata();
    expect(customMeta.sourceLabel).toBe('User Uploaded Dataset (.csv)');
  });
});
