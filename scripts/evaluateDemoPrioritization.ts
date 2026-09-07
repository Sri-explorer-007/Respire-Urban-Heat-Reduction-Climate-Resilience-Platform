import { DEMO_CHENNAI_ZONES } from '../src/data/demo/chennaiDemoData';
import { RespirePrioritizationEngine } from '../src/core/services/prioritization/prioritizationEngine';
import { PRIORITIZATION_DISCLAIMER_NOTICE } from '../src/core/services/prioritization/prioritizationConstants';

const prioEngine = new RespirePrioritizationEngine();

console.log('========================================================================================================');
console.log('RESPIRE COST + IMPACT PRIORITIZATION ENGINE EVALUATION (Illustrative Demo Data)');
console.log('========================================================================================================');
console.log(`DISCLAIMER NOTICE:\n"${PRIORITIZATION_DISCLAIMER_NOTICE}"`);
console.log('========================================================================================================\n');

// Run full pipeline over demo zones
const prioResult = prioEngine.prioritizeMultipleZones(DEMO_CHENNAI_ZONES);

console.log(`Evaluated ${prioResult.totalEvaluatedCount} Wards | Ranked: ${prioResult.rankedPriorities.length} | Insufficient Evidence: ${prioResult.unrankedInsufficientEvidence.length}\n`);

const tableData = prioResult.rankedPriorities.map(p => ({
  'Rank': `#${p.rank}`,
  'Zone / Ward Name': p.wardName,
  'Risk Score': p.riskScore?.totalScore !== null ? `${p.riskScore?.totalScore}/100 [${p.riskBand}]` : 'NULL',
  'Primary Recommendation': p.interventionName || 'None',
  'Indicative Cost': p.indicativeCost !== null ? `INR ${p.indicativeCost.toLocaleString()} (${p.costStatus})` : 'N/A',
  'Indicative Impact': p.indicativeImpact !== null ? `${p.indicativeImpact} ${p.impactUnit} (${p.impactStatus})` : 'N/A',
  'Priority Score': `${p.priorityScore}/100`,
  'Priority Band': p.priorityBand,
  'Confidence': `${p.confidenceStatus} (${Math.round(p.completeness * 100)}%)`
}));

console.table(tableData);

if (prioResult.unrankedInsufficientEvidence.length > 0) {
  console.log('\n--- UNRANKED ZONES (INSUFFICIENT EVIDENCE) ---');
  prioResult.unrankedInsufficientEvidence.forEach(un => {
    console.log(`- ${un.wardName} (${un.zoneId}): Status = ${un.confidenceStatus}, Missing = [${un.missingFields.join(', ')}]`);
  });
}

console.log('\n========================================================================================================');
console.log('PRIORITIZATION EXPLANATION EXAMPLES — "WHY THIS PRIORITIZATION?"');
console.log('========================================================================================================\n');

// Top 3 Ranked Examples
prioResult.rankedPriorities.slice(0, 3).forEach(p => {
  console.log(`[Rank #${p.rank}] ${p.wardName} (${p.zoneId})`);
  console.log(`Priority Score: ${p.priorityScore}/100 [${p.priorityBand}] | Risk Score: ${p.riskScore?.totalScore}/100 [${p.riskBand}]`);
  console.log(`Recommended Action: ${p.interventionName ?? 'None'} (${p.recommendationCategory})`);
  console.log(`Indicative Cost: ${p.indicativeCost ? `INR ${p.indicativeCost.toLocaleString()}` : 'N/A'} [${p.costStatus}]`);
  console.log(`Indicative Impact: ${p.indicativeImpact ? `${p.indicativeImpact} °C reduction` : 'N/A'} [${p.impactStatus}]`);
  console.log(`Prioritization Breakdown: Need=${p.breakdown.needComponent.obtainedScore}/50, Impact=${p.breakdown.impactComponent.obtainedScore}/30, CostEfficiency=${p.breakdown.costEfficiencyComponent.obtainedScore}/20`);
  console.log(`Calculation Basis: "${p.calculationBasis}"`);
  console.log(`Explanation:\n"${p.explanation}"`);
  console.log('--------------------------------------------------------------------------------------------------------\n');
});
