import React from 'react';

export const RiskLegend: React.FC = () => {
  return (
    <div className="map-legend">
      <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginRight: '8px' }}>Risk Bands:</span>
      
      <div className="legend-item">
        <div className="legend-color-dot" style={{ backgroundColor: '#EF4444' }} />
        <span>VERY HIGH (75-100)</span>
      </div>

      <div className="legend-item">
        <div className="legend-color-dot" style={{ backgroundColor: '#F97316' }} />
        <span>HIGH (50-74)</span>
      </div>

      <div className="legend-item">
        <div className="legend-color-dot" style={{ backgroundColor: '#EAB308' }} />
        <span>MODERATE (25-49)</span>
      </div>

      <div className="legend-item">
        <div className="legend-color-dot" style={{ backgroundColor: '#10B981' }} />
        <span>LOW (0-24)</span>
      </div>

      <div className="legend-item">
        <div className="legend-color-dot" style={{ backgroundColor: '#64748B' }} />
        <span>INSUFFICIENT EVIDENCE</span>
      </div>
    </div>
  );
};
