import { describe, it, expect } from 'vitest';
import { DEMO_CHENNAI_ZONES } from '../../../data/demo/chennaiDemoData';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';

describe('RESPIRE Step 7 — EXPLAIN Screen Data Flow & UI Logic Tests', () => {
  it('1. should process Vyasarpadi (Ward 045) scoring results for EXPLAIN view rendering', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    expect(vyasarpadi).toBeDefined();

    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi!);
    expect(score.totalScore).toBe(88);
    expect(score.riskTier).toBe('VERY_HIGH');
    expect(score.primaryDriver).toBe('Heat Exposure');
    expect(score.secondaryDriver).toBe('Social Vulnerability');
  });

  it('2. should verify component contribution points for Vyasarpadi sum to 88 / 100', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi!);

    const heatPts = score.breakdown.heatExposure.obtainedScore;
    const vegPts = score.breakdown.vegetationDeficit.obtainedScore;
    const vulnPts = score.breakdown.socialVulnerability.obtainedScore;

    expect(heatPts).toBe(45);
    expect(vegPts).toBe(17);
    expect(vulnPts).toBe(26);
    expect(heatPts! + vegPts! + vulnPts!).toBe(88);
  });

  it('3. should verify Vyasarpadi completeness (100%) and confidence (HIGH)', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi!);

    expect(score.completeness).toBe(1.0);
    expect(score.confidence).toBe('HIGH');
    expect(score.missingComponents).toHaveLength(0);
  });

  it('4. should verify Sholinganallur (Ward 198) displays INSUFFICIENT_EVIDENCE and null totalScore', () => {
    const sholinganallur = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-198' || z.zoneId === 'ZONE-CHN-W198');
    expect(sholinganallur).toBeDefined();

    const score = respireScoringEngine.calculateZoneRisk(sholinganallur!);

    expect(score.totalScore).toBeNull();
    expect(score.riskTier).toBe('INSUFFICIENT_EVIDENCE');
    expect(score.completeness).toBe(0.3);
    expect(score.confidence).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('5. should verify Sholinganallur missing indicators are Unavailable and never 0 or 40/100', () => {
    const sholinganallur = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-198' || z.zoneId === 'ZONE-CHN-W198');
    const score = respireScoringEngine.calculateZoneRisk(sholinganallur!);

    expect(score.breakdown.heatExposure.normalizedInput).toBeNull();
    expect(score.breakdown.vegetationDeficit.normalizedInput).toBeNull();
    expect(score.breakdown.heatExposure.isMissing).toBe(true);
    expect(score.breakdown.vegetationDeficit.isMissing).toBe(true);
    expect(score.breakdown.socialVulnerability.normalizedInput).toBe(0.40);
    expect(score.breakdown.socialVulnerability.obtainedScore).toBe(12);

    expect(score.totalScore).not.toBe(40);
    expect(score.totalScore).not.toBe(30);
    expect(score.totalScore).not.toBe(0);
  });

  it('6. should verify zone switching updates explanation text deterministically', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const adyar = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-175');

    const vyasarpadiScore = respireScoringEngine.calculateZoneRisk(vyasarpadi!);
    const adyarScore = respireScoringEngine.calculateZoneRisk(adyar!);

    expect(vyasarpadiScore.totalScore).toBe(88);
    expect(adyarScore.totalScore).toBe(42);
    expect(adyarScore.riskTier).toBe('MODERATE');
    expect(vyasarpadiScore.explanation).not.toBe(adyarScore.explanation);
  });
});
