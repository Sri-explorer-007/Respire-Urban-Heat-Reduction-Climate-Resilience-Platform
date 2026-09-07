import React from 'react';
import { WardZone } from '../../core/types/zone';
import { ZoneRiskScore } from '../../core/types/scoring';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { Database, CheckCircle2, XCircle } from 'lucide-react';

interface DataQualityPanelProps {
  zone: WardZone;
  riskScore: ZoneRiskScore;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({ zone: _zone, riskScore }) => {
  const { breakdown, missingComponents, completeness, confidence, provenance } = riskScore;
  const completenessPct = Math.round(completeness * 100);

  const availableIndicators: string[] = [];
  const missingIndicatorsList: string[] = [];

  if (!breakdown.heatExposure.isMissing && breakdown.heatExposure.normalizedInput !== null) {
    availableIndicators.push(`Heat Exposure (LST normalized: ${breakdown.heatExposure.normalizedInput.toFixed(2)})`);
  } else {
    missingIndicatorsList.push('Heat Exposure (Satellite LST data missing or obstructed)');
  }

  if (!breakdown.vegetationDeficit.isMissing && breakdown.vegetationDeficit.normalizedInput !== null) {
    availableIndicators.push(`Vegetation Deficit (NDVI deficit: ${breakdown.vegetationDeficit.normalizedInput.toFixed(2)})`);
  } else {
    missingIndicatorsList.push('Vegetation Canopy Deficit (Satellite NDVI data missing or obstructed)');
  }

  if (!breakdown.socialVulnerability.isMissing && breakdown.socialVulnerability.normalizedInput !== null) {
    availableIndicators.push(`Social Vulnerability (Census index: ${breakdown.socialVulnerability.normalizedInput.toFixed(2)})`);
  } else {
    missingIndicatorsList.push('Social Vulnerability Index (Census demographic data missing)');
  }

  const getConfidenceBadgeColor = (level: string) => {
    switch (level) {
      case 'HIGH': return '#10B981';
      case 'MODERATE': return '#EAB308';
      case 'LOW': return '#F97316';
      default: return '#94A3B8';
    }
  };

  return (
    <div className="data-quality-card">
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Database size={16} color="#3B82F6" />
        <span>Data Quality & Indicator Provenance</span>
      </div>

      <div className="data-quality-grid">
        {/* Quality Metrics Header */}
        <div className="quality-metric-box">
          <span className="quality-metric-label">Data Completeness</span>
          <span className="quality-metric-value">{completenessPct}%</span>
          <div className="quality-progress-track">
            <div 
              className="quality-progress-fill" 
              style={{ width: `${completenessPct}%`, backgroundColor: completenessPct >= 100 ? '#10B981' : completenessPct >= 50 ? '#EAB308' : '#F97316' }} 
            />
          </div>
        </div>

        <div className="quality-metric-box">
          <span className="quality-metric-label">Confidence Assessment</span>
          <span className="quality-metric-value" style={{ color: getConfidenceBadgeColor(confidence) }}>
            {confidence.replace(/_/g, ' ')}
          </span>
          <span className="quality-metric-subtitle">
            {missingComponents.length === 0 ? 'Full evidence dataset' : `${missingComponents.length} component(s) missing`}
          </span>
        </div>
      </div>

      {/* Indicator Breakdown Lists */}
      <div className="indicator-provenance-group" style={{ marginTop: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h4 className="indicator-group-title" style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} /> Available Indicators ({availableIndicators.length})
          </h4>
          {availableIndicators.length > 0 ? (
            <ul className="indicator-list">
              {availableIndicators.map((ind, idx) => (
                <li key={idx}>{ind}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 20px' }}>No indicators available for this zone.</p>
          )}
        </div>

        <div>
          <h4 className="indicator-group-title" style={{ color: missingIndicatorsList.length > 0 ? '#F97316' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {missingIndicatorsList.length > 0 ? <XCircle size={14} /> : <CheckCircle2 size={14} color="#64748B" />}
            Missing Indicators ({missingIndicatorsList.length})
          </h4>
          {missingIndicatorsList.length > 0 ? (
            <ul className="indicator-list missing">
              {missingIndicatorsList.map((ind, idx) => (
                <li key={idx}>{ind}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 20px' }}>None &mdash; All 3 scoring indicators present.</p>
          )}
        </div>
      </div>

      {/* Provenance Footnote */}
      <div className="provenance-footer" style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--bg-surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <div style={{ color: 'var(--text-secondary)' }}>
          <span>Source: <strong>{provenance.sourceName}</strong></span>
        </div>
        <ProvenanceBadge status={provenance.status} />
      </div>
    </div>
  );
};
