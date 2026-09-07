# RESPIRE
## Urban Heat Reduction & Climate Resilience Platform

RESPIRE is a municipal decision-support system designed for municipal and ward planning officers to identify urban heat risk, explain risk factors, evaluate rule-based interventions, and prioritize climate resilience investments.

---

### Core Workflow

```
IDENTIFY → EXPLAIN → RECOMMEND → PRIORITIZE
```

1. **IDENTIFY**: Ward-level heat and vulnerability risk map using Land Surface Temperature, NDVI, social vulnerability, and informal settlement indicators.
2. **EXPLAIN**: Transparent risk scoring breakdown based on the locked weight model:
   - Heat Exposure: 50%
   - Vegetation Deficit: 20%
   - Social Vulnerability: 30%
3. **RECOMMEND**: Rule-based, explainable intervention selection (tree planting, cool roofs, shaded rest areas, urban greening).
4. **PRIORITIZE**: Cost and impact matrix to guide municipal funding decisions.

---

### Data Policy & Provenance

RESPIRE strictly categorizes all data inputs into 5 provenance levels:
- `SOURCED`: Directly obtained from documented satellite/governmental sources.
- `DERIVED`: Calculated from sourced measurements.
- `INDICATIVE ESTIMATE`: Planning/demo estimate for decision modeling.
- `ASSUMPTION`: Explicit proxy caused by unavailable data.
- `UNKNOWN`: Insufficient evidence.

---

### Architecture Overview

```
DATA SOURCES / DEMO CACHE
           │
  DATA PROCESSING & NORMALIZATION LAYER
           │
  ZONE-LEVEL CONTRACTS (src/core/types)
           │
┌──────────┴────────────────────────┐
│                                   │
▼                                   ▼
EXPLAINABLE RISK SCORING          INTERVENTION RECOMMENDATION
ENGINE (src/core/services/scoring) ENGINE (src/core/services/recommendations)
│                                   │
└──────────┬────────────────────────┘
           │
           ▼
    API ADAPTER LAYER (src/api)
           │
           ▼
    RESPIRE DASHBOARD / MAP (src/components)
```

---

### Project Structure

```
├── index.html
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/
    │   └── respireApi.ts                 # UI <-> Domain API bridge
    ├── components/
    │   ├── common/
    │   │   ├── Header.tsx               # Platform header with subtitle & demo badge
    │   │   └── ProvenanceBadge.tsx      # Data policy provenance status pill
    │   ├── dashboard/
    │   │   └── DashboardLayout.tsx      # IDENTIFY -> EXPLAIN -> RECOMMEND -> PRIORITIZE tabs
    │   └── map/
    │       └── MapContainer.tsx         # Ward Risk Map container stub
    ├── core/
    │   ├── services/
    │   │   ├── data/
    │   │   │   └── dataProvider.ts      # Data provider contract & demo cache boundary
    │   │   ├── recommendations/
    │   │   │   └── recommendationEngine.ts # Rule-based recommendation engine stub
    │   │   └── scoring/
    │   │       └── scoringEngine.ts     # Decoupled risk scoring engine stub
    │   └── types/
    │       ├── data-provenance.ts       # SOURCED, DERIVED, ESTIMATE, ASSUMPTION status
    │       ├── intervention.ts          # Intervention costs, impact, & priority types
    │       ├── recommendation.ts        # Recommendation rule evaluation contracts
    │       ├── scoring.ts               # 50/20/30 scoring model contract & breakdown
    │       └── zone.ts                  # WardZone, LST, NDVI, Vulnerability indicators
    ├── data/
    │   └── demo/
    │       └── chennaiDemoData.ts       # Illustrative demo dataset for Chennai Wards
    └── styles/
        ├── main.css
        └── variables.css
```

---

### Run & Build Commands

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Run Development Server
```bash
npm run dev
```

#### 3. Typecheck & Build Production Bundle
```bash
npm run build
```
