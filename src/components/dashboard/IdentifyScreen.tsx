import React, { useState, useEffect, useMemo } from 'react';
import { respireApi } from '../../api/respireApi';
import { WardZone } from '../../core/types/zone';
import { ZoneRiskScore } from '../../core/types/scoring';
import { respireScoringEngine } from '../../core/services/scoring/scoringEngine';
import { RiskSummaryCards } from './RiskSummaryCards';
import { RiskMap } from './RiskMap';
import { SelectedZonePanel } from './SelectedZonePanel';
import { AlertCircle, Layers } from 'lucide-react';

interface ScoredZoneItem {
  zone: WardZone;
  riskScore: ZoneRiskScore;
}

interface IdentifyScreenProps {
  selectedZoneId?: string | null;
  onSelectZone?: (zoneId: string) => void;
}

export const IdentifyScreen: React.FC<IdentifyScreenProps> = ({ 
  selectedZoneId: propSelectedZoneId, 
  onSelectZone: propOnSelectZone 
}) => {
  const [zones, setZones] = useState<WardZone[]>([]);
  const [internalZoneId, setInternalZoneId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const selectedZoneId = propSelectedZoneId !== undefined ? propSelectedZoneId : internalZoneId;

  const handleSelectZone = (id: string) => {
    if (propOnSelectZone) {
      propOnSelectZone(id);
    } else {
      setInternalZoneId(id);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await respireApi.getWardZones();
      setZones(data);
      if (data.length > 0 && !selectedZoneId) {
        // Default select Ward 045 (Vyasarpadi - highest risk candidate)
        const defaultZone = data.find(z => z.wardId === 'WARD-045' || z.zoneId === 'ZONE-CHN-W045') || data[0];
        const defaultId = defaultZone.zoneId || defaultZone.id || null;
        if (defaultId) handleSelectZone(defaultId);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  // Pass every zone through the domain scoring engine deterministically
  const scoredZones: ScoredZoneItem[] = useMemo(() => {
    return zones.map(zone => ({
      zone,
      riskScore: respireScoringEngine.calculateZoneRisk(zone)
    }));
  }, [zones]);

  const selectedScoredItem = useMemo(() => {
    if (!selectedZoneId) return null;
    return scoredZones.find(item => (item.zone.zoneId || item.zone.id) === selectedZoneId) || null;
  }, [scoredZones, selectedZoneId]);

  if (loading) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading RESPIRE zone data & running risk scoring engine...
      </div>
    );
  }

  return (
    <div className="identify-container">
      {/* Disclosure Banner */}
      <div className="data-disclosure-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color="#F59E0B" />
          <span>
            <strong>Illustrative Demo Data Active</strong> &mdash; All 10 Chennai wards are evaluated live through the domain scoring engine.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>IDENTIFY WORKFLOW STAGE 01</span>
        </div>
      </div>

      {/* Summary Cards */}
      <RiskSummaryCards scoredZones={scoredZones} />

      {/* Zone Quick Switch Selector (Accessibility & Keyboard Access) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-surface)', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--bg-surface-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Layers size={15} color="#3B82F6" />
          <span>Select Ward/Zone:</span>
        </div>
        <select 
          value={selectedZoneId || ''} 
          onChange={(e) => handleSelectZone(e.target.value)}
          aria-label="Select Chennai Ward for Risk Details"
          style={{ 
            backgroundColor: 'var(--bg-surface-elevated)', 
            color: 'var(--text-primary)', 
            border: '1px solid var(--bg-surface-border)', 
            padding: '6px 12px', 
            borderRadius: '4px',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          {scoredZones.map(({ zone, riskScore }) => {
            const id = zone.zoneId || zone.id;
            const name = zone.wardName || zone.zoneName;
            const scoreStr = riskScore.totalScore !== null ? `${Math.round(riskScore.totalScore)}/100 [${riskScore.riskTier}]` : 'INSUFFICIENT EVIDENCE';
            return (
              <option key={id} value={id}>
                {name} &mdash; {scoreStr}
              </option>
            );
          })}
        </select>
      </div>

      {/* Main Grid: Map & Details */}
      <div className="identify-main-grid">
        <RiskMap 
          scoredZones={scoredZones} 
          selectedZoneId={selectedZoneId} 
          onSelectZone={(id) => handleSelectZone(id)} 
        />

        <SelectedZonePanel 
          zone={selectedScoredItem?.zone || null} 
          riskScore={selectedScoredItem?.riskScore || null} 
        />
      </div>
    </div>
  );
};
