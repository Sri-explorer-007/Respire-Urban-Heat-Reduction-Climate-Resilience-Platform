import { ZoneDataProvider, DataProviderSourceOptions } from '../core/services/data/dataProvider';
import { WardZone } from '../core/types/zone';
import { DEMO_CHENNAI_ZONES, DATASET_LABEL } from '../data/demo/chennaiDemoData';

/**
 * RESPIRE Platform API Service Layer
 * Serves as the abstraction boundary between UI and Domain/Data Layer.
 */
export class LocalRespireDataProvider implements ZoneDataProvider {
  private activeMode: 'LIVE' | 'DEMO_CACHE' = 'DEMO_CACHE';

  async getWardZones(options?: DataProviderSourceOptions): Promise<WardZone[]> {
    if (options?.forceDemoMode || this.activeMode === 'DEMO_CACHE') {
      return DEMO_CHENNAI_ZONES;
    }
    // Fallback to demo dataset if live service unavailable
    return DEMO_CHENNAI_ZONES;
  }

  async getZoneById(id: string, options?: DataProviderSourceOptions): Promise<WardZone | null> {
    const zones = await this.getWardZones(options);
    return zones.find(z => (z.zoneId || z.id) === id) || null;
  }

  isDemoDataActive(): boolean {
    return true;
  }

  getDatasetLabel(): string {
    return DATASET_LABEL;
  }
}

export const respireApi = new LocalRespireDataProvider();
