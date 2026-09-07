import { WardZone } from '../../types/zone';
import { ZoneRiskScore } from '../../types/scoring';
import { 
  ZoneRecommendationResult, 
  RecommendationEngineContract, 
  RuleEvaluationResult 
} from '../../types/recommendation';
import { RecommendedIntervention } from '../../types/intervention';
import { 
  RECOMMENDATION_THRESHOLDS, 
  RECOMMENDATION_RULES, 
  INTERVENTION_TEMPLATES 
} from './recommendationConstants';
import { respireScoringEngine } from '../scoring/scoringEngine';

/**
 * RESPIRE Explainable Intervention Recommendation Engine
 * 
 * Explicit, rule-based, decision-support engine.
 * 
 * Pure, deterministic, and completely decoupled from UI / Browser APIs.
 */
export class RespireRecommendationEngine implements RecommendationEngineContract {
  
  evaluateZone(zone: WardZone, providedRiskScore?: ZoneRiskScore): ZoneRecommendationResult {
    // 1. Reuse existing risk scoring result (or compute if not provided)
    const riskScore = providedRiskScore || respireScoringEngine.calculateZoneRisk(zone);

    // 2. Extract normalized indicators (preserving nulls)
    const heatNorm = this.extractHeatNorm(zone);
    const vegDeficitNorm = this.extractVegDeficitNorm(zone);
    const outdoorWorker = this.extractOutdoorWorker(zone);
    const builtEnv = this.extractBuiltEnv(zone);

    // 3. Track missing evidence
    const missingEvidence: string[] = [];
    if (heatNorm === null) missingEvidence.push('HEAT_EXPOSURE');
    if (vegDeficitNorm === null) missingEvidence.push('VEGETATION_DEFICIT');
    if (outdoorWorker === null) missingEvidence.push('OUTDOOR_WORKER_EXPOSURE');
    if (builtEnv === null) missingEvidence.push('BUILT_ENVIRONMENT_DENSITY');

    // 4. Evaluate each rule deterministically
    const ruleEvaluations: RuleEvaluationResult[] = [];
    const matchedInterventions: Array<{ intervention: RecommendedIntervention; priorityRank: number }> = [];

    // Rule 1: Shaded Cooling & Outdoor Worker Rest Area
    const r1 = this.evalRule1(zone, heatNorm, outdoorWorker);
    ruleEvaluations.push(r1.evaluation);
    if (r1.matchedIntervention) {
      matchedInterventions.push({ intervention: r1.matchedIntervention, priorityRank: RECOMMENDATION_RULES.RULE_SHADED_COOLING_REST_AREA.priorityRank });
    }

    // Rule 2: Cool Roof Reflective Coating
    const r2 = this.evalRule2(zone, heatNorm, builtEnv);
    ruleEvaluations.push(r2.evaluation);
    if (r2.matchedIntervention) {
      matchedInterventions.push({ intervention: r2.matchedIntervention, priorityRank: RECOMMENDATION_RULES.RULE_COOL_ROOF_INTERVENTION.priorityRank });
    }

    // Rule 3: Targeted Shade / Tree Planting
    const r3 = this.evalRule3(zone, heatNorm, vegDeficitNorm);
    ruleEvaluations.push(r3.evaluation);
    if (r3.matchedIntervention) {
      matchedInterventions.push({ intervention: r3.matchedIntervention, priorityRank: RECOMMENDATION_RULES.RULE_TARGETED_SHADE_TREE_PLANTING.priorityRank });
    }

    // Rule 4: Urban Greening & Pocket Parks
    const r4 = this.evalRule4(zone, heatNorm, vegDeficitNorm);
    ruleEvaluations.push(r4.evaluation);
    if (r4.matchedIntervention) {
      matchedInterventions.push({ intervention: r4.matchedIntervention, priorityRank: RECOMMENDATION_RULES.RULE_TARGETED_GREENING.priorityRank });
    }

    // Sort matched rules by priority rank (1 = highest priority)
    matchedInterventions.sort((a, b) => a.priorityRank - b.priorityRank);

    const matchedRules = ruleEvaluations.filter(r => r.matched);
    const recommendedInterventions = matchedInterventions.map(m => m.intervention);

    const primaryRecommendation = recommendedInterventions.length > 0 ? recommendedInterventions[0] : null;
    const secondaryRecommendations = recommendedInterventions.length > 1 ? recommendedInterventions.slice(1) : [];

    const status = recommendedInterventions.length > 0 ? 'RECOMMENDATIONS_FOUND' : 'NO_CONFIDENT_RECOMMENDATION';
    const confidenceLevel = riskScore.confidence === 'HIGH' ? 'HIGH' : riskScore.confidence === 'MODERATE' ? 'MODERATE' : riskScore.confidence === 'LOW' ? 'LOW' : 'INSUFFICIENT_DATA';

    const activeZoneId = zone.zoneId || zone.id || 'UNKNOWN_ZONE';
    const activeWardName = zone.wardName || zone.zoneName || zone.name || activeZoneId;

    // Generate human-readable "Why this action?" summary
    const explanation = this.generateActionExplanation(activeWardName, primaryRecommendation, missingEvidence, matchedRules);

    return {
      zoneId: activeZoneId,
      wardName: activeWardName,
      riskScore,
      status,
      primaryRecommendation,
      secondaryRecommendations,
      recommendedInterventions,
      ruleEvaluations,
      matchedRules,
      confidenceLevel,
      missingEvidence,
      explanation,
      timestamp: new Date().toISOString()
    };
  }

