import React from 'react';
import { WardZone } from '../../core/types/zone';
import { ZoneRiskScore } from '../../core/types/scoring';
import { ScoreBreakdown } from './ScoreBreakdown';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SelectedZonePanelProps {
  zone: WardZone | null;
  riskScore: ZoneRiskScore | null;
}

export const SelectedZonePanel: React.FC<SelectedZonePanelProps> = ({ zone, riskScore }) => {
  if (!zone) {
    return (
      <div className="zone-panel">
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Info size={36} style={{ marginBottom: '12px' }} />
          <p>Select a ward marker on the map to view risk score breakdown and drivers.</p>
        </div>
      </div>
    );
  }

  const isInsufficient = !riskScore || riskScore.totalScore === null || riskScore.confidence === 'INSUFFICIENT_EVIDENCE';
  const scoreVal = riskScore?.totalScore !== null && riskScore?.totalScore !== undefined ? Math.round(riskScore.totalScore) : null;
  const riskTier = riskScore?.riskTier || 'INSUFFICIENT_EVIDENCE';

  const getBandBadgeClass = (tier: string) => {
    switch (tier) {
      case 'VERY_HIGH': return 'band-very-high';
      case 'HIGH': return 'band-high';
      case 'MODERATE': return 'band-moderate';
      case 'LOW': return 'band-low';
      default: return 'band-insufficient';
    }
  };

  const getBandLabel = (tier: string) => {
    switch (tier) {
      case 'VERY_HIGH': return 'VERY HIGH RISK';
      case 'HIGH': return 'HIGH RISK';
      case 'MODERATE': return 'MODERATE RISK';
      case 'LOW': return 'LOW RISK';
      default: return 'INSUFFICIENT EVIDENCE';
    }
  };

  const activeZoneId = zone.zoneId || zone.id || 'UNKNOWN';
  const activeWardName = zone.wardName || zone.zoneName || zone.name || activeZoneId;
  const districtName = zone.district || 'Chennai Metro';

  return (
    <div className="zone-panel">
      {/* Header */}
      <div className="zone-panel-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="zone-name">{activeWardName}</h2>
            <div className="zone-meta">{activeZoneId} &bull; {districtName}</div>
          </div>
          {zone.heat?.provenance && (
            <ProvenanceBadge status={zone.heat.provenance.status} />
          )}
        </div>
      </div>

      {/* Main Score Display */}
      <div className="score-display-card">
        <div className="score-number-group">
          <span className="score-label">Priority Risk Score</span>
          <div className="score-value" style={{ 
            color: isInsufficient ? '#94A3B8' : scoreVal! >= 75 ? '#EF4444' : scoreVal! >= 50 ? '#F97316' : scoreVal! >= 25 ? '#EAB308' : '#10B981',
            fontSize: isInsufficient ? '1.25rem' : '2.25rem'
          }}>
            {isInsufficient ? 'Insufficient Evidence' : `${scoreVal}/100`}
          </div>
        </div>

        <div className={`risk-band-badge ${getBandBadgeClass(riskTier)}`}>
          {getBandLabel(riskTier)}
        </div>
      </div>

      {/* Completeness / Confidence Bar */}
      {riskScore && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-elevated)', padding: '6px 12px', borderRadius: '4px' }}>
          <span>Data Completeness: <strong>{Math.round((riskScore.completeness ?? 1) * 100)}%</strong></span>
          <span>Confidence: <strong style={{ color: riskScore.confidence === 'HIGH' ? '#10B981' : riskScore.confidence === 'MODERATE' ? '#EAB308' : '#F97316' }}>{riskScore.confidence}</strong></span>
        </div>
      )}

      {/* Component Breakdown */}
      <ScoreBreakdown riskScore={riskScore} />

      {/* Why This Zone? */}
      <div className="why-zone-card">
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isInsufficient ? <AlertTriangle size={14} color="#EAB308" /> : <CheckCircle2 size={14} color="#3B82F6" />}
          <span>Why This Zone?</span>
        </div>

        {riskScore?.primaryDriver && (
          <div className="driver-pill-group">
            <div className="driver-pill">
              <strong>Primary:</strong> {riskScore.primaryDriver}
            </div>
            {riskScore?.secondaryDriver && (
              <div className="driver-pill" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', borderColor: 'rgba(234, 179, 8, 0.3)', color: '#FBBF24' }}>
                <strong>Secondary:</strong> {riskScore.secondaryDriver}
              </div>
            )}
          </div>
        )}

        <p className="why-zone-explanation">
          "{riskScore?.explanation}"
        </p>
      </div>
    </div>
  );
};
