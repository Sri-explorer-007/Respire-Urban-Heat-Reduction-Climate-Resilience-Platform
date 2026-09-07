import React, { useState } from 'react';
import { WardZone } from '../../core/types/zone';
import { ZoneRiskScore } from '../../core/types/scoring';
import { RiskLegend } from './RiskLegend';
import { MapPin, Info } from 'lucide-react';

interface ScoredZoneItem {
  zone: WardZone;
  riskScore: ZoneRiskScore;
}

interface RiskMapProps {
  scoredZones: ScoredZoneItem[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}

export const RiskMap: React.FC<RiskMapProps> = ({ scoredZones, selectedZoneId, onSelectZone }) => {
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  // Map Bounds for Chennai Demo Dataset
  const minLat = 12.8800;
  const maxLat = 13.1400;
  const minLng = 80.1300;
  const maxLng = 80.3200;

  const width = 800;
  const height = 480;
  const padding = 60;

  const projectCoords = (lat: number | null, lng: number | null) => {
    if (lat === null || lng === null) return { x: width / 2, y: height / 2 };
    const x = padding + ((lng - minLng) / (maxLng - minLng)) * (width - 2 * padding);
    // Invert lat for SVG Y axis
    const y = height - padding - ((lat - minLat) / (maxLat - minLat)) * (height - 2 * padding);
    return { x, y };
  };

  const getMarkerColor = (riskScore: ZoneRiskScore) => {
    const isMissingHeatAndVeg = riskScore.breakdown.heatExposure.isMissing && riskScore.breakdown.vegetationDeficit.isMissing;
    if (riskScore.totalScore === null || isMissingHeatAndVeg || riskScore.confidence === 'INSUFFICIENT_EVIDENCE') {
      return '#64748B'; // Neutral Slate
    }
    const score = Math.round(riskScore.totalScore);
    if (score >= 75) return '#EF4444'; // Red
    if (score >= 50) return '#F97316'; // Orange
    if (score >= 25) return '#EAB308'; // Yellow
    return '#10B981'; // Green
  };

  return (
    <div className="map-card">
      <div className="map-header">
        <div className="map-title-group">
          <h2 className="map-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="#3B82F6" />
            <span>Chennai Urban Heat & Vulnerability Risk Map</span>
          </h2>
          <span className="map-subtitle">Click any ward marker to inspect heat risk drivers & components</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--provenance-estimate)', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <Info size={13} />
          <span>Illustrative Demo Map &mdash; relative zone positioning</span>
        </div>
      </div>

      <div className="schematic-map-canvas">
        <svg 
          className="schematic-svg" 
          viewBox={`0 0 ${width} ${height}`} 
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Chennai Ward Risk Map"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="2,2" />
            </pattern>
            {/* Bay of Bengal Coast Gradient */}
            <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0B1329" stopOpacity="0" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Background Grid */}
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Bay of Bengal Label & Shading (East side) */}
          <rect x={width - 120} y={0} width={120} height={height} fill="url(#oceanGrad)" />
          <text x={width - 40} y={height / 2} fill="#3B82F6" fontSize="11" fontWeight="600" opacity="0.6" letterSpacing="2" transform={`rotate(90, ${width - 40}, ${height / 2})`}>
            BAY OF BENGAL (EAST)
          </text>

          {/* Inter-zone connection grid lines (schematic network) */}
          {scoredZones.map((itemA, i) => {
            const latA = itemA.zone.latitude;
            const lngA = itemA.zone.longitude;
            if (latA === null || lngA === null) return null;
            const posA = projectCoords(latA, lngA);
            return scoredZones.slice(i + 1).map((itemB, j) => {
              const latB = itemB.zone.latitude;
              const lngB = itemB.zone.longitude;
              if (latB === null || lngB === null) return null;
              const dist = Math.hypot(latA - latB, lngA - lngB);
              if (dist < 0.08) {
                const posB = projectCoords(latB, lngB);
                return (
                  <line 
                    key={`link-${i}-${j}`} 
                    x1={posA.x} y1={posA.y} 
                    x2={posB.x} y2={posB.y} 
                    stroke="#1E293B" 
                    strokeWidth="1" 
                    strokeDasharray="4,4" 
                  />
                );
              }
              return null;
            });
          })}

          {/* Zone Markers */}
          {scoredZones.map(({ zone, riskScore }) => {
            const { x, y } = projectCoords(zone.latitude, zone.longitude);
            const isSelected = (zone.zoneId || zone.id) === selectedZoneId;
            const isHovered = (zone.zoneId || zone.id) === hoveredZoneId;
            const markerColor = getMarkerColor(riskScore);
            const wardName = zone.wardName || zone.zoneName || zone.name || zone.zoneId;
            const scoreLabel = riskScore.totalScore !== null ? `${Math.round(riskScore.totalScore)}` : 'N/A';

            return (
              <g 
                key={zone.zoneId || zone.id}
                className="map-marker"
                onClick={() => onSelectZone(zone.zoneId || zone.id!)}
                onMouseEnter={() => setHoveredZoneId(zone.zoneId || zone.id!)}
                onMouseLeave={() => setHoveredZoneId(null)}
              >
                {/* Outer Glow Ring for Selected Zone */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={24}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                    opacity="0.9"
                  />
                )}

                {/* Pulsing ring for Very High Risk */}
                {riskScore.riskTier === 'VERY_HIGH' && (
                  <circle
                    cx={x}
                    cy={y}
                    r={18}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                )}

                {/* Base Marker Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected || isHovered ? 14 : 11}
                  fill={markerColor}
                  stroke={isSelected ? '#FFFFFF' : '#0B0F17'}
                  strokeWidth={isSelected ? 3 : 2}
                />

                {/* Score Number inside Marker */}
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  pointerEvents="none"
                >
                  {scoreLabel}
                </text>

                {/* Ward Name Label */}
                <text
                  x={x}
                  y={y + (isSelected ? 28 : 25)}
                  textAnchor="middle"
                  fill={isSelected ? '#FFFFFF' : 'var(--text-secondary)'}
                  fontSize={isSelected ? '11' : '10'}
                  fontWeight={isSelected ? '700' : '500'}
                  pointerEvents="none"
                >
                  {wardName.replace(/^Ward \d+ - /, '')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <RiskLegend />
    </div>
  );
};