  // --- Individual Rule Evaluators ---

  private evalRule1(
    zone: WardZone,
    heatNorm: number | null,
    outdoorWorker: number | null
  ): { evaluation: RuleEvaluationResult; matchedIntervention?: RecommendedIntervention } {
    const rule = RECOMMENDATION_RULES.RULE_SHADED_COOLING_REST_AREA;
    const missing: string[] = [];
    if (heatNorm === null) missing.push('heat');
    if (outdoorWorker === null) missing.push('outdoorWorkerExposure');

    if (missing.length > 0) {
      return {
        evaluation: {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          matched: false,
          priorityRank: rule.priorityRank,
          rationale: `Rule skipped: Required indicator(s) missing (${missing.join(', ')}).`,
          missingIndicators: missing
        }
      };
    }

    const matched = heatNorm! >= RECOMMENDATION_THRESHOLDS.HIGH_HEAT && outdoorWorker! >= RECOMMENDATION_THRESHOLDS.HIGH_OUTDOOR_WORKER;
    const activeZoneId = zone.zoneId || zone.id || 'UNKNOWN_ZONE';

    if (!matched) {
      return {
        evaluation: {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          matched: false,
          priorityRank: rule.priorityRank,
          rationale: `Thresholds not met: Heat severity (${Math.round(heatNorm! * 100)}%) or Outdoor Worker Exposure (${Math.round(outdoorWorker! * 100)}%) below required thresholds.`,
          missingIndicators: []
        }
      };
    }

    const rationale = `Recommended because high heat exposure (${Math.round(heatNorm! * 100)}% severity) coincides with elevated outdoor-worker exposure (${Math.round(outdoorWorker! * 100)}%).`;
    const template = INTERVENTION_TEMPLATES.OUTDOOR_WORKER_SHADE_SHELTER;

    const intervention: RecommendedIntervention = {
      interventionId: `${template.id}-${activeZoneId}`,
      interventionName: template.name,
      category: template.category,
      description: template.shortDescription,
      targetZoneId: activeZoneId,
      priority: rule.defaultPriorityLevel,
      applicabilityConditions: [
        `High Heat Exposure (Normalized: ${heatNorm?.toFixed(2)})`,
        `High Outdoor Worker Exposure (Ratio: ${outdoorWorker?.toFixed(2)})`
      ],
      cost: {
        amountInINR: template.costINRPerSqKm,
        costCategory: 'CAPEX',
        unitBasis: template.costUnit,
        costUnit: template.costUnit,
        costStatus: 'INDICATIVE_ESTIMATE',
        provenance: {
          status: 'INDICATIVE_ESTIMATE',
          sourceName: 'RESPIRE Planning Benchmark Catalogue',
          isDemoData: true,
          notes: 'Indicative Planning Estimate for Hackathon Demonstration'
        }
      },
      costUnit: template.costUnit,
      costStatus: 'INDICATIVE_ESTIMATE',
      impact: {
        expectedTempReductionCelsius: template.impactTempReduction,
        expectedBeneficiariesCount: 4500,
        impactUnit: template.impactUnit,
        coBenefits: template.coBenefits,
        impactStatus: 'INDICATIVE_ESTIMATE',
        provenance: {
          status: 'INDICATIVE_ESTIMATE',
          sourceName: 'RESPIRE Indicative Planning Catalogue (Illustrative Demo Data)',
          isDemoData: true,
          notes: 'Indicative Planning Estimate (Not a Guaranteed Scientific Claim)'
        }
      },
      impactUnit: template.impactUnit,
      impactStatus: 'INDICATIVE_ESTIMATE',
      assumptions: [
        'Assumes shaded shelter hubs placed near major transit & market hubs',
        'Cost is an indicative planning estimate'
      ],
      evidenceStatus: {
        status: 'INDICATIVE_ESTIMATE',
        sourceName: 'Rule-Based Decision Engine',
        isDemoData: true
      },
      // Legacy aliases
      id: template.id,
      title: template.name,
      type: 'OUTDOOR_WORKER_SHADE_SHELTER',
      shortDescription: template.shortDescription,
      triggerRulesMatched: [rule.ruleId],
      explanation: rationale
    };

    return {
      evaluation: {
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        matched: true,
        priorityRank: rule.priorityRank,
        rationale,
        missingIndicators: []
      },
      matchedIntervention: intervention
    };
  }

