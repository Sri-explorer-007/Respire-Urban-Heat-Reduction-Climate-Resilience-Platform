import { RiskTier } from '../scoring/scoringConstants';

/**
 * RESPIRE Cost + Impact Prioritization Engine Constants
 * 
 * DISCLAIMER & LIMITATION NOTICE:
 * Impact and cost-efficiency components are illustrative planning estimates derived from 
 * the RESPIRE demo intervention catalogue. They are intended for relative demonstration 
 * prioritization only and are not validated scientific effectiveness or ROI estimates.
 * 
 * Locked Prioritization Weights:
 * Need (Risk Score) = 50%
 * Indicative Impact  = 30%
 * Cost Efficiency    = 20%
 * Total = 100%
 */
export const PRIORITIZATION_WEIGHTS = {
  NEED: 50,
  IMPACT: 30,
  COST_EFFICIENCY: 20,
  MAX_TOTAL: 100,
} as const;

/**
 * RESPIRE Illustrative Intervention Catalogue Normalization Reference
 * Used to normalize raw indicative impact and cost onto [0.0 - 1.0] relative scale.
 * Note: These are internal catalogue scaling ceilings, NOT validated industry/scientific benchmarks.
 */
export const CATALOGUE_NORMALIZATION_REFS = {
  MAX_EXPECTED_TEMP_REDUCTION: 3.0, // °C max in catalogue (e.g., worker shelter 3.0°C)
  MAX_INDICATIVE_COST_INR: 3000000, // 30 Lakhs INR max in catalogue
  MIN_INDICATIVE_COST_INR: 500000,  // 5 Lakhs INR floor to prevent div-by-zero or extreme ratios
} as const;

export const PRIORITIZATION_CALCULATION_BASIS = 
  'Illustrative planning prioritization using indicative intervention cost and impact estimates.';

export const PRIORITIZATION_DISCLAIMER_NOTICE = 
  'Impact and cost-efficiency components are illustrative planning estimates derived from the RESPIRE demo intervention catalogue. They are intended for relative demonstration prioritization only and are not validated scientific effectiveness or ROI estimates.';

export type PriorityBand = RiskTier | 'INSUFFICIENT_EVIDENCE';

export function getPriorityBandForScore(score: number | null): PriorityBand {
  if (score === null || isNaN(score)) return 'INSUFFICIENT_EVIDENCE';
  const rounded = Math.round(score);
  if (rounded >= 75) return 'VERY_HIGH';
  if (rounded >= 50) return 'HIGH';
  if (rounded >= 25) return 'MODERATE';
  return 'LOW';
}
