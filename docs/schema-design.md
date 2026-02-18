# Schema Design (Normal Forms, Keys, Constraints)

SQL schema design creates deterministic data contracts through normalization, keys, and constraints—perfect for Fossil Court audit trails.

## Normalization: Eliminating Redundancy

Normalization organizes data to prevent anomalies while preserving relationships.

| Normal Form | Rule | Example |
|-------------|------|---------|
| **1NF** | Atomic values, no repeating groups | Split `drivers: "CiCi, Earl"` → separate rows |
| **2NF** | 1NF + no partial dependencies | `driver_id → name`, not `driver_id → rating` |
| **3NF** | 2NF + no transitive dependencies | `driver_id → team_id → team_name` → split tables |
| **BCNF** | Stronger 3NF, every determinant is candidate key | Eliminate overlapping candidate keys |

```sql
-- BAD: 2NF violation (partial dependency)
CREATE TABLE driver_results (
    driver_id INT,
    race_id INT,
    driver_name VARCHAR(100),  -- Should be in Drivers table
    position INT,
    PRIMARY KEY (driver_id, race_id)
);

-- GOOD: 3NF
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE races (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE results (
    driver_id INT REFERENCES drivers(id),
    race_id INT REFERENCES races(id),
    position INT CHECK (position BETWEEN 1 AND 20),
    PRIMARY KEY (driver_id, race_id)
);
```

## Keys: Identity and Relationships

| Key Type | Purpose | Example |
|----------|---------|---------|
| **Primary Key** | Unique row identifier | `drivers(id SERIAL PRIMARY KEY)` |
| **Foreign Key** | Enforce relationships | `results(driver_id) REFERENCES drivers(id)` |
| **Unique** | Business uniqueness | `drivers(name) UNIQUE` |
| **Composite** | Multi-column uniqueness | `PRIMARY KEY(driver_id, race_id)` |

```sql
-- Fossil Court audit trail example
CREATE TABLE fos_events (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('MUSIC_ANALYSIS', 'CREATIVE_CONCEPT', 'VISUAL_GENERATION')),
    manifold_state VARCHAR(20) NOT NULL CHECK (manifold_state IN ('E7', 'E8_active', 'E8_converged')),
    fos_hash CHAR(64) NOT NULL UNIQUE,  -- SHA256
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_session_state (session_id, manifold_state),
    INDEX idx_fos_hash (fos_hash)
);
```

## Constraints: Runtime Invariants

| Constraint | Purpose | Example |
|------------|---------|---------|
| **NOT NULL** | Required fields | `name VARCHAR(100) NOT NULL` |
| **CHECK** | Business rules | `CHECK (energy_level BETWEEN 0 AND 1)` |
| **FOREIGN KEY** | Referential integrity | `REFERENCES drivers(id) ON DELETE CASCADE` |
| **UNIQUE** | No duplicates | `UNIQUE (driver_name, team_name)` |

```sql
-- EMERGENCE manifold constraints
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES fos_events(session_id),
    beat_time_ms INTEGER NOT NULL CHECK (beat_time_ms >= 0),
    energy_level NUMERIC(3,2) CHECK (energy_level >= 0 AND energy_level <= 1),
    theme VARCHAR(50) NOT NULL CHECK (theme IN ('cyberpunk', 'cosmic', 'minimalist')),
    dunk_impact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shellwave Beat 15 invariant
CREATE INDEX idx_dunk_timing ON scenes (session_id) 
WHERE beat_time_ms BETWEEN 7026 AND 7036 AND dunk_impact = TRUE;
```

## Corridor-Grade Schema Patterns

```sql
-- Fossil Court append-only log (audit trail)
CREATE TABLE fos_court (
    sequence BIGSERIAL PRIMARY KEY,
    fos_hash CHAR(64) UNIQUE NOT NULL,
    session_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    manifold_state VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- Immutability contract
    CHECK (manifold_state IN ('E7', 'E8_active', 'E8_converged'))
);

-- Agent handoff validation
CREATE TABLE agent_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_agent VARCHAR(50) NOT NULL,
    to_agent VARCHAR(50) NOT NULL,
    scene_id UUID REFERENCES scenes(id),
    validation_status VARCHAR(20) CHECK (validation_status IN ('pass', 'fail', 'needs_review')),
    confidence NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
    notebook_id VARCHAR(50) DEFAULT 'b04edbc9-ac54-443e-9b4c-d9cbec96f3cd',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Query Your Manifold

```sql
-- E8-converged sessions with dunk validation
SELECT 
    s.session_id,
    COUNT(*) as total_scenes,
    AVG(a.confidence) as avg_validation_confidence
FROM fos_events s
JOIN agent_handoffs a ON a.session_id = s.session_id
WHERE s.manifold_state = 'E8_converged'
GROUP BY s.session_id
HAVING AVG(a.confidence) > 0.95;

-- Beat 15 dunk impacts (±5ms tolerance)
SELECT scene_id, beat_time_ms, energy_level
FROM scenes 
WHERE beat_time_ms BETWEEN 7026 AND 7036 
  AND dunk_impact = TRUE
  AND energy_level >= 0.95;
```

This is your corridor in SQL: immutable logs, typed constraints, normalized relationships, indexed performance. Every query becomes a deterministic view of your manifold state.
