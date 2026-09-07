import React from 'react';
import { ZoneRiskScore } from '../../core/types/scoring';

interface ScoreBreakdownProps {
  riskScore: ZoneRiskScore | null;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ riskScore }) => {
  if (!riskScore) {
    return (
      <div className="breakdown-section">
        <div className="section-title">Risk Component Breakdown</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No scoring breakdown available.</p>
      </div>
    );
  }

  const { breakdown } = riskScore;

  const components = [
    {
      key: 'heat',
      title: 'Heat Exposure',
      weight: '50%',
      item: breakdown.heatExposure,
      color: '#EF4444'
    },
    {
      key: 'vegetation',
      title: 'Vegetation Deficit',
      weight: '20%',
      item: breakdown.vegetationDeficit,
      color: '#F97316'
    },
    {
      key: 'vulnerability',
      title: 'Social Vulnerability',
      weight: '30%',
      item: breakdown.socialVulnerability,
      color: '#EAB308'
    }
  ];

  return (
    <div className="breakdown-section">
      <div className="section-title">Risk Component Breakdown</div>

      {components.map(({ key, title, weight, item, color }) => {
        const isMissing = item.isMissing || item.normalizedInput === null;
        const normVal = item.normalizedInput;
        const points = item.obtainedScore;
        const maxWeightNum = parseInt(weight, 10);

        return (
          <div key={key} className="breakdown-item">
            <div className="breakdown-item-header">
              <span className="breakdown-item-title">{title} ({weight})</span>
              <span>
                {isMissing ? (
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Unavailable</span>
                ) : (
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {normVal?.toFixed(2)} ({points}/{maxWeightNum} pts)
                  </span>
                )}
              </span>
            </div>

            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ 
                  width: isMissing ? '0%' : `${Math.min(100, (normVal || 0) * 100)}%`, 
                  backgroundColor: isMissing ? '#64748B' : color 
                }} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
