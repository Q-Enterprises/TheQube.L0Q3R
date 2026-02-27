import unittest

from app.services.world_model_explorer import WorldEdge, WorldModelExplorer, WorldNode


class WorldModelExplorerTests(unittest.TestCase):
    def _build_fixture(self):
        return [
            WorldNode(
                node_id="spawn",
                summary="Starting chamber",
                tags={"entry"},
                edges=[
                    WorldEdge(target="hall", relation="corridor", cost=1),
                    WorldEdge(target="vault", relation="corridor", cost=3),
                ],
            ),
            WorldNode(
                node_id="hall",
                summary="Hallway",
                tags={"transit"},
                edges=[
                    WorldEdge(target="lab", relation="door", cost=1),
                    WorldEdge(target="vault", relation="corridor", cost=1),
                ],
            ),
            WorldNode(
                node_id="lab",
                summary="Observation lab",
                tags={"intel"},
                edges=[],
            ),
            WorldNode(
                node_id="vault",
                summary="Goal node",
                tags={"goal"},
                edges=[],
            ),
        ]

    def test_deterministic_breadth_first_path(self):
        explorer = WorldModelExplorer(self._build_fixture())
        path = explorer.build_path("spawn", max_depth=4)
        self.assertEqual(path.visited_nodes, ["spawn", "hall", "vault", "lab"])
        self.assertTrue(path.frontier_exhausted)

    def test_goal_tag_stops_when_reached(self):
        explorer = WorldModelExplorer(self._build_fixture())
        path = explorer.build_path("spawn", max_depth=4, goal_tags={"goal"})
        self.assertEqual(path.goals_reached, ["goal"])
        self.assertEqual(path.visited_nodes, ["spawn", "hall", "vault"])

    def test_unknown_start_node_raises(self):
        explorer = WorldModelExplorer(self._build_fixture())
        with self.assertRaises(ValueError):
            explorer.build_path("missing")


if __name__ == "__main__":
    unittest.main()