  private evalRule2(
    zone: WardZone,
    heatNorm: number | null,
    builtEnv: number | null
  ): { evaluation: RuleEvaluationResult; matchedIntervention?: RecommendedIntervention } {
    const rule = RECOMMENDATION_RULES.RULE_COOL_ROOF_INTERVENTION;
    const missing: string[] = [];
    if (heatNorm === null) missing.push('heat');
    if (builtEnv === null) missing.push('builtEnvironment');

    if (missing.length > 0) {
      return {
        evaluation: {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          matched: false,
          priorityRank: rule.priorityRank,
          rationale: `Rule skipped: Required indicator(s) missing (${missing.join(', ')}).`,
          missingIndicators: missing
        }
      };
    }

    const matched = heatNorm! >= RECOMMENDATION_THRESHOLDS.HIGH_HEAT && builtEnv! >= RECOMMENDATION_THRESHOLDS.HIGH_BUILT_ENVIRONMENT;
    const activeZoneId = zone.zoneId || zone.id || 'UNKNOWN_ZONE';

    if (!matched) {
      return {
        evaluation: {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          matched: false,
          priorityRank: rule.priorityRank,
          rationale: `Thresholds not met: Heat severity (${Math.round(heatNorm! * 100)}%) or Built Environment Density (${Math.round(builtEnv! * 100)}%) below required thresholds.`,
          missingIndicators: []
        }
      };
    }

    const rationale = `Recommended because high heat exposure (${Math.round(heatNorm! * 100)}% severity) occurs in a dense built environment (${Math.round(builtEnv! * 100)}% impervious/built index).`;
    const template = INTERVENTION_TEMPLATES.COOL_ROOF_INSTALLATION;

    const intervention: RecommendedIntervention = {
      interventionId: `${template.id}-${activeZoneId}`,
      interventionName: template.name,
      category: template.category,
      description: template.shortDescription,
      targetZoneId: activeZoneId,
      priority: rule.defaultPriorityLevel,
      applicabilityConditions: [
        `High Heat Exposure (Normalized: ${heatNorm?.toFixed(2)})`,
        `High Built Environment Density (Ratio: ${builtEnv?.toFixed(2)})`
      ],
      cost: {
        amountInINR: template.costINRPerSqKm,
        costCategory: 'CAPEX',
        unitBasis: template.costUnit,
        costUnit: template.costUnit,
        costStatus: 'INDICATIVE_ESTIMATE',
        provenance: {
          status: 'INDICATIVE_ESTIMATE',
          sourceName: 'RESPIRE Planning Benchmark Catalogue',
          isDemoData: true,
          notes: 'Indicative Planning Estimate for Hackathon Demonstration'
        }
      },
      costUnit: template.costUnit,
      costStatus: 'INDICATIVE_ESTIMATE',
      impact: {
        expectedTempReductionCelsius: template.impactTempReduction,
        expectedBeneficiariesCount: 8200,
        impactUnit: template.impactUnit,
        coBenefits: template.coBenefits,
        impactStatus: 'INDICATIVE_ESTIMATE',
        provenance: {
          status: 'INDICATIVE_ESTIMATE',
          sourceName: 'RESPIRE Indicative Planning Catalogue (Illustrative Demo Data)',
          isDemoData: true,
          notes: 'Indicative Planning Estimate (Not a Guaranteed Scientific Claim)'
        }
      },
      impactUnit: template.impactUnit,
      impactStatus: 'INDICATIVE_ESTIMATE',
      assumptions: [
        'Assumes 70%+ roof area adoption across targeted ward structures',
        'Cost is an indicative planning estimate'
      ],
      evidenceStatus: {
        status: 'INDICATIVE_ESTIMATE',
        sourceName: 'Rule-Based Decision Engine',
        isDemoData: true
      },
      id: template.id,
      title: template.name,
      type: 'COOL_ROOF_INSTALLATION',
      shortDescription: template.shortDescription,
      triggerRulesMatched: [rule.ruleId],
      explanation: rationale
    };

    return {
      evaluation: {
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        matched: true,
        priorityRank: rule.priorityRank,
        rationale,
        missingIndicators: []
      },
      matchedIntervention: intervention
    };
  }

