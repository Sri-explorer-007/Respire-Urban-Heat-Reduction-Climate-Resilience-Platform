import { describe, it, expect } from 'vitest';
import { DEMO_CHENNAI_ZONES } from '../../../data/demo/chennaiDemoData';
import { respireScoringEngine } from '../../../core/services/scoring/scoringEngine';
import { respireRecommendationEngine } from '../../../core/services/recommendations/recommendationEngine';
import { respirePrioritizationEngine } from '../../../core/services/prioritization/prioritizationEngine';
import { respireWorkspaceService } from '../../../core/services/data/workspaceService';
import { parseWardZoneCSV, getCSVTemplateContent } from '../../../core/services/data/csvParser';
import { WardZone } from '../../../core/types/zone';

describe('RESPIRE Judge Attack Validation Suite', () => {
  const zones = DEMO_CHENNAI_ZONES;

  // ==========================================
  // SECTION A: DATA INTEGRITY & PROVENANCE
  // ==========================================
  describe('A. Data Integrity & Provenance', () => {
    it('1. should verify demo dataset is explicitly flagged as illustrative demo data', () => {
      const meta = respireWorkspaceService.getActiveMetadata();
      expect(meta.isDemo).toBe(true);
      expect(meta.sourceLabel).toBe('Illustrative Demo Data');
      expect(meta.name).toBe('Chennai Heat Assessment');
    });

    it('2. should verify CSV template generation works and contains all required headers', () => {
      const template = getCSVTemplateContent();
      expect(template).toContain('zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability');
    });

    it('3. should handle invalid coordinates and flag as validation error', () => {
      const invalidCsv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
ZONE-INV-01,Test Ward,WARD-01,District A,999.0,-999.0,0.85,0.70,0.60`;
      const result = parseWardZoneCSV(invalidCsv);
      expect(result.totalErrors).toBeGreaterThan(0);
      expect(result.invalidRowCount).toBe(1);
    });

    it('4. should handle missing zoneId by auto-generating fallback ID to preserve ingestion resilience', () => {
      const missingFieldCsv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
,Test Ward,WARD-01,District A,13.0,80.2,0.85,0.70,0.60`;
      const result = parseWardZoneCSV(missingFieldCsv);
      expect(result.zones[0].zoneId).toBe('ZONE-UPLOAD-1');
      expect(result.zones[0].wardName).toBe('Test Ward');
    });

    it('5. should detect duplicate zone IDs in CSV', () => {
      const dupCsv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
ZONE-DUP,Ward 1,WARD-01,District A,13.0,80.2,0.85,0.70,0.60
ZONE-DUP,Ward 2,WARD-02,District A,13.1,80.3,0.75,0.60,0.50`;
      const result = parseWardZoneCSV(dupCsv);
      expect(result.totalErrors).toBeGreaterThan(0);
      const dupIssue = result.validationResults[1].issues.find(i => i.field === 'zoneId' && i.message.includes('Duplicate'));
      expect(dupIssue).toBeDefined();
    });

    it('6. should strictly preserve missing values as null and never convert to 0', () => {
      const missingValsCsv = `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability
ZONE-NULL,Missing Val Ward,WARD-NULL,District B,13.0,80.2,null,N/A,`;
      const result = parseWardZoneCSV(missingValsCsv);
      expect(result.zones[0].heat.lstNormalized).toBeNull();
      expect(result.zones[0].vegetation.vegetationDeficitNormalized).toBeNull();
      expect(result.zones[0].vulnerability.vulnerabilityScore).toBeNull();
    });
  });

  // ==========================================
  // SECTION B: RISK SCORING & FORMULA FIDELITY
  // ==========================================
  describe('B. Risk Scoring & Formula Fidelity', () => {
    it('7. should compute risk score strictly as Heat(50%) + Veg(20%) + Vuln(30%)', () => {
      const vyasarpadi = zones.find(z => z.wardId === 'WARD-045')!;
      const score = respireScoringEngine.calculateZoneRisk(vyasarpadi);

      expect(score.totalScore).toBe(88);
      expect(score.riskTier).toBe('VERY_HIGH');

      const b = score.breakdown;
      const sum = b.heatExposure.obtainedScore! + b.vegetationDeficit.obtainedScore! + b.socialVulnerability.obtainedScore!;
      expect(Math.round(sum)).toBe(88);
    });

    it('8. should match exact expected values for all 10 demo Chennai zones', () => {
      const expected = [
        { ward: 'Vyasarpadi', score: 88, tier: 'VERY_HIGH' },
        { ward: 'Washermanpet', score: 86, tier: 'VERY_HIGH' },
        { ward: 'Royapuram', score: 82, tier: 'VERY_HIGH' },
        { ward: 'T. Nagar', score: 81, tier: 'VERY_HIGH' },
        { ward: 'Ambattur', score: 77, tier: 'VERY_HIGH' },
        { ward: 'Velachery', score: 73, tier: 'HIGH' },
        { ward: 'Kodambakkam', score: 63, tier: 'HIGH' },
        { ward: 'Mylapore', score: 62, tier: 'HIGH' },
        { ward: 'Adyar', score: 42, tier: 'MODERATE' },
        { ward: 'Sholinganallur', score: null, tier: 'INSUFFICIENT_EVIDENCE' }
      ];

      expected.forEach(exp => {
        const zone = zones.find(z => z.wardName.includes(exp.ward))!;
        expect(zone, `Zone for ${exp.ward} must exist`).toBeDefined();
        const score = respireScoringEngine.calculateZoneRisk(zone);
        expect(score.totalScore).toBe(exp.score);
        expect(score.riskTier).toBe(exp.tier);
      });
    });

    it('9. should ensure an insufficient zone NEVER receives a score or rank', () => {
      const sholinganallur = zones.find(z => z.wardId === 'WARD-198')!;
      const score = respireScoringEngine.calculateZoneRisk(sholinganallur);
      expect(score.totalScore).toBeNull();
      expect(score.riskTier).toBe('INSUFFICIENT_EVIDENCE');

      const rec = respireRecommendationEngine.evaluateZone(sholinganallur, score);
      const prio = respirePrioritizationEngine.prioritizeZone(sholinganallur, score, rec);
      expect(prio.rank).toBeNull();
      expect(prio.priorityScore).toBeNull();
    });
  });

  // ==========================================
  // SECTION C: RECOMMENDATIONS & RULE ENGINE
  // ==========================================
  describe('C. Recommendations & Rule Traceability', () => {
    it('10. should trigger exact rule for Vyasarpadi', () => {
      const vyasarpadi = zones.find(z => z.wardId === 'WARD-045')!;
      const score = respireScoringEngine.calculateZoneRisk(vyasarpadi);
      const rec = respireRecommendationEngine.evaluateZone(vyasarpadi, score);

      expect(rec.status).toBe('RECOMMENDATIONS_FOUND');
      expect(rec.primaryRecommendation).toBeDefined();
      expect(rec.primaryRecommendation?.interventionName).toBe('Shaded Cooling & Worker Rest Shelters');
      expect(rec.ruleEvaluations.length).toBeGreaterThan(0);
      const matchedRule = rec.ruleEvaluations.find(r => r.matched);
      expect(matchedRule).toBeDefined();
    });

    it('11. should return NO_CONFIDENT_RECOMMENDATION for Sholinganallur', () => {
      const sholinganallur = zones.find(z => z.wardId === 'WARD-198')!;
      const rec = respireRecommendationEngine.evaluateZone(sholinganallur);
      expect(rec.status).toBe('NO_CONFIDENT_RECOMMENDATION');
      expect(rec.primaryRecommendation).toBeNull();
      expect(rec.recommendedInterventions).toHaveLength(0);
      expect(rec.missingEvidence).toContain('HEAT_EXPOSURE');
      expect(rec.missingEvidence).toContain('VEGETATION_DEFICIT');
    });
  });

  // ==========================================
  // SECTION D: PRIORITIZATION & CAPITAL FUNDING
  // ==========================================
  describe('D. Prioritization & Capital Funding', () => {
    it('12. should produce exact expected ranks for Chennai demo', () => {
      const result = respirePrioritizationEngine.prioritizeMultipleZones(zones);
      expect(result.rankedPriorities).toHaveLength(9);
      expect(result.unrankedInsufficientEvidence).toHaveLength(1);

      const expectedRanks = [
        { rank: 1, ward: 'Vyasarpadi' },
        { rank: 2, ward: 'Washermanpet' },
        { rank: 3, ward: 'Royapuram' },
        { rank: 4, ward: 'T. Nagar' },
        { rank: 5, ward: 'Ambattur' },
        { rank: 6, ward: 'Velachery' },
        { rank: 7, ward: 'Kodambakkam' },
        { rank: 8, ward: 'Mylapore' },
        { rank: 9, ward: 'Adyar' }
      ];

      expectedRanks.forEach(exp => {
        const item = result.rankedPriorities[exp.rank - 1];
        expect(item.rank).toBe(exp.rank);
        expect(item.wardName).toContain(exp.ward);
        expect(item.priorityScore).toBeGreaterThan(0);
      });

      expect(result.unrankedInsufficientEvidence[0].wardName).toContain('Sholinganallur');
      expect(result.unrankedInsufficientEvidence[0].rank).toBeNull();
      expect(result.unrankedInsufficientEvidence[0].priorityScore).toBeNull();
    });

    it('13. should calculate prioritization score from Need(50%) + Impact(30%) + CostEfficiency(20%)', () => {
      const result = respirePrioritizationEngine.prioritizeMultipleZones(zones);
      const item = result.rankedPriorities[0]; // Vyasarpadi
      const b = item.breakdown;

      expect(b.needComponent.weight).toBe(50);
      expect(b.impactComponent.weight).toBe(30);
      expect(b.costEfficiencyComponent.weight).toBe(20);

      const sum = (b.needComponent.obtainedScore || 0) + (b.impactComponent.obtainedScore || 0) + (b.costEfficiencyComponent.obtainedScore || 0);
      expect(Math.round(sum)).toBe(item.priorityScore);
    });
  });

  // ==========================================
  // SECTION E: DATASET SWITCHING & ISOLATION
  // ==========================================
  describe('E. Dataset Switching & Isolation', () => {
    it('14. should cleanly switch from demo to custom dataset and restore demo cleanly', () => {
      const customZones: WardZone[] = [
        {
          zoneId: 'ZONE-CUST-001',
          zoneName: 'Custom Ward North',
          wardName: 'Custom Ward North',
          wardId: 'WARD-CUST-01',
          district: 'Custom City',
          latitude: 15.1,
          longitude: 75.2,
          heat: { lst: 42, lstNormalized: 0.9, provenance: { status: 'SOURCED', isDemoData: false } },
          vegetation: { ndvi: 0.1, vegetationDeficitNormalized: 0.8, provenance: { status: 'SOURCED', isDemoData: false } },
          vulnerability: { vulnerabilityScore: 0.7, vulnerabilityComponents: { populationDensity: 20000, elderlyPopulation: 0.15, informalSettlementIndicator: 0.3, outdoorWorkerExposure: 0.4 }, provenance: { status: 'SOURCED', isDemoData: false } }
        }
      ];

      respireWorkspaceService.loadCustomDataset(customZones, 'Custom North City', 'custom.csv', 0, 0);
      expect(respireWorkspaceService.isDemoDatasetActive()).toBe(false);
      expect(respireWorkspaceService.getActiveZones()).toHaveLength(1);
      expect(respireWorkspaceService.getActiveMetadata().name).toBe('Custom North City');

      // Check scoring on custom dataset
      const scoredCustom = respireScoringEngine.calculateZoneRisk(respireWorkspaceService.getActiveZones()[0]);
      expect(scoredCustom.totalScore).toBeGreaterThan(75);

      // Restore demo dataset
      respireWorkspaceService.useDemoDataset();
      expect(respireWorkspaceService.isDemoDatasetActive()).toBe(true);
      expect(respireWorkspaceService.getActiveZones()).toHaveLength(10);
      expect(respireWorkspaceService.getActiveMetadata().name).toBe('Chennai Heat Assessment');
    });
  });

  // ==========================================
  // SECTION F: EMPTY & ERROR STATE DEFENSE
  // ==========================================
  describe('F. Empty & Error State Defense', () => {
    it('15. should handle empty zone array in scoring engine gracefully without crashing', () => {
      const scored = [].map(z => respireScoringEngine.calculateZoneRisk(z));
      expect(scored).toHaveLength(0);
    });

    it('16. should handle empty zone array in prioritization engine gracefully without crashing', () => {
      const result = respirePrioritizationEngine.prioritizeMultipleZones([]);
      expect(result.rankedPriorities).toHaveLength(0);
      expect(result.unrankedInsufficientEvidence).toHaveLength(0);
      expect(result.totalEvaluatedCount).toBe(0);
    });

    it('17. should handle all zones insufficient gracefully in prioritization engine', () => {
      const insufficientZones: WardZone[] = [
        {
          zoneId: 'ZONE-INSUFF-01',
          zoneName: 'Insuff Ward 1',
          wardName: 'Insuff Ward 1',
          wardId: 'WARD-INSUFF-01',
          district: 'City',
          latitude: 13.0,
          longitude: 80.2,
          heat: { lst: null, lstNormalized: null, provenance: { status: 'ASSUMPTION', isDemoData: false } },
          vegetation: { ndvi: null, vegetationDeficitNormalized: null, provenance: { status: 'ASSUMPTION', isDemoData: false } },
          vulnerability: { vulnerabilityScore: 0.5, vulnerabilityComponents: { populationDensity: null, elderlyPopulation: null, informalSettlementIndicator: null, outdoorWorkerExposure: null }, provenance: { status: 'SOURCED', isDemoData: false } }
        }
      ];

      const result = respirePrioritizationEngine.prioritizeMultipleZones(insufficientZones);
      expect(result.rankedPriorities).toHaveLength(0);
      expect(result.unrankedInsufficientEvidence).toHaveLength(1);
    });
  });
});
