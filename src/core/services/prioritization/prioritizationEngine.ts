
import { WardZone } from '../../types/zone';
import { ZoneRiskScore } from '../../types/scoring';
import { ZoneRecommendationResult } from '../../types/recommendation';
import { RecommendedIntervention } from '../../types/intervention';
import { 
  InterventionPriority, 
  PrioritizationResult, 
  PrioritizationEngineContract, 
  PrioritizationBreakdown 
} from '../../types/prioritization';
import { 
  PRIORITIZATION_WEIGHTS, 
  CATALOGUE_NORMALIZATION_REFS, 
  PRIORITIZATION_CALCULATION_BASIS,
  PRIORITIZATION_DISCLAIMER_NOTICE,
  getPriorityBandForScore 
} from './prioritizationConstants';
import { respireScoringEngine } from '../scoring/scoringEngine';
import { respireRecommendationEngine } from '../recommendations/recommendationEngine';

/**
 * RESPIRE Cost + Impact Prioritization Engine
 * 
 * Transparent, deterministic planning prioritization engine.
 * 
 * DISCLAIMER:
 * Impact and cost-efficiency components are illustrative planning estimates derived from 
 * the RESPIRE demo intervention catalogue. They are intended for relative demonstration 
 * prioritization only and are not validated scientific effectiveness or ROI estimates.
 * 
 * Formula:
 * Priority Score = 50% Need (Risk Score) + 30% Indicative Impact + 20% Cost Efficiency
 * Rescaled proportionally if inputs are missing.
 * 
 * Pure domain service, completely decoupled from UI / Browser APIs.
 */
export class RespirePrioritizationEngine implements PrioritizationEngineContract {

