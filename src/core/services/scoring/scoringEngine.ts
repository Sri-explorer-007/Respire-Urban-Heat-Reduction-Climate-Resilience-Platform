import { WardZone } from '../../types/zone';
import { 
  ZoneRiskScore, 
  ScoringEngineContract, 
  RiskScoreBreakdown 
} from '../../types/scoring';
import { 
  COMPONENT_WEIGHTS, 
  getRiskTierForScore, 
  ScoringComponentTag, 
  ScoreConfidenceLevel 
} from './scoringConstants';

export class ScoringValidationError extends Error {
  constructor(public field: string, message: string) {
    super(`[RESPIRE Scoring Validation Error] ${field}: ${message}`);
    this.name = 'ScoringValidationError';
  }
}

/**
 * RESPIRE Explainable Risk Scoring Engine
 * 
 * Locked Model:
 * Heat Exposure (50%) + Vegetation Deficit (20%) + Social Vulnerability (30%) = 100%
 * 
 * Pure, deterministic, transparent, and completely decoupled from UI / Browser APIs.
 */
export class RespireScoringEngine implements ScoringEngineContract {
  
  calculateZoneRisk(zone: WardZone): ZoneRiskScore {
    // 1. Extract and validate normalized inputs
    const heatNorm = this.extractAndValidateHeatNorm(zone);
    const vegNorm = this.extractAndValidateVegNorm(zone);
    const vulnNorm = this.extractAndValidateVulnNorm(zone);

    // 2. Identify missing components
    const missingComponents: ScoringComponentTag[] = [];
    if (heatNorm === null) missingComponents.push('HEAT_EXPOSURE');
    if (vegNorm === null) missingComponents.push('VEGETATION_DEFICIT');
    if (vulnNorm === null) missingComponents.push('SOCIAL_VULNERABILITY');

    // 3. Compute available weights and raw component points
    const heatWeightAvailable = heatNorm !== null ? COMPONENT_WEIGHTS.HEAT : 0;
    const vegWeightAvailable = vegNorm !== null ? COMPONENT_WEIGHTS.VEGETATION : 0;
    const vulnWeightAvailable = vulnNorm !== null ? COMPONENT_WEIGHTS.VULNERABILITY : 0;

    const availableWeight = heatWeightAvailable + vegWeightAvailable + vulnWeightAvailable;
    const completeness = availableWeight / COMPONENT_WEIGHTS.MAX_TOTAL;

    // 4. Calculate raw component points
    const heatPoints = heatNorm !== null ? heatNorm * COMPONENT_WEIGHTS.HEAT : null;
    const vegPoints = vegNorm !== null ? vegNorm * COMPONENT_WEIGHTS.VEGETATION : null;
    const vulnPoints = vulnNorm !== null ? vulnNorm * COMPONENT_WEIGHTS.VULNERABILITY : null;

    // 5. Handle missing data rescaling
    let totalScore: number | null = null;
    let confidence: ScoreConfidenceLevel = 'INSUFFICIENT_EVIDENCE';

    // Insufficient evidence threshold: If physical heat and vegetation indicators are missing (or available weight < 50%), risk score cannot be evaluated reliably.
    if (availableWeight >= 50 && !(heatNorm === null && vegNorm === null)) {
      const rawPointsSum = (heatPoints ?? 0) + (vegPoints ?? 0) + (vulnPoints ?? 0);
      // Proportional rescaling formula: (rawObtained / availableWeight) * 100
      totalScore = Math.round((rawPointsSum / availableWeight) * 100);
      // Ensure clamp 0-100
      totalScore = Math.max(0, Math.min(100, totalScore));

      if (completeness === 1.0) {
        confidence = 'HIGH';
      } else {
        confidence = 'MODERATE';
      }
    } else {
      totalScore = null;
      confidence = 'INSUFFICIENT_EVIDENCE';
    }

    const riskTier = totalScore !== null ? getRiskTierForScore(totalScore) : 'INSUFFICIENT_EVIDENCE';

    // 6. Driver Analysis
    const { primaryDriver, secondaryDriver } = this.determineDrivers(heatPoints, vegPoints, vulnPoints);

    // 7. Component Breakdowns
    const breakdown = this.buildBreakdown(
      heatNorm, heatPoints,
      vegNorm, vegPoints,
      vulnNorm, vulnPoints,
      availableWeight
    );

    // 8. Human-readable explanation generation
    const explanation = this.generateExplanation(
      zone, totalScore, riskTier, breakdown, missingComponents, completeness, availableWeight
    );

    const activeZoneId = zone.zoneId || zone.id || 'UNKNOWN_ZONE';
    const activeWardName = zone.wardName || zone.zoneName || zone.name || activeZoneId;

    return {
      zoneId: activeZoneId,
      wardName: activeWardName,
      totalScore,
      riskTier,
      riskLevel: riskTier,
      
      heatScore: heatPoints !== null ? Math.round(heatPoints) : null,
      vegetationScore: vegPoints !== null ? Math.round(vegPoints) : null,
      vulnerabilityScore: vulnPoints !== null ? Math.round(vulnPoints) : null,

      heatWeight: COMPONENT_WEIGHTS.HEAT,
      vegetationWeight: COMPONENT_WEIGHTS.VEGETATION,
      vulnerabilityWeight: COMPONENT_WEIGHTS.VULNERABILITY,
      availableWeight,

      missingComponents,
      confidence,
      completeness,

      primaryDriver,
      secondaryDriver,
      explanation,

      breakdown,
      provenance: {
        status: missingComponents.length > 0 ? 'ASSUMPTION' : 'DERIVED',
        sourceName: 'RESPIRE Risk Scoring Engine (Deterministic 50/20/30 Model)',
        isDemoData: zone.heat?.provenance?.isDemoData ?? true,
        notes: missingComponents.length > 0 ? `Score calculated with missing data policy (${missingComponents.join(', ')})` : 'Full evidence score'
      },
      timestamp: new Date().toISOString()
    };
  }

