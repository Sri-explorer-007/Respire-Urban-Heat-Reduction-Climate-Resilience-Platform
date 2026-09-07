import { WardZone } from '../../types/zone';

export interface DataProviderSourceOptions {
  useDemoCacheIfUnavailable: boolean;
  forceDemoMode?: boolean;
}

export interface ZoneDataProvider {
  getWardZones(options?: DataProviderSourceOptions): Promise<WardZone[]>;
  getZoneById(id: string, options?: DataProviderSourceOptions): Promise<WardZone | null>;
  isDemoDataActive(): boolean;
}
