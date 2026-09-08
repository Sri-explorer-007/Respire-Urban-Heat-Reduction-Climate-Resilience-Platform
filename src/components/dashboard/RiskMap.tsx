import React, { useState, useMemo } from 'react';
import { WardZone } from '../../core/types/zone';
import { ZoneRiskScore } from '../../core/types/scoring';
import { RiskLegend } from './RiskLegend';
import { MapPin, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Layers, ChevronRight, Check } from 'lucide-react';

export interface ScoredZoneItem {
  zone: WardZone;
  riskScore: ZoneRiskScore;
}

interface RiskMapProps {
  scoredZones: ScoredZoneItem[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  onNavigateToExplain?: () => void;
}

export const RiskMap: React.FC<RiskMapProps> = ({ 
  scoredZones, 
  selectedZoneId, 
  onSelectZone,
  onNavigateToExplain 
}) => {
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [showZoneList, setShowZoneList] = useState<boolean>(true);

  // SVG Canvas dimensions
  const width = 800;
  const height = 480;
  const padding = 60;

  // 1. Separate valid mapped zones from unmapped zones (missing/invalid coordinates)
  const { mappedItems, unmappedItems, bounds } = useMemo(() => {
    const mapped: ScoredZoneItem[] = [];
    const unmapped: ScoredZoneItem[] = [];

    scoredZones.forEach(item => {
      const lat = item.zone.latitude;
      const lng = item.zone.longitude;
      if (
        lat !== null && lat !== undefined && !isNaN(lat) && lat >= -90 && lat <= 90 &&
        lng !== null && lng !== undefined && !isNaN(lng) && lng >= -180 && lng <= 180
      ) {
        mapped.push(item);
      } else {
        unmapped.push(item);
      }
    });

    if (mapped.length === 0) {
      return {
        mappedItems: [],
        unmappedItems: unmapped,
        bounds: { minLat: 12.9, maxLat: 13.1, minLng: 80.1, maxLng: 80.3 }
      };
    }

    let minLat = Math.min(...mapped.map(m => m.zone.latitude!));
    let maxLat = Math.max(...mapped.map(m => m.zone.latitude!));
    let minLng = Math.min(...mapped.map(m => m.zone.longitude!));
    let maxLng = Math.max(...mapped.map(m => m.zone.longitude!));

    // Expand bounding box by 12% padding for visual safety
    let latSpan = maxLat - minLat;
    let lngSpan = maxLng - minLng;

    if (latSpan === 0) latSpan = 0.05;
    if (lngSpan === 0) lngSpan = 0.05;

    minLat -= latSpan * 0.12;
    maxLat += latSpan * 0.12;
    minLng -= lngSpan * 0.12;
    maxLng += lngSpan * 0.12;

    return {
      mappedItems: mapped,
      unmappedItems: unmapped,
      bounds: { minLat, maxLat, minLng, maxLng }
    };
  }, [scoredZones]);

  // Dynamic Mercator projection function
  const projectCoords = (lat: number, lng: number) => {
    const { minLat, maxLat, minLng, maxLng } = bounds;
    
    // Scale according to zoom level centered on center point
    const normX = (lng - minLng) / (maxLng - minLng);
    const normY = (lat - minLat) / (maxLat - minLat);

    const centerX = width / 2;
    const centerY = height / 2;

    const rawX = padding + normX * (width - 2 * padding);
    const rawY = height - padding - normY * (height - 2 * padding); // Inverted Y axis for SVG

    // Apply zoom transformation around center
    const x = centerX + (rawX - centerX) * zoomLevel;
    const y = centerY + (rawY - centerY) * zoomLevel;

    return { x, y };
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.3, 2.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.3, 0.8));
  const handleResetMap = () => setZoomLevel(1.0);

  const getMarkerColor = (riskScore: ZoneRiskScore) => {
    const isMissingHeatAndVeg = riskScore.breakdown.heatExposure.isMissing && riskScore.breakdown.vegetationDeficit.isMissing;
    if (riskScore.totalScore === null || isMissingHeatAndVeg || riskScore.confidence === 'INSUFFICIENT_EVIDENCE') {
      return '#64748B'; // Slate Grey for Insufficient Evidence
    }
    const score = Math.round(riskScore.totalScore);
    if (score >= 75) return '#EF4444'; // Red
    if (score >= 50) return '#F97316'; // Orange
    if (score >= 25) return '#EAB308'; // Yellow
    return '#10B981'; // Green
  };

