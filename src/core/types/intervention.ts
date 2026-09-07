import { DataProvenance, DataSourceStatus } from './data-provenance';

export type InterventionCategory = 
  | 'VEGETATION_SHADE'
  | 'BUILT_SURFACE_COOLING'
  | 'SOCIAL_PROTECTION'
  | 'URBAN_GREENING'
  | 'UNSPECIFIED';

export type PriorityLevel = 'P1_URGENT' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';

export interface InterventionCost {
  amountInINR: number | null;
  costCategory: 'CAPEX' | 'OPEX';
  unitBasis: string; // e.g. "per sq km", "per structure"
  costUnit?: string;
  costStatus: DataSourceStatus; // SOURCED or INDICATIVE_ESTIMATE
  provenance: DataProvenance;
}

export interface InterventionImpact {
  expectedTempReductionCelsius: number | null;
  expectedBeneficiariesCount: number | null;
  impactUnit: string; // e.g. "°C reduction", "beneficiaries protected"
  coBenefits: string[];
  impactStatus: DataSourceStatus; // SOURCED, DERIVED, or ASSUMPTION
  provenance: DataProvenance;
}

export interface RecommendedIntervention {
  interventionId: string;
  interventionName: string;
  category: InterventionCategory;
  description: string;
  targetZoneId: string;
  priority: PriorityLevel;
  applicabilityConditions: string[]; // Rule conditions that triggered this
  cost: InterventionCost;
  costUnit: string;
  costStatus: DataSourceStatus;
  impact: InterventionImpact;
  impactUnit: string;
  impactStatus: DataSourceStatus;
  evidenceReference?: string;
  assumptions: string[];
  evidenceStatus: DataProvenance;
  
  // Legacy aliases
  id?: string;
  title?: string;
  type?: string;
  shortDescription?: string;
  triggerRulesMatched?: string[];
  explanation?: string;
}