  // --- Helper Methods ---

  private extractAndValidateHeatNorm(zone: WardZone): number | null {
    if (!zone.heat) return null;
    let val: number | null = null;
    if (zone.heat.lstNormalized !== undefined && zone.heat.lstNormalized !== null) {
      val = zone.heat.lstNormalized;
    } else if (zone.heat.lst !== undefined && zone.heat.lst !== null) {
      // Fallback normalization formula from raw LST: (LST - 25) / 20 clamped
      val = Math.min(1.0, Math.max(0.0, (zone.heat.lst - 25) / 20));
    }

    if (val !== null) {
      if (typeof val !== 'number' || isNaN(val) || val < 0.0 || val > 1.0) {
        throw new ScoringValidationError('heat.lstNormalized', `Normalized heat value must be a number between 0.0 and 1.0. Received: ${val}`);
      }
    }
    return val;
  }

  private extractAndValidateVegNorm(zone: WardZone): number | null {
    if (!zone.vegetation) return null;
    let val: number | null = null;
    if (zone.vegetation.vegetationDeficitNormalized !== undefined && zone.vegetation.vegetationDeficitNormalized !== null) {
      val = zone.vegetation.vegetationDeficitNormalized;
    } else if (zone.vegetation.ndvi !== undefined && zone.vegetation.ndvi !== null) {
      // Deficit is inverse of NDVI: 1.0 - (NDVI normalized to 0-1)
      const ndviNorm = (zone.vegetation.ndvi + 1.0) / 2.0;
      val = Math.min(1.0, Math.max(0.0, 1.0 - ndviNorm));
    }

    if (val !== null) {
      if (typeof val !== 'number' || isNaN(val) || val < 0.0 || val > 1.0) {
        throw new ScoringValidationError('vegetation.vegetationDeficitNormalized', `Normalized vegetation deficit must be a number between 0.0 and 1.0. Received: ${val}`);
      }
    }
    return val;
  }

  private extractAndValidateVulnNorm(zone: WardZone): number | null {
    if (!zone.vulnerability) return null;
    let val: number | null = null;
    if (zone.vulnerability.vulnerabilityScore !== undefined && zone.vulnerability.vulnerabilityScore !== null) {
      val = zone.vulnerability.vulnerabilityScore;
    } else if (zone.vulnerability.vulnerabilityIndex !== undefined && zone.vulnerability.vulnerabilityIndex !== null) {
      val = zone.vulnerability.vulnerabilityIndex;
    }

    if (val !== null) {
      if (typeof val !== 'number' || isNaN(val) || val < 0.0 || val > 1.0) {
        throw new ScoringValidationError('vulnerability.vulnerabilityScore', `Normalized vulnerability score must be a number between 0.0 and 1.0. Received: ${val}`);
      }
    }
    return val;
  }

  private determineDrivers(
    heatPts: number | null, 
    vegPts: number | null, 
    vulnPts: number | null
  ): { primaryDriver: string | null; secondaryDriver: string | null } {
    const list: Array<{ name: string; scoreRatio: number }> = [];

    if (heatPts !== null) {
      list.push({ name: 'Heat Exposure', scoreRatio: heatPts / COMPONENT_WEIGHTS.HEAT });
    }
    if (vegPts !== null) {
      list.push({ name: 'Vegetation Deficit', scoreRatio: vegPts / COMPONENT_WEIGHTS.VEGETATION });
    }
    if (vulnPts !== null) {
      list.push({ name: 'Social Vulnerability', scoreRatio: vulnPts / COMPONENT_WEIGHTS.VULNERABILITY });
    }

    if (list.length === 0) {
      return { primaryDriver: null, secondaryDriver: null };
    }

    // Sort descending by ratio of obtained component points to max weight
    list.sort((a, b) => b.scoreRatio - a.scoreRatio);

    const primaryDriver = list[0].scoreRatio > 0 ? list[0].name : list[0].name;
    const secondaryDriver = list.length > 1 && list[1].scoreRatio > 0 ? list[1].name : null;

    return { primaryDriver, secondaryDriver };
  }

