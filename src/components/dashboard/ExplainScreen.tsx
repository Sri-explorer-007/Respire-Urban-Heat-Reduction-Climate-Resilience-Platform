import React, { useState, useEffect, useMemo } from 'react';
import { respireApi } from '../../api/respireApi';
import { WardZone } from '../../core/types/zone';
import { ZoneRiskScore } from '../../core/types/scoring';
import { respireScoringEngine } from '../../core/services/scoring/scoringEngine';
import { DataQualityPanel } from './DataQualityPanel';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { AlertCircle, HelpCircle, Layers, Flame, ShieldAlert, BarChart3, MessageSquareText } from 'lucide-react';

interface ScoredZoneItem {
  zone: WardZone;
  riskScore: ZoneRiskScore;
}

interface ExplainScreenProps {
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}

export const ExplainScreen: React.FC<ExplainScreenProps> = ({ selectedZoneId, onSelectZone }) => {
  const [zones, setZones] = useState<WardZone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await respireApi.getWardZones();
      setZones(data);

      if (data.length > 0) {
        if (!selectedZoneId) {
          // Default to Ward 045 (Vyasarpadi - highest valid risk zone)
          const defaultZone = data.find(z => z.wardId === 'WARD-045' || z.zoneId === 'ZONE-CHN-W045') || data[0];
          const defaultId = defaultZone.zoneId || defaultZone.id;
          if (defaultId) onSelectZone(defaultId);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [selectedZoneId, onSelectZone]);

  // Calculate scoring results for all 10 zones deterministically via domain engine
  const scoredZones: ScoredZoneItem[] = useMemo(() => {
    return zones.map(zone => ({
      zone,
      riskScore: respireScoringEngine.calculateZoneRisk(zone)
    }));
  }, [zones]);

  const activeScoredItem = useMemo(() => {
    if (!selectedZoneId) return scoredZones[0] || null;
    return scoredZones.find(item => (item.zone.zoneId || item.zone.id) === selectedZoneId) || scoredZones[0] || null;
  }, [scoredZones, selectedZoneId]);

  if (loading || !activeScoredItem) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading RESPIRE zone explanation & indicator breakdown...
      </div>
    );
  }

  const { zone, riskScore } = activeScoredItem;
  const isInsufficient = riskScore.totalScore === null || riskScore.riskTier === 'INSUFFICIENT_EVIDENCE';
  const scoreVal = riskScore.totalScore !== null ? Math.round(riskScore.totalScore) : null;
  const activeZoneId = zone.zoneId || zone.id || 'UNKNOWN';
  const activeWardName = zone.wardName || zone.zoneName || activeZoneId;
  const districtName = zone.district || 'Chennai Metro';

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

  const { breakdown } = riskScore;
  const components = [
    {
      key: 'heatExposure',
      name: 'Heat Exposure',
      weight: 50,
      item: breakdown.heatExposure,
      color: '#EF4444'
    },
    {
      key: 'vegetationDeficit',
      name: 'Vegetation Deficit',
      weight: 20,
      item: breakdown.vegetationDeficit,
      color: '#F97316'
    },
    {
      key: 'socialVulnerability',
      name: 'Social Vulnerability',
      weight: 30,
      item: breakdown.socialVulnerability,
      color: '#EAB308'
    }
  ];

  return (
    <div className="explain-container">
      {/* Disclosure & Stage Header */}
      <div className="data-disclosure-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color="#F59E0B" />
          <span>
            <strong>Illustrative Demo Data Active</strong> &mdash; Explanations and driver rankings are generated deterministically by the scoring engine.
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>EXPLAIN WORKFLOW STAGE 02</span>
      </div>

      {/* Title & Zone Switcher Bar */}
      <div className="explain-selector-bar">
        <div className="explain-selector-label">
          <Layers size={16} color="#3B82F6" />
          <span>Select Ward/Zone to Explain:</span>
        </div>
        <select 
          className="explain-select-dropdown"
          value={selectedZoneId || activeZoneId}
          onChange={(e) => onSelectZone(e.target.value)}
          aria-label="Select Ward for Risk Explanation"
        >
          {scoredZones.map(({ zone: z, riskScore: rs }) => {
            const id = z.zoneId || z.id;
            const name = z.wardName || z.zoneName;
            const scoreStr = rs.totalScore !== null ? `${Math.round(rs.totalScore)}/100 [${rs.riskTier}]` : 'INSUFFICIENT EVIDENCE';
            return (
              <option key={id} value={id}>
                {name} &mdash; {scoreStr}
              </option>
            );
          })}
        </select>
      </div>

      {/* Main Explain Grid Layout */}
      <div className="explain-grid">
        {/* Left Column: Zone Overview & Driver Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Zone Risk Header Card */}
          <div className="explain-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="zone-name" style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  {activeWardName}
                </h2>
                <div className="zone-meta" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {activeZoneId} &bull; {districtName}
                </div>
              </div>
              {zone.heat?.provenance && (
                <ProvenanceBadge status={zone.heat.provenance.status} />
              )}
            </div>

            {/* Score & Band Badge */}
            <div className="score-display-card" style={{ marginTop: '8px' }}>
              <div className="score-number-group">
                <span className="score-label">Priority Risk Score</span>
                <div className="score-value" style={{ 
                  color: isInsufficient ? '#94A3B8' : scoreVal! >= 75 ? '#EF4444' : scoreVal! >= 50 ? '#F97316' : scoreVal! >= 25 ? '#EAB308' : '#10B981',
                  fontSize: isInsufficient ? '1.25rem' : '2.25rem'
                }}>
                  {isInsufficient ? 'Insufficient Evidence' : `${scoreVal} / 100`}
                </div>
              </div>

              <div className={`risk-band-badge ${getBandBadgeClass(riskScore.riskTier)}`}>
                {getBandLabel(riskScore.riskTier)}
              </div>
            </div>

            {/* Data Completeness Pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-elevated)', padding: '8px 14px', borderRadius: '6px' }}>
              <span>Data Completeness: <strong>{Math.round(riskScore.completeness * 100)}%</strong></span>
              <span>Confidence: <strong style={{ color: riskScore.confidence === 'HIGH' ? '#10B981' : riskScore.confidence === 'MODERATE' ? '#EAB308' : '#F97316' }}>{riskScore.confidence.replace(/_/g, ' ')}</strong></span>
            </div>
          </div>

          {/* Driver Hierarchy Card ("Why This Zone?") */}
          <div className="explain-card">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isInsufficient ? <HelpCircle size={18} color="#EAB308" /> : <Flame size={18} color="#EF4444" />}
              <span>Why This Zone? (Dominant Drivers)</span>
            </div>

            {isInsufficient ? (
              <div style={{ padding: '12px 16px', backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '6px', color: '#FBBF24', fontSize: '0.9rem' }}>
                <strong>Insufficient evidence to determine dominant risk drivers.</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Primary physical indicators (heat island surface temperature and vegetation canopy deficit) are unavailable for this ward.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#EF4444', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                      PRIMARY RISK DRIVER
                    </span>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {riskScore.primaryDriver || 'N/A'}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#FBBF24', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                      SECONDARY RISK DRIVER
                    </span>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {riskScore.secondaryDriver || 'None Identified'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Plain-Language Domain Explanation */}
          <div className="explain-card">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <MessageSquareText size={18} color="#3B82F6" />
              <span>Plain-Language Risk Explanation</span>
            </div>

            <blockquote style={{ 
              margin: 0, 
              padding: '16px', 
              backgroundColor: 'var(--bg-surface-elevated)', 
              borderLeft: '4px solid #3B82F6', 
              borderRadius: '0 6px 6px 0',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)'
            }}>
              "{riskScore.explanation}"
            </blockquote>
          </div>
        </div>

        {/* Right Column: Risk Contribution Breakdown & Data Quality */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Component Contribution Breakdown Card */}
          <div className="explain-card">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <BarChart3 size={18} color="#3B82F6" />
              <span>Risk Contribution Breakdown</span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
              Determined by formula: Heat Exposure (50%) + Vegetation Deficit (20%) + Social Vulnerability (30%) = 100%
            </p>

            <table className="contribution-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Norm Value</th>
                  <th>Weight</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                {components.map(({ key, name, weight, item, color }) => {
                  const isMissing = item.isMissing || item.normalizedInput === null;
                  const normStr = item.normalizedInput !== null ? item.normalizedInput.toFixed(2) : 'Unavailable';
                  const ptsStr = item.obtainedScore !== null ? `${item.obtainedScore.toFixed(1)} / ${weight} pts` : 'Unavailable';

                  return (
                    <tr key={key}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isMissing ? '#64748B' : color }} />
                          {name}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {isMissing ? (
                          <span style={{ color: 'var(--text-muted)' }}>Unavailable</span>
                        ) : (
                          normStr
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {weight}%
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {isMissing ? (
                          <span style={{ color: 'var(--text-muted)' }}>Unavailable</span>
                        ) : (
                          ptsStr
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr className="total-row">
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldAlert size={14} color="#3B82F6" />
                      TOTAL PRIORITY SCORE
                    </div>
                  </td>
                  <td>&mdash;</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>100%</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: isInsufficient ? '#94A3B8' : '#3B82F6' }}>
                    {isInsufficient ? 'Insufficient Evidence' : `${scoreVal} / 100`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Data Quality & Indicator Provenance Panel */}
          <DataQualityPanel zone={zone} riskScore={riskScore} />
        </div>
      </div>
    </div>
  );
};