  prioritizeZone(
    zone: WardZone,
    providedRiskScore?: ZoneRiskScore,
    providedRecommendationResult?: ZoneRecommendationResult
  ): InterventionPriority {
    const riskScore = providedRiskScore || respireScoringEngine.calculateZoneRisk(zone);
    const recResult = providedRecommendationResult || respireRecommendationEngine.evaluateZone(zone, riskScore);

    const primaryRec = recResult.primaryRecommendation;

    // 1. Extract & validate components while preserving nulls
    const missingFields: string[] = [];

    // Need Component (Risk Score)
    const riskTotal = riskScore.totalScore;
    let needNorm: number | null = null;
    let needPoints: number | null = null;
    let needWeightAvailable = 0;

    if (riskTotal !== null && !isNaN(riskTotal)) {
      needNorm = Math.min(1.0, Math.max(0.0, riskTotal / 100));
      needPoints = needNorm * PRIORITIZATION_WEIGHTS.NEED;
      needWeightAvailable = PRIORITIZATION_WEIGHTS.NEED;
    } else {
      missingFields.push('RISK_SCORE');
    }

    // Impact Component (Indicative Temp Reduction)
    const rawImpactTemp = primaryRec?.impact?.expectedTempReductionCelsius ?? null;
    let impactNorm: number | null = null;
    let impactPoints: number | null = null;
    let impactWeightAvailable = 0;

    if (rawImpactTemp !== null && !isNaN(rawImpactTemp)) {
      impactNorm = Math.min(1.0, Math.max(0.0, rawImpactTemp / CATALOGUE_NORMALIZATION_REFS.MAX_EXPECTED_TEMP_REDUCTION));
      impactPoints = impactNorm * PRIORITIZATION_WEIGHTS.IMPACT;
      impactWeightAvailable = PRIORITIZATION_WEIGHTS.IMPACT;
    } else {
      missingFields.push('INDICATIVE_IMPACT');
    }

    // Cost-Efficiency Component (Impact / Cost Ratio)
    const rawCostINR = primaryRec?.cost?.amountInINR ?? null;
    let costEffNorm: number | null = null;
    let costEffPoints: number | null = null;
    let costEffWeightAvailable = 0;
    let rawCostEffRatio: number | null = null;

    if (impactNorm !== null && rawCostINR !== null && rawCostINR > 0) {
      const costNorm = Math.min(1.0, Math.max(0.1, rawCostINR / CATALOGUE_NORMALIZATION_REFS.MAX_INDICATIVE_COST_INR));
      rawCostEffRatio = impactNorm / costNorm;
      costEffNorm = Math.min(1.0, Math.max(0.0, rawCostEffRatio));
      costEffPoints = costEffNorm * PRIORITIZATION_WEIGHTS.COST_EFFICIENCY;
      costEffWeightAvailable = PRIORITIZATION_WEIGHTS.COST_EFFICIENCY;
    } else {
      if (rawCostINR === null) missingFields.push('INDICATIVE_COST');
      missingFields.push('INDICATIVE_COST_EFFICIENCY');
    }

    // 2. Compute available weights and proportional rescaling
    const availableWeight = needWeightAvailable + impactWeightAvailable + costEffWeightAvailable;
    const completeness = availableWeight / PRIORITIZATION_WEIGHTS.MAX_TOTAL;

    let priorityScore: number | null = null;
    let confidenceStatus: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_EVIDENCE' = 'INSUFFICIENT_EVIDENCE';

    // Critical missing data rule: if risk score is missing or total available weight is 0
    if (needNorm !== null && availableWeight > 0) {
      const pointsSum = (needPoints ?? 0) + (impactPoints ?? 0) + (costEffPoints ?? 0);
      // Proportional rescaling formula: Math.round((pointsSum / availableWeight) * 100)
      priorityScore = Math.round((pointsSum / availableWeight) * 100);
      priorityScore = Math.max(0, Math.min(100, priorityScore));

      if (completeness === 1.0) {
        confidenceStatus = 'HIGH';
      } else if (completeness >= 0.5) {
        confidenceStatus = 'MODERATE';
      } else {
        confidenceStatus = 'LOW';
      }
    } else {
      priorityScore = null;
      confidenceStatus = 'INSUFFICIENT_EVIDENCE';
    }

    const priorityBand = getPriorityBandForScore(priorityScore);
    const activeZoneId = zone.zoneId || zone.id || 'UNKNOWN_ZONE';
    const activeWardName = zone.wardName || zone.zoneName || zone.name || activeZoneId;

    // Breakdown construction
    const breakdown: PrioritizationBreakdown = {
      needComponent: {
        weight: PRIORITIZATION_WEIGHTS.NEED,
        rawInput: riskTotal,
        normalizedValue: needNorm,
        obtainedScore: needPoints !== null ? Math.round(needPoints) : null,
        isMissing: needNorm === null
      },
      impactComponent: {
        weight: PRIORITIZATION_WEIGHTS.IMPACT,
        rawInput: rawImpactTemp,
        normalizedValue: impactNorm,
        obtainedScore: impactPoints !== null ? Math.round(impactPoints) : null,
        isMissing: impactNorm === null
      },
      costEfficiencyComponent: {
        weight: PRIORITIZATION_WEIGHTS.COST_EFFICIENCY,
        rawInputRatio: rawCostEffRatio,
        normalizedValue: costEffNorm,
        obtainedScore: costEffPoints !== null ? Math.round(costEffPoints) : null,
        isMissing: costEffNorm === null
      }
    };

    // Explanation generation
    const explanation = this.generatePrioritizationExplanation(
      activeWardName,
      priorityScore,
      priorityBand,
      riskTotal,
      primaryRec,
      missingFields,
      availableWeight
    );

    return {
      zoneId: activeZoneId,
      wardName: activeWardName,
      riskScore,
      riskBand: riskScore.riskTier,

      recommendationCategory: primaryRec?.category ?? null,
      interventionId: primaryRec?.interventionId ?? null,
      interventionName: primaryRec?.interventionName ?? null,
      recommendedIntervention: primaryRec,

      indicativeCost: primaryRec?.cost?.amountInINR ?? null,
      costUnit: primaryRec?.costUnit ?? 'INR',
      costStatus: primaryRec?.costStatus ?? 'INDICATIVE_ESTIMATE',
      costProvenance: primaryRec?.cost?.provenance ?? null,

      indicativeImpact: primaryRec?.impact?.expectedTempReductionCelsius ?? null,
      impactUnit: primaryRec?.impactUnit ?? '°C reduction',
      impactStatus: primaryRec?.impactStatus ?? 'INDICATIVE_ESTIMATE',
      impactProvenance: primaryRec?.impact?.provenance ?? null,

      needScore: needPoints !== null ? Math.round(needPoints) : null,
      impactScore: impactPoints !== null ? Math.round(impactPoints) : null,
      costEfficiencyScore: costEffPoints !== null ? Math.round(costEffPoints) : null,
      priorityScore,
      rank: null, // Populated during multi-zone ranking
      priorityBand,

      availableWeight,
      completeness,
      confidenceStatus,
      missingFields,
      explanation,
      assumptions: primaryRec?.assumptions ?? [
        'Prioritization score is a relative municipal planning metric based on available indicators.',
        'Costs and impacts are indicative estimates for demonstration.'
      ],
      breakdown,
      calculationBasis: PRIORITIZATION_CALCULATION_BASIS,
      disclaimer: PRIORITIZATION_DISCLAIMER_NOTICE,
      timestamp: new Date().toISOString()
    };
  }

