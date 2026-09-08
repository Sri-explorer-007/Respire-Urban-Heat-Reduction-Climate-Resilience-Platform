import React, { useState, useEffect, useMemo } from 'react';
import { WardZone } from '../../core/types/zone';
import { WorkflowStep } from './DashboardLayout';
import { respireWorkspaceService } from '../../core/services/data/workspaceService';
import { respireScoringEngine } from '../../core/services/scoring/scoringEngine';
import { respireRecommendationEngine } from '../../core/services/recommendations/recommendationEngine';
import { respirePrioritizationEngine } from '../../core/services/prioritization/prioritizationEngine';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { 
  Building2, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Layers, 
  TrendingUp, 
  Flame, 
  TreePine, 
  Users,
  FileSpreadsheet,
  MapPin
} from 'lucide-react';
import '../../styles/executiveOverview.css';

interface ExecutiveOverviewScreenProps {
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  onNavigate: (step: WorkflowStep) => void;
}

export const ExecutiveOverviewScreen: React.FC<ExecutiveOverviewScreenProps> = ({
  selectedZoneId,
  onSelectZone,
  onNavigate
}) => {
  const [zones, setZones] = useState<WardZone[]>(() => respireWorkspaceService.getActiveZones());

  // Subscribe to dataset changes so Command Center updates dynamically
  useEffect(() => {
    const handleDatasetChange = () => {
      setZones(respireWorkspaceService.getActiveZones());
    };
    const unsubscribe = respireWorkspaceService.subscribe(handleDatasetChange);
    return unsubscribe;
  }, []);

  const metadata = respireWorkspaceService.getActiveMetadata();

  // Scored zones from scoring engine
  const scoredZones = useMemo(() => {
    return zones.map(z => respireScoringEngine.calculateZoneRisk(z));
  }, [zones]);

  // Recommendations from recommendation engine
  const recommendations = useMemo(() => {
    return zones.map(z => respireRecommendationEngine.evaluateZone(z));
  }, [zones]);

  // Prioritization rankings from prioritization engine
  const prioritizationResult = useMemo(() => {
    return respirePrioritizationEngine.prioritizeMultipleZones(zones);
  }, [zones]);

  // Data completeness score (Average evidence completeness across active zones)
  const datasetCompletenessPercent = useMemo(() => {
    if (scoredZones.length === 0) return 0;
    const sum = scoredZones.reduce((acc, s) => acc + s.completeness, 0);
    return Math.round((sum / scoredZones.length) * 100);
  }, [scoredZones]);

  // Risk Tier Distribution
  const riskDistribution = useMemo(() => {
    let veryHigh = 0, high = 0, moderate = 0, low = 0, insufficient = 0;
    scoredZones.forEach(s => {
      if (s.riskTier === 'INSUFFICIENT_EVIDENCE' || s.totalScore === null) insufficient++;
      else if (s.totalScore >= 75) veryHigh++;
      else if (s.totalScore >= 50) high++;
      else if (s.totalScore >= 25) moderate++;
      else low++;
    });
    return { veryHigh, high, moderate, low, insufficient };
  }, [scoredZones]);

  // High + Very High Risk zone count
  const highRiskCount = riskDistribution.veryHigh + riskDistribution.high;

  // Unmapped count
  const unmappedCount = zones.filter(z => z.latitude === null || z.longitude === null).length;

  // Decision Readiness Status
  const decisionReadiness = useMemo(() => {
    if (zones.length === 0 || metadata.validationErrorCount > 0 || metadata.analyzableZoneCount === 0) {
      return { status: 'NOT_READY', label: 'NOT READY FOR DECISION', color: '#EF4444' };
    }
    if (metadata.insufficientEvidenceCount > 0 || unmappedCount > 0 || metadata.validationWarningCount > 0) {
      return { status: 'READY_WITH_WARNINGS', label: 'READY WITH WARNINGS', color: '#F59E0B' };
    }
    return { status: 'READY', label: 'DECISION READY', color: '#10B981' };
  }, [zones, metadata, unmappedCount]);

  // Aggregate Dominant Risk Drivers
  const dominantDrivers = useMemo(() => {
    let heatCount = 0, vegCount = 0, vulnCount = 0;
    scoredZones.forEach(s => {
      if (s.riskTier !== 'INSUFFICIENT_EVIDENCE' && s.primaryDriver) {
        if (s.primaryDriver.toLowerCase().includes('heat')) heatCount++;
        else if (s.primaryDriver.toLowerCase().includes('vegetation') || s.primaryDriver.toLowerCase().includes('canopy')) vegCount++;
        else vulnCount++;
      }
    });
    return { heatCount, vegCount, vulnCount };
  }, [scoredZones]);

  // Aggregate Recommended Interventions (exclude insufficient evidence zones)
  const interventionSummary = useMemo(() => {
    const summaryMap: Record<string, number> = {};
    recommendations.forEach(r => {
      if (r.primaryRecommendation && r.confidenceLevel !== 'INSUFFICIENT_DATA') {
        const name = r.primaryRecommendation.interventionName;
        summaryMap[name] = (summaryMap[name] || 0) + 1;
      }
    });
    return Object.entries(summaryMap).map(([name, count]) => ({ name, count }));
  }, [recommendations]);

  // Currency Formatter
  const formatCurrencyINR = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Top 3 ranked priority candidates
  const top3Priorities = prioritizationResult.rankedPriorities.slice(0, 3);

  // Insufficient evidence zones list
  const insufficientZones = prioritizationResult.unrankedInsufficientEvidence;

  // Empty state handling
  if (zones.length === 0 || metadata.analyzableZoneCount === 0 && metadata.insufficientEvidenceCount === 0) {
    return (
      <div className="exec-overview-container">
        <div className="exec-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileSpreadsheet size={48} color="#64748B" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>NO ANALYSIS DATA</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '8px auto 20px auto' }}>
            Load a valid ward dataset from the Data Workspace to begin municipal heat risk assessment and decision prioritization.
          </p>
          <button className="btn-primary" onClick={() => onNavigate('DATA')} style={{ margin: '0 auto' }}>
            OPEN DATA WORKSPACE →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exec-overview-container">
      {/* 2. HERO / EXECUTIVE HEADER */}
      <div className="exec-hero-header">
        <div className="exec-hero-title-group">
          <div className="platform-label">RESPIRE Platform &bull; Urban Heat Reduction</div>
          <h1>Municipal Heat Risk Command Center</h1>
          <p>Executive Decision Dashboard for Capital Funding & Cooling Investment</p>
        </div>

        <div className="exec-hero-meta-card">
          <div className="exec-hero-meta-row">
            <span>Active Dataset:</span>
            <strong>{metadata.name}</strong>
          </div>
          <div className="exec-hero-meta-row">
            <span>Provenance:</span>
            <span className="provenance-badge provenance-derived" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
              {metadata.sourceLabel.toUpperCase()}
            </span>
          </div>
          <div className="exec-hero-meta-row" style={{ marginTop: '4px' }}>
            <span>Readiness:</span>
            <span className="readiness-pill" style={{ backgroundColor: `${decisionReadiness.color}20`, color: decisionReadiness.color, border: `1px solid ${decisionReadiness.color}40` }}>
              ● {decisionReadiness.label}
            </span>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE KPI CARDS */}
      <div className="exec-kpi-grid">
        <div className="exec-kpi-card">
          <span className="kpi-label">A. TOTAL ZONES</span>
          <span className="kpi-value">{metadata.zoneCount}</span>
          <span className="kpi-sub">Wards in active dataset</span>
        </div>

        <div className="exec-kpi-card">
          <span className="kpi-label">B. ANALYZABLE</span>
          <span className="kpi-value" style={{ color: '#10B981' }}>
            {metadata.analyzableZoneCount} / {metadata.zoneCount}
          </span>
          <span className="kpi-sub">Sufficient evidence for risk scoring</span>
        </div>

        <div className="exec-kpi-card">
          <span className="kpi-label">C. HIGH / VERY HIGH RISK</span>
          <span className="kpi-value" style={{ color: '#EF4444' }}>{highRiskCount}</span>
          <span className="kpi-sub">Wards requiring urgent cooling action</span>
        </div>

        <div className="exec-kpi-card">
          <span className="kpi-label">D. INSUFFICIENT EVIDENCE</span>
          <span className="kpi-value" style={{ color: metadata.insufficientEvidenceCount > 0 ? '#F59E0B' : '#10B981' }}>
            {metadata.insufficientEvidenceCount}
          </span>
          <span className="kpi-sub">Unranked (missing satellite/ground data)</span>
        </div>

        <div className="exec-kpi-card">
          <span className="kpi-label">E. DATA COMPLETENESS</span>
          <span className="kpi-value" style={{ color: '#3B82F6' }}>{datasetCompletenessPercent}%</span>
          <span className="kpi-sub">Average evidence completeness across zones in the active dataset</span>
        </div>
      </div>

      {/* ROW 2: RISK DISTRIBUTION & DECISION READINESS */}
      <div className="exec-grid-2-col">
        {/* 4. RISK DISTRIBUTION */}
        <div className="exec-panel">
          <div className="exec-panel-header">
            <div className="exec-panel-title">
              <Layers size={18} color="#3B82F6" />
              Dataset Risk Tier Distribution
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {metadata.analyzableZoneCount} Scored Wards
            </span>
          </div>

          <div className="exec-risk-bars">
            <div className="exec-risk-tier-item">
              <span style={{ color: '#EF4444', fontWeight: 600 }}>VERY HIGH (≥75)</span>
              <div className="exec-risk-bar-track">
                <div className="exec-risk-bar-fill" style={{ width: `${(riskDistribution.veryHigh / metadata.zoneCount) * 100}%`, backgroundColor: '#EF4444' }} />
              </div>
              <strong style={{ textAlign: 'right' }}>{riskDistribution.veryHigh}</strong>
            </div>

            <div className="exec-risk-tier-item">
              <span style={{ color: '#F97316', fontWeight: 600 }}>HIGH (50-74)</span>
              <div className="exec-risk-bar-track">
                <div className="exec-risk-bar-fill" style={{ width: `${(riskDistribution.high / metadata.zoneCount) * 100}%`, backgroundColor: '#F97316' }} />
              </div>
              <strong style={{ textAlign: 'right' }}>{riskDistribution.high}</strong>
            </div>

            <div className="exec-risk-tier-item">
              <span style={{ color: '#EAB308', fontWeight: 600 }}>MODERATE (25-49)</span>
              <div className="exec-risk-bar-track">
                <div className="exec-risk-bar-fill" style={{ width: `${(riskDistribution.moderate / metadata.zoneCount) * 100}%`, backgroundColor: '#EAB308' }} />
              </div>
              <strong style={{ textAlign: 'right' }}>{riskDistribution.moderate}</strong>
            </div>

            <div className="exec-risk-tier-item">
              <span style={{ color: '#10B981', fontWeight: 600 }}>LOW (&lt;25)</span>
              <div className="exec-risk-bar-track">
                <div className="exec-risk-bar-fill" style={{ width: `${(riskDistribution.low / metadata.zoneCount) * 100}%`, backgroundColor: '#10B981' }} />
              </div>
              <strong style={{ textAlign: 'right' }}>{riskDistribution.low}</strong>
            </div>

            <div className="exec-risk-tier-item" style={{ paddingTop: '4px', borderTop: '1px border var(--bg-surface-border)' }}>
              <span style={{ color: '#F59E0B', fontWeight: 600 }}>INSUFFICIENT</span>
              <div className="exec-risk-bar-track">
                <div className="exec-risk-bar-fill" style={{ width: `${(riskDistribution.insufficient / metadata.zoneCount) * 100}%`, backgroundColor: '#F59E0B' }} />
              </div>
              <strong style={{ textAlign: 'right' }}>{riskDistribution.insufficient}</strong>
            </div>
          </div>
        </div>

        {/* 9. DECISION READINESS */}
        <div className="exec-panel">
          <div className="exec-panel-header">
            <div className="exec-panel-title">
              <ShieldCheck size={18} color={decisionReadiness.color} />
              Decision Readiness Evaluation
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', border: `1px solid ${decisionReadiness.color}40`, borderRadius: '6px', padding: '14px' }}>
            <div style={{ fontWeight: 800, color: decisionReadiness.color, fontSize: '1.05rem', marginBottom: '4px' }}>
              {decisionReadiness.label}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              {metadata.analyzableZoneCount} of {metadata.zoneCount} zones possess sufficient satellite and ground evidence for risk assessment.
              {metadata.insufficientEvidenceCount > 0 && ` ${metadata.insufficientEvidenceCount} zone requires additional physical indicators.`}
            </p>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button className="btn-secondary" onClick={() => onNavigate('DATA')} style={{ width: '100%', justifyContent: 'center' }}>
              REVIEW DATA QUALITY →
            </button>
          </div>
        </div>
      </div>

      {/* 5. "WHERE SHOULD WE ACT FIRST?" */}
      <div className="exec-panel">
        <div className="exec-panel-header">
          <div className="exec-panel-title">
            <TrendingUp size={18} color="#3B82F6" />
            WHERE SHOULD WE ACT FIRST? (TOP MUNICIPAL PRIORITIES)
          </div>
          <button className="btn-secondary" onClick={() => onNavigate('PRIORITIZE')} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            View Full Prioritization List ({prioritizationResult.rankedPriorities.length}) →
          </button>
        </div>

        <div className="exec-top3-grid">
          {top3Priorities.map((item) => {
            const isSelected = selectedZoneId === item.zoneId;
            return (
              <div 
                key={item.zoneId}
                className={`exec-top3-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectZone(item.zoneId)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="exec-rank-badge">#{item.rank}</span>
                  <span style={{ fontSize: '0.78rem', color: item.riskBand === 'VERY_HIGH' ? '#EF4444' : '#F97316', fontWeight: 700 }}>
                    {item.riskBand?.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 2px 0' }}>
                    {item.wardName}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.zoneId}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '4px' }}>
                  <span>Risk Score: <strong style={{ color: '#F8FAFC' }}>{item.riskScore?.totalScore}/100</strong></span>
                  <span>Planning Priority: <strong style={{ color: '#3B82F6' }}>{item.priorityScore}/100</strong></span>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    RECOMMENDED COOLING ACTION
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {item.interventionName}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--bg-surface-border)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10B981' }}>
                    {formatCurrencyINR(item.indicativeCost)}
                  </span>
                  <ProvenanceBadge status={item.costStatus} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ROW 4: DRIVERS & INTERVENTIONS */}
      <div className="exec-grid-2-col">
        {/* 6. "WHAT IS DRIVING RISK?" */}
        <div className="exec-panel">
          <div className="exec-panel-header">
            <div className="exec-panel-title">
              <Flame size={18} color="#EF4444" />
              DOMINANT PRIMARY DRIVERS
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '-6px', marginBottom: '4px' }}>
            Number of analyzable zones where each driver is identified as the primary risk driver.
          </div>

          <div className="exec-summary-list">
            <div className="exec-summary-item">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <Flame size={16} color="#EF4444" /> Heat Exposure (Thermal LST)
              </span>
              <strong>{dominantDrivers.heatCount} Wards</strong>
            </div>

            <div className="exec-summary-item">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <TreePine size={16} color="#10B981" /> Vegetation Deficit (Low Canopy)
              </span>
              <strong>{dominantDrivers.vegCount} Wards</strong>
            </div>

            <div className="exec-summary-item">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <Users size={16} color="#3B82F6" /> Social Vulnerability (Demographics)
              </span>
              <strong>{dominantDrivers.vulnCount} Wards</strong>
            </div>
          </div>
        </div>

        {/* 7. "WHAT SHOULD WE FUND?" */}
        <div className="exec-panel">
          <div className="exec-panel-header">
            <div className="exec-panel-title">
              <Building2 size={18} color="#10B981" />
              WHAT SHOULD WE FUND? (RECOMMENDED COOLING ACTIONS)
            </div>
          </div>

          <div className="exec-summary-list">
            {interventionSummary.map((item) => (
              <div key={item.name} className="exec-summary-item">
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                <span style={{ color: '#10B981', fontWeight: 700 }}>{item.count} {item.count === 1 ? 'zone' : 'zones'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8. DATA QUALITY ALERT */}
      {insufficientZones.length > 0 && (
        <div className="exec-data-alert">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertTriangle size={24} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 800, color: '#F59E0B', fontSize: '0.95rem' }}>
                DATA QUALITY ATTENTION: {insufficientZones.length} UNRANKED ZONE DETECTED
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {insufficientZones.map(u => u.wardName).join(', ')} cannot currently be risk-ranked because required physical heat and vegetation evidence is missing. Risk score and priority rank remain null (Insufficient Evidence).
              </div>
            </div>
          </div>

          <button className="btn-secondary" onClick={() => onNavigate('DATA')} style={{ border: '1px solid #F59E0B', color: '#F59E0B' }}>
            Review Data Workspace →
          </button>
        </div>
      )}

      {/* 10. NEXT BEST ACTION */}
      <div className="exec-next-action-panel">
        <div>
          <div style={{ fontSize: '0.75rem', color: '#3B82F6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            RECOMMENDED MUNICIPAL NEXT STEP
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
            Review highest-priority wards and generate an evidence-backed capital funding decision report.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => onNavigate('PRIORITIZE')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            VIEW PRIORITY RANKING <ArrowRight size={16} />
          </button>
          <button className="btn-secondary" onClick={() => onNavigate('IDENTIFY')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={16} /> OPEN RISK MAP
          </button>
        </div>
      </div>
    </div>
  );
};
