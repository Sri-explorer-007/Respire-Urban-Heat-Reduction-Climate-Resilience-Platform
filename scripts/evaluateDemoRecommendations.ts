import { DEMO_CHENNAI_ZONES } from '../src/data/demo/chennaiDemoData';
import { RespireRecommendationEngine } from '../src/core/services/recommendations/recommendationEngine';
import { RespireScoringEngine } from '../src/core/services/scoring/scoringEngine';

const scoringEngine = new RespireScoringEngine();
const recEngine = new RespireRecommendationEngine();

console.log('========================================================================================================');
console.log('RESPIRE DEMO DATASET INTERVENTION RECOMMENDATIONS EVALUATION (Illustrative Demo Data)');
console.log('========================================================================================================\n');

const tableData = DEMO_CHENNAI_ZONES.map(zone => {
  const riskScore = scoringEngine.calculateZoneRisk(zone);
  const recResult = recEngine.evaluateZone(zone, riskScore);

  const primaryName = recResult.primaryRecommendation?.interventionName || 'NO CONFIDENT RECOMMENDATION';
  const secondaryNames = recResult.secondaryRecommendations.map(r => r.interventionName).join('; ') || 'None';
  const missingText = recResult.missingEvidence.length > 0 ? recResult.missingEvidence.join(', ') : 'None';

  return {
    'Zone Name': zone.wardName,
    'Score': riskScore.totalScore !== null ? `${riskScore.totalScore}/100` : 'NULL',
    'Risk Tier': riskScore.riskTier,
    'Primary Recommendation': primaryName,
    'Secondary Recommendations': secondaryNames,
    'Missing Evidence': missingText,
    'Confidence': recResult.confidenceLevel
  };
});

console.table(tableData);

console.log('\n========================================================================================================');
console.log('EXPLAINABILITY EXAMPLES — "WHY THIS ACTION?"');
console.log('========================================================================================================\n');

// Show 3 distinct examples
const exampleZones = [
  { index: 0, title: 'Example 1: High Heat + High Worker Exposure + Vegetation Deficit' }, // Vyasarpadi
  { index: 1, title: 'Example 2: High Heat + High Built Environment Density' }, // T. Nagar
  { index: 9, title: 'Example 3: Missing Indicator Data Edge Case' } // Sholinganallur
];

exampleZones.forEach(ex => {
  const zone = DEMO_CHENNAI_ZONES[ex.index];
  const risk = scoringEngine.calculateZoneRisk(zone);
  const rec = recEngine.evaluateZone(zone, risk);

  console.log(`--- ${ex.title} ---`);
  console.log(`Ward: ${zone.wardName} (${zone.zoneId})`);
  console.log(`Priority Score: ${risk.totalScore !== null ? `${risk.totalScore}/100` : 'NULL'} [${risk.riskTier}]`);
  console.log(`Primary Recommended Action: ${rec.primaryRecommendation?.interventionName || 'None'}`);
  console.log(`Category: ${rec.primaryRecommendation?.category || 'N/A'}`);
  console.log(`Matched Conditions:`);
  if (rec.primaryRecommendation?.applicabilityConditions) {
    rec.primaryRecommendation.applicabilityConditions.forEach(c => console.log(`  ✓ ${c}`));
  } else {
    console.log('  ✗ Insufficient matched conditions');
  }
  console.log(`Reason / Rationale:\n"${rec.primaryRecommendation?.explanation || rec.explanation}"`);
  console.log(`Indicative Cost: INR ${rec.primaryRecommendation?.cost.amountInINR?.toLocaleString() || 'N/A'} (${rec.primaryRecommendation?.cost.costStatus || 'N/A'})`);
  console.log(`Indicative Impact: ${rec.primaryRecommendation?.impact.expectedTempReductionCelsius || 'N/A'} ${rec.primaryRecommendation?.impact.impactUnit} (${rec.primaryRecommendation?.impact.impactStatus || 'N/A'})`);
  console.log('--------------------------------------------------------------------------------------------------------\n');
});
