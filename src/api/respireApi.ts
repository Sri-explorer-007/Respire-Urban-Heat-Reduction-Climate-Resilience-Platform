import { ZoneDataProvider, DataProviderSourceOptions } from '../core/services/data/dataProvider';
import { WardZone } from '../core/types/zone';
import { respireWorkspaceService, DatasetMetadata } from '../core/services/data/workspaceService';
import { DEMO_CHENNAI_ZONES } from '../data/demo/chennaiDemoData';

/**
 * RESPIRE Platform API Service Layer
 * Serves as the abstraction boundary between UI and Domain/Data Layer.
 * Delegates active dataset resolution to the workspace service.
 */
export class LocalRespireDataProvider implements ZoneDataProvider {
  async getWardZones(options?: DataProviderSourceOptions): Promise<WardZone[]> {
    if (options?.forceDemoMode) {
      return DEMO_CHENNAI_ZONES;
    }
    return respireWorkspaceService.getActiveZones();
  }

  async getZoneById(id: string, options?: DataProviderSourceOptions): Promise<WardZone | null> {
    const zones = await this.getWardZones(options);
    return zones.find(z => (z.zoneId || z.id) === id) || null;
  }

  isDemoDataActive(): boolean {
    return respireWorkspaceService.isDemoDatasetActive();
  }

  getDatasetLabel(): string {
    return respireWorkspaceService.getActiveMetadata().sourceLabel;
  }

  getDatasetMetadata(): DatasetMetadata {
    return respireWorkspaceService.getActiveMetadata();
  }
}

export const respireApi = new LocalRespireDataProvider();

