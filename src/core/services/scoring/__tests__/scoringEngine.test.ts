import { describe, it, expect } from 'vitest';
import { RespireScoringEngine, ScoringValidationError } from '../scoringEngine';
import { WardZone } from '../../../types/zone';

describe('RESPIRE Explainable Risk Scoring Engine', () => {
  const engine = new RespireScoringEngine();

  const createTestZone = (
    heatNorm: number | null,
    vegNorm: number | null,
    vulnNorm: number | null
  ): WardZone => ({
    zoneId: 'ZONE-TEST-001',
    zoneName: 'Test Ward',
    wardId: 'WARD-TEST',
    wardName: 'Ward Test',
    district: 'Test District',
    latitude: 13.0827,
    longitude: 80.2707,
    heat: {
      lst: heatNorm !== null ? 25 + heatNorm * 20 : null,
      lstNormalized: heatNorm,
      provenance: { status: 'SOURCED', isDemoData: false }
    },
    vegetation: {
      ndvi: vegNorm !== null ? 1.0 - (vegNorm * 2.0 - 1.0) : null,
      vegetationDeficitNormalized: vegNorm,
      provenance: { status: 'SOURCED', isDemoData: false }
    },
    vulnerability: {
      vulnerabilityScore: vulnNorm,
      vulnerabilityComponents: {
        populationDensity: 15000,
        elderlyPopulation: 0.2,
        informalSettlementIndicator: 0.5,
        outdoorWorkerExposure: 0.5
      },
      provenance: { status: 'SOURCED', isDemoData: false }
    }
  });

  // Test 1: Fully populated high-risk zone
  it('1. should calculate score correctly for fully populated high-risk zone', () => {
    const zone = createTestZone(0.9, 0.85, 0.8);
    const score = engine.calculateZoneRisk(zone);

    // Heat: 0.9 * 50 = 45; Veg: 0.85 * 20 = 17; Vuln: 0.8 * 30 = 24. Total = 86
    expect(score.totalScore).toBe(86);
    expect(score.riskTier).toBe('VERY_HIGH');
    expect(score.confidence).toBe('HIGH');
    expect(score.completeness).toBe(1.0);
    expect(score.missingComponents).toHaveLength(0);
    expect(score.primaryDriver).toBe('Heat Exposure');
    expect(score.secondaryDriver).toBe('Vegetation Deficit');
  });

  // Test 2: Fully populated low-risk zone
  it('2. should calculate score correctly for fully populated low-risk zone', () => {
    const zone = createTestZone(0.1, 0.2, 0.1);
    const score = engine.calculateZoneRisk(zone);

    // Heat: 0.1 * 50 = 5; Veg: 0.2 * 20 = 4; Vuln: 0.1 * 30 = 3. Total = 12
    expect(score.totalScore).toBe(12);
    expect(score.riskTier).toBe('LOW');
    expect(score.confidence).toBe('HIGH');
    expect(score.completeness).toBe(1.0);
  });

  // Test 3: Moderate-risk zone
  it('3. should calculate score correctly for a moderate-risk zone', () => {
    const zone = createTestZone(0.4, 0.5, 0.3);
    const score = engine.calculateZoneRisk(zone);

    // Heat: 0.4 * 50 = 20; Veg: 0.5 * 20 = 10; Vuln: 0.3 * 30 = 9. Total = 39
    expect(score.totalScore).toBe(39);
    expect(score.riskTier).toBe('MODERATE');
  });

  // Test 4: Missing heat data (proportional rescaling)
  it('4. should proportionally rescale score when heat data is missing', () => {
    const zone = createTestZone(null, 0.8, 0.6);
    const score = engine.calculateZoneRisk(zone);

    // Veg points = 0.8 * 20 = 16; Vuln points = 0.6 * 30 = 18. Obtained = 34.
    // Available weight = 20 + 30 = 50. Rescaled = (34 / 50) * 100 = 68.
    expect(score.totalScore).toBe(68);
    expect(score.riskTier).toBe('HIGH');
    expect(score.confidence).toBe('MODERATE');
    expect(score.completeness).toBe(0.5); // 50 / 100
    expect(score.missingComponents).toContain('HEAT_EXPOSURE');
    expect(score.explanation).toContain('Heat exposure data is unavailable');
  });

  // Test 5: Missing vegetation data
  it('5. should proportionally rescale score when vegetation data is missing', () => {
    const zone = createTestZone(0.8, null, 0.5);
    const score = engine.calculateZoneRisk(zone);

    // Heat = 0.8 * 50 = 40; Vuln = 0.5 * 30 = 15. Total obtained = 55.
    // Available weight = 50 + 30 = 80. Rescaled = (55 / 80) * 100 = 69.
    expect(score.totalScore).toBe(69);
    expect(score.completeness).toBe(0.8);
    expect(score.missingComponents).toContain('VEGETATION_DEFICIT');
  });

  // Test 6: Missing vulnerability data
  it('6. should proportionally rescale score when vulnerability data is missing', () => {
    const zone = createTestZone(0.7, 0.6, null);
    const score = engine.calculateZoneRisk(zone);

    // Heat = 0.7 * 50 = 35; Veg = 0.6 * 20 = 12. Obtained = 47.
    // Available weight = 50 + 20 = 70. Rescaled = (47 / 70) * 100 = 67.
    expect(score.totalScore).toBe(67);
    expect(score.completeness).toBe(0.7);
    expect(score.missingComponents).toContain('SOCIAL_VULNERABILITY');
  });

  // Test 7: Multiple missing components (Only Heat available)
  it('7. should handle multiple missing components gracefully', () => {
    const zone = createTestZone(0.6, null, null);
    const score = engine.calculateZoneRisk(zone);

    // Heat = 0.6 * 50 = 30. Available weight = 50. Rescaled = (30 / 50) * 100 = 60.
    expect(score.totalScore).toBe(60);
    expect(score.completeness).toBe(0.5); // 50 / 100
    expect(score.confidence).toBe('MODERATE');
    expect(score.missingComponents).toHaveLength(2);
  });

  // Test 8: All scoring inputs missing
  it('8. should return null total score and INSUFFICIENT_EVIDENCE when all inputs are missing', () => {
    const zone = createTestZone(null, null, null);
    const score = engine.calculateZoneRisk(zone);

    expect(score.totalScore).toBeNull();
    expect(score.confidence).toBe('INSUFFICIENT_EVIDENCE');
    expect(score.completeness).toBe(0.0);
    expect(score.missingComponents).toHaveLength(3);
    expect(score.explanation).toContain('Insufficient evidence');
  });

  // Test 9: Boundary values (0, 25, 50, 75, 100)
  it('9. should handle risk band boundaries accurately', () => {
    // Score 0 -> LOW
    expect(engine.calculateZoneRisk(createTestZone(0, 0, 0)).totalScore).toBe(0);
    expect(engine.calculateZoneRisk(createTestZone(0, 0, 0)).riskTier).toBe('LOW');

    // Score ~25 -> MODERATE
    const modZone = createTestZone(0.26, 0.25, 0.23); // (13 + 5 + 6.9) = 24.9 -> 25
    expect(engine.calculateZoneRisk(modZone).totalScore).toBe(25);
    expect(engine.calculateZoneRisk(modZone).riskTier).toBe('MODERATE');

    // Score ~50 -> HIGH
    const highZone = createTestZone(0.5, 0.5, 0.5); // (25 + 10 + 15) = 50
    expect(engine.calculateZoneRisk(highZone).totalScore).toBe(50);
    expect(engine.calculateZoneRisk(highZone).riskTier).toBe('HIGH');

    // Score ~75 -> VERY_HIGH
    const vhighZone = createTestZone(0.75, 0.75, 0.75); // (37.5 + 15 + 22.5) = 75
    expect(engine.calculateZoneRisk(vhighZone).totalScore).toBe(75);
    expect(engine.calculateZoneRisk(vhighZone).riskTier).toBe('VERY_HIGH');

    // Score 100 -> VERY_HIGH
    const maxZone = createTestZone(1.0, 1.0, 1.0); // (50 + 20 + 30) = 100
    expect(engine.calculateZoneRisk(maxZone).totalScore).toBe(100);
    expect(engine.calculateZoneRisk(maxZone).riskTier).toBe('VERY_HIGH');
  });

  // Test 10: Invalid normalized values (< 0, > 1)
  it('10. should throw ScoringValidationError for invalid normalized values', () => {
    const invalidLow = createTestZone(-0.2, 0.5, 0.5);
    expect(() => engine.calculateZoneRisk(invalidLow)).toThrow(ScoringValidationError);

    const invalidHigh = createTestZone(0.5, 1.5, 0.5);
    expect(() => engine.calculateZoneRisk(invalidHigh)).toThrow(ScoringValidationError);
  });

  // Test 11: Deterministic repeated calculation
  it('11. should produce identical scores and explanations for repeated calculations', () => {
    const zone = createTestZone(0.82, 0.65, 0.44);
    const run1 = engine.calculateZoneRisk(zone);
    const run2 = engine.calculateZoneRisk(zone);

    expect(run1.totalScore).toEqual(run2.totalScore);
    expect(run1.riskTier).toEqual(run2.riskTier);
    expect(run1.explanation).toEqual(run2.explanation);
    expect(run1.primaryDriver).toEqual(run2.primaryDriver);
  });

  // Test 12: Correct component contribution breakdown (Heat 50%, Veg 20%, Vuln 30%)
  it('12. should respect component weights of 50%, 20%, 30%', () => {
    // Only heat = 1.0 -> 50 points out of 100
    const heatOnly = engine.calculateZoneRisk(createTestZone(1.0, 0, 0));
    expect(heatOnly.heatScore).toBe(50);
    expect(heatOnly.vegetationScore).toBe(0);
    expect(heatOnly.vulnerabilityScore).toBe(0);
    expect(heatOnly.totalScore).toBe(50);

    // Only veg = 1.0 -> 20 points out of 100
    const vegOnly = engine.calculateZoneRisk(createTestZone(0, 1.0, 0));
    expect(vegOnly.vegetationScore).toBe(20);

    // Only vuln = 1.0 -> 30 points out of 100
    const vulnOnly = engine.calculateZoneRisk(createTestZone(0, 0, 1.0));
    expect(vulnOnly.vulnerabilityScore).toBe(30);
  });

  // Test 13: Correct total score calculations
  it('13. should produce exact total score matches for known inputs', () => {
    const zone = createTestZone(0.80, 0.50, 0.70);
    // Heat: 0.8 * 50 = 40
    // Veg:  0.5 * 20 = 10
    // Vuln: 0.7 * 30 = 21
    // Total = 40 + 10 + 21 = 71
    const res = engine.calculateZoneRisk(zone);
    expect(res.totalScore).toBe(71);
    expect(res.riskTier).toBe('HIGH');
  });
});
