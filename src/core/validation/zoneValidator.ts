import { WardZone } from '../types/zone';
import { DataSourceStatus } from '../types/data-provenance';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ZoneValidationResult {
  isValid: boolean;
  zoneId: string;
  issues: ValidationIssue[];
}

const ALLOWED_PROVENANCE_STATUSES: DataSourceStatus[] = [
  'SOURCED',
  'DERIVED',
  'INDICATIVE_ESTIMATE',
  'ASSUMPTION',
  'UNKNOWN'
];

/**
 * RESPIRE Zone Data Foundation Validator
 * Validates identifiers, numeric ranges, coordinates, provenance statuses, and null preservation.
 */
export function validateWardZone(zone: WardZone): ZoneValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Required Identifiers
  const activeZoneId = zone.zoneId || zone.id;
  if (!activeZoneId || typeof activeZoneId !== 'string' || activeZoneId.trim() === '') {
    issues.push({ field: 'zoneId', message: 'Zone ID is required and must be a non-empty string.', severity: 'ERROR' });
  }

  const activeWardName = zone.wardName || zone.zoneName || zone.name;
  if (!activeWardName || typeof activeWardName !== 'string' || activeWardName.trim() === '') {
    issues.push({ field: 'wardName', message: 'Ward name is required and must be a non-empty string.', severity: 'ERROR' });
  }

  // 2. Coordinates Validation
  if (zone.latitude !== null && zone.latitude !== undefined) {
    if (typeof zone.latitude !== 'number' || zone.latitude < -90 || zone.latitude > 90) {
      issues.push({ field: 'latitude', message: `Latitude must be between -90 and 90 or null. Got ${zone.latitude}`, severity: 'ERROR' });
    }
  }

  if (zone.longitude !== null && zone.longitude !== undefined) {
    if (typeof zone.longitude !== 'number' || zone.longitude < -180 || zone.longitude > 180) {
      issues.push({ field: 'longitude', message: `Longitude must be between -180 and 180 or null. Got ${zone.longitude}`, severity: 'ERROR' });
    }
  }

  // 3. Heat Range Validation (preserves null)
  if (zone.heat) {
    if (zone.heat.lst !== null && zone.heat.lst !== undefined) {
      if (typeof zone.heat.lst !== 'number' || zone.heat.lst < 10 || zone.heat.lst > 60) {
        issues.push({ field: 'heat.lst', message: `LST value (${zone.heat.lst}°C) is outside valid realistic range [10, 60].`, severity: 'WARNING' });
      }
    }
    if (zone.heat.lstNormalized !== null && zone.heat.lstNormalized !== undefined) {
      if (typeof zone.heat.lstNormalized !== 'number' || zone.heat.lstNormalized < 0 || zone.heat.lstNormalized > 1) {
        issues.push({ field: 'heat.lstNormalized', message: `lstNormalized must be in range [0.0, 1.0] or null.`, severity: 'ERROR' });
      }
    }
    if (!ALLOWED_PROVENANCE_STATUSES.includes(zone.heat.provenance?.status)) {
      issues.push({ field: 'heat.provenance.status', message: `Invalid heat provenance status: ${zone.heat.provenance?.status}`, severity: 'ERROR' });
    }
  } else {
    issues.push({ field: 'heat', message: 'Heat indicator block is missing.', severity: 'ERROR' });
  }

  // 4. Vegetation Range Validation (preserves null)
  if (zone.vegetation) {
    if (zone.vegetation.ndvi !== null && zone.vegetation.ndvi !== undefined) {
      if (typeof zone.vegetation.ndvi !== 'number' || zone.vegetation.ndvi < -1.0 || zone.vegetation.ndvi > 1.0) {
        issues.push({ field: 'vegetation.ndvi', message: `NDVI must be in range [-1.0, 1.0] or null. Got ${zone.vegetation.ndvi}`, severity: 'ERROR' });
      }
    }
    if (zone.vegetation.vegetationDeficitNormalized !== null && zone.vegetation.vegetationDeficitNormalized !== undefined) {
      if (typeof zone.vegetation.vegetationDeficitNormalized !== 'number' || zone.vegetation.vegetationDeficitNormalized < 0 || zone.vegetation.vegetationDeficitNormalized > 1) {
        issues.push({ field: 'vegetation.vegetationDeficitNormalized', message: `vegetationDeficitNormalized must be in range [0.0, 1.0] or null.`, severity: 'ERROR' });
      }
    }
    if (!ALLOWED_PROVENANCE_STATUSES.includes(zone.vegetation.provenance?.status)) {
      issues.push({ field: 'vegetation.provenance.status', message: `Invalid vegetation provenance status: ${zone.vegetation.provenance?.status}`, severity: 'ERROR' });
    }
  } else {
    issues.push({ field: 'vegetation', message: 'Vegetation indicator block is missing.', severity: 'ERROR' });
  }

  // 5. Social Vulnerability Range Validation (preserves null)
  if (zone.vulnerability) {
    if (zone.vulnerability.vulnerabilityScore !== null && zone.vulnerability.vulnerabilityScore !== undefined) {
      if (typeof zone.vulnerability.vulnerabilityScore !== 'number' || zone.vulnerability.vulnerabilityScore < 0 || zone.vulnerability.vulnerabilityScore > 1) {
        issues.push({ field: 'vulnerability.vulnerabilityScore', message: `vulnerabilityScore must be in range [0.0, 1.0] or null.`, severity: 'ERROR' });
      }
    }
    if (!ALLOWED_PROVENANCE_STATUSES.includes(zone.vulnerability.provenance?.status)) {
      issues.push({ field: 'vulnerability.provenance.status', message: `Invalid vulnerability provenance status: ${zone.vulnerability.provenance?.status}`, severity: 'ERROR' });
    }
  } else {
    issues.push({ field: 'vulnerability', message: 'Vulnerability indicator block is missing.', severity: 'ERROR' });
  }

  const hasErrors = issues.some(i => i.severity === 'ERROR');

  return {
    isValid: !hasErrors,
    zoneId: activeZoneId || 'UNKNOWN_ZONE',
    issues
  };
}