  // Find active hovered or selected zone for detail popup overlay
  const activePopupItem = useMemo(() => {
    const activeId = hoveredZoneId || selectedZoneId;
    if (!activeId) return null;
    return scoredZones.find(item => (item.zone.zoneId || item.zone.id) === activeId) || null;
  }, [scoredZones, hoveredZoneId, selectedZoneId]);

  return (
    <div className="map-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header Bar with Title & Map Quality Metrics */}
      <div className="map-header">
        <div className="map-title-group">
          <h2 className="map-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <MapPin size={18} color="#3B82F6" />
            <span>Urban Heat Risk Map</span>
          </h2>
          <span className="map-subtitle">Geographic view of assessed zones</span>
        </div>
        
        {/* Map Quality & Controls Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-elevated)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--bg-surface-border)' }}>
            <span>Mapped: <strong style={{ color: '#10B981' }}>{mappedItems.length}</strong> / {scoredZones.length}</span>
            {unmappedItems.length > 0 && (
              <span style={{ color: '#F59E0B' }}>({unmappedItems.length} unmapped)</span>
            )}
          </div>

          <button
            className="action-button secondary"
            onClick={() => setShowZoneList(!showZoneList)}
            style={{ fontSize: '0.78rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Toggle Accessible Zone List"
          >
            <Layers size={13} />
            <span>{showZoneList ? 'Hide List' : 'Zone List'}</span>
          </button>
        </div>
      </div>

      {/* Unmapped Coordinates Warning Banner */}
      {unmappedItems.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#FBBF24', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <AlertTriangle size={14} />
          <span>
            <strong>{unmappedItems.length} zone(s)</strong> could not be mapped geographically because coordinates are unavailable or invalid. They remain fully available in the zone list and non-map analysis.
          </span>
        </div>
      )}

