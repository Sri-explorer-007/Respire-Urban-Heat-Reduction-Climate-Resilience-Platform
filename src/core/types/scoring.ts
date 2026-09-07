import { WardZone } from './zone';
import { DataProvenance } from './data-provenance';
import { RiskTier, ScoreConfidenceLevel, ScoringComponentTag } from '../services/scoring/scoringConstants';

/**
 * RESPIRE Risk Scoring Contract
 * Heat Exposure (50%) + Vegetation Deficit (20%) + Social Vulnerability (30%) = 100%
 */

export interface NormalizedScoringInputs {
  heatExposureNorm: number | null; // 0.0 - 1.0 (nullable)
  vegetationDeficitNorm: number | null; // 0.0 - 1.0 (nullable)
  socialVulnerabilityNorm: number | null; // 0.0 - 1.0 (nullable)
}

export interface ComponentScoreBreakdown {
  componentTag: ScoringComponentTag;
  name: string;
  maxWeight: number; // e.g. 50 for heat, 20 for veg, 30 for vuln
  obtainedScore: number | null; // Raw component score before missing-data rescaling
  rescaledScore: number | null; // Rescaled score contribution on 100-pt scale
  normalizedInput: number | null; // 0.0 - 1.0
  isMissing: boolean;
  explanation: string;
}

export interface RiskScoreBreakdown {
  heatExposure: ComponentScoreBreakdown;
  vegetationDeficit: ComponentScoreBreakdown;
  socialVulnerability: ComponentScoreBreakdown;
}

export interface ZoneRiskScore {
  zoneId: string;
  wardName: string;
  totalScore: number | null; // 0 - 100 (null if completely missing data)
  riskTier: RiskTier;
  riskLevel: RiskTier; // Alias for riskTier
  
  // Individual component points
  heatScore: number | null; // max 50 pts (or null)
  vegetationScore: number | null; // max 20 pts (or null)
  vulnerabilityScore: number | null; // max 30 pts (or null)

  // Assigned component weights
  heatWeight: number; // 50
  vegetationWeight: number; // 20
  vulnerabilityWeight: number; // 30
  availableWeight: number; // Sum of available component weights (e.g. 100 or 50)

  // Missing data tracking & confidence
  missingComponents: ScoringComponentTag[];
  confidence: ScoreConfidenceLevel;
  completeness: number; // 0.0 to 1.0

  // Explainability & Drivers
  primaryDriver: string | null;
  secondaryDriver: string | null;
  explanation: string;

  breakdown: RiskScoreBreakdown;
  provenance: DataProvenance;
  timestamp: string;
}

export interface ScoringEngineContract {
  calculateZoneRisk(zone: WardZone): ZoneRiskScore;
}
