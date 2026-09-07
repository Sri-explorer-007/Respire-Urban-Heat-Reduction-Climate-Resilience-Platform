/**
 * RESPIRE Risk Scoring Engine Constants & Risk Band Configurations
 * LOCKED SCORING MODEL:
 * Heat Exposure (50%) + Vegetation Deficit (20%) + Social Vulnerability (30%) = 100%
 */

export const COMPONENT_WEIGHTS = {
  HEAT: 50,
  VEGETATION: 20,
  VULNERABILITY: 30,
  MAX_TOTAL: 100,
} as const;

export type RiskTier = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'INSUFFICIENT_EVIDENCE';

export interface RiskBand {
  tier: RiskTier;
  minScore: number;
  maxScore: number;
  label: string;
  description: string;
}

/**
 * Deterministic Risk Tier Boundaries
 * 0 - 24   -> LOW
 * 25 - 49  -> MODERATE
 * 50 - 74  -> HIGH
 * 75 - 100 -> VERY_HIGH
 */
export const RISK_BANDS: Record<RiskTier, RiskBand> = {
  LOW: {
    tier: 'LOW',
    minScore: 0,
    maxScore: 24,
    label: 'Low Risk',
    description: 'Baseline heat resilience with adequate canopy cover and low social vulnerability.'
  },
  MODERATE: {
    tier: 'MODERATE',
    minScore: 25,
    maxScore: 49,
    label: 'Moderate Risk',
    description: 'Elevated urban heat or localized vegetation deficits requiring monitoring.'
  },
  HIGH: {
    tier: 'HIGH',
    minScore: 50,
    maxScore: 74,
    label: 'High Risk',
    description: 'Significant thermal exposure combined with vegetation deficit or social vulnerability.'
  },
  VERY_HIGH: {
    tier: 'VERY_HIGH',
    minScore: 75,
    maxScore: 100,
    label: 'Very High / Critical Risk',
    description: 'Severe heat island exposure, extreme canopy deficit, and highly vulnerable population.'
  },
  INSUFFICIENT_EVIDENCE: {
    tier: 'INSUFFICIENT_EVIDENCE',
    minScore: -1,
    maxScore: -1,
    label: 'Insufficient Evidence',
    description: 'Incomplete satellite or environmental indicator data. Cannot determine risk band.'
  }
};

export function getRiskTierForScore(score: number): RiskTier {
  const rounded = Math.round(score);
  if (rounded >= 75) return 'VERY_HIGH';
  if (rounded >= 50) return 'HIGH';
  if (rounded >= 25) return 'MODERATE';
  return 'LOW';
}

export type ScoringComponentTag = 'HEAT_EXPOSURE' | 'VEGETATION_DEFICIT' | 'SOCIAL_VULNERABILITY';
export type ScoreConfidenceLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_EVIDENCE';
