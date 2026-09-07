/**
 * RESPIRE Data Policy & Provenance Protocol
 * All data in RESPIRE must clearly distinguish its source status.
 */
export type DataSourceStatus = 
  | 'SOURCED'
  | 'DERIVED'
  | 'INDICATIVE_ESTIMATE'
  | 'ASSUMPTION'
  | 'UNKNOWN';

export interface DataProvenance {
  status: DataSourceStatus;
  sourceType?: string; // e.g. "SATELLITE_RASTER", "MUNICIPAL_CENSUS", "DEMO_PROXY"
  sourceName?: string; // e.g. "Landsat 8 LST", "Chennai Census 2011"
  sourceReference?: string; // DOI or URL reference
  dataDate?: string; // ISO date string e.g. "2024-05-15"
  resolution?: string; // e.g. "30m", "Ward Level"
  processingMethod?: string; // e.g. "Split-Window Algorithm", "Min-Max Normalization"
  confidence?: number | null; // 0.0 - 1.0
  confidenceScore?: number | null; // Alias for backward compatibility
  notes?: string;
  isDemoData: boolean;
}
