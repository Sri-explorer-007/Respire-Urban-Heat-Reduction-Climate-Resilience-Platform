import React, { useState, useEffect, useMemo } from 'react';
import { WardZone } from '../../core/types/zone';
import { WorkflowStep } from './DashboardLayout';
import { respireWorkspaceService } from '../../core/services/data/workspaceService';
import { respireRecommendationEngine } from '../../core/services/recommendations/recommendationEngine';
import { respirePrioritizationEngine } from '../../core/services/prioritization/prioritizationEngine';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { 
  Building2, 
  AlertTriangle, 
  Layers, 
  FileSpreadsheet,
  CheckCircle2,
  Info,
  DollarSign
} from 'lucide-react';
import '../../styles/interventionPlanning.css';

interface InterventionPlanningScreenProps {
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  onNavigate: (step: WorkflowStep) => void;
}

export const InterventionPlanningScreen: React.FC<InterventionPlanningScreenProps> = ({
  selectedZoneId,
  onSelectZone,
  onNavigate
}) => {
  const [zones, setZones] = useState<WardZone[]>(() => respireWorkspaceService.getActiveZones());

  // Subscribe to dataset changes so Planning View updates dynamically
  useEffect(() => {
    const handleDatasetChange = () => {
      setZones(respireWorkspaceService.getActiveZones());
    };
    const unsubscribe = respireWorkspaceService.subscribe(handleDatasetChange);
    return unsubscribe;
  }, []);

  const metadata = respireWorkspaceService.getActiveMetadata();

  // Recommendations from recommendation engine
  const recommendations = useMemo(() => {
    return zones.map(z => respireRecommendationEngine.evaluateZone(z));
  }, [zones]);

  // Prioritization rankings from prioritization engine
  const prioritizationResult = useMemo(() => {
    return respirePrioritizationEngine.prioritizeMultipleZones(zones);
  }, [zones]);

  // Ranked candidates & unranked insufficient evidence
  const rankedCandidates = prioritizationResult.rankedPriorities;
  const insufficientZones = prioritizationResult.unrankedInsufficientEvidence;

  // Selected priority item
  const selectedPriorityItem = useMemo(() => {
    if (!selectedZoneId) return rankedCandidates[0] || null;
    return rankedCandidates.find(r => r.zoneId === selectedZoneId) || rankedCandidates[0] || null;
  }, [selectedZoneId, rankedCandidates]);

  // Selected zone's raw WardZone object
  const selectedZoneObject = useMemo(() => {
    if (!selectedPriorityItem) return null;
    return zones.find(z => (z.zoneId || z.id) === selectedPriorityItem.zoneId) || null;
  }, [selectedPriorityItem, zones]);

  // Selected zone recommendation result
  const selectedRecommendation = useMemo(() => {
    if (!selectedZoneObject) return null;
    return respireRecommendationEngine.evaluateZone(selectedZoneObject);
  }, [selectedZoneObject]);

  // Currency Formatter
  const formatCurrencyINR = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // High / Very High Priority Count
  const highOrVeryHighCount = useMemo(() => {
    return rankedCandidates.filter(r => r.riskBand === 'HIGH' || r.riskBand === 'VERY_HIGH').length;
  }, [rankedCandidates]);

  // Confident Recommendations Count
  const confidentRecCount = useMemo(() => {
    return recommendations.filter(r => r.primaryRecommendation && r.confidenceLevel !== 'INSUFFICIENT_DATA').length;
  }, [recommendations]);

  // Aggregate Portfolio Interventions
  const portfolioSummary = useMemo(() => {
    const map: Record<string, {
      name: string;
      category: string;
      count: number;
      cost: number | null;
      impact: number | null;
      shortDescription: string;
      coBenefits: string[];
    }> = {};

    recommendations.forEach(r => {
      if (r.primaryRecommendation && r.confidenceLevel !== 'INSUFFICIENT_DATA') {
        const p = r.primaryRecommendation;
        const name = p.interventionName;
        if (!map[name]) {
          map[name] = {
            name,
            category: p.category,
            count: 0,
            cost: p.cost?.amountInINR ?? null,
            impact: p.impact?.expectedTempReductionCelsius ?? null,
            shortDescription: p.shortDescription || p.description || 'Targeted municipal cooling intervention.',
            coBenefits: p.impact?.coBenefits || []
          };
        }
        map[name].count += 1;
      }
    });

    return Object.values(map);
  }, [recommendations]);

  // Total Portfolio Indicative Cost (sum of available costs across ranked planning candidates)
  const portfolioCostAggregation = useMemo(() => {
    let total = 0;
    let validCount = 0;
    let missingCount = 0;

    rankedCandidates.forEach(r => {
      if (r.indicativeCost !== null) {
        total += r.indicativeCost;
        validCount++;
      } else {
        missingCount++;
      }
    });

    return { total: validCount > 0 ? total : null, validCount, missingCount };
  }, [rankedCandidates]);

  // Decision Readiness Status
  const decisionReadiness = useMemo(() => {
    if (zones.length === 0 || metadata.validationErrorCount > 0 || metadata.analyzableZoneCount === 0) {
      return { status: 'NOT_READY', label: 'NOT READY FOR DECISION', color: '#EF4444' };
    }
    if (metadata.insufficientEvidenceCount > 0 || metadata.validationWarningCount > 0) {
      return { status: 'READY_WITH_WARNINGS', label: 'READY WITH WARNINGS', color: '#F59E0B' };
    }
    return { status: 'READY', label: 'DECISION READY', color: '#10B981' };
  }, [zones, metadata]);

  // --- EMPTY STATES ---

  // 1. No Active Dataset
  if (zones.length === 0) {
    return (
      <div className="planning-container">
        <div className="planning-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileSpreadsheet size={48} color="#64748B" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>NO PLANNING DATA</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '8px auto 20px auto' }}>
            Load a valid ward dataset from the Data Workspace to begin intervention planning.
          </p>
          <button className="btn-primary" onClick={() => onNavigate('DATA')} style={{ margin: '0 auto' }}>
            OPEN DATA WORKSPACE →
          </button>
        </div>
      </div>
    );
  }

  // 2. All Zones Insufficient
  if (metadata.analyzableZoneCount === 0 && metadata.insufficientEvidenceCount > 0) {
    return (
      <div className="planning-container">
        <div className="planning-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <AlertTriangle size={48} color="#F59E0B" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', color: '#F59E0B', margin: 0 }}>PLANNING BLOCKED</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '8px auto 20px auto' }}>
            No zones currently have sufficient physical heat and vegetation evidence for intervention planning.
          </p>
          <button className="btn-primary" onClick={() => onNavigate('DATA')} style={{ margin: '0 auto' }}>
            REVIEW DATA WORKSPACE →
          </button>
        </div>
      </div>
    );
  }

  // 3. No Recommendations
  if (confidentRecCount === 0 && rankedCandidates.length === 0) {
    return (
      <div className="planning-container">
        <div className="planning-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Info size={48} color="#3B82F6" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>NO CONFIDENT INTERVENTIONS</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '8px auto 20px auto' }}>
            No current zones meet the recommendation engine's evidence criteria.
          </p>
          <button className="btn-secondary" onClick={() => onNavigate('DATA')} style={{ margin: '0 auto' }}>
            REVIEW DATA WORKSPACE →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="planning-container">
      {/* 2. HERO / HEADER */}
      <div className="planning-hero-header">
        <div className="planning-hero-title-group">
          <div className="platform-label">RESPIRE PLATFORM &bull; MUNICIPAL COOLING PLAN</div>
          <h1>INTERVENTION PLANNING</h1>
          <p>Translate risk priorities into a practical municipal cooling intervention plan.</p>
        </div>

        <div className="planning-hero-meta-card">
          <div className="planning-hero-meta-row">
            <span>Active Dataset:</span>
            <strong>{metadata.name}</strong>
          </div>
          <div className="planning-hero-meta-row">
            <span>Provenance:</span>
            <span className="provenance-badge provenance-derived" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
              {metadata.sourceLabel.toUpperCase()}
            </span>
          </div>
          <div className="planning-hero-meta-row" style={{ marginTop: '4px' }}>
            <span>Readiness:</span>
            <span className="readiness-pill" style={{ backgroundColor: `${decisionReadiness.color}20`, color: decisionReadiness.color, border: `1px solid ${decisionReadiness.color}40` }}>
              ● {decisionReadiness.label}
            </span>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE PLANNING SUMMARY */}
      <div className="planning-kpi-grid">
        <div className="planning-kpi-card">
          <span className="kpi-label">TOTAL PRIORITY ZONES</span>
          <span className="kpi-value">{rankedCandidates.length}</span>
          <span className="kpi-sub">Wards with valid planning priority</span>
        </div>

        <div className="planning-kpi-card">
          <span className="kpi-label">HIGH / VERY HIGH PRIORITY</span>
          <span className="kpi-value" style={{ color: '#EF4444' }}>{highOrVeryHighCount}</span>
          <span className="kpi-sub">Ranked zones requiring immediate action</span>
        </div>

        <div className="planning-kpi-card">
          <span className="kpi-label">INTERVENTIONS RECOMMENDED</span>
          <span className="kpi-value" style={{ color: '#10B981' }}>{confidentRecCount}</span>
          <span className="kpi-sub">Analyzable zones with confident actions</span>
        </div>

        <div className="planning-kpi-card">
          <span className="kpi-label">INSUFFICIENT EVIDENCE</span>
          <span className="kpi-value" style={{ color: insufficientZones.length > 0 ? '#F59E0B' : '#10B981' }}>
            {insufficientZones.length}
          </span>
          <span className="kpi-sub">Unranked (requires data completion)</span>
        </div>
      </div>

      {/* 4. INTERVENTION PORTFOLIO */}
      <div className="planning-panel">
        <div className="planning-panel-header">
          <div className="planning-panel-title">
            <Building2 size={18} color="#10B981" />
            INTERVENTION PORTFOLIO
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Aggregated from decision recommendation outputs
          </span>
        </div>

        <div className="portfolio-grid">
          {portfolioSummary.map((item) => (
            <div key={item.name} className="portfolio-card">
              <div className="portfolio-card-header">
                <span className="portfolio-card-title">{item.name}</span>
                <span className="portfolio-card-badge">{item.count} {item.count === 1 ? 'Zone' : 'Zones'}</span>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {item.shortDescription}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px', borderTop: '1px solid var(--bg-surface-border)' }}>
                <div className="portfolio-metric-row">
                  <span>Indicative Unit Cost:</span>
                  <span style={{ fontWeight: 700, color: '#10B981' }}>
                    {formatCurrencyINR(item.cost)}
                  </span>
                </div>
                <div className="portfolio-metric-row">
                  <span>Indicative Reduction:</span>
                  <span style={{ fontWeight: 700, color: '#3B82F6' }}>
                    {item.impact !== null ? `Up to -${item.impact}°C` : 'N/A'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <ProvenanceBadge status="INDICATIVE_ESTIMATE" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5 & 6. ZONE IMPLEMENTATION PLAN & DETAIL */}
      <div className="planning-panel">
        <div className="planning-panel-header">
          <div className="planning-panel-title">
            <Layers size={18} color="#3B82F6" />
            ZONE IMPLEMENTATION PLAN (PRIORITY ORDER)
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Order derived deterministically by prioritization engine
          </span>
        </div>

        <div className="planning-detail-grid">
          {/* TABLE OF CANDIDATES */}
          <div className="planning-table-container">
            <table className="planning-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Zone / Ward</th>
                  <th>Risk Score</th>
                  <th>Priority</th>
                  <th>Recommended Intervention</th>
                  <th>Indicative Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rankedCandidates.map((item) => {
                  const isSelected = selectedPriorityItem?.zoneId === item.zoneId;
                  return (
                    <tr 
                      key={item.zoneId}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => onSelectZone(item.zoneId)}
                    >
                      <td style={{ fontWeight: 800, color: '#3B82F6' }}>#{item.rank}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.wardName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.zoneId}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: item.riskBand === 'VERY_HIGH' ? '#EF4444' : '#F97316' }}>
                          {item.riskScore?.totalScore !== null ? `${item.riskScore?.totalScore}/100` : 'N/A'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#3B82F6' }}>
                        {item.priorityScore !== null ? `${item.priorityScore}/100` : 'N/A'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.interventionName || 'N/A'}</td>
                      <td style={{ fontWeight: 700, color: '#10B981' }}>{formatCurrencyINR(item.indicativeCost)}</td>
                      <td>
                        <span className="status-badge-candidate">PLANNING CANDIDATE</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 7. SELECTED ZONE PLANNING DETAIL */}
          {selectedPriorityItem && (
            <div className="planning-detail-card">
              <div style={{ borderBottom: '1px solid var(--bg-surface-border)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 800, textTransform: 'uppercase' }}>
                  SELECTED ZONE PLANNING DETAIL
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 2px 0' }}>
                  #{selectedPriorityItem.rank} {selectedPriorityItem.wardName}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedPriorityItem.zoneId}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RISK SCORE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#EF4444' }}>
                    {selectedPriorityItem.riskScore?.totalScore}/100
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PLANNING PRIORITY</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3B82F6' }}>
                    {selectedPriorityItem.priorityScore}/100
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  RECOMMENDED INTERVENTION
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedPriorityItem.interventionName}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  WHY THIS INTERVENTION?
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  {selectedRecommendation?.explanation || selectedPriorityItem.explanation}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--bg-surface-border)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>INDICATIVE COST</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10B981' }}>
                    {formatCurrencyINR(selectedPriorityItem.indicativeCost)}
                  </div>
                </div>
                <ProvenanceBadge status={selectedPriorityItem.costStatus} />
              </div>

              {selectedRecommendation?.primaryRecommendation?.impact?.coBenefits && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    EXPECTED CO-BENEFITS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selectedRecommendation.primaryRecommendation.impact.coBenefits.map((b: string, idx: number) => (
                      <span key={idx} style={{ fontSize: '0.72rem', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 8. INSUFFICIENT EVIDENCE SECTION */}
      {insufficientZones.length > 0 && (
        <div className="planning-data-alert">
          <div className="planning-panel-title" style={{ color: '#F59E0B' }}>
            <AlertTriangle size={20} color="#F59E0B" />
            DATA REQUIRED BEFORE PLANNING ({insufficientZones.length} ZONE)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {insufficientZones.map(u => (
              <div key={u.zoneId} style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--bg-surface-border)', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{u.wardName}</strong>
                  <span className="status-badge-data-required">DATA REQUIRED</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.zoneId}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px' }}>
                  <div>Risk Score: <strong>N/A</strong></div>
                  <div>Priority: <strong>N/A</strong></div>
                  <div>Recommendation: <strong>NO CONFIDENT RECOMMENDATION</strong></div>
                  <div>Indicative Cost: <strong>N/A</strong></div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Missing Evidence: <strong>Heat Exposure (Thermal LST), Vegetation Deficit (Canopy)</strong>
                </div>
              </div>
            ))}
          </div>

          <button className="btn-secondary" onClick={() => onNavigate('DATA')} style={{ border: '1px solid #F59E0B', color: '#F59E0B', width: 'fit-content' }}>
            REVIEW DATA WORKSPACE →
          </button>
        </div>
      )}

      {/* 9 & 10. FUNDING OUTLOOK & PLANNING NOTES */}
      <div className="planning-grid-2-col">
        {/* 9. INDICATIVE FUNDING OUTLOOK */}
        <div className="planning-panel">
          <div className="planning-panel-header">
            <div className="planning-panel-title">
              <DollarSign size={18} color="#10B981" />
              INDICATIVE FUNDING OUTLOOK
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--bg-surface-border)', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              INDICATIVE PORTFOLIO ESTIMATE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981' }}>
                {formatCurrencyINR(portfolioCostAggregation.total)}
              </span>
              <ProvenanceBadge status="INDICATIVE_ESTIMATE" />
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Sum of available indicative intervention costs across {portfolioCostAggregation.validCount} ranked planning candidates.
              {portfolioCostAggregation.missingCount > 0 && ` (${portfolioCostAggregation.missingCount} unranked zone excluded due to missing evidence)`}.
            </p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
              Illustrative planning estimate — not a contractor quote.
            </div>
          </div>
        </div>

        {/* 10. PLANNING NOTES */}
        <div className="planning-panel">
          <div className="planning-panel-header">
            <div className="planning-panel-title">
              <Info size={18} color="#3B82F6" />
              PLANNING NOTES & GUIDANCE
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <CheckCircle2 size={16} color="#3B82F6" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Prioritize high-risk / high-priority wards (e.g. Vyasarpadi, Washermanpet) for early capital budget allocation.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <CheckCircle2 size={16} color="#3B82F6" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Validate site-level structural feasibility and microclimate conditions prior to procurement.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <CheckCircle2 size={16} color="#3B82F6" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Confirm intervention cost estimates with municipal engineering departments and local contractor schedules.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <CheckCircle2 size={16} color="#3B82F6" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Acquire satellite LST and canopy indicators for unranked zones (e.g. Sholinganallur) before commencing intervention planning.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
