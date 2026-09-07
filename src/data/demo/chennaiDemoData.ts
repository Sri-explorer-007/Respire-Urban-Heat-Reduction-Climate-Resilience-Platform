import { WardZone } from '../../core/types/zone';

/**
 * RESPIRE Illustrative Demo Dataset — Chennai Wards Foundation
 * 
 * IMPORTANT DATA POLICY NOTICE:
 * This dataset is explicitly labelled as "Illustrative Demo Data".
 * It is structured to pass through the EXACT SAME scoring and recommendation engines
 * as real processed satellite & municipal data.
 * 
 * Values are illustrative proxies designed for hackathon demonstration of
 * Low, Moderate, High, and Critical risk scoring profiles.
 */

export const IS_DEMO_DATASET = true;
export const DATASET_LABEL = "Illustrative Demo Data";

export const DEMO_CHENNAI_ZONES: WardZone[] = [
  // 1. Critical Risk Candidate: High Heat, High Deficit, High Vulnerability
  {
    zoneId: "ZONE-CHN-W045",
    zoneName: "Vyasarpadi",
    wardId: "WARD-045",
    wardName: "Ward 045 - Vyasarpadi",
    district: "North Chennai",
    latitude: 13.1087,
    longitude: 80.2584,
    heat: {
      lst: 39.8,
      lstCelsius: 39.8,
      lstNormalized: 0.90,
      heatIslandAnomalyCelsius: +5.1,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Satellite Sample",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vegetation: {
      ndvi: 0.08,
      ndviValue: 0.08,
      vegetationDeficitNormalized: 0.85,
      canopyCoveragePercentage: 4.2,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Vegetation Index",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vulnerability: {
      vulnerabilityScore: 0.86,
      vulnerabilityIndex: 0.86,
      vulnerabilityComponents: {
        populationDensity: 24200,
        elderlyPopulation: 0.32,
        informalSettlementIndicator: 0.82,
        outdoorWorkerExposure: 0.78,
        lowIncomeRatio: 0.68
      },
      provenance: {
        status: "ASSUMPTION",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Vulnerability Proxy",
        isDemoData: true,
        notes: "Assumption"
      }
    }
  },

  // 2. High Risk Candidate: High Heat, High Vulnerability, Moderate Deficit
  {
    zoneId: "ZONE-CHN-W134",
    zoneName: "T. Nagar",
    wardId: "WARD-134",
    wardName: "Ward 134 - T. Nagar",
    district: "Central Chennai",
    latitude: 13.0418,
    longitude: 80.2341,
    heat: {
      lst: 38.4,
      lstCelsius: 38.4,
      lstNormalized: 0.82,
      heatIslandAnomalyCelsius: +4.2,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Satellite Sample",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vegetation: {
      ndvi: 0.14,
      ndviValue: 0.14,
      vegetationDeficitNormalized: 0.86,
      canopyCoveragePercentage: 7.0,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Vegetation Index",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vulnerability: {
      vulnerabilityScore: 0.76,
      vulnerabilityIndex: 0.76,
      vulnerabilityComponents: {
        populationDensity: 18500,
        elderlyPopulation: 0.28,
        informalSettlementIndicator: 0.55,
        outdoorWorkerExposure: 0.65,
        lowIncomeRatio: 0.45
      },
      provenance: {
        status: "ASSUMPTION",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Vulnerability Proxy",
        isDemoData: true,
        notes: "Assumption"
      }
    }
  },

  // 3. High Heat + Dense Built Environment (Cool roof candidate)
  {
    zoneId: "ZONE-CHN-W052",
    zoneName: "Royapuram",
    wardId: "WARD-052",
    wardName: "Ward 052 - Royapuram",
    district: "North Chennai",
    latitude: 13.1124,
    longitude: 80.2952,
    heat: {
      lst: 38.9,
      lstCelsius: 38.9,
      lstNormalized: 0.85,
      heatIslandAnomalyCelsius: +4.6,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Satellite Sample",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vegetation: {
      ndvi: 0.10,
      ndviValue: 0.10,
      vegetationDeficitNormalized: 0.90,
      canopyCoveragePercentage: 5.1,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Vegetation Index",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vulnerability: {
      vulnerabilityScore: 0.70,
      vulnerabilityIndex: 0.70,
      vulnerabilityComponents: {
        populationDensity: 21000,
        elderlyPopulation: 0.25,
        informalSettlementIndicator: 0.60,
        outdoorWorkerExposure: 0.72,
        lowIncomeRatio: 0.58
      },
      provenance: {
        status: "ASSUMPTION",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Vulnerability Proxy",
        isDemoData: true,
        notes: "Assumption"
      }
    }
  },

  // 4. High Outdoor Worker Exposure Candidate (Shaded cooling center candidate)
  {
    zoneId: "ZONE-CHN-W012",
    zoneName: "Washermanpet",
    wardId: "WARD-012",
    wardName: "Ward 012 - Washermanpet",
    district: "North Chennai",
    latitude: 13.1012,
    longitude: 80.2811,
    heat: {
      lst: 39.2,
      lstCelsius: 39.2,
      lstNormalized: 0.88,
      heatIslandAnomalyCelsius: +4.8,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Satellite Sample",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vegetation: {
      ndvi: 0.12,
      ndviValue: 0.12,
      vegetationDeficitNormalized: 0.88,
      canopyCoveragePercentage: 6.0,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Vegetation Index",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vulnerability: {
      vulnerabilityScore: 0.82,
      vulnerabilityIndex: 0.82,
      vulnerabilityComponents: {
        populationDensity: 23500,
        elderlyPopulation: 0.30,
        informalSettlementIndicator: 0.75,
        outdoorWorkerExposure: 0.85, // Very high worker exposure
        lowIncomeRatio: 0.62
      },
      provenance: {
        status: "ASSUMPTION",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Vulnerability Proxy",
        isDemoData: true,
        notes: "Assumption"
      }
    }
  },

  // 5. Moderate Risk Candidate: Moderate Heat, High Vegetation Deficit
  {
    zoneId: "ZONE-CHN-W108",
    zoneName: "Kodambakkam",
    wardId: "WARD-108",
    wardName: "Ward 108 - Kodambakkam",
    district: "Central Chennai",
    latitude: 13.0514,
    longitude: 80.2208,
    heat: {
      lst: 36.1,
      lstCelsius: 36.1,
      lstNormalized: 0.62,
      heatIslandAnomalyCelsius: +2.2,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Satellite Sample",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vegetation: {
      ndvi: 0.18,
      ndviValue: 0.18,
      vegetationDeficitNormalized: 0.82,
      canopyCoveragePercentage: 11.2,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Vegetation Index",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vulnerability: {
      vulnerabilityScore: 0.52,
      vulnerabilityIndex: 0.52,
      vulnerabilityComponents: {
        populationDensity: 14200,
        elderlyPopulation: 0.24,
        informalSettlementIndicator: 0.35,
        outdoorWorkerExposure: 0.42,
        lowIncomeRatio: 0.38
      },
      provenance: {
        status: "ASSUMPTION",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Vulnerability Proxy",
        isDemoData: true,
        notes: "Assumption"
      }
    }
  },

  // 6. Moderate Risk Candidate: High Heat, Good Vegetation Mitigation
  {
    zoneId: "ZONE-CHN-W114",
    zoneName: "Mylapore",
    wardId: "WARD-114",
    wardName: "Ward 114 - Mylapore",
    district: "South Chennai",
    latitude: 13.0339,
    longitude: 80.2699,
    heat: {
      lst: 36.8,
      lstCelsius: 36.8,
      lstNormalized: 0.68,
      heatIslandAnomalyCelsius: +2.8,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Satellite Sample",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vegetation: {
      ndvi: 0.28,
      ndviValue: 0.28,
      vegetationDeficitNormalized: 0.72,
      canopyCoveragePercentage: 18.0,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Vegetation Index",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vulnerability: {
      vulnerabilityScore: 0.45,
      vulnerabilityIndex: 0.45,
      vulnerabilityComponents: {
        populationDensity: 12800,
        elderlyPopulation: 0.35,
        informalSettlementIndicator: 0.22,
        outdoorWorkerExposure: 0.30,
        lowIncomeRatio: 0.28
      },
      provenance: {
        status: "ASSUMPTION",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Vulnerability Proxy",
        isDemoData: true,
        notes: "Assumption"
      }
    }
  },

  // 7. Low Risk / Resilience Benchmark: Low Heat, High Canopy, Low Vulnerability
  {
    zoneId: "ZONE-CHN-W175",
    zoneName: "Adyar",
    wardId: "WARD-175",
    wardName: "Ward 175 - Adyar",
    district: "South Chennai",
    latitude: 13.0067,
    longitude: 80.2571,
    heat: {
      lst: 34.2,
      lstCelsius: 34.2,
      lstNormalized: 0.42,
      heatIslandAnomalyCelsius: +1.0,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Satellite Sample",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vegetation: {
      ndvi: 0.42,
      ndviValue: 0.42,
      vegetationDeficitNormalized: 0.58,
      canopyCoveragePercentage: 24.5,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Vegetation Index",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vulnerability: {
      vulnerabilityScore: 0.30,
      vulnerabilityIndex: 0.30,
      vulnerabilityComponents: {
        populationDensity: 9800,
        elderlyPopulation: 0.22,
        informalSettlementIndicator: 0.12,
        outdoorWorkerExposure: 0.25,
        lowIncomeRatio: 0.18
      },
      provenance: {
        status: "ASSUMPTION",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Vulnerability Proxy",
        isDemoData: true,
        notes: "Assumption"
      }
    }
  },

  // 8. Rapid Urbanizing Zone: High Heat, Moderate Vegetation, High Vulnerability
  {
    zoneId: "ZONE-CHN-W156",
    zoneName: "Velachery",
    wardId: "WARD-156",
    wardName: "Ward 156 - Velachery",
    district: "South Chennai",
    latitude: 12.9815,
    longitude: 80.2180,
    heat: {
      lst: 37.6,
      lstCelsius: 37.6,
      lstNormalized: 0.75,
      heatIslandAnomalyCelsius: +3.5,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Satellite Sample",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vegetation: {
      ndvi: 0.20,
      ndviValue: 0.20,
      vegetationDeficitNormalized: 0.80,
      canopyCoveragePercentage: 12.5,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Vegetation Index",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vulnerability: {
      vulnerabilityScore: 0.65,
      vulnerabilityIndex: 0.65,
      vulnerabilityComponents: {
        populationDensity: 15400,
        elderlyPopulation: 0.20,
        informalSettlementIndicator: 0.48,
        outdoorWorkerExposure: 0.58,
        lowIncomeRatio: 0.42
      },
      provenance: {
        status: "ASSUMPTION",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Vulnerability Proxy",
        isDemoData: true,
        notes: "Assumption"
      }
    }
  },

  // 9. Industrial / Mixed Zone: High Heat, Extreme Deficit, Moderate Vulnerability
  {
    zoneId: "ZONE-CHN-W080",
    zoneName: "Ambattur",
    wardId: "WARD-080",
    wardName: "Ward 080 - Ambattur",
    district: "West Chennai",
    latitude: 13.1143,
    longitude: 80.1548,
    heat: {
      lst: 38.7,
      lstCelsius: 38.7,
      lstNormalized: 0.84,
      heatIslandAnomalyCelsius: +4.4,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Satellite Sample",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vegetation: {
      ndvi: 0.11,
      ndviValue: 0.11,
      vegetationDeficitNormalized: 0.89,
      canopyCoveragePercentage: 5.8,
      provenance: {
        status: "INDICATIVE_ESTIMATE",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Demo Vegetation Index",
        isDemoData: true,
        notes: "Illustrative Demo Data"
      }
    },
    vulnerability: {
      vulnerabilityScore: 0.58,
      vulnerabilityIndex: 0.58,
      vulnerabilityComponents: {
        populationDensity: 11200,
        elderlyPopulation: 0.18,
        informalSettlementIndicator: 0.40,
        outdoorWorkerExposure: 0.70, // Industrial outdoor workers
        lowIncomeRatio: 0.48
      },
      provenance: {
        status: "ASSUMPTION",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Vulnerability Proxy",
        isDemoData: true,
        notes: "Assumption"
      }
    }
  },

  // 10. Missing Data Edge Case: Null LST & Null NDVI to test Null Handling Protocol
  {
    zoneId: "ZONE-CHN-W198",
    zoneName: "Sholinganallur",
    wardId: "WARD-198",
    wardName: "Ward 198 - Sholinganallur",
    district: "South Chennai",
    latitude: 12.9010,
    longitude: 80.2279,
    heat: {
      lst: null, // Test null preservation
      lstCelsius: null,
      lstNormalized: null,
      heatIslandAnomalyCelsius: null,
      provenance: {
        status: "UNKNOWN",
        sourceType: "MISSING_DATA",
        sourceName: "Cloud Cover Interference",
        isDemoData: true,
        notes: "Insufficient Evidence / Missing Satellite Data"
      }
    },
    vegetation: {
      ndvi: null, // Test null preservation
      ndviValue: null,
      vegetationDeficitNormalized: null,
      canopyCoveragePercentage: null,
      provenance: {
        status: "UNKNOWN",
        sourceType: "MISSING_DATA",
        sourceName: "Cloud Cover Interference",
        isDemoData: true,
        notes: "Insufficient Evidence / Missing Vegetation Data"
      }
    },
    vulnerability: {
      vulnerabilityScore: 0.40,
      vulnerabilityIndex: 0.40,
      vulnerabilityComponents: {
        populationDensity: 7500,
        elderlyPopulation: 0.15,
        informalSettlementIndicator: 0.20,
        outdoorWorkerExposure: 0.35,
        lowIncomeRatio: 0.25
      },
      provenance: {
        status: "ASSUMPTION",
        sourceType: "DEMO_PROXY",
        sourceName: "Illustrative Vulnerability Proxy",
        isDemoData: true,
        notes: "Assumption"
      }
    }
  }
];
