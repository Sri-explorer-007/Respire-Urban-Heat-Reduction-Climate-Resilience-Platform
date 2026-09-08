import { WardZone } from '../../types/zone';
import { DEMO_CHENNAI_ZONES, DATASET_LABEL } from '../../../data/demo/chennaiDemoData';

export interface DatasetMetadata {
  id: string;
  name: string;
  sourceLabel: string;
  isDemo: boolean;
  uploadTimestamp?: string;
  fileName?: string;
  zoneCount: number;
  analyzableZoneCount: number;
  insufficientEvidenceCount: number;
  validationErrorCount: number;
  validationWarningCount: number;
}

export class RespireWorkspaceService {
  private activeZones: WardZone[] = DEMO_CHENNAI_ZONES;
  private activeMetadata: DatasetMetadata = this.computeDemoMetadata();
  private customDataset: { zones: WardZone[]; metadata: DatasetMetadata } | null = null;
  private listeners: Set<() => void> = new Set();

  private computeDemoMetadata(): DatasetMetadata {
    const analyzable = DEMO_CHENNAI_ZONES.filter(
      z => z.heat.lstNormalized !== null && z.vegetation.vegetationDeficitNormalized !== null
    ).length;

    return {
      id: 'DEMO_CHENNAI',
      name: 'Chennai Heat Assessment',
      sourceLabel: DATASET_LABEL,
      isDemo: true,
      zoneCount: DEMO_CHENNAI_ZONES.length,
      analyzableZoneCount: analyzable,
      insufficientEvidenceCount: DEMO_CHENNAI_ZONES.length - analyzable,
      validationErrorCount: 0,
      validationWarningCount: 1 // Ward 198 Sholinganallur insufficient evidence
    };
  }

  getActiveZones(): WardZone[] {
    return this.activeZones;
  }

  getActiveMetadata(): DatasetMetadata {
    return this.activeMetadata;
  }

  isDemoDatasetActive(): boolean {
    return this.activeMetadata.isDemo;
  }

  useDemoDataset(): void {
    this.activeZones = DEMO_CHENNAI_ZONES;
    this.activeMetadata = this.computeDemoMetadata();
    this.notify();
  }

  loadCustomDataset(
    zones: WardZone[],
    datasetName: string = 'User Uploaded Dataset',
    fileName?: string,
    validationErrorCount: number = 0,
    validationWarningCount: number = 0
  ): void {
    const analyzable = zones.filter(
      z => z.heat.lstNormalized !== null && z.vegetation.vegetationDeficitNormalized !== null
    ).length;

    const metadata: DatasetMetadata = {
      id: `CUSTOM_${Date.now()}`,
      name: datasetName,
      sourceLabel: 'User Uploaded Dataset (.csv)',
      isDemo: false,
      uploadTimestamp: new Date().toISOString(),
      fileName: fileName || 'uploaded_dataset.csv',
      zoneCount: zones.length,
      analyzableZoneCount: analyzable,
      insufficientEvidenceCount: zones.length - analyzable,
      validationErrorCount,
      validationWarningCount
    };

    this.customDataset = { zones, metadata };
    this.activeZones = zones;
    this.activeMetadata = metadata;
    this.notify();
  }

  hasCustomDataset(): boolean {
    return this.customDataset !== null;
  }

  getCustomMetadata(): DatasetMetadata | null {
    return this.customDataset ? this.customDataset.metadata : null;
  }

  useCustomDataset(): void {
    if (this.customDataset) {
      this.activeZones = this.customDataset.zones;
      this.activeMetadata = this.customDataset.metadata;
      this.notify();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const respireWorkspaceService = new RespireWorkspaceService();
