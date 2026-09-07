import { InterventionCategory, PriorityLevel } from '../../types/intervention';

/**
 * RESPIRE Recommendation Engine Decision-Support Thresholds
 * 
 * IMPORTANT:
 * These thresholds are configurable decision-support classification assumptions
 * based on normalized indicator values [0.0 - 1.0].
 * They do NOT represent guaranteed scientific laws.
 */
export const RECOMMENDATION_THRESHOLDS = {
  HIGH_HEAT: 0.70, // lstNormalized >= 0.70
  MODERATE_HEAT: 0.50, // lstNormalized >= 0.50
  HIGH_VEGETATION_DEFICIT: 0.70, // vegetationDeficitNormalized >= 0.70
  MODERATE_VEGETATION_DEFICIT: 0.50, // vegetationDeficitNormalized >= 0.50
  HIGH_OUTDOOR_WORKER: 0.60, // outdoorWorkerExposure >= 0.60
  HIGH_BUILT_ENVIRONMENT: 0.75, // imperviousSurfaceRatio or informalSettlement >= 0.75
} as const;

export type RuleId = 
  | 'RULE_SHADED_COOLING_REST_AREA'
  | 'RULE_COOL_ROOF_INTERVENTION'
  | 'RULE_TARGETED_SHADE_TREE_PLANTING'
  | 'RULE_TARGETED_GREENING';

export interface RecommendationRuleConfig {
  ruleId: RuleId;
  ruleName: string;
  priorityRank: number; // 1 = highest priority
  category: InterventionCategory;
  defaultPriorityLevel: PriorityLevel;
  description: string;
}

/**
 * Deterministic Rule Priority Order
 * 1. High Heat + Outdoor Worker Exposure -> Shaded Cooling / Rest Shelters
 * 2. High Heat + Dense Built Environment -> Cool Roof Treatments
 * 3. High Heat + Vegetation Canopy Deficit -> Targeted Tree Planting & Shade
 * 4. Moderate Heat + Vegetation Canopy Deficit -> Urban Greening Corridors
 */
export const RECOMMENDATION_RULES: Record<RuleId, RecommendationRuleConfig> = {
  RULE_SHADED_COOLING_REST_AREA: {
    ruleId: 'RULE_SHADED_COOLING_REST_AREA',
    ruleName: 'Shaded Cooling & Worker Rest Shelters',
    priorityRank: 1,
    category: 'SOCIAL_PROTECTION',
    defaultPriorityLevel: 'P1_URGENT',
    description: 'High heat exposure in areas with significant outdoor worker density requiring public rest shelters and cooling stations.'
  },
  RULE_COOL_ROOF_INTERVENTION: {
    ruleId: 'RULE_COOL_ROOF_INTERVENTION',
    ruleName: 'Cool Roof Reflective Coating Program',
    priorityRank: 2,
    category: 'BUILT_SURFACE_COOLING',
    defaultPriorityLevel: 'P1_URGENT',
    description: 'High heat exposure in dense, highly impervious built structures suitable for high-albedo solar reflective coatings.'
  },
  RULE_TARGETED_SHADE_TREE_PLANTING: {
    ruleId: 'RULE_TARGETED_SHADE_TREE_PLANTING',
    ruleName: 'Targeted Canopy Shade & Tree Planting',
    priorityRank: 3,
    category: 'VEGETATION_SHADE',
    defaultPriorityLevel: 'P2_HIGH',
    description: 'High heat exposure combined with extreme vegetation canopy deficit requiring urgent tree canopy expansion.'
  },
  RULE_TARGETED_GREENING: {
    ruleId: 'RULE_TARGETED_GREENING',
    ruleName: 'Urban Greening & Pocket Parks',
    priorityRank: 4,
    category: 'URBAN_GREENING',
    defaultPriorityLevel: 'P3_MEDIUM',
    description: 'Moderate heat exposure coinciding with localized canopy deficit suitable for pocket greenery and linear parks.'
  }
};

/**
 * MVP Intervention Catalogue Templates
 * All costs & impacts are explicitly labelled as INDICATIVE ESTIMATES or ASSUMPTIONS per data policy.
 */
export const INTERVENTION_TEMPLATES = {
  TARGETED_TREE_PLANTING: {
    id: 'INT-TREE-001',
    name: 'Targeted Tree Planting & Shade Canopy',
    category: 'VEGETATION_SHADE' as InterventionCategory,
    shortDescription: 'Plant high-canopy indigenous trees along street corridors and public spaces.',
    costINRPerSqKm: 1500000,
    costUnit: 'INR per sq km',
    impactTempReduction: 1.5,
    impactUnit: '°C indicative surface temp reduction',
    coBenefits: ['Air quality improvement', 'Stormwater retention', 'Biodiversity enhancement'],
  },
  COOL_ROOF_INSTALLATION: {
    id: 'INT-COOLROOF-002',
    name: 'Cool Roof Reflective Coating',
    category: 'BUILT_SURFACE_COOLING' as InterventionCategory,
    shortDescription: 'Apply high-albedo solar-reflective thermal coating to roofs in residential and dense zones.',
    costINRPerSqKm: 2200000,
    costUnit: 'INR per sq km of built roof',
    impactTempReduction: 2.1,
    impactUnit: '°C indicative indoor/surface reduction',
    coBenefits: ['Lower indoor temperature', 'Reduced energy load', 'Low cost rapid deployment'],
  },
  OUTDOOR_WORKER_SHADE_SHELTER: {
    id: 'INT-SHELTER-003',
    name: 'Shaded Cooling & Worker Rest Shelters',
    category: 'SOCIAL_PROTECTION' as InterventionCategory,
    shortDescription: 'Construct shaded public shelters equipped with hydration points for outdoor labor.',
    costINRPerSqKm: 850000,
    costUnit: 'INR per shelter hub cluster',
    impactTempReduction: 3.0,
    impactUnit: '°C microclimate shade relief',
    coBenefits: ['Occupational health protection', 'Supports heat-exposure protection', 'Hydration access'],
  },
  URBAN_GREENING_CORRIDOR: {
    id: 'INT-GREENING-004',
    name: 'Urban Greening & Pocket Park Expansion',
    category: 'URBAN_GREENING' as InterventionCategory,
    shortDescription: 'Develop localized urban green corridors, vegetated buffers, and permeable surfaces.',
    costINRPerSqKm: 1200000,
    costUnit: 'INR per greening corridor',
    impactTempReduction: 1.0,
    impactUnit: '°C indicative local temp reduction',
    coBenefits: ['Neighborhood aesthetics', 'Community recreational space', 'Urban biodiversity'],
  }
};