  private evalRule3(
    zone: WardZone,
    heatNorm: number | null,
    vegDeficitNorm: number | null
  ): { evaluation: RuleEvaluationResult; matchedIntervention?: RecommendedIntervention } {
    const rule = RECOMMENDATION_RULES.RULE_TARGETED_SHADE_TREE_PLANTING;
    const missing: string[] = [];
    if (heatNorm === null) missing.push('heat');
    if (vegDeficitNorm === null) missing.push('vegetationDeficit');

    if (missing.length > 0) {
      return {
        evaluation: {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          matched: false,
          priorityRank: rule.priorityRank,
          rationale: `Rule skipped: Required indicator(s) missing (${missing.join(', ')}).`,
          missingIndicators: missing
        }
      };
    }

    const matched = heatNorm! >= RECOMMENDATION_THRESHOLDS.HIGH_HEAT && vegDeficitNorm! >= RECOMMENDATION_THRESHOLDS.HIGH_VEGETATION_DEFICIT;
    const activeZoneId = zone.zoneId || zone.id || 'UNKNOWN_ZONE';

    if (!matched) {
      return {
        evaluation: {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          matched: false,
          priorityRank: rule.priorityRank,
          rationale: `Thresholds not met: Heat severity (${Math.round(heatNorm! * 100)}%) or Vegetation Deficit (${Math.round(vegDeficitNorm! * 100)}%) below required thresholds.`,
          missingIndicators: []
        }
      };
    }

    const rationale = `Recommended because the zone has high heat exposure (${Math.round(heatNorm! * 100)}% severity) combined with a significant vegetation canopy deficit (${Math.round(vegDeficitNorm! * 100)}%).`;
    const template = INTERVENTION_TEMPLATES.TARGETED_TREE_PLANTING;

    const intervention: RecommendedIntervention = {
      interventionId: `${template.id}-${activeZoneId}`,
      interventionName: template.name,
      category: template.category,
      description: template.shortDescription,
      targetZoneId: activeZoneId,
      priority: rule.defaultPriorityLevel,
      applicabilityConditions: [
        `High Heat Exposure (Normalized: ${heatNorm?.toFixed(2)})`,
        `High Vegetation Deficit (Normalized: ${vegDeficitNorm?.toFixed(2)})`
      ],
      cost: {
        amountInINR: template.costINRPerSqKm,
        costCategory: 'CAPEX',
        unitBasis: template.costUnit,
        costUnit: template.costUnit,
        costStatus: 'INDICATIVE_ESTIMATE',
        provenance: {
          status: 'INDICATIVE_ESTIMATE',
          sourceName: 'RESPIRE Planning Benchmark Catalogue',
          isDemoData: true,
          notes: 'Indicative Planning Estimate for Hackathon Demonstration'
        }
      },
      costUnit: template.costUnit,
      costStatus: 'INDICATIVE_ESTIMATE',
      impact: {
        expectedTempReductionCelsius: template.impactTempReduction,
        expectedBeneficiariesCount: 12000,
        impactUnit: template.impactUnit,
        coBenefits: template.coBenefits,
        impactStatus: 'INDICATIVE_ESTIMATE',
        provenance: {
          status: 'INDICATIVE_ESTIMATE',
          sourceName: 'RESPIRE Indicative Planning Catalogue (Illustrative Demo Data)',
          isDemoData: true,
          notes: 'Indicative Planning Estimate (Not a Guaranteed Scientific Claim)'
        }
      },
      impactUnit: template.impactUnit,
      impactStatus: 'INDICATIVE_ESTIMATE',
      assumptions: [
        'Assumes 3-5 year growth period to achieve mature canopy shade relief',
        'Cost is an indicative planning estimate'
      ],
      evidenceStatus: {
        status: 'INDICATIVE_ESTIMATE',
        sourceName: 'Rule-Based Decision Engine',
        isDemoData: true
      },
      id: template.id,
      title: template.name,
      type: 'TARGETED_TREE_PLANTING',
      shortDescription: template.shortDescription,
      triggerRulesMatched: [rule.ruleId],
      explanation: rationale
    };

    return {
      evaluation: {
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        matched: true,
        priorityRank: rule.priorityRank,
        rationale,
        missingIndicators: []
      },
      matchedIntervention: intervention
    };
  }

