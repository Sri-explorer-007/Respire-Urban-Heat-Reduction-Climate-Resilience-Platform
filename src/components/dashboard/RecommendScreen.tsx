import React, { useState, useEffect, useMemo } from 'react';
import { respireApi } from '../../api/respireApi';
import { WardZone } from '../../core/types/zone';
import { ZoneRiskScore } from '../../core/types/scoring';
import { ZoneRecommendationResult } from '../../core/types/recommendation';
import { respireScoringEngine } from '../../core/services/scoring/scoringEngine';
import { respireRecommendationEngine } from '../../core/services/recommendations/recommendationEngine';
import { RuleEvaluationTraceability } from './RuleEvaluationTraceability';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { AlertCircle, Layers, Lightbulb, CheckCircle2, Thermometer, DollarSign, ListChecks, HelpCircle } from 'lucide-react';

import { respireWorkspaceService } from '../../core/services/data/workspaceService';

interface ScoredAndRecommendedItem {
  zone: WardZone;
  riskScore: ZoneRiskScore;
  recommendation: ZoneRecommendationResult;
}

interface RecommendScreenProps {
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}

export const RecommendScreen: React.FC<RecommendScreenProps> = ({ selectedZoneId, onSelectZone }) => {
  const [zones, setZones] = useState<WardZone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await respireApi.getWardZones();
      setZones(data);

      if (data.length > 0) {
        const exists = data.some(z => (z.zoneId || z.id) === selectedZoneId);
        if (!selectedZoneId || !exists) {
          // Default to Ward 045 (Vyasarpadi) if present, else first zone
          const defaultZone = data.find(z => z.wardId === 'WARD-045' || z.zoneId === 'ZONE-CHN-W045') || data[0];
          const defaultId = defaultZone.zoneId || defaultZone.id;
          if (defaultId) onSelectZone(defaultId);
        }
      }
      setLoading(false);
    };

    loadData();

    const unsubscribe = respireWorkspaceService.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [selectedZoneId, onSelectZone]);

  // Evaluate risk scores and rule-based recommendations deterministically via domain engines
  const evaluatedItems: ScoredAndRecommendedItem[] = useMemo(() => {
    return zones.map(zone => {
      const riskScore = respireScoringEngine.calculateZoneRisk(zone);
      const recommendation = respireRecommendationEngine.evaluateZone(zone, riskScore);
      return { zone, riskScore, recommendation };
    });
  }, [zones]);

  const activeItem = useMemo(() => {
    if (!selectedZoneId) return evaluatedItems[0] || null;
    return evaluatedItems.find(item => (item.zone.zoneId || item.zone.id) === selectedZoneId) || evaluatedItems[0] || null;
  }, [evaluatedItems, selectedZoneId]);

  if (loading || !activeItem) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading RESPIRE zone recommendations & evaluating cooling rules...
      </div>
    );
  }

  const { zone, riskScore, recommendation } = activeItem;
  const isInsufficient = riskScore.totalScore === null || riskScore.riskTier === 'INSUFFICIENT_EVIDENCE';
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

  const getCategoryPillClass = (category: string) => {
    switch (category) {
      case 'SOCIAL_PROTECTION': return 'cat-social';
      case 'BUILT_SURFACE_COOLING': return 'cat-built';
      case 'VEGETATION_SHADE': return 'cat-vegetation';
      case 'URBAN_GREENING': return 'cat-greening';
      default: return 'cat-social';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'P1_URGENT': return '#EF4444';
      case 'P2_HIGH': return '#F97316';
      case 'P3_MEDIUM': return '#EAB308';
      default: return '#10B981';
    }
  };

  const formatCurrencyINR = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'P1_URGENT': return 'P1 — URGENT ACTION';
      case 'P2_HIGH': return 'P2 — HIGH ACTION';
      case 'P3_MEDIUM': return 'P3 — MEDIUM ACTION';
      case 'P4_LOW': return 'P4 — LOW ACTION';
      default: return priority.replace(/_/g, ' ');
    }
  };

  const primaryRec = recommendation.primaryRecommendation;
  const secondaryRecs = recommendation.secondaryRecommendations;

  return (
    <div className="recommend-container">
      {/* Disclosure Banner & Workflow Stage */}
      <div className="data-disclosure-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color="#F59E0B" />
          <span>
            <strong>{respireApi.getDatasetLabel()} Active</strong> &mdash; Interventions are generated deterministically by the rule-based recommendation engine.
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>WORKFLOW STAGE 04 &bull; RECOMMEND ACTION</span>
      </div>

      {/* Zone Quick Switch Selector */}
      <div className="recommend-selector-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          <Layers size={16} color="#3B82F6" />
          <span>Select Ward/Zone to Recommend Actions:</span>
        </div>
        <select
          className="explain-select-dropdown"
          value={selectedZoneId || activeZoneId}
          onChange={(e) => onSelectZone(e.target.value)}
          aria-label="Select Ward for Intervention Recommendations"
        >
          {evaluatedItems.map(({ zone: z, riskScore: rs, recommendation: rec }) => {
            const id = z.zoneId || z.id;
            const name = z.wardName || z.zoneName;
            const count = rec.recommendedInterventions.length;
            const countStr = count > 0 ? `${count} Action(s)` : 'No Confident Action';
            const scoreStr = rs.totalScore !== null ? `${Math.round(rs.totalScore)}/100` : 'INSUFFICIENT';
            return (
              <option key={id} value={id}>
                {name} &mdash; [{scoreStr}] &bull; {countStr}
              </option>
            );
          })}
        </select>
      </div>

      {/* Main Recommend Grid */}
      <div className="recommend-grid">
        {/* Left Column: Zone Context & Rule Evaluation Traceability */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Zone Risk Context Summary */}
          <div className="recommend-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="zone-name" style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  {activeWardName}
                </h2>
                <div className="zone-meta" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {activeZoneId} &bull; {districtName}
                </div>
              </div>

              <div className={`risk-band-badge ${getBandBadgeClass(riskScore.riskTier)}`}>
                {riskScore.riskTier.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Score & Driver Summary Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '6px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Risk Score</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: isInsufficient ? '#94A3B8' : '#EF4444' }}>
                  {riskScore.totalScore !== null ? `${Math.round(riskScore.totalScore)} / 100` : 'Insufficient Evidence'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Primary Risk Driver</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {riskScore.primaryDriver || 'None / Missing'}
                </div>
              </div>
            </div>
          </div>

          {/* Rule Evaluation Traceability Audit Panel */}
          <RuleEvaluationTraceability ruleEvaluations={recommendation.ruleEvaluations} />
        </div>

        {/* Right Column: Recommended Cooling Interventions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Case A: Missing / Insufficient Data (Sholinganallur) */}
          {isInsufficient || recommendation.status === 'NO_CONFIDENT_RECOMMENDATION' || !primaryRec ? (
            <div className="recommend-card" style={{ borderLeft: '4px solid #EAB308' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FBBF24' }}>
                <HelpCircle size={24} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>No Confident Intervention Recommended</h3>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: '8px 0 0 0' }}>
                No confident cooling intervention can be recommended for <strong>{activeWardName}</strong> due to insufficient physical indicator coverage (satellite land surface temperature and vegetation canopy data are unavailable).
              </p>

              <div style={{ backgroundColor: 'var(--bg-surface-elevated)', border: '1px dashed rgba(234, 179, 8, 0.4)', borderRadius: '6px', padding: '12px', marginTop: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  MISSING EVIDENCE INDICATORS
                </span>
                <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {recommendation.missingEvidence.length > 0 ? (
                    recommendation.missingEvidence.map((ev, i) => (
                      <li key={i}>{ev.replace(/_/g, ' ')}</li>
                    ))
                  ) : (
                    <li>Heat exposure and vegetation canopy deficit indicators unavailable.</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            /* Case B: Primary & Secondary Recommendations Available */
            <>
              {/* Primary Action Recommendation Card */}
              <div className="primary-recommendation-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lightbulb size={20} color="#3B82F6" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      PRIMARY RECOMMENDED ACTION
                    </span>
                  </div>

                  <span 
                    style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      color: '#FFFFFF', 
                      backgroundColor: getPriorityBadgeColor(primaryRec.priority), 
                      padding: '2px 8px', 
                      borderRadius: '4px' 
                    }}
                  >
                    {formatPriorityLabel(primaryRec.priority)}
                  </span>
                </div>

                {/* Title & Category */}
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                    {primaryRec.interventionName}
                  </h3>

                  <span className={`recommendation-badge-pill ${getCategoryPillClass(primaryRec.category)}`}>
                    {primaryRec.category.replace(/_/g, ' ')}
                  </span>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {primaryRec.description}
                </p>

                {/* Trigger Rules Matched */}
                {primaryRec.applicabilityConditions.length > 0 && (
                  <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ListChecks size={14} color="#10B981" /> Matched Condition Rationale:
                    </span>
                    <ul style={{ margin: '4px 0 0 18px', padding: 0, color: 'var(--text-primary)' }}>
                      {primaryRec.applicabilityConditions.map((cond, idx) => (
                        <li key={idx}>{cond}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Impact & Cost Metrics Grid */}
                <div className="impact-cost-metrics-grid">
                  <div className="metric-box-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Thermometer size={12} color="#10B981" /> Indicative Impact
                      </span>
                      <ProvenanceBadge status={primaryRec.impact.impactStatus} />
                    </div>
                    <span className="metric-value" style={{ color: '#10B981' }}>
                      {primaryRec.impact.expectedTempReductionCelsius !== null 
                        ? `-${primaryRec.impact.expectedTempReductionCelsius}°C` 
                        : 'N/A'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {primaryRec.impact.impactUnit}
                    </span>
                  </div>

                  <div className="metric-box-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={12} color="#3B82F6" /> Indicative Cost
                      </span>
                      <ProvenanceBadge status={primaryRec.cost.costStatus} />
                    </div>
                    <span className="metric-value">
                      {formatCurrencyINR(primaryRec.cost.amountInINR)}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {primaryRec.cost.unitBasis || primaryRec.costUnit}
                    </span>
                  </div>
                </div>

                {/* Co-Benefits Tags */}
                {primaryRec.impact.coBenefits.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      CO-BENEFITS:
                    </span>
                    <div className="co-benefits-tags">
                      {primaryRec.impact.coBenefits.map((cb, idx) => (
                        <span key={idx} className="co-benefit-tag">
                          {cb}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plain Language Rationale Box */}
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
                  <strong>Why this action?</strong> "{recommendation.explanation}"
                </blockquote>
              </div>

              {/* Secondary Matched Recommendations (If any) */}
              {secondaryRecs.length > 0 && (
                <div className="recommend-card">
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <span>Secondary Matched Actions ({secondaryRecs.length})</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {secondaryRecs.map((secRec) => (
                      <div 
                        key={secRec.interventionId}
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--bg-surface-border)',
                          borderRadius: '6px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {secRec.interventionName}
                          </h4>

                          <span className={`recommendation-badge-pill ${getCategoryPillClass(secRec.category)}`}>
                            {secRec.category.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {secRec.description}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', paddingTop: '6px', borderTop: '1px dashed var(--bg-surface-border)' }}>
                          <span style={{ color: '#10B981', fontWeight: 600 }}>
                            Impact: -{secRec.impact.expectedTempReductionCelsius}°C ({secRec.impact.impactUnit})
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                            Cost: {formatCurrencyINR(secRec.cost.amountInINR)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
