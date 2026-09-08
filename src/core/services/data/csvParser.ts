import { WardZone } from '../../types/zone';
import { validateWardZone, ZoneValidationResult } from '../../validation/zoneValidator';

export interface CSVParseResult {
  zones: WardZone[];
  validationResults: ZoneValidationResult[];
  totalRows: number;
  validRowCount: number;
  invalidRowCount: number;
  analyzableCount: number;
  insufficientEvidenceCount: number;
  totalErrors: number;
  totalWarnings: number;
  globalErrors: string[];
}

/**
 * Safely parses string or numeric input into a number or null.
 * Empty string, 'null', 'n/a', 'na', undefined, or whitespace return NULL.
 * Percentage values like "75%" return 0.75.
 * Invalid text returns NaN.
 */
export function parseNullableNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  const str = String(val).trim().toLowerCase();
  if (str === '' || str === 'null' || str === 'n/a' || str === 'na' || str === '-' || str === 'none') {
    return null;
  }
  if (str.endsWith('%')) {
    const num = parseFloat(str.slice(0, -1));
    return isNaN(num) ? null : num / 100;
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Normalizes LST temperature into 0.0 - 1.0 range if provided in raw Celsius (10°C - 60°C).
 * If input is already between 0.0 and 1.0, returns input as normalized.
 */
function normalizeLST(lst: number | null): number | null {
  if (lst === null) return null;
  if (lst >= 0 && lst <= 1.0) return lst;
  if (lst >= 10 && lst <= 60) {
    const minLst = 28.0;
    const maxLst = 45.0;
    const clamped = Math.max(minLst, Math.min(maxLst, lst));
    return Number(((clamped - minLst) / (maxLst - minLst)).toFixed(2));
  }
  return lst;
}

/**
 * Normalizes NDVI to Vegetation Deficit Normalized (0.0 = high vegetation, 1.0 = zero vegetation).
 */
function normalizeVegetationDeficit(ndvi: number | null, rawVegDeficit: number | null): number | null {
  if (rawVegDeficit !== null) {
    return rawVegDeficit;
  }
  if (ndvi === null) return null;
  if (ndvi >= -1.0 && ndvi <= 1.0) {
    const clampedNdvi = Math.max(-0.2, Math.min(0.8, ndvi));
    const deficit = (0.8 - clampedNdvi) / 1.0;
    return Number(Math.max(0, Math.min(1, deficit)).toFixed(2));
  }
  return ndvi;
}

/**
 * Parses raw CSV line into token array handling quoted fields.
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses raw CSV content into WardZone objects and validates them.
 */
export function parseWardZoneCSV(csvContent: string): CSVParseResult {
  const globalErrors: string[] = [];
  if (!csvContent || csvContent.trim() === '') {
    return {
      zones: [],
      validationResults: [],
      totalRows: 0,
      validRowCount: 0,
      invalidRowCount: 0,
      analyzableCount: 0,
      insufficientEvidenceCount: 0,
      totalErrors: 1,
      totalWarnings: 0,
      globalErrors: ['CSV content is empty.']
    };
  }

  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) {
    return {
      zones: [],
      validationResults: [],
      totalRows: 0,
      validRowCount: 0,
      invalidRowCount: 0,
      analyzableCount: 0,
      insufficientEvidenceCount: 0,
      totalErrors: 1,
      totalWarnings: 0,
      globalErrors: ['CSV must contain at least a header line and one data row.']
    };
  }

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Header field index mapping
  const findHeaderIndex = (aliases: string[]): number => {
    return headers.findIndex(h => aliases.includes(h));
  };

  const idxZoneId = findHeaderIndex(['zoneid', 'zone_id', 'id', 'wardid', 'ward_id']);
  const idxWardName = findHeaderIndex(['wardname', 'ward_name', 'zonename', 'name']);
  const idxWardId = findHeaderIndex(['wardid', 'ward_id']);
  const idxDistrict = findHeaderIndex(['district', 'region', 'zone']);
  const idxLat = findHeaderIndex(['latitude', 'lat']);
  const idxLng = findHeaderIndex(['longitude', 'lng', 'lon', 'long']);

  const idxHeat = findHeaderIndex(['heatexposure', 'heat_exposure', 'lst', 'lstcelsius', 'heat']);
  const idxVeg = findHeaderIndex(['vegetationdeficit', 'vegetation_deficit', 'ndvi', 'vegdeficit']);
  const idxVuln = findHeaderIndex(['socialvulnerability', 'social_vulnerability', 'vulnerabilityscore', 'vulnerability']);
  const idxPopDensity = findHeaderIndex(['populationdensity', 'population_density', 'density']);
  const idxOutdoorWorker = findHeaderIndex(['outdoorworkerexposure', 'outdoor_worker_exposure', 'outdoorworker']);
  const idxCoolRoof = findHeaderIndex(['coolroofpercentage', 'cool_roof_percentage', 'coolroof']);
  const idxImpervious = findHeaderIndex(['impervioussurfaceratio', 'impervious_surface_ratio', 'impervious']);

  if (idxZoneId === -1 && idxWardName === -1) {
    globalErrors.push('Missing required column header: "zoneId" or "wardName".');
  }

  const rawRows = lines.slice(1);
  const zones: WardZone[] = [];
  const validationResults: ZoneValidationResult[] = [];
  const seenZoneIds = new Set<string>();

  rawRows.forEach((rowLine, rowIndex) => {
    const cols = parseCSVLine(rowLine);
    if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) return;

    const rowNum = rowIndex + 2; // 1-indexed including header

    const rawZoneId = idxZoneId !== -1 ? cols[idxZoneId] : `ZONE-UPLOAD-${rowNum - 1}`;
    const rawWardName = idxWardName !== -1 ? cols[idxWardName] : `Ward ${rowNum - 1}`;
    const rawWardId = idxWardId !== -1 ? cols[idxWardId] : `WARD-${String(rowNum - 1).padStart(3, '0')}`;
    const rawDistrict = idxDistrict !== -1 ? cols[idxDistrict] : 'Municipal Assessment Zone';

    const lat = idxLat !== -1 ? parseNullableNumber(cols[idxLat]) : 13.0827;
    const lng = idxLng !== -1 ? parseNullableNumber(cols[idxLng]) : 80.2707;

    const rawHeat = idxHeat !== -1 ? parseNullableNumber(cols[idxHeat]) : null;
    const rawVeg = idxVeg !== -1 ? parseNullableNumber(cols[idxVeg]) : null;
    const rawVuln = idxVuln !== -1 ? parseNullableNumber(cols[idxVuln]) : null;

    const popDensity = idxPopDensity !== -1 ? parseNullableNumber(cols[idxPopDensity]) : null;
    const outdoorWorker = idxOutdoorWorker !== -1 ? parseNullableNumber(cols[idxOutdoorWorker]) : null;
    const coolRoof = idxCoolRoof !== -1 ? parseNullableNumber(cols[idxCoolRoof]) : null;
    const impervious = idxImpervious !== -1 ? parseNullableNumber(cols[idxImpervious]) : null;

    const lstNormalized = normalizeLST(rawHeat);
    const vegDeficitNormalized = normalizeVegetationDeficit(null, rawVeg);

    const zoneId = rawZoneId || `ZONE-UPLOAD-${rowNum - 1}`;
    const wardName = rawWardName || `Ward ${rowNum - 1}`;

    const zone: WardZone = {
      zoneId,
      zoneName: wardName,
      wardId: rawWardId || `WARD-${rowNum - 1}`,
      wardName,
      district: rawDistrict || 'Municipal Assessment Zone',
      latitude: lat,
      longitude: lng,
      heat: {
        lst: rawHeat,
        lstCelsius: rawHeat,
        lstNormalized,
        provenance: {
          status: 'UNKNOWN',
          sourceType: 'USER_UPLOADED_CSV',
          sourceName: 'User Uploaded Dataset (.csv)',
          isDemoData: false
        }
      },
      vegetation: {
        ndvi: rawVeg !== null ? 1.0 - rawVeg : null,
        vegetationDeficitNormalized: vegDeficitNormalized,
        provenance: {
          status: 'UNKNOWN',
          sourceType: 'USER_UPLOADED_CSV',
          sourceName: 'User Uploaded Dataset (.csv)',
          isDemoData: false
        }
      },
      vulnerability: {
        vulnerabilityScore: rawVuln !== null ? Math.max(0, Math.min(1, rawVuln)) : null,
        vulnerabilityComponents: {
          populationDensity: popDensity,
          elderlyPopulation: null,
          informalSettlementIndicator: rawVuln,
          outdoorWorkerExposure: outdoorWorker
        },
        provenance: {
          status: 'UNKNOWN',
          sourceType: 'USER_UPLOADED_CSV',
          sourceName: 'User Uploaded Dataset (.csv)',
          isDemoData: false
        }
      },
      builtEnvironment: {
        coolRoofPercentage: coolRoof,
        imperviousSurfaceRatio: impervious,
        provenance: {
          status: 'UNKNOWN',
          sourceType: 'USER_UPLOADED_CSV',
          sourceName: 'User Uploaded Dataset (.csv)',
          isDemoData: false
        }
      }
    };

    // Validate zone using existing domain validator
    const valResult = validateWardZone(zone);

    // Check for duplicate zone ID
    if (seenZoneIds.has(zoneId)) {
      valResult.isValid = false;
      valResult.issues.push({
        field: 'zoneId',
        message: `Duplicate Zone ID detected: "${zoneId}" on row ${rowNum}.`,
        severity: 'ERROR'
      });
    } else {
      seenZoneIds.add(zoneId);
    }

    // Add warnings for missing analytical data
    if (lstNormalized === null || vegDeficitNormalized === null) {
      valResult.issues.push({
        field: 'indicators',
        message: `Zone "${wardName}" has missing heat or vegetation indicator; it will be treated as INSUFFICIENT EVIDENCE.`,
        severity: 'WARNING'
      });
    }

    zones.push(zone);
    validationResults.push(valResult);
  });

  const validRowCount = validationResults.filter(r => r.isValid).length;
  const invalidRowCount = validationResults.filter(r => !r.isValid).length;
  
  const analyzableCount = zones.filter(
    z => z.heat.lstNormalized !== null && z.vegetation.vegetationDeficitNormalized !== null
  ).length;
  
  const insufficientEvidenceCount = zones.length - analyzableCount;

  let totalErrors = globalErrors.length;
  let totalWarnings = 0;

  validationResults.forEach(r => {
    r.issues.forEach(i => {
      if (i.severity === 'ERROR') totalErrors++;
      if (i.severity === 'WARNING') totalWarnings++;
    });
  });

  return {
    zones,
    validationResults,
    totalRows: rawRows.length,
    validRowCount,
    invalidRowCount,
    analyzableCount,
    insufficientEvidenceCount,
    totalErrors,
    totalWarnings,
    globalErrors
  };
}

/**
 * Returns formatted CSV template content for user download or reference.
 */
export function getCSVTemplateContent(): string {
  return `zoneId,wardName,wardId,district,latitude,longitude,heatExposure,vegetationDeficit,socialVulnerability,builtEnvironment,outdoorWorkerExposure
ZONE-DEMO-001,Ward 001 - Central District,WARD-001,Central Metro,13.0827,80.2707,0.85,0.70,0.60,0.75,0.65
ZONE-DEMO-002,Ward 002 - North Station,WARD-002,North Metro,13.0900,80.2800,0.92,0.88,0.78,0.80,0.85
ZONE-DEMO-003,Ward 003 - Coastal Zone (Missing Heat Data),WARD-003,East Coast,13.0500,80.2900,null,0.40,0.50,0.30,0.20`;
}