  prioritizeMultipleZones(zones: WardZone[]): PrioritizationResult {
    const unranked: InterventionPriority[] = zones.map(zone => this.prioritizeZone(zone));

    const validPriorities: InterventionPriority[] = [];
    const insufficientEvidencePriorities: InterventionPriority[] = [];

    unranked.forEach(item => {
      if (item.priorityScore !== null) {
        validPriorities.push(item);
      } else {
        insufficientEvidencePriorities.push(item);
      }
    });

    // Deterministic Sort Order:
    // 1. Priority Score descending
    // 2. Risk Score total descending
    // 3. Zone ID ascending
    validPriorities.sort((a, b) => {
      if (b.priorityScore! !== a.priorityScore!) {
        return b.priorityScore! - a.priorityScore!;
      }
      const aRisk = a.riskScore?.totalScore ?? 0;
      const bRisk = b.riskScore?.totalScore ?? 0;
      if (bRisk !== aRisk) {
        return bRisk - aRisk;
      }
      return a.zoneId.localeCompare(b.zoneId);
    });

    // Assign 1-indexed ranks to valid items
    validPriorities.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Keep insufficient evidence items unranked (rank = null)
    insufficientEvidencePriorities.forEach(item => {
      item.rank = null;
    });

    return {
      rankedPriorities: validPriorities,
      unrankedInsufficientEvidence: insufficientEvidencePriorities,
      totalEvaluatedCount: zones.length,
      timestamp: new Date().toISOString()
    };
  }

  // --- Explanation Generator ---

  private generatePrioritizationExplanation(
    wardName: string,
    priorityScore: number | null,
    priorityBand: string,
    riskTotal: number | null,
    primaryRec: RecommendedIntervention | null,
    missingFields: string[],
    availableWeight: number
  ): string {
    if (priorityScore === null || riskTotal === null) {
      return `Insufficient risk or indicator data to establish a relative planning priority score for ${wardName}.`;
    }

    const recName = primaryRec?.interventionName ?? 'targeted cooling action';
    const sentences: string[] = [];

    sentences.push(`${wardName} assigned a relative planning Priority Score of ${priorityScore}/100 [${priorityBand}], recommending ${recName}.`);

    if (missingFields.length === 0) {
      sentences.push(`High risk urgency (${riskTotal}/100) combined with available indicative cost and impact estimates contributes to a higher relative planning priority.`);
    } else {
      const missingNames = missingFields.map(f => {
        if (f === 'INDICATIVE_COST') return 'indicative cost';
        if (f === 'INDICATIVE_IMPACT') return 'indicative impact';
        return f.toLowerCase();
      }).join(' and ');
      sentences.push(`Relative priority calculated using available risk and evidence indicators (available weight: ${availableWeight}/100). ${missingNames.charAt(0).toUpperCase() + missingNames.slice(1)} data is unavailable.`);
    }

    return sentences.join(' ');
  }
}

export const respirePrioritizationEngine = new RespirePrioritizationEngine();
