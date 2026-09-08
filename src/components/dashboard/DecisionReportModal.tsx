import React, { useMemo } from 'react';
import { WardZone } from '../../core/types/zone';
import { respirePrioritizationEngine } from '../../core/services/prioritization/prioritizationEngine';
import { respireScoringEngine } from '../../core/services/scoring/scoringEngine';
import { respireWorkspaceService } from '../../core/services/data/workspaceService';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { FileText, Printer, X, ShieldAlert, CheckCircle } from 'lucide-react';

interface DecisionReportModalProps {
  zones: WardZone[];
  onClose: () => void;
}

export const DecisionReportModal: React.FC<DecisionReportModalProps> = ({ zones, onClose }) => {
  const metadata = respireWorkspaceService.getActiveMetadata();

  const prioritizationResult = useMemo(() => {
    return respirePrioritizationEngine.prioritizeMultipleZones(zones);
  }, [zones]);

  const scoredZones = useMemo(() => {
    return zones.map(z => respireScoringEngine.calculateZoneRisk(z));
  }, [zones]);

  // Compute dataset completeness
  const datasetCompletenessPercent = useMemo(() => {
    if (scoredZones.length === 0) return 0;
    const sum = scoredZones.reduce((acc, s) => acc + s.completeness, 0);
    return Math.round((sum / scoredZones.length) * 100);
  }, [scoredZones]);

  // Compute risk distribution
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

  // Unmapped count
  const unmappedCount = zones.filter(z => z.latitude === null || z.longitude === null).length;

  // Decision readiness status
  const decisionReadiness = useMemo(() => {
    if (zones.length === 0 || metadata.validationErrorCount > 0 || metadata.analyzableZoneCount === 0) {
      return { status: 'NOT_READY', label: 'NOT READY FOR DECISION', color: '#EF4444' };
    }
    if (metadata.insufficientEvidenceCount > 0 || unmappedCount > 0 || metadata.validationWarningCount > 0) {
      return { status: 'READY_WITH_WARNINGS', label: 'READY WITH WARNINGS', color: '#F59E0B' };
    }
    return { status: 'READY', label: 'DECISION READY', color: '#10B981' };
  }, [zones, metadata, unmappedCount]);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatCurrencyINR = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="decision-report-modal-overlay">
      <div className="decision-report-modal-container">
        {/* Modal Toolbar (Screen Only, hidden during print) */}
        <div className="report-toolbar print-hide">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#3B82F6" />
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              Municipal Funding Decision Report Preview
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn-secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print / Save as PDF
            </button>
            <button className="btn-secondary" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <X size={16} /> Close Preview
            </button>
          </div>
        </div>

        {/* Printable Report Document Surface */}
        <div className="decision-report-document">
          {/* Header Banner */}
          <div className="report-header">
            <div>
              <div className="report-badge">RESPIRE MUNICIPAL DECISION SUPPORT SYSTEM</div>
              <h1 className="report-title">Urban Heat Reduction & Cooling Investment Report</h1>
              <div className="report-subtitle">
                Comprehensive Risk Assessment, Evidence Readiness, and Capital Funding Prioritization Plan
              </div>
            </div>

            <div className="report-meta-box">
              <div><strong>Date Generated:</strong> {formattedDate}</div>
              <div><strong>Dataset:</strong> {metadata.name}</div>
              <div><strong>Provenance:</strong> {metadata.sourceLabel}</div>
              <div style={{ marginTop: '4px' }}>
                <span className="readiness-pill" style={{ backgroundColor: `${decisionReadiness.color}20`, color: decisionReadiness.color, border: `1px solid ${decisionReadiness.color}40` }}>
                  ● {decisionReadiness.label}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary & Dataset Readiness */}
          <div className="report-section">
            <h2 className="section-title">1. Dataset Readiness & Executive Metrics</h2>
            
            <div className="metrics-grid-4">
              <div className="report-metric-card">
                <span className="metric-label">Total Planning Zones</span>
                <span className="metric-value">{metadata.zoneCount} Wards</span>
                <span className="metric-sub">{metadata.zoneCount - unmappedCount} / {metadata.zoneCount} Mapped GIS</span>
              </div>

              <div className="report-metric-card">
                <span className="metric-label">Analyzable Wards</span>
                <span className="metric-value" style={{ color: '#10B981' }}>{metadata.analyzableZoneCount} Wards</span>
                <span className="metric-sub">Sufficient evidence for risk scoring</span>
              </div>

              <div className="report-metric-card">
                <span className="metric-label">Data Completeness Score</span>
                <span className="metric-value" style={{ color: '#3B82F6' }}>{datasetCompletenessPercent}%</span>
                <span className="metric-sub">Average evidence completeness across zones in the active dataset</span>
              </div>

              <div className="report-metric-card">
                <span className="metric-label">Insufficient Evidence</span>
                <span className="metric-value" style={{ color: metadata.insufficientEvidenceCount > 0 ? '#F59E0B' : '#10B981' }}>
                  {metadata.insufficientEvidenceCount} Ward
                </span>
                <span className="metric-sub">Unranked (missing satellite/ground data)</span>
              </div>
            </div>

            {/* Risk Tier Breakdown */}
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                Dataset Risk Tier Distribution
              </h3>
              <div className="risk-tier-bar">
                <div className="tier-pill tier-very-high">Very High (≥75): <strong>{riskDistribution.veryHigh}</strong></div>
                <div className="tier-pill tier-high">High (50-74): <strong>{riskDistribution.high}</strong></div>
                <div className="tier-pill tier-moderate">Moderate (25-49): <strong>{riskDistribution.moderate}</strong></div>
                <div className="tier-pill tier-low">Low (&lt;25): <strong>{riskDistribution.low}</strong></div>
                <div className="tier-pill tier-insufficient">Insufficient Evidence: <strong>{riskDistribution.insufficient}</strong></div>
              </div>
            </div>
          </div>

          {/* Section 2: Municipal Priority Ranking Summary */}
          <div className="report-section">
            <h2 className="section-title">2. Capital Funding Priority Ranking</h2>
            <p className="section-desc">
              Candidates are ordered deterministically by the cost + impact prioritization engine based on Need (50%), Impact (30%), and Cost Efficiency (20%). Costs and temperature reductions are indicative planning estimates.
            </p>

            <table className="report-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Ward Name (Zone ID)</th>
                  <th>Risk Score & Tier</th>
                  <th>Planning Priority</th>
                  <th>Recommended Cooling Intervention</th>
                  <th>Indicative Cost (INR)</th>
                  <th>Indicative Impact</th>
                </tr>
              </thead>
              <tbody>
                {prioritizationResult.rankedPriorities.map((item) => (
                  <tr key={item.zoneId}>
                    <td>
                      <span className="rank-badge">#{item.rank}</span>
                    </td>
                    <td>
                      <strong>{item.wardName}</strong>
                      <div className="sub-text">{item.zoneId}</div>
                    </td>
                    <td>
                      <strong>{item.riskScore?.totalScore} / 100</strong>
                      <div className="sub-text">{item.riskBand?.replace(/_/g, ' ')}</div>
                    </td>
                    <td>
                      <strong style={{ color: (item.priorityScore ?? 0) >= 75 ? '#EF4444' : (item.priorityScore ?? 0) >= 50 ? '#F97316' : '#EAB308' }}>
                        {item.priorityScore} / 100
                      </strong>
                    </td>
                    <td>
                      <strong>{item.interventionName}</strong>
                      <div className="sub-text">Co-benefit: {item.recommendedIntervention?.impact?.coBenefits?.[0] || 'Supports heat-exposure protection'}</div>
                    </td>
                    <td>
                      <strong>{formatCurrencyINR(item.indicativeCost)}</strong>
                      <div className="sub-text"><ProvenanceBadge status={item.costStatus} /></div>
                    </td>
                    <td>
                      <strong style={{ color: '#10B981' }}>
                        {item.indicativeImpact !== null ? `-${item.indicativeImpact}°C` : 'N/A'}
                      </strong>
                      <div className="sub-text"><ProvenanceBadge status={item.impactStatus} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Detailed Ward Risk & Funding Analysis */}
          <div className="report-section page-break-before">
            <h2 className="section-title">3. Detailed Ward Assessments & Interventions</h2>
            
            <div className="ward-breakdown-list">
              {prioritizationResult.rankedPriorities.map((item) => (
                <div key={item.zoneId} className="ward-report-card">
                  <div className="ward-card-header">
                    <div>
                      <span className="rank-badge" style={{ fontSize: '0.9rem', marginRight: '8px' }}>RANK #{item.rank}</span>
                      <h3 style={{ display: 'inline', fontSize: '1.2rem', fontWeight: 700 }}>{item.wardName}</h3>
                      <span className="sub-text" style={{ marginLeft: '8px' }}>({item.zoneId})</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="info-tag">Risk Score: {item.riskScore?.totalScore}/100</span>
                      <span className="info-tag" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
                        Priority: {item.priorityScore}/100
                      </span>
                    </div>
                  </div>

                  <div className="ward-card-grid">
                    <div>
                      <div className="mini-label">RECOMMENDED COOLING INTERVENTION</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: '2px 0' }}>
                        {item.interventionName}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {item.recommendedIntervention?.description}
                      </div>
                    </div>

                    <div className="triplet-box">
                      <div>
                        <span className="mini-label">INDICATIVE COST</span>
                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatCurrencyINR(item.indicativeCost)}</div>
                        <ProvenanceBadge status={item.costStatus} />
                      </div>
                      <div>
                        <span className="mini-label">INDICATIVE TEMP REDUCTION</span>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10B981' }}>
                          {item.indicativeImpact !== null ? `-${item.indicativeImpact}°C` : 'N/A'}
                        </div>
                        <ProvenanceBadge status={item.impactStatus} />
                      </div>
                    </div>
                  </div>

                  {/* Triplet Score Contribution Breakdown */}
                  <div style={{ marginTop: '10px' }}>
                    <span className="mini-label">PRIORITIZATION SCORE CONTRIBUTION</span>
                    <div className="contrib-triplet">
                      <div>Need (50%): <strong>{item.breakdown.needComponent.obtainedScore?.toFixed(1) ?? 'N/A'}/50</strong></div>
                      <div>Impact (30%): <strong>{item.breakdown.impactComponent.obtainedScore?.toFixed(1) ?? 'N/A'}/30</strong></div>
                      <div>Cost Efficiency (20%): <strong>{item.breakdown.costEfficiencyComponent.obtainedScore?.toFixed(1) ?? 'N/A'}/20</strong></div>
                    </div>
                  </div>

                  {/* Justification Rationale */}
                  <div className="rationale-box">
                    <strong>Funding Justification:</strong> "{item.explanation}"
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Insufficient Evidence Wards Audit (Sholinganallur Check) */}
          <div className="report-section">
            <h2 className="section-title">4. Insufficient Evidence Audit & Unranked Zones</h2>
            <p className="section-desc">
              Zones lacking physical heat or vegetation indicators are strictly excluded from numerical scoring and priority ranking to preserve physical provenance.
            </p>

            {prioritizationResult.unrankedInsufficientEvidence.length > 0 ? (
              <div className="unranked-card">
                {prioritizationResult.unrankedInsufficientEvidence.map((item) => (
                  <div key={item.zoneId} className="unranked-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{item.wardName} ({item.zoneId})</strong>
                      <span className="insufficient-badge">● INSUFFICIENT EVIDENCE</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {item.explanation}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#F59E0B', fontWeight: 600, marginTop: '4px' }}>
                      Missing Required Indicators: {item.missingFields.join(', ').replace(/_/g, ' ')}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                      Audit Status: Unranked. Risk Score: N/A (null). Priority Rank: N/A (null). No Fallback Cooling Action Manufactured.
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="all-valid-box">
                <CheckCircle size={16} color="#10B981" />
                <span>All wards in active dataset possess sufficient physical evidence for scoring.</span>
              </div>
            )}
          </div>

          {/* Section 5: Official Disclaimers & Provenance Policy */}
          <div className="report-section report-disclaimer-box">
            <h2 className="section-title" style={{ fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} color="#F59E0B" /> Official Municipal Planning Disclaimers & Provenance Standards
            </h2>
            <ul style={{ margin: '8px 0 0 18px', padding: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li>
                <strong>Indicative Estimate Notice:</strong> All cooling intervention costs, temperature reduction impacts, and priority scores presented in this report are indicative planning estimates generated for decision support. They do not constitute scientific performance guarantees or fixed contractor quotes.
              </li>
              <li>
                <strong>GIS Spatial Disclaimer:</strong> Map markers and zonal representations use approximate point coordinates for illustrative visualization. Formal municipal administrative boundaries are not represented in this MVP interface.
              </li>
              <li>
                <strong>Missing Data Integrity Policy:</strong> Physical heat and vegetation deficits are evaluated from satellite thermal infrared proxies. Missing values remain explicitly preserved as <code>null</code> and are never converted to zero.
              </li>
            </ul>
          </div>

          {/* Footer */}
          <div className="report-footer">
            <div>RESPIRE Platform &bull; Urban Heat Reduction & Climate Resilience Platform &bull; Hackathon MVP</div>
            <div>Report Generated: {formattedDate}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
