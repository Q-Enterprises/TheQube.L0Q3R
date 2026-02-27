from __future__ import annotations

from dataclasses import dataclass, field
from collections import deque
from typing import Deque, Dict, Iterable, List, Optional, Set, Tuple


@dataclass(frozen=True)
class WorldEdge:
    """Directed relation from one node to another in the world model."""

    target: str
    relation: str = "adjacent"
    cost: int = 1


@dataclass
class WorldNode:
    """Single node in an explorable world model graph."""

    node_id: str
    summary: str
    tags: Set[str] = field(default_factory=set)
    edges: List[WorldEdge] = field(default_factory=list)


@dataclass(frozen=True)
class ExplorationStep:
    """A deterministic step in the agent's exploration path."""

    from_node: Optional[str]
    to_node: str
    depth: int
    rationale: str


@dataclass
class ExplorationPath:
    """Output capsule describing the full path explored by an agent."""

    start_node: str
    steps: List[ExplorationStep]
    visited_nodes: List[str]
    goals_reached: List[str]
    frontier_exhausted: bool


class WorldModelExplorer:
    """
    Builds a deterministic exploration path across a world model.

    Traversal strategy:
    - Breadth-first expansion for predictable coverage.
    - Stable sort by (cost, relation, target) for deterministic ordering.
    - Optional goal tags terminate traversal once all are reached.
    """

    def __init__(self, world_nodes: Iterable[WorldNode]):
        self.nodes: Dict[str, WorldNode] = {n.node_id: n for n in world_nodes}

    def build_path(
        self,
        start_node: str,
        *,
        max_depth: int = 4,
        goal_tags: Optional[Set[str]] = None,
    ) -> ExplorationPath:
        if start_node not in self.nodes:
            raise ValueError(f"Unknown start node: {start_node}")

        goal_tags = goal_tags or set()
        goals_reached: Set[str] = set()

        queue: Deque[Tuple[str, int, Optional[str]]] = deque([(start_node, 0, None)])
        seen: Set[str] = set()
        visited_nodes: List[str] = []
        steps: List[ExplorationStep] = []
        frontier_exhausted = True

        while queue:
            node_id, depth, from_node = queue.popleft()
            if node_id in seen:
                continue
            seen.add(node_id)
            visited_nodes.append(node_id)

            node = self.nodes[node_id]
            if goal_tags.intersection(node.tags):
                goals_reached.update(goal_tags.intersection(node.tags))

            rationale = self._build_rationale(node=node, depth=depth, goal_tags=goal_tags)
            steps.append(
                ExplorationStep(
                    from_node=from_node,
                    to_node=node_id,
                    depth=depth,
                    rationale=rationale,
                )
            )

            if goals_reached == goal_tags and goal_tags:
                break

            if depth >= max_depth:
                frontier_exhausted = False
                continue

            for edge in self._sorted_edges(node.edges):
                if edge.target in self.nodes and edge.target not in seen:
                    queue.append((edge.target, depth + 1, node_id))

        return ExplorationPath(
            start_node=start_node,
            steps=steps,
            visited_nodes=visited_nodes,
            goals_reached=sorted(goals_reached),
            frontier_exhausted=frontier_exhausted,
        )

    @staticmethod
    def _sorted_edges(edges: Iterable[WorldEdge]) -> List[WorldEdge]:
        return sorted(edges, key=lambda e: (e.cost, e.relation, e.target))

    @staticmethod
    def _build_rationale(node: WorldNode, depth: int, goal_tags: Set[str]) -> str:
        if goal_tags.intersection(node.tags):
            goals = ", ".join(sorted(goal_tags.intersection(node.tags)))
            return f"Goal surface reached ({goals}) at depth {depth}."
        return f"Coverage expansion at depth {depth} via deterministic breadth-first traversal."
