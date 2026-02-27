# Agent Exploration Path for the World Model

This adds a deterministic pathing layer so an agent can explore a world model as a graph.

## Implementation

- Module: `app/services/world_model_explorer.py`
- Core types:
  - `WorldNode`
  - `WorldEdge`
  - `ExplorationStep`
  - `ExplorationPath`
  - `WorldModelExplorer`

## Traversal guarantees

1. **Deterministic ordering** using stable edge sorting `(cost, relation, target)`.
2. **Breadth-first coverage** for predictable expansion.
3. **Goal-directed stop condition** using `goal_tags`.
4. **Depth cap** via `max_depth` to enforce bounded exploration.

## Example

```python
from app.services.world_model_explorer import WorldNode, WorldEdge, WorldModelExplorer

nodes = [
    WorldNode("spawn", "Entry", tags={"entry"}, edges=[WorldEdge("hall")]),
    WorldNode("hall", "Transit", tags={"transit"}, edges=[WorldEdge("vault", relation="door")]),
    WorldNode("vault", "Target", tags={"goal"}, edges=[]),
]

explorer = WorldModelExplorer(nodes)
path = explorer.build_path("spawn", max_depth=4, goal_tags={"goal"})

print(path.visited_nodes)
# ['spawn', 'hall', 'vault']
```

This creates a concrete path for the agent to explore and validates that the goal surface is reached.
