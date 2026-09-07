import React, { useState, useEffect, useMemo } from 'react';
import { respireApi } from '../../api/respireApi';
import { WardZone } from '../../core/types/zone';
import { PrioritizationResult, InterventionPriority } from '../../core/types/prioritization';
import { respirePrioritizationEngine } from '../../core/services/prioritization/prioritizationEngine';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { AlertCircle, Award, HelpCircle, Layers } from 'lucide-react';

interface PrioritizeScreenProps {
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}

export const PrioritizeScreen: React.FC<PrioritizeScreenProps> = ({ selectedZoneId, onSelectZone }) => {
  const [zones, setZones] = useState<WardZone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await respireApi.getWardZones();
      setZones(data);
      setLoading(false);
    };

    loadData();
  }, []);

  // Compute prioritization results strictly via domain prioritization engine
  const prioritizationResult: PrioritizationResult = useMemo(() => {
    if (zones.length === 0) {
      return {
        rankedPriorities: [],
        unrankedInsufficientEvidence: [],
        totalEvaluatedCount: 0,
        timestamp: new Date().toISOString()
      };
    }
    return respirePrioritizationEngine.prioritizeMultipleZones(zones);
  }, [zones]);

  const { rankedPriorities, unrankedInsufficientEvidence } = prioritizationResult;

  // Active selected ranked priority item (default to #1 ranked candidate)
  const activePriorityItem: InterventionPriority | null = useMemo(() => {
    if (rankedPriorities.length === 0) return null;
    if (!selectedZoneId) return rankedPriorities[0];

    const match = rankedPriorities.find(item => item.zoneId === selectedZoneId);
    return match || rankedPriorities[0];
  }, [rankedPriorities, selectedZoneId]);

  // Calculate total indicative cost across valid ranked candidates (clearly labeled INDICATIVE DEMO TOTAL)
  const totalIndicativeCostINR = useMemo(() => {
    return rankedPriorities.reduce((sum, item) => sum + (item.indicativeCost || 0), 0);
  }, [rankedPriorities]);

  if (loading || rankedPriorities.length === 0) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Evaluating municipal funding priorities & cost-efficiency breakdown...
      </div>
    );
  }

  const activeZoneId = activePriorityItem?.zoneId || 'UNKNOWN';

  const formatCurrencyINR = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getPriorityScoreBadgeClass = (band: string) => {
    switch (band) {
      case 'PRIORITY_VERY_HIGH': return 'prio-very-high';
      case 'PRIORITY_HIGH': return 'prio-high';
      case 'PRIORITY_MODERATE': return 'prio-moderate';
      case 'PRIORITY_LOW': return 'prio-low';
      default: return 'prio-low';
    }
  };

  return (
    <div className="prioritize-container">
      {/* Disclosure Banner & Workflow Stage */}
      <div className="data-disclosure-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color="#F59E0B" />
          <span>
            <strong>Illustrative Demo Data Active</strong> &mdash; Municipal priorities are derived deterministically by the cost + impact prioritization engine.
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>PRIORITIZE WORKFLOW STAGE 04</span>
      </div>

      {/* Indicative Budget & Candidate Summary Bar */}
      <div className="budget-summary-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Award size={22} color="#3B82F6" />
          <div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Municipal Funding Decision Support
            </span>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Relative prioritization based on Need (50%), Impact (30%), and Cost-Efficiency (20%).
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className="budget-metric-group">
            <span className="label">Ranked Candidates</span>
            <span className="value">{rankedPriorities.length} Wards</span>
          </div>

          <div className="budget-metric-group">
            <span className="label">Indicative Demo Total</span>
            <span className="value" style={{ color: '#3B82F6' }}>
              {formatCurrencyINR(totalIndicativeCostINR)}
            </span>
          </div>

          <div className="budget-metric-group">
            <span className="label">Insufficient Data</span>
            <span className="value" style={{ color: '#F97316' }}>
              {unrankedInsufficientEvidence.length} Ward
            </span>
          </div>
        </div>
      </div>

      {/* Main Prioritize Grid */}
      <div className="prioritize-grid">
        {/* Left Column: Municipal Priority Ranking List */}
        <div className="prioritize-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              <Layers size={18} color="#3B82F6" />
              <span>Municipal Funding Priority Ranking</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              1-INDEXED RANK
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            Which cooling intervention should the city fund first? Select a zone to view detailed contribution breakdown.
          </p>

          <div className="ranking-list">
            {rankedPriorities.map((item) => {
              const isSelected = item.zoneId === activeZoneId;

              return (
                <div 
                  key={item.zoneId}
                  className={`ranking-item-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectZone(item.zoneId)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="rank-badge-pill">#{item.rank}</span>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.wardName}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        ({item.zoneId})
                      </span>
                    </div>

                    <span className={`priority-score-pill ${getPriorityScoreBadgeClass(item.priorityBand)}`}>
                      Score: {item.priorityScore} / 100
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#3B82F6' }}>
                    {item.interventionName || 'Targeted Cooling Action'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', paddingTop: '4px', borderTop: '1px dashed var(--bg-surface-border)' }}>
                    <span>Risk Score: <strong>{item.riskScore?.totalScore} / 100</strong> ({item.riskBand?.replace(/_/g, ' ')})</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      Cost: <strong>{formatCurrencyINR(item.indicativeCost)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Zone Funding Detail Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activePriorityItem && (
            <div className="prioritize-card" style={{ border: '2px solid #3B82F6' }}>
              {/* Selected Zone Context Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="rank-badge-pill" style={{ fontSize: '0.95rem', padding: '4px 10px' }}>
                      RANK #{activePriorityItem.rank}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      FUNDING DECISION DETAIL
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
                    {activePriorityItem.wardName}
                  </h2>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {activePriorityItem.zoneId} &bull; Risk Score: {activePriorityItem.riskScore?.totalScore} / 100 ({activePriorityItem.riskBand?.replace(/_/g, ' ')})
                  </div>
                </div>

                <div className={`priority-score-pill ${getPriorityScoreBadgeClass(activePriorityItem.priorityBand)}`} style={{ fontSize: '1rem', padding: '6px 12px' }}>
                  Planning Priority: {activePriorityItem.priorityScore} / 100
                </div>
              </div>

              {/* Recommended Action Detail */}
              <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '6px', border: '1px solid var(--bg-surface-border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  RECOMMENDED COOLING INTERVENTION
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 6px 0' }}>
                  {activePriorityItem.interventionName}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {activePriorityItem.recommendedIntervention?.description}
                </p>
              </div>

              {/* Indicative Cost & Impact Provenance Box */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--bg-surface-border)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      INDICATIVE COST
                    </span>
                    <ProvenanceBadge status={activePriorityItem.costStatus} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                    {formatCurrencyINR(activePriorityItem.indicativeCost)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {activePriorityItem.costUnit}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--bg-surface-border)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      INDICATIVE IMPACT
                    </span>
                    <ProvenanceBadge status={activePriorityItem.impactStatus} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                    {activePriorityItem.indicativeImpact !== null ? `-${activePriorityItem.indicativeImpact}°C` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {activePriorityItem.impactUnit}
                  </div>
                </div>
              </div>

              {/* Prioritization Contribution Triplet Breakdown */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  PRIORITIZATION SCORE CONTRIBUTION BREAKDOWN
                </span>
                
                <div className="contribution-triplet-grid" style={{ marginTop: '8px' }}>
                  <div className="contribution-card">
                    <span className="contrib-title">NEED (50%)</span>
                    <span className="contrib-points" style={{ color: '#EF4444' }}>
                      {activePriorityItem.breakdown.needComponent.obtainedScore !== null 
                        ? `${activePriorityItem.breakdown.needComponent.obtainedScore.toFixed(1)} / 50` 
                        : 'N/A'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Driven by zone risk score ({activePriorityItem.breakdown.needComponent.rawInput ?? 'N/A'}/100).
                    </span>
                  </div>

                  <div className="contribution-card">
                    <span className="contrib-title">IMPACT (30%)</span>
                    <span className="contrib-points" style={{ color: '#10B981' }}>
                      {activePriorityItem.breakdown.impactComponent.obtainedScore !== null 
                        ? `${activePriorityItem.breakdown.impactComponent.obtainedScore.toFixed(1)} / 30` 
                        : 'N/A'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Based on indicative temp reduction (-{activePriorityItem.breakdown.impactComponent.rawInput}°C).
                    </span>
                  </div>

                  <div className="contribution-card">
                    <span className="contrib-title">COST EFFICIENCY (20%)</span>
                    <span className="contrib-points" style={{ color: '#3B82F6' }}>
                      {activePriorityItem.breakdown.costEfficiencyComponent.obtainedScore !== null 
                        ? `${activePriorityItem.breakdown.costEfficiencyComponent.obtainedScore.toFixed(1)} / 20` 
                        : 'N/A'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Relative planning ratio using catalogue cost & impact.
                    </span>
                  </div>
                </div>
              </div>

              {/* Plain-Language Explanation Box */}
              <blockquote style={{ 
                margin: 0, 
                padding: '12px 14px', 
                backgroundColor: 'var(--bg-surface-elevated)', 
                borderLeft: '3px solid #3B82F6', 
                borderRadius: '0 6px 6px 0',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: 'var(--text-primary)'
              }}>
                <strong>Why fund this zone?</strong> "{activePriorityItem.explanation}"
              </blockquote>

              {/* Step 5 Domain Disclaimer & Calculation Basis */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--bg-surface-border)', padding: '10px 12px', borderRadius: '6px' }}>
                <strong>Planning Disclaimer:</strong> {activePriorityItem.disclaimer}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Insufficient Evidence Candidates (Sholinganallur) */}
      {unrankedInsufficientEvidence.length > 0 && (
        <div className="insufficient-evidence-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FBBF24' }}>
            <HelpCircle size={22} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              Insufficient Evidence Zones ({unrankedInsufficientEvidence.length}) &mdash; Unranked
            </h3>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
            Municipal funding priority cannot be established for these zones because required physical heat and vegetation canopy evidence is unavailable.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginTop: '4px' }}>
            {unrankedInsufficientEvidence.map((item) => (
              <div 
                key={item.zoneId}
                style={{ 
                  backgroundColor: 'var(--bg-surface-elevated)', 
                  border: '1px dashed rgba(234, 179, 8, 0.4)', 
                  borderRadius: '6px', 
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {item.wardName} ({item.zoneId})
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FBBF24', backgroundColor: 'rgba(234, 179, 8, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                    INSUFFICIENT EVIDENCE
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {item.explanation}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#FBBF24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> Missing: {item.missingFields.join(', ').replace(/_/g, ' ')}
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: '4px', borderTop: '1px dashed var(--bg-surface-border)' }}>
                  No intervention recommendation generated. No fallback priority rank, cost, or impact assigned.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
