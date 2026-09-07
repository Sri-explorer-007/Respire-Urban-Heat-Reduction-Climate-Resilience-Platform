import { DataProvenance } from './data-provenance';

export interface HeatIndicator {
  lst: number | null; // Land Surface Temp (°C) - nullable for missing data
  lstCelsius?: number | null; // Alias
  lstNormalized: number | null; // 0.0 - 1.0 normalized heat - nullable
  heatIslandAnomalyCelsius?: number | null;
  provenance: DataProvenance;
}

export interface VegetationIndicator {
  ndvi: number | null; // NDVI (-1.0 to 1.0) - nullable
  ndviValue?: number | null; // Alias
  vegetationDeficitNormalized: number | null; // 0.0 - 1.0 (1.0 = maximum vegetation deficit)
  canopyCoveragePercentage?: number | null;
  provenance: DataProvenance;
}

export interface VulnerabilityComponents {
  populationDensity: number | null; // density per sq km
  elderlyPopulation: number | null; // ratio or population count
  informalSettlementIndicator: number | null; // 0.0 - 1.0 index
  outdoorWorkerExposure: number | null; // 0.0 - 1.0 ratio
  lowIncomeRatio?: number | null;
}

export interface SocialVulnerabilityIndicator {
  vulnerabilityScore: number | null; // 0.0 - 1.0 normalized score - nullable
  vulnerabilityIndex?: number | null; // Alias
  vulnerabilityComponents: VulnerabilityComponents;
  provenance: DataProvenance;
}

export interface PopulationDensityIndicator {
  densityPerSqKm: number | null;
  outdoorWorkerExposureRatio: number | null;
  provenance: DataProvenance;
}

export interface BuiltEnvironmentIndicator {
  coolRoofPercentage: number | null;
  imperviousSurfaceRatio: number | null;
  provenance: DataProvenance;
}

export interface WardZone {
  zoneId: string; // e.g. "ZONE-CHN-W045"
  zoneName: string; // e.g. "Vyasarpadi"
  wardId: string; // e.g. "WARD-045"
  wardName: string; // e.g. "Ward 045 - Vyasarpadi"
  district: string; // e.g. "North Chennai"
  latitude: number | null; // WGS84 coordinate
  longitude: number | null; // WGS84 coordinate
  geometry?: any; // GeoJSON Polygon/MultiPolygon or reference
  
  // Legacy aliases for backwards compatibility
  id?: string;
  name?: string;
  
  // Environmental & Social Indicators
  heat: HeatIndicator;
  vegetation: VegetationIndicator;
  vulnerability: SocialVulnerabilityIndicator;
  population?: PopulationDensityIndicator;
  builtEnvironment?: BuiltEnvironmentIndicator;
}