  private buildBreakdown(
    heatNorm: number | null, heatPts: number | null,
    vegNorm: number | null, vegPts: number | null,
    vulnNorm: number | null, vulnPts: number | null,
    availableWeight: number
  ): RiskScoreBreakdown {
    const rescaledHeat = (heatPts !== null && availableWeight > 0) ? Math.round((heatPts / availableWeight) * 100) : null;
    const rescaledVeg = (vegPts !== null && availableWeight > 0) ? Math.round((vegPts / availableWeight) * 100) : null;
    const rescaledVuln = (vulnPts !== null && availableWeight > 0) ? Math.round((vulnPts / availableWeight) * 100) : null;

    return {
      heatExposure: {
        componentTag: 'HEAT_EXPOSURE',
        name: 'Heat Exposure',
        maxWeight: COMPONENT_WEIGHTS.HEAT,
        obtainedScore: heatPts !== null ? Math.round(heatPts) : null,
        rescaledScore: rescaledHeat,
        normalizedInput: heatNorm,
        isMissing: heatNorm === null,
        explanation: heatNorm !== null 
          ? `Heat exposure contributed ${Math.round(heatPts!)} / 50 weighted points (${Math.round(heatNorm * 100)}% normalized severity).` 
          : 'Heat exposure satellite data is unavailable.'
      },
      vegetationDeficit: {
        componentTag: 'VEGETATION_DEFICIT',
        name: 'Vegetation Deficit',
        maxWeight: COMPONENT_WEIGHTS.VEGETATION,
        obtainedScore: vegPts !== null ? Math.round(vegPts) : null,
        rescaledScore: rescaledVeg,
        normalizedInput: vegNorm,
        isMissing: vegNorm === null,
        explanation: vegNorm !== null 
          ? `Vegetation deficit contributed ${Math.round(vegPts!)} / 20 weighted points (${Math.round(vegNorm * 100)}% canopy deficit).` 
          : 'Vegetation canopy data is unavailable.'
      },
      socialVulnerability: {
        componentTag: 'SOCIAL_VULNERABILITY',
        name: 'Social Vulnerability',
        maxWeight: COMPONENT_WEIGHTS.VULNERABILITY,
        obtainedScore: vulnPts !== null ? Math.round(vulnPts) : null,
        rescaledScore: rescaledVuln,
        normalizedInput: vulnNorm,
        isMissing: vulnNorm === null,
        explanation: vulnNorm !== null 
          ? `Social vulnerability contributed ${Math.round(vulnPts!)} / 30 weighted points (${Math.round(vulnNorm * 100)}% vulnerability index).` 
          : 'Social vulnerability census data is unavailable.'
      }
    };
  }

  private generateExplanation(
    zone: WardZone,
    totalScore: number | null,
    riskTier: string,
    breakdown: RiskScoreBreakdown,
    missingComponents: ScoringComponentTag[],
    completeness: number,
    availableWeight: number
  ): string {
    const wardName = zone.wardName || zone.zoneName || zone.name || 'This ward';

    if (totalScore === null || completeness === 0) {
      return `Insufficient evidence to calculate a risk score for ${wardName}. All scoring indicators (heat, vegetation, vulnerability) are missing.`;
    }

    const sentences: string[] = [];

    // Summary sentence
    sentences.push(`${wardName} has an overall Priority Score of ${totalScore}/100, placing it in the ${riskTier} risk tier.`);

    // Component details
    const compParts: string[] = [];
    if (!breakdown.heatExposure.isMissing) {
      compParts.push(`Heat exposure contributed ${breakdown.heatExposure.obtainedScore}/50 points`);
    }
    if (!breakdown.vegetationDeficit.isMissing) {
      compParts.push(`Vegetation deficit contributed ${breakdown.vegetationDeficit.obtainedScore}/20 points`);
    }
    if (!breakdown.socialVulnerability.isMissing) {
      compParts.push(`Social vulnerability contributed ${breakdown.socialVulnerability.obtainedScore}/30 points`);
    }

    if (compParts.length > 0) {
      sentences.push(compParts.join('. ') + '.');
    }

    // Missing components sentence
    if (missingComponents.length > 0) {
      const missingNames = missingComponents.map(c => {
        if (c === 'HEAT_EXPOSURE') return 'heat exposure';
        if (c === 'VEGETATION_DEFICIT') return 'vegetation canopy';
        return 'social vulnerability';
      }).join(' and ');

      sentences.push(`${missingNames.charAt(0).toUpperCase() + missingNames.slice(1)} data is unavailable. The score was calculated using available indicators (available weight: ${availableWeight}/100) and should be interpreted with reduced confidence.`);
    }

    return sentences.join(' ');
  }
}

export const respireScoringEngine = new RespireScoringEngine();
