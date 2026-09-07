import { WardZone } from './zone';
import { ZoneRiskScore } from './scoring';
import { ZoneRecommendationResult } from './recommendation';
import { RecommendedIntervention, InterventionCategory } from './intervention';
import { DataSourceStatus, DataProvenance } from './data-provenance';
import { RiskTier } from '../services/scoring/scoringConstants';
import { PriorityBand } from '../services/prioritization/prioritizationConstants';

export interface PrioritizationBreakdown {
  needComponent: {
    weight: number;
    rawInput: number | null; // Risk Score (0-100)
    normalizedValue: number | null; // 0.0 - 1.0
    obtainedScore: number | null;
    isMissing: boolean;
  };
  impactComponent: {
    weight: number;
    rawInput: number | null; // Expected Temp Reduction (°C)
    normalizedValue: number | null; // 0.0 - 1.0
    obtainedScore: number | null;
    isMissing: boolean;
  };
  costEfficiencyComponent: {
    weight: number;
    rawInputRatio: number | null; // Impact / Cost ratio
    normalizedValue: number | null; // 0.0 - 1.0
    obtainedScore: number | null;
    isMissing: boolean;
  };
}

export interface InterventionPriority {
  zoneId: string;
  wardName: string;
  riskScore: ZoneRiskScore | null;
  riskBand: RiskTier | null;
  
  // Intervention context
  recommendationCategory: InterventionCategory | null;
  interventionId: string | null;
  interventionName: string | null;
  recommendedIntervention: RecommendedIntervention | null;

  // Cost & Impact Provenance
  indicativeCost: number | null;
  costUnit: string;
  costStatus: DataSourceStatus;
  costProvenance: DataProvenance | null;
  
  indicativeImpact: number | null;
  impactUnit: string;
  impactStatus: DataSourceStatus;
  impactProvenance: DataProvenance | null;

  // Prioritization metrics
  needScore: number | null;
  impactScore: number | null;
  costEfficiencyScore: number | null;
  priorityScore: number | null; // 0 - 100
  rank: number | null; // 1 to N for valid priorities
  priorityBand: PriorityBand;
  
  availableWeight: number;
  completeness: number; // 0.0 to 1.0
  confidenceStatus: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_EVIDENCE';
  missingFields: string[];
  explanation: string;
  assumptions: string[];
  breakdown: PrioritizationBreakdown;
  calculationBasis: string;
  disclaimer: string;
  timestamp: string;
}

export interface PrioritizationResult {
  rankedPriorities: InterventionPriority[];
  unrankedInsufficientEvidence: InterventionPriority[];
  totalEvaluatedCount: number;
  timestamp: string;
}

export interface PrioritizationEngineContract {
  prioritizeZone(
    zone: WardZone, 
    riskScore?: ZoneRiskScore, 
    recommendationResult?: ZoneRecommendationResult
  ): InterventionPriority;
  
  prioritizeMultipleZones(zones: WardZone[]): PrioritizationResult;
}
