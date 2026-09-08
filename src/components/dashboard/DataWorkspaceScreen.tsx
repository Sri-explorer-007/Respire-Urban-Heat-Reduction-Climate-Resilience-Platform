import React, { useState, useEffect, useMemo, useRef } from 'react';
import { respireWorkspaceService, DatasetMetadata } from '../../core/services/data/workspaceService';
import { parseWardZoneCSV, CSVParseResult, getCSVTemplateContent } from '../../core/services/data/csvParser';
import { respireScoringEngine } from '../../core/services/scoring/scoringEngine';
import { ZoneRiskScore } from '../../core/types/scoring';
import { WardZone } from '../../core/types/zone';
import { 
  Database, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Info,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';

export type DecisionReadiness = 'READY' | 'READY_WITH_WARNINGS' | 'NOT_READY';

interface ScoredWorkspaceItem {
  zone: WardZone;
  riskScore: ZoneRiskScore;
}

interface DataWorkspaceScreenProps {
  onNavigateToIdentify: () => void;
}

export const DataWorkspaceScreen: React.FC<DataWorkspaceScreenProps> = ({ onNavigateToIdentify }) => {
  const [metadata, setMetadata] = useState<DatasetMetadata>(respireWorkspaceService.getActiveMetadata());
  const [activeZones, setActiveZones] = useState<WardZone[]>(respireWorkspaceService.getActiveZones());
  const [hasCustom, setHasCustom] = useState<boolean>(respireWorkspaceService.hasCustomDataset());
  
  // CSV Upload & Validation Preview State
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [showColumnGuide, setShowColumnGuide] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadWorkspaceData = () => {
      setMetadata(respireWorkspaceService.getActiveMetadata());
      setActiveZones(respireWorkspaceService.getActiveZones());
      setHasCustom(respireWorkspaceService.hasCustomDataset());
    };

    loadWorkspaceData();
    const unsubscribe = respireWorkspaceService.subscribe(loadWorkspaceData);
    return unsubscribe;
  }, []);

  // Pass active dataset through domain scoring engine deterministically
  const scoredWorkspaceItems: ScoredWorkspaceItem[] = useMemo(() => {
    return activeZones.map(zone => ({
      zone,
      riskScore: respireScoringEngine.calculateZoneRisk(zone)
    }));
  }, [activeZones]);

  // 1. Dataset Spatial Mapping Metrics
  const mappedCount = useMemo(() => {
    return activeZones.filter(z => 
      z.latitude !== null && z.latitude !== undefined && !isNaN(z.latitude) && z.latitude >= -90 && z.latitude <= 90 &&
      z.longitude !== null && z.longitude !== undefined && !isNaN(z.longitude) && z.longitude >= -180 && z.longitude <= 180
    ).length;
  }, [activeZones]);

  const unmappedCount = activeZones.length - mappedCount;

  // 2. Data Completeness Score (Average Zone Completeness)
  const datasetCompletenessPercent = useMemo(() => {
    if (scoredWorkspaceItems.length === 0) return 0;
    const totalCompleteness = scoredWorkspaceItems.reduce((sum, item) => sum + item.riskScore.completeness, 0);
    return Math.round((totalCompleteness / scoredWorkspaceItems.length) * 100);
  }, [scoredWorkspaceItems]);

  // 3. Risk Distribution Summary
  const riskDistribution = useMemo(() => {
    const counts = {
      VERY_HIGH: 0,
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
      INSUFFICIENT_EVIDENCE: 0
    };

    scoredWorkspaceItems.forEach(item => {
      if (item.riskScore.totalScore === null || item.riskScore.riskTier === 'INSUFFICIENT_EVIDENCE') {
        counts.INSUFFICIENT_EVIDENCE += 1;
      } else {
        counts[item.riskScore.riskTier] += 1;
      }
    });

    return counts;
  }, [scoredWorkspaceItems]);

  // 4. Data Gaps Breakdown
  const dataGaps = useMemo(() => {
    const total = activeZones.length || 1;
    const missingHeat = activeZones.filter(z => z.heat.lstNormalized === null).length;
    const missingVeg = activeZones.filter(z => z.vegetation.vegetationDeficitNormalized === null).length;
    const missingVuln = activeZones.filter(z => z.vulnerability.vulnerabilityScore === null).length;
    const missingCoords = unmappedCount;

    return [
      { name: 'Heat Exposure (LST Surface Temp)', missing: missingHeat, percent: Math.round((missingHeat / total) * 100) },
      { name: 'Vegetation Canopy Deficit', missing: missingVeg, percent: Math.round((missingVeg / total) * 100) },
      { name: 'Social Vulnerability Index', missing: missingVuln, percent: Math.round((missingVuln / total) * 100) },
      { name: 'Geographic Coordinates (Lat/Lng)', missing: missingCoords, percent: Math.round((missingCoords / total) * 100) }
    ];
  }, [activeZones, unmappedCount]);

  // 5. Deterministic Key Findings
  const keyFindings = useMemo(() => {
    const findings: string[] = [];
    
    if (scoredWorkspaceItems.length === 0) {
      return ['No active zones found in the selected dataset.'];
    }

    if (riskDistribution.VERY_HIGH > 0) {
      findings.push(`${riskDistribution.VERY_HIGH} ward(s) are classified as VERY HIGH risk requiring immediate priority cooling intervention.`);
    }

    if (riskDistribution.HIGH > 0) {
      findings.push(`${riskDistribution.HIGH} ward(s) demonstrate HIGH risk levels due to compound heat and vulnerability factors.`);
    }

    if (riskDistribution.INSUFFICIENT_EVIDENCE > 0) {
      findings.push(`${riskDistribution.INSUFFICIENT_EVIDENCE} ward(s) cannot be fully assessed because required physical heat or vegetation indicators are missing.`);
    } else {
      findings.push('All wards in this dataset have complete physical indicator coverage for risk evaluation.');
    }

    if (unmappedCount > 0) {
      findings.push(`${unmappedCount} ward(s) lack geographic coordinates and will rely solely on non-map decision analysis.`);
    }

    // Dominant Driver Analysis across analyzed zones
    const validScores = scoredWorkspaceItems.filter(s => s.riskScore.primaryDriver !== null);
    if (validScores.length > 0) {
      const driverCounts: Record<string, number> = {};
      validScores.forEach(s => {
        const driver = s.riskScore.primaryDriver!;
        driverCounts[driver] = (driverCounts[driver] || 0) + 1;
      });
      const topDriver = Object.entries(driverCounts).sort((a, b) => b[1] - a[1])[0];
      if (topDriver) {
        findings.push(`Primary risk driver across high-risk wards: ${topDriver[0]}.`);
      }
    }

    return findings;
  }, [scoredWorkspaceItems, riskDistribution, unmappedCount]);

  // 6. Decision Readiness Status Determination
  const decisionReadiness: DecisionReadiness = useMemo(() => {
    if (activeZones.length === 0 || metadata.validationErrorCount > 0 || metadata.analyzableZoneCount === 0) {
      return 'NOT_READY';
    }
    if (metadata.insufficientEvidenceCount > 0 || unmappedCount > 0 || metadata.validationWarningCount > 0) {
      return 'READY_WITH_WARNINGS';
    }
    return 'READY';
  }, [activeZones, metadata, unmappedCount]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const result = parseWardZoneCSV(content);
        setParseResult(result);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadDataset = () => {
    if (!parseResult || parseResult.totalErrors > 0) return;
    const datasetName = uploadedFileName.replace(/\.csv$/i, '').replace(/_/g, ' ');
    respireWorkspaceService.loadCustomDataset(
      parseResult.zones,
      datasetName || 'User Uploaded Dataset',
      uploadedFileName,
      parseResult.totalErrors,
      parseResult.totalWarnings
    );
    setParseResult(null);
  };

  const handleCancelPreview = () => {
    setParseResult(null);
    setUploadedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const templateText = getCSVTemplateContent();
    const blob = new Blob([templateText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'respire_zone_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isDemoActive = metadata.isDemo;

  return (
    <div className="workspace-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stage Disclosure Banner */}
      <div className="data-disclosure-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={16} color="#3B82F6" />
          <span>
            <strong>RESPIRE DATA WORKSPACE</strong> &mdash; Municipal assessment data import, validation, quality assessment, and decision readiness.
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>WORKFLOW STAGE 01 &bull; DATA WORKSPACE</span>
      </div>

      {/* Hero Summary & Decision Readiness Card */}
      <div className="workspace-hero-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              CURRENT ACTIVE DATASET
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 6px 0' }}>
              {metadata.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={`status-badge-${isDemoActive ? 'insufficient' : 'ready'}`}>
                {metadata.sourceLabel}
              </span>
              {metadata.uploadTimestamp && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  Loaded: {new Date(metadata.uploadTimestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Decision Readiness Status & Action CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Decision Readiness:</span>
              <span className={`status-badge-${decisionReadiness === 'READY' ? 'ready' : decisionReadiness === 'READY_WITH_WARNINGS' ? 'insufficient' : 'invalid'}`} style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                {decisionReadiness === 'READY' && '● READY FOR PLANNING'}
                {decisionReadiness === 'READY_WITH_WARNINGS' && '● READY WITH WARNINGS'}
                {decisionReadiness === 'NOT_READY' && '✕ NOT READY'}
              </span>
            </div>

            <button 
              className="action-button primary"
              onClick={onNavigateToIdentify}
              disabled={decisionReadiness === 'NOT_READY'}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '12px 20px', 
                fontSize: '0.95rem',
                opacity: decisionReadiness === 'NOT_READY' ? 0.5 : 1,
                cursor: decisionReadiness === 'NOT_READY' ? 'not-allowed' : 'pointer'
              }}
            >
              <span>{decisionReadiness === 'NOT_READY' ? 'Resolve Data Issues' : 'Continue to Risk Assessment'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Dataset Summary & Data Completeness Metrics Grid */}
        <div className="workspace-stats-grid" style={{ marginTop: '12px' }}>
          <div className="workspace-stat-box">
            <span className="stat-label">Total Wards / Zones</span>
            <span className="stat-value">{metadata.zoneCount}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Municipal planning units</span>
          </div>

          <div className="workspace-stat-box">
            <span className="stat-label">Mapped Geographically</span>
            <span className="stat-value" style={{ color: mappedCount === activeZones.length ? '#10B981' : '#FBBF24' }}>
              {mappedCount} / {metadata.zoneCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{unmappedCount > 0 ? `${unmappedCount} unmapped` : '100% mapped'}</span>
          </div>

          <div className="workspace-stat-box">
            <span className="stat-label">Analyzable Wards</span>
            <span className="stat-value" style={{ color: '#10B981' }}>{metadata.analyzableZoneCount}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sufficient evidence for risk score</span>
          </div>

          <div className="workspace-stat-box">
            <span className="stat-label">Insufficient Evidence</span>
            <span className="stat-value" style={{ color: metadata.insufficientEvidenceCount > 0 ? '#FBBF24' : '#10B981' }}>
              {metadata.insufficientEvidenceCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Requires satellite/ground data</span>
          </div>

          <div className="workspace-stat-box">
            <span className="stat-label">Data Completeness</span>
            <span className="stat-value" style={{ color: datasetCompletenessPercent >= 90 ? '#10B981' : '#FBBF24' }}>
              {datasetCompletenessPercent}%
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Average evidence completeness across zones in the active dataset</span>
          </div>
        </div>
      </div>

      {/* Grid Row 2: Validation Results & Data Gaps Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Validation Results Checklist Card */}
        <div className="workspace-hero-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <ShieldCheck size={18} color="#3B82F6" />
            <span>Dataset Validation & Integrity Report</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span>Zone Structure & Header Schema</span>
              </div>
              <span style={{ fontWeight: 700, color: '#10B981' }}>VALID</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                {unmappedCount === 0 ? <CheckCircle2 size={16} color="#10B981" /> : <AlertTriangle size={16} color="#FBBF24" />}
                <span>Geographic Lat/Lng Coordinates</span>
              </div>
              <span style={{ fontWeight: 700, color: unmappedCount === 0 ? '#10B981' : '#FBBF24' }}>
                {unmappedCount === 0 ? 'VALID' : `${unmappedCount} UNMAPPED`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                {dataGaps[0].missing === 0 ? <CheckCircle2 size={16} color="#10B981" /> : <AlertTriangle size={16} color="#FBBF24" />}
                <span>Heat Exposure Surface Temp</span>
              </div>
              <span style={{ fontWeight: 700, color: dataGaps[0].missing === 0 ? '#10B981' : '#FBBF24' }}>
                {dataGaps[0].missing === 0 ? 'COMPLETE' : `${dataGaps[0].missing} MISSING`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                {dataGaps[1].missing === 0 ? <CheckCircle2 size={16} color="#10B981" /> : <AlertTriangle size={16} color="#FBBF24" />}
                <span>Vegetation Canopy Deficit</span>
              </div>
              <span style={{ fontWeight: 700, color: dataGaps[1].missing === 0 ? '#10B981' : '#FBBF24' }}>
                {dataGaps[1].missing === 0 ? 'COMPLETE' : `${dataGaps[1].missing} MISSING`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                {dataGaps[2].missing === 0 ? <CheckCircle2 size={16} color="#10B981" /> : <AlertTriangle size={16} color="#FBBF24" />}
                <span>Social Vulnerability Indicators</span>
              </div>
              <span style={{ fontWeight: 700, color: dataGaps[2].missing === 0 ? '#10B981' : '#FBBF24' }}>
                {dataGaps[2].missing === 0 ? 'COMPLETE' : `${dataGaps[2].missing} MISSING`}
              </span>
            </div>
          </div>
        </div>

        {/* Data Gaps & Indicator Coverage Breakdown Card */}
        <div className="workspace-hero-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <FileSpreadsheet size={18} color="#F59E0B" />
            <span>Indicator Data Gaps & Missing Evidence</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
            Missing values remain explicitly <code>null</code> to preserve physical provenance. Missing values are never converted to zero.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dataGaps.map(gap => (
              <div key={gap.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{gap.name}</span>
                  <span style={{ color: gap.missing > 0 ? '#FBBF24' : '#10B981', fontFamily: 'var(--font-mono)' }}>
                    {gap.missing > 0 ? `${gap.missing} zone(s) missing (${gap.percent}%)` : '0 missing (100% complete)'}
                  </span>
                </div>

                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${100 - gap.percent}%`, 
                      height: '100%', 
                      backgroundColor: gap.missing > 0 ? '#FBBF24' : '#10B981',
                      borderRadius: '3px'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Row 3: Risk Distribution & Deterministic Key Findings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
        {/* Risk Tier Distribution Summary Card */}
        <div className="workspace-hero-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <BarChart3 size={18} color="#3B82F6" />
            <span>Dataset Risk Tier Distribution</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', borderLeft: '4px solid #EF4444' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>VERY HIGH RISK (≥ 75)</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#EF4444' }}>
                {riskDistribution.VERY_HIGH} Wards
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', borderLeft: '4px solid #F97316' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>HIGH RISK (50 – 74)</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#F97316' }}>
                {riskDistribution.HIGH} Wards
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', borderLeft: '4px solid #EAB308' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>MODERATE RISK (25 – 49)</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#EAB308' }}>
                {riskDistribution.MODERATE} Wards
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', borderLeft: '4px solid #10B981' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>LOW RISK (&lt; 25)</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#10B981' }}>
                {riskDistribution.LOW} Wards
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '6px', borderLeft: '4px solid #64748B' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>INSUFFICIENT EVIDENCE</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
                {riskDistribution.INSUFFICIENT_EVIDENCE} Wards
              </span>
            </div>
          </div>
        </div>

        {/* Deterministic Key Findings Card */}
        <div className="workspace-hero-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Info size={18} color="#3B82F6" />
            <span>Deterministic Key Analysis Findings</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            {keyFindings.map((finding, idx) => (
              <div 
                key={idx}
                style={{ 
                  backgroundColor: 'var(--bg-surface-elevated)', 
                  borderLeft: '3px solid #3B82F6', 
                  padding: '10px 14px', 
                  borderRadius: '0 6px 6px 0',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  color: 'var(--text-primary)'
                }}
              >
                {finding}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dataset Switching Control */}
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Select Active Dataset for Decision Support
        </div>

        <div className="dataset-switcher-grid">
          {/* Card 1: Demo Dataset */}
          <div 
            className={`switcher-card ${isDemoActive ? 'active' : ''}`}
            onClick={() => respireWorkspaceService.useDemoDataset()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Chennai Heat Assessment
              </span>
              {isDemoActive && <CheckCircle2 size={18} color="#3B82F6" />}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Illustrative Demo Data (10 Chennai Wards, 9 analyzable, 1 insufficient evidence zone).
            </p>
            <span style={{ fontSize: '0.75rem', color: '#60A5FA', fontFamily: 'var(--font-mono)' }}>
              Source: Illustrative Demo Satellite & Census Proxy
            </span>
          </div>

          {/* Card 2: Custom Uploaded Dataset */}
          <div 
            className={`switcher-card ${!isDemoActive ? 'active' : ''} ${!hasCustom ? 'disabled' : ''}`}
            onClick={() => {
              if (hasCustom) respireWorkspaceService.useCustomDataset();
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                User Uploaded Dataset
              </span>
              {!isDemoActive && <CheckCircle2 size={18} color="#3B82F6" />}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              {hasCustom 
                ? `${respireWorkspaceService.getCustomMetadata()?.name} (${respireWorkspaceService.getCustomMetadata()?.zoneCount} zones loaded)`
                : 'Upload a municipal CSV dataset below to activate custom risk scoring.'}
            </p>
            <span style={{ fontSize: '0.75rem', color: hasCustom ? '#10B981' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {hasCustom ? 'Status: Active in Memory' : 'Status: No Custom Dataset Loaded'}
            </span>
          </div>
        </div>
      </div>

      {/* CSV Dataset Upload & Validation Control */}
      <div className="workspace-hero-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Upload Municipal Assessment Dataset (.csv)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Upload your city ward assessment CSV to run the locked RESPIRE scoring, recommendation, and prioritization engines.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="action-button secondary" 
              onClick={handleDownloadTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <Download size={14} />
              <span>Download CSV Template</span>
            </button>

            <button 
              className="action-button secondary" 
              onClick={() => setShowColumnGuide(!showColumnGuide)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <Info size={14} />
              <span>{showColumnGuide ? 'Hide Format Guide' : 'Expected CSV Columns'}</span>
            </button>
          </div>
        </div>

        {/* Expected CSV Columns Reference Panel */}
        {showColumnGuide && (
          <div style={{ backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--bg-surface-border)', padding: '14px', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Expected CSV Header Contract:</div>
            <code style={{ display: 'block', backgroundColor: 'var(--bg-dark)', padding: '8px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#60A5FA', overflowX: 'auto' }}>
              zoneId, wardName, wardId, district, latitude, longitude, heatExposure, vegetationDeficit, socialVulnerability, builtEnvironment, outdoorWorkerExposure
            </code>
            <div style={{ marginTop: '8px', fontSize: '0.78rem', lineHeight: 1.4 }}>
              <strong>Missing values policy:</strong> Empty cells, <code>"null"</code>, or <code>"N/A"</code> will be strictly parsed as <code>null</code> to preserve physical missing evidence status.
            </div>
          </div>
        )}

        {/* Dropzone File Input */}
        <label className="csv-upload-dropzone">
          <Upload size={32} color="#3B82F6" />
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            Click to Select or Drop Ward Dataset (.csv)
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Supports standard CSV files with ward heat, vegetation deficit, and vulnerability columns.
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".csv" 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />
        </label>
      </div>

      {/* Validation & Data Preview Section (Appears after file selection) */}
      {parseResult && (
        <div className="workspace-hero-card" style={{ border: parseResult.totalErrors === 0 ? '2px solid #10B981' : '2px solid #EF4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {parseResult.totalErrors === 0 ? (
                <ShieldCheck size={24} color="#10B981" />
              ) : (
                <AlertCircle size={24} color="#EF4444" />
              )}
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  DATASET VALIDATION PREVIEW &mdash; {uploadedFileName}
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Parsed {parseResult.totalRows} row(s) &bull; {parseResult.validRowCount} valid &bull; {parseResult.analyzableCount} analyzable &bull; {parseResult.insufficientEvidenceCount} insufficient evidence
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="action-button secondary" 
                onClick={handleCancelPreview}
              >
                Cancel
              </button>

              <button 
                className="action-button primary" 
                onClick={handleLoadDataset}
                disabled={parseResult.totalErrors > 0}
                style={{ opacity: parseResult.totalErrors > 0 ? 0.5 : 1, cursor: parseResult.totalErrors > 0 ? 'not-allowed' : 'pointer' }}
              >
                Load Dataset into RESPIRE
              </button>
            </div>
          </div>

          {/* Validation Issues Log */}
          {(parseResult.totalErrors > 0 || parseResult.totalWarnings > 0) && (
            <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--bg-surface-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                Validation Issues ({parseResult.totalErrors} Errors, {parseResult.totalWarnings} Warnings)
              </div>
              {parseResult.validationResults.flatMap(r => r.issues).map((issue, idx) => (
                <div key={idx} style={{ fontSize: '0.78rem', color: issue.severity === 'ERROR' ? '#EF4444' : '#FBBF24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {issue.severity === 'ERROR' ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
                  <span>[{issue.severity}] <strong>{issue.field}</strong>: {issue.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Compact Data Preview Table */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Parsed Ward Row Data Preview ({parseResult.zones.length} Zones)
            </div>

            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Zone ID</th>
                    <th>Ward Name</th>
                    <th>Heat Exposure</th>
                    <th>Veg Deficit</th>
                    <th>Vulnerability</th>
                    <th>Row Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.zones.map((zone, i) => {
                    const heatVal = zone.heat.lstNormalized !== null ? `${(zone.heat.lstNormalized * 100).toFixed(0)}%` : 'null';
                    const vegVal = zone.vegetation.vegetationDeficitNormalized !== null ? `${(zone.vegetation.vegetationDeficitNormalized * 100).toFixed(0)}%` : 'null';
                    const vulnVal = zone.vulnerability.vulnerabilityScore !== null ? `${(zone.vulnerability.vulnerabilityScore * 100).toFixed(0)}%` : 'null';

                    const isRowValid = parseResult.validationResults[i]?.isValid;
                    const isAnalyzable = zone.heat.lstNormalized !== null && zone.vegetation.vegetationDeficitNormalized !== null;

                    let rowStatusClass = 'status-badge-ready';
                    let rowStatusLabel = 'READY';
                    if (!isRowValid) {
                      rowStatusClass = 'status-badge-invalid';
                      rowStatusLabel = 'INVALID';
                    } else if (!isAnalyzable) {
                      rowStatusClass = 'status-badge-insufficient';
                      rowStatusLabel = 'INSUFFICIENT EVIDENCE';
                    }

                    return (
                      <tr key={zone.zoneId || i}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{zone.zoneId}</td>
                        <td>{zone.wardName}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{heatVal}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{vegVal}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{vulnVal}</td>
                        <td>
                          <span className={rowStatusClass}>{rowStatusLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
