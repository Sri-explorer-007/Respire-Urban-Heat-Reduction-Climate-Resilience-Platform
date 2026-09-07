import React from 'react';
import { WardZone } from '../../core/types/zone';
import { ZoneRiskScore } from '../../core/types/scoring';
import { AlertTriangle, Flame, ShieldAlert, CheckCircle, HelpCircle } from 'lucide-react';

interface ScoredZoneItem {
  zone: WardZone;
  riskScore: ZoneRiskScore;
}

interface RiskSummaryCardsProps {
  scoredZones: ScoredZoneItem[];
}

export const RiskSummaryCards: React.FC<RiskSummaryCardsProps> = ({ scoredZones }) => {
  const totalCount = scoredZones.length;
  
  let veryHighCount = 0;
  let highCount = 0;
  let moderateCount = 0;
  let lowCount = 0;
  let insufficientCount = 0;

  scoredZones.forEach(({ riskScore }) => {
    const isMissingHeatAndVeg = riskScore.breakdown.heatExposure.isMissing && riskScore.breakdown.vegetationDeficit.isMissing;
    if (riskScore.totalScore === null || isMissingHeatAndVeg || riskScore.confidence === 'INSUFFICIENT_EVIDENCE') {
      insufficientCount++;
    } else {
      const score = Math.round(riskScore.totalScore);
      if (score >= 75) veryHighCount++;
      else if (score >= 50) highCount++;
      else if (score >= 25) moderateCount++;
      else lowCount++;
    }
  });

  return (
    <div className="summary-cards-grid">
      {/* 1. Total Zones */}
      <div className="summary-card summary-card-total">
        <div className="summary-card-header">
          <span>Total Wards Evaluated</span>
          <ShieldAlert size={16} color="#3B82F6" />
        </div>
        <div className="summary-card-value">{totalCount}</div>
        <div className="summary-card-subtitle">Municipal planning zones</div>
      </div>

      {/* 2. Very High Risk */}
      <div className="summary-card summary-card-very-high">
        <div className="summary-card-header">
          <span>Very High Risk</span>
          <Flame size={16} color="#EF4444" />
        </div>
        <div className="summary-card-value" style={{ color: '#EF4444' }}>{veryHighCount}</div>
        <div className="summary-card-subtitle">Priority score &ge; 75/100</div>
      </div>

      {/* 3. High Risk */}
      <div className="summary-card summary-card-high">
        <div className="summary-card-header">
          <span>High Risk</span>
          <AlertTriangle size={16} color="#F97316" />
        </div>
        <div className="summary-card-value" style={{ color: '#F97316' }}>{highCount}</div>
        <div className="summary-card-subtitle">Priority score 50 &ndash; 74/100</div>
      </div>

      {/* 4. Moderate Risk */}
      <div className="summary-card summary-card-moderate">
        <div className="summary-card-header">
          <span>Moderate Risk</span>
          <CheckCircle size={16} color="#EAB308" />
        </div>
        <div className="summary-card-value" style={{ color: '#EAB308' }}>{moderateCount}</div>
        <div className="summary-card-subtitle">Priority score 25 &ndash; 49/100</div>
      </div>

      {/* 5. Insufficient Data */}
      {insufficientCount > 0 && (
        <div className="summary-card" style={{ borderTop: '3px solid #64748B' }}>
          <div className="summary-card-header">
            <span>Insufficient Data</span>
            <HelpCircle size={16} color="#94A3B8" />
          </div>
          <div className="summary-card-value" style={{ color: '#94A3B8' }}>{insufficientCount}</div>
          <div className="summary-card-subtitle">Requires satellite/ground data</div>
        </div>
      )}
    </div>
  );
};