  private evalRule4(
    zone: WardZone,
    heatNorm: number | null,
    vegDeficitNorm: number | null
  ): { evaluation: RuleEvaluationResult; matchedIntervention?: RecommendedIntervention } {
    const rule = RECOMMENDATION_RULES.RULE_TARGETED_GREENING;
    const missing: string[] = [];
    if (heatNorm === null) missing.push('heat');
    if (vegDeficitNorm === null) missing.push('vegetationDeficit');

    if (missing.length > 0) {
      return {
        evaluation: {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          matched: false,
          priorityRank: rule.priorityRank,
          rationale: `Rule skipped: Required indicator(s) missing (${missing.join(', ')}).`,
          missingIndicators: missing
        }
      };
    }

    const matched = heatNorm! >= RECOMMENDATION_THRESHOLDS.MODERATE_HEAT && vegDeficitNorm! >= RECOMMENDATION_THRESHOLDS.MODERATE_VEGETATION_DEFICIT;
    const activeZoneId = zone.zoneId || zone.id || 'UNKNOWN_ZONE';

    if (!matched) {
      return {
        evaluation: {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          matched: false,
          priorityRank: rule.priorityRank,
          rationale: `Thresholds not met: Moderate Heat severity (${Math.round(heatNorm! * 100)}%) or Vegetation Deficit (${Math.round(vegDeficitNorm! * 100)}%) below required thresholds.`,
          missingIndicators: []
        }
      };
    }

    const rationale = `Recommended because moderate-to-high heat exposure (${Math.round(heatNorm! * 100)}% severity) aligns with a moderate vegetation deficit (${Math.round(vegDeficitNorm! * 100)}%).`;
    const template = INTERVENTION_TEMPLATES.URBAN_GREENING_CORRIDOR;

    const intervention: RecommendedIntervention = {
      interventionId: `${template.id}-${activeZoneId}`,
      interventionName: template.name,
      category: template.category,
      description: template.shortDescription,
      targetZoneId: activeZoneId,
      priority: rule.defaultPriorityLevel,
      applicabilityConditions: [
        `Moderate Heat Exposure (Normalized: ${heatNorm?.toFixed(2)})`,
        `Moderate Vegetation Deficit (Normalized: ${vegDeficitNorm?.toFixed(2)})`
      ],
      cost: {
        amountInINR: template.costINRPerSqKm,
        costCategory: 'CAPEX',
        unitBasis: template.costUnit,
        costUnit: template.costUnit,
        costStatus: 'INDICATIVE_ESTIMATE',
        provenance: {
          status: 'INDICATIVE_ESTIMATE',
          sourceName: 'RESPIRE Planning Benchmark Catalogue',
          isDemoData: true,
          notes: 'Indicative Planning Estimate for Hackathon Demonstration'
        }
      },
      costUnit: template.costUnit,
      costStatus: 'INDICATIVE_ESTIMATE',
      impact: {
        expectedTempReductionCelsius: template.impactTempReduction,
        expectedBeneficiariesCount: 6500,
        impactUnit: template.impactUnit,
        coBenefits: template.coBenefits,
        impactStatus: 'INDICATIVE_ESTIMATE',
        provenance: {
          status: 'INDICATIVE_ESTIMATE',
          sourceName: 'RESPIRE Indicative Planning Catalogue (Illustrative Demo Data)',
          isDemoData: true,
          notes: 'Indicative Planning Estimate (Not a Guaranteed Scientific Claim)'
        }
      },
      impactUnit: template.impactUnit,
      impactStatus: 'INDICATIVE_ESTIMATE',
      assumptions: [
        'Assumes municipal land availability for green linear corridors',
        'Cost is an indicative planning estimate'
      ],
      evidenceStatus: {
        status: 'INDICATIVE_ESTIMATE',
        sourceName: 'Rule-Based Decision Engine',
        isDemoData: true
      },
      id: template.id,
      title: template.name,
      type: 'URBAN_GREENING_CORRIDOR',
      shortDescription: template.shortDescription,
      triggerRulesMatched: [rule.ruleId],
      explanation: rationale
    };

    return {
      evaluation: {
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        matched: true,
        priorityRank: rule.priorityRank,
        rationale,
        missingIndicators: []
      },
      matchedIntervention: intervention
    };
  }

