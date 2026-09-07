import { DEMO_CHENNAI_ZONES } from '../src/data/demo/chennaiDemoData';
import { RespireScoringEngine } from '../src/core/services/scoring/scoringEngine';

const engine = new RespireScoringEngine();

console.log('========================================================================================================');
console.log('RESPIRE DEMO DATASET SCORING ENGINE EVALUATION (Illustrative Demo Data)');
console.log('========================================================================================================\n');

const tableData = DEMO_CHENNAI_ZONES.map(zone => {
  const result = engine.calculateZoneRisk(zone);
  return {
    'Zone Name': result.wardName,
    'Score': result.totalScore !== null ? `${result.totalScore}/100` : 'NULL',
    'Risk Tier': result.riskTier,
    'Heat (50)': result.heatScore !== null ? `${result.heatScore}` : 'N/A',
    'Veg (20)': result.vegetationScore !== null ? `${result.vegetationScore}` : 'N/A',
    'Vuln (30)': result.vulnerabilityScore !== null ? `${result.vulnerabilityScore}` : 'N/A',
    'Missing Data': result.missingComponents.length > 0 ? result.missingComponents.join(', ') : 'None',
    'Primary Driver': result.primaryDriver || 'N/A'
  };
});

console.table(tableData);

console.log('\n========================================================================================================');
console.log('SAMPLE GENERATED "WHY THIS ZONE?" EXPLANATION:');
console.log('========================================================================================================');
const sampleZone = DEMO_CHENNAI_ZONES[0]; // Vyasarpadi
const sampleResult = engine.calculateZoneRisk(sampleZone);
console.log(`Zone: ${sampleResult.wardName}`);
console.log(`Score: ${sampleResult.totalScore}/100 [${sampleResult.riskTier}]`);
console.log(`Primary Driver: ${sampleResult.primaryDriver}`);
console.log(`Secondary Driver: ${sampleResult.secondaryDriver}`);
console.log(`Generated Explanation:\n"${sampleResult.explanation}"`);
console.log('========================================================================================================\n');
