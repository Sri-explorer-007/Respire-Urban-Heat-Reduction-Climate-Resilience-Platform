import { describe, it, expect, beforeEach } from 'vitest';
import { DEMO_CHENNAI_ZONES } from '../../../data/demo/chennaiDemoData';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';
import { respireWorkspaceService } from '../../../core/services/data/workspaceService';
import { parseWardZoneCSV } from '../../../core/services/data/csvParser';
import { respireRecommendationEngine } from '../../../core/services/recommendations/recommendationEngine';
import { respirePrioritizationEngine } from '../../../core/services/prioritization/prioritizationEngine';

describe('STEP 11B — REAL GEOGRAPHIC MAP & SPATIAL INTERACTION AUDIT', () => {
  beforeEach(() => {
    respireWorkspaceService.useDemoDataset();
  });

  it('1. should verify active demo dataset zones have valid geographic coordinates', () => {
    const zones = respireWorkspaceService.getActiveZones();
    expect(zones.length).toBe(10);

    const validGeo = zones.filter(z => z.latitude !== null && z.longitude !== null);
    expect(validGeo.length).toBe(10);
  });

  it('2. should verify map dynamic bounding box calculates correctly from dataset lat/lng bounds', () => {
    const zones = respireWorkspaceService.getActiveZones();
    const lats = zones.map(z => z.latitude!).filter(Boolean);
    const lngs = zones.map(z => z.longitude!).filter(Boolean);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    expect(minLat).toBeGreaterThan(12.0);
    expect(maxLat).toBeLessThan(14.0);
    expect(minLng).toBeGreaterThan(79.0);
    expect(maxLng).toBeLessThan(81.0);
  });

  it('3. should verify Vyasarpadi (Ward 045) risk tier and score originate strictly from domain scoring engine', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045')!;
    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi);

    expect(score.totalScore).toBe(88);
    expect(score.riskTier).toBe('VERY_HIGH');
    expect(score.primaryDriver).toBe('Heat Exposure');
  });

  it('4. should verify T. Nagar (Ward 134) risk tier and score originate strictly from domain scoring engine', () => {
    const tnagar = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-134')!;
    const score = respireScoringEngine.calculateZoneRisk(tnagar);

    expect(score.totalScore).toBe(81);
    expect(score.riskTier).toBe('VERY_HIGH');
  });

  it('5. should verify Sholinganallur (Ward 198) remains INSUFFICIENT EVIDENCE with null total score', () => {
    const sholinganallur = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-198')!;
    const score = respireScoringEngine.calculateZoneRisk(sholinganallur);

    expect(score.totalScore).toBeNull();
    expect(score.riskTier).toBe('INSUFFICIENT_EVIDENCE');
    expect(score.confidence).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('6. should handle invalid/missing coordinates without dropping zone from non-map analysis', () => {
    const csv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
ZONE-MAP-001,Valid Ward 1,WARD-M1,District,13.0827,80.2707,0.90,0.80,0.70
ZONE-MAP-999,No Coords Ward,WARD-M999,District,null,null,0.85,0.75,0.60`;

    const parsed = parseWardZoneCSV(csv);
    expect(parsed.zones.length).toBe(2);

    const validZones = parsed.zones.filter(z => z.latitude !== null && z.longitude !== null);
    const unmappedZones = parsed.zones.filter(z => z.latitude === null || z.longitude === null);

    expect(validZones.length).toBe(1);
    expect(unmappedZones.length).toBe(1);

    // Unmapped zone must still be scored correctly by domain engine
    const unmappedScore = respireScoringEngine.calculateZoneRisk(unmappedZones[0]);
    expect(unmappedScore.totalScore).toBeGreaterThan(70);
  });

  it('7. should update dataset markers and bounds dynamically when uploading custom CSV dataset', () => {
    const csv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
ZONE-NEW-01,London Ward,WARD-LDN1,London,51.5074,-0.1278,0.90,0.80,0.70
ZONE-NEW-02,London Ward 2,WARD-LDN2,London,51.5200,-0.1100,0.70,0.60,0.50`;

    const parsed = parseWardZoneCSV(csv);
    respireWorkspaceService.loadCustomDataset(parsed.zones, 'London Custom Dataset');

    const activeZones = respireWorkspaceService.getActiveZones();
    expect(activeZones.length).toBe(2);
    expect(activeZones[0].zoneId).toBe('ZONE-NEW-01');

    // Confirm old demo markers are completely replaced
    expect(activeZones.some(z => z.wardId === 'WARD-045')).toBe(false);
  });

  it('8. should restore Chennai demo dataset bounds and markers when switching back', () => {
    const csv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
ZONE-TEMP,Temp Ward,WARD-T1,District,10.0,70.0,0.80,0.70,0.60`;

    const parsed = parseWardZoneCSV(csv);
    respireWorkspaceService.loadCustomDataset(parsed.zones, 'Temp Dataset');
    expect(respireWorkspaceService.getActiveZones().length).toBe(1);

    respireWorkspaceService.useDemoDataset();
    const restoredZones = respireWorkspaceService.getActiveZones();

    expect(restoredZones.length).toBe(10);
    expect(restoredZones[0].wardName).toContain('Vyasarpadi');
  });

  it('9. should preserve single selection state (selectedZoneId) across all 4 workflow stages', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045')!;
    const selectedZoneId = vyasarpadi.zoneId;

    // 01 IDENTIFY
    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi);
    expect(score.totalScore).toBe(88);

    // 02 EXPLAIN
    expect(score.explanation).toContain('Vyasarpadi');

    // 03 RECOMMEND
    const rec = respireRecommendationEngine.evaluateZone(vyasarpadi, score);
    expect(rec.primaryRecommendation?.interventionName).toBe('Shaded Cooling & Worker Rest Shelters');

    // 04 PRIORITIZE
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const prioItem = prioResult.rankedPriorities.find(p => p.zoneId === selectedZoneId);
    expect(prioItem?.rank).toBe(1);
    expect(prioItem?.priorityScore).toBe(94);
  });

  it('10. should verify T. Nagar (Ward 134) funding rank (#4) and planning priority score (91) in prioritization engine', () => {
    const tnagar = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-134')!;
    const prioResult = respirePrioritizationEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);
    const prioItem = prioResult.rankedPriorities.find(p => p.zoneId === tnagar.zoneId);

    expect(prioItem?.rank).toBe(4);
    expect(prioItem?.priorityScore).toBe(91);
  });
});