  // --- Extractor Helpers (Null-Preserving) ---

  private extractHeatNorm(zone: WardZone): number | null {
    if (!zone.heat) return null;
    if (zone.heat.lstNormalized !== undefined && zone.heat.lstNormalized !== null) return zone.heat.lstNormalized;
    if (zone.heat.lst !== undefined && zone.heat.lst !== null) return Math.min(1.0, Math.max(0.0, (zone.heat.lst - 25) / 20));
    return null;
  }

  private extractVegDeficitNorm(zone: WardZone): number | null {
    if (!zone.vegetation) return null;
    if (zone.vegetation.vegetationDeficitNormalized !== undefined && zone.vegetation.vegetationDeficitNormalized !== null) return zone.vegetation.vegetationDeficitNormalized;
    if (zone.vegetation.ndvi !== undefined && zone.vegetation.ndvi !== null) {
      const ndviNorm = (zone.vegetation.ndvi + 1.0) / 2.0;
      return Math.min(1.0, Math.max(0.0, 1.0 - ndviNorm));
    }
    return null;
  }

  private extractOutdoorWorker(zone: WardZone): number | null {
    if (zone.vulnerability?.vulnerabilityComponents?.outdoorWorkerExposure !== undefined && zone.vulnerability?.vulnerabilityComponents?.outdoorWorkerExposure !== null) {
      return zone.vulnerability.vulnerabilityComponents.outdoorWorkerExposure;
    }
    if (zone.population?.outdoorWorkerExposureRatio !== undefined && zone.population?.outdoorWorkerExposureRatio !== null) {
      return zone.population.outdoorWorkerExposureRatio;
    }
    return null;
  }

  private extractBuiltEnv(zone: WardZone): number | null {
    if (zone.builtEnvironment?.imperviousSurfaceRatio !== undefined && zone.builtEnvironment?.imperviousSurfaceRatio !== null) {
      return zone.builtEnvironment.imperviousSurfaceRatio;
    }
    if (zone.vulnerability?.vulnerabilityComponents?.informalSettlementIndicator !== undefined && zone.vulnerability?.vulnerabilityComponents?.informalSettlementIndicator !== null) {
      return zone.vulnerability.vulnerabilityComponents.informalSettlementIndicator;
    }
    return null;
  }

  private generateActionExplanation(
    wardName: string,
    primaryRec: RecommendedIntervention | null,
    missingEvidence: string[],
    matchedRules: RuleEvaluationResult[]
  ): string {
    if (!primaryRec) {
      if (missingEvidence.length > 0) {
        return `No confident intervention recommendation available for ${wardName}. Insufficient indicator data (${missingEvidence.join(', ')}) to satisfy rule conditions.`;
      }
      return `No confident intervention recommendation available for ${wardName}. Environmental indicators do not exceed action thresholds.`;
    }

    const recName = primaryRec.interventionName || primaryRec.title || 'Targeted intervention';
    const mainReason = primaryRec.explanation || primaryRec.description;

    let explanationText = `${recName} is recommended as the primary action for ${wardName}. ${mainReason}`;

    if (matchedRules.length > 1) {
      const secondaryNames = matchedRules.slice(1).map(r => r.ruleName).join(', ');
      explanationText += ` Additional secondary actions identified: ${secondaryNames}.`;
    }

    return explanationText;
  }
}

export const respireRecommendationEngine = new RespireRecommendationEngine();
