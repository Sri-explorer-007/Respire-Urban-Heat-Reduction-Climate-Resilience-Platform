import { describe, it, expect } from 'vitest';
import { DEMO_CHENNAI_ZONES } from '../../../data/demo/chennaiDemoData';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';

describe('RESPIRE Step 6A — IDENTIFY Consistency & Data Integrity Tests', () => {
  it('1. should pass all 10 demo Chennai zones through the risk scoring engine for UI rendering', () => {
    const scored = DEMO_CHENNAI_ZONES.map(z => ({
      zone: z,
      riskScore: respireScoringEngine.calculateZoneRisk(z)
    }));

    expect(scored).toHaveLength(10);
  });

  it('2. should calculate summary card counts dynamically matching expected distribution', () => {
    const scored = DEMO_CHENNAI_ZONES.map(z => respireScoringEngine.calculateZoneRisk(z));

    let total = scored.length;
    let veryHigh = 0;
    let high = 0;
    let moderate = 0;
    let low = 0;
    let insufficient = 0;

    scored.forEach(score => {
      if (score.totalScore === null || score.riskTier === 'INSUFFICIENT_EVIDENCE') {
        insufficient++;
      } else {
        if (score.riskTier === 'VERY_HIGH') veryHigh++;
        else if (score.riskTier === 'HIGH') high++;
        else if (score.riskTier === 'MODERATE') moderate++;
        else if (score.riskTier === 'LOW') low++;
      }
    });

    expect(total).toBe(10);
    expect(veryHigh).toBe(5);    // Vyasarpadi (88), Washermanpet (86), Royapuram (82), T. Nagar (81), Ambattur (77)
    expect(high).toBe(3);        // Velachery (73), Kodambakkam (63), Mylapore (62)
    expect(moderate).toBe(1);    // Adyar (42)
    expect(low).toBe(0);
    expect(insufficient).toBe(1); // Sholinganallur (null / INSUFFICIENT_EVIDENCE)
  });

  it('3. should verify Ward 045 (Vyasarpadi) score equals exactly 88 VERY_HIGH', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    expect(vyasarpadi).toBeDefined();

    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi!);
    expect(score.totalScore).toBe(88);
    expect(score.riskTier).toBe('VERY_HIGH');
    expect(score.breakdown.heatExposure.normalizedInput).toBe(0.90);
    expect(score.breakdown.vegetationDeficit.normalizedInput).toBe(0.85);
    expect(score.breakdown.socialVulnerability.normalizedInput).toBe(0.86);
  });

  it('4. should verify Ward 198 (Sholinganallur) has null riskScore and INSUFFICIENT_EVIDENCE band', () => {
    const sholinganallur = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-198' || z.zoneId === 'ZONE-CHN-W198');
    expect(sholinganallur).toBeDefined();

    const score = respireScoringEngine.calculateZoneRisk(sholinganallur!);
    expect(score.totalScore).toBeNull();
    expect(score.riskTier).toBe('INSUFFICIENT_EVIDENCE');
    expect(score.completeness).toBe(0.3); // 30% completeness
    expect(score.confidence).toBe('INSUFFICIENT_EVIDENCE');

    expect(score.breakdown.heatExposure.normalizedInput).toBeNull();
    expect(score.breakdown.vegetationDeficit.normalizedInput).toBeNull();
    expect(score.breakdown.heatExposure.isMissing).toBe(true);
    expect(score.breakdown.vegetationDeficit.isMissing).toBe(true);
    expect(score.breakdown.socialVulnerability.normalizedInput).toBe(0.40);
  });

  it('5. should verify score component weights sum up to 100%', () => {
    const vyasarpadi = DEMO_CHENNAI_ZONES.find(z => z.wardId === 'WARD-045');
    const score = respireScoringEngine.calculateZoneRisk(vyasarpadi!);

    const heatWeight = score.breakdown.heatExposure.maxWeight;
    const vegWeight = score.breakdown.vegetationDeficit.maxWeight;
    const vulnWeight = score.breakdown.socialVulnerability.maxWeight;

    expect(heatWeight + vegWeight + vulnWeight).toBe(100);
  });
});