      {/* Map Content Grid: Map Canvas + Accessible Companion Zone List */}
      <div style={{ display: 'grid', gridTemplateColumns: showZoneList ? '1fr 260px' : '1fr', gap: '14px', alignItems: 'stretch' }}>
        {/* Main Map SVG Canvas Container */}
        <div className="schematic-map-canvas" style={{ position: 'relative', width: '100%', height: '480px' }}>
          {/* Map Controls Floating Overlay */}
          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface)', padding: '4px', borderRadius: '6px', border: '1px solid var(--bg-surface-border)' }}>
            <button
              onClick={handleZoomIn}
              style={{ backgroundColor: 'var(--bg-surface-elevated)', border: 'none', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={handleZoomOut}
              style={{ backgroundColor: 'var(--bg-surface-elevated)', border: 'none', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <button
              onClick={handleResetMap}
              style={{ backgroundColor: 'var(--bg-surface-elevated)', border: 'none', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Reset / Fit Map Bounds"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Compass / Directional Indicator */}
          <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 5, backgroundColor: 'rgba(10, 13, 20, 0.7)', border: '1px solid var(--bg-surface-border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            ▲ N
          </div>

          {mappedItems.length === 0 ? (
            /* Fallback display if 0 valid coordinates */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '8px', padding: '24px', textAlign: 'center' }}>
              <AlertTriangle size={32} color="#F59E0B" />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Map Visualization Unavailable
              </div>
              <div style={{ fontSize: '0.8rem', maxWidth: '380px' }}>
                Zero zones in the active dataset contain valid latitude and longitude coordinates. Select zones from the companion Zone List to perform risk evaluation.
              </div>
            </div>
          ) : (
            <svg 
              className="schematic-svg" 
              viewBox={`0 0 ${width} ${height}`} 
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Geographic Assessment Zone Map"
            >
              <defs>
                {/* Background Grid Pattern */}
                <pattern id="geoGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="2,2" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect width={width} height={height} fill="url(#geoGrid)" />

              {/* Geographic Connection Web Lines */}
              {mappedItems.map((itemA, i) => {
                const posA = projectCoords(itemA.zone.latitude!, itemA.zone.longitude!);
                return mappedItems.slice(i + 1).map((itemB, j) => {
                  const dist = Math.hypot(
                    itemA.zone.latitude! - itemB.zone.latitude!,
                    itemA.zone.longitude! - itemB.zone.longitude!
                  );
                  if (dist < 0.08) {
                    const posB = projectCoords(itemB.zone.latitude!, itemB.zone.longitude!);
                    return (
                      <line 
                        key={`geo-link-${i}-${j}`} 
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

              {/* Zone Geographic Markers */}
              {mappedItems.map(({ zone, riskScore }) => {
                const { x, y } = projectCoords(zone.latitude!, zone.longitude!);
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
                    style={{ cursor: 'pointer' }}
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

                    {/* Pulsing Ring for Very High Risk */}
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
          )}

          {/* Interactive Zone Detail Overlay Popup (Card) */}
          {activePopupItem && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 20, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-surface-border)', borderRadius: '8px', padding: '12px 16px', width: '280px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                    {activePopupItem.zone.zoneId || activePopupItem.zone.id}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {activePopupItem.zone.wardName || activePopupItem.zone.zoneName}
                  </div>
                </div>

                <span className={`risk-band-badge ${
                  activePopupItem.riskScore.riskTier === 'VERY_HIGH' ? 'band-very-high' :
                  activePopupItem.riskScore.riskTier === 'HIGH' ? 'band-high' :
                  activePopupItem.riskScore.riskTier === 'MODERATE' ? 'band-moderate' :
                  activePopupItem.riskScore.riskTier === 'LOW' ? 'band-low' : 'band-insufficient'
                }`} style={{ fontSize: '0.65rem' }}>
                  {activePopupItem.riskScore.riskTier.replace(/_/g, ' ')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface-elevated)', padding: '6px 10px', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Risk Score:</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: activePopupItem.riskScore.totalScore !== null ? 'var(--text-primary)' : '#94A3B8' }}>
                  {activePopupItem.riskScore.totalScore !== null ? `${Math.round(activePopupItem.riskScore.totalScore)} / 100` : 'INSUFFICIENT EVIDENCE'}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Primary Driver: <strong style={{ color: 'var(--text-primary)' }}>{activePopupItem.riskScore.primaryDriver || 'N/A'}</strong>
              </div>

              {onNavigateToExplain && (
                <button
                  className="action-button secondary"
                  onClick={() => {
                    onSelectZone(activePopupItem.zone.zoneId || activePopupItem.zone.id!);
                    onNavigateToExplain();
                  }}
                  style={{ fontSize: '0.75rem', padding: '6px 10px', width: '100%', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <span>View Detailed Analysis (03 EXPLAIN WHY)</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Accessible Companion Zone List Sidebar */}
        {showZoneList && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-surface-border)', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-surface-border)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                Active Zone List ({scoredZones.length})
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Click to Select
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {scoredZones.map(({ zone, riskScore }) => {
                const id = zone.zoneId || zone.id!;
                const isSelected = id === selectedZoneId;
                const markerColor = getMarkerColor(riskScore);
                const wardName = zone.wardName || zone.zoneName || id;
                const scoreStr = riskScore.totalScore !== null ? `${Math.round(riskScore.totalScore)}` : 'N/A';

                return (
                  <button
                    key={id}
                    onClick={() => onSelectZone(id)}
                    aria-label={`Select ${wardName}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface-elevated)',
                      border: isSelected ? '1px solid #3B82F6' : '1px solid var(--bg-surface-border)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: markerColor, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {wardName.replace(/^Ward \d+ - /, '')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: riskScore.totalScore !== null ? 'var(--text-primary)' : '#94A3B8' }}>
                        {scoreStr}
                      </span>
                      {isSelected && <Check size={14} color="#3B82F6" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* GIS Credibility Note */}
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface-elevated)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--bg-surface-border)' }}>
        <strong>Credibility Note:</strong> Zone points shown from active dataset coordinates. Administrative boundaries are not represented unless supplied by the dataset.
      </div>

      {/* Risk Tier Color Legend */}
      <RiskLegend />
    </div>
  );
};
