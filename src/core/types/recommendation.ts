import { WardZone } from './zone';
import { ZoneRiskScore } from './scoring';
import { RecommendedIntervention } from './intervention';
import { RuleId } from '../services/recommendations/recommendationConstants';

export interface RuleEvaluationResult {
  ruleId: RuleId;
  ruleName: string;
  matched: boolean;
  priorityRank: number;
  rationale: string;
  missingIndicators: string[];
}

export type RecommendationStatus = 'RECOMMENDATIONS_FOUND' | 'NO_CONFIDENT_RECOMMENDATION';

export interface ZoneRecommendationResult {
  zoneId: string;
  wardName: string;
  riskScore: ZoneRiskScore;
  status: RecommendationStatus;
  primaryRecommendation: RecommendedIntervention | null;
  secondaryRecommendations: RecommendedIntervention[];
  recommendedInterventions: RecommendedIntervention[]; // Ordered by rule priority
  ruleEvaluations: RuleEvaluationResult[];
  matchedRules: RuleEvaluationResult[];
  confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA';
  missingEvidence: string[];
  explanation: string; // "Why this action?" overall summary
  timestamp: string;
}

export interface RecommendationEngineContract {
  evaluateZone(zone: WardZone, riskScore?: ZoneRiskScore): ZoneRecommendationResult;
}
