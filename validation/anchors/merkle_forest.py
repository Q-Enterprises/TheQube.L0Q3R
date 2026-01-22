from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


# ---------- Merkle primitives ----------

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonicalize_jcs(payload: Dict[str, Any]) -> str:
    """Implements JSON Canonicalization Scheme (RFC 8785) for dict payloads."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


@dataclass(frozen=True)
class HashSurfaces:
    leaf_hash: str
    canonical_payload: str

    @classmethod
    def from_payload(cls, payload: Dict[str, Any]) -> "HashSurfaces":
        canonical_source = {key: value for key, value in payload.items() if key != "digest"}
        canonical_payload = canonicalize_jcs(canonical_source)
        leaf_hash = payload.get("digest") or sha256_hex(canonical_payload.encode("utf-8"))
        return cls(leaf_hash=leaf_hash, canonical_payload=canonical_payload)


def canonical_leaf_hash(payload: Dict[str, Any]) -> str:
    """
    Canonical leaf hashing: uses payload["digest"] when provided,
    otherwise computes a digest from RFC 8785 canonical JSON without digest.
    """
    hs = HashSurfaces.from_payload(payload)
    return hs.leaf_hash


@dataclass
class MerkleNode:
    hash: str
    left: Optional["MerkleNode"] = None
    right: Optional["MerkleNode"] = None
    is_leaf: bool = False
    leaf_id: Optional[str] = None  # e.g., receipt_id


@dataclass
class MerkleTree:
    """
    A single Merkle tree over a sequence of fossils (e.g., AgentProposalReceipt.v1).
    """

    tree_id: str
    leaves: List[MerkleNode] = field(default_factory=list)
    root: Optional[MerkleNode] = None
    created_at_utc: float = field(default_factory=lambda: time.time())
    last_updated_utc: float = field(default_factory=lambda: time.time())

    def add_leaf(self, leaf_id: str, payload: Dict[str, Any]) -> None:
        leaf_hash = canonical_leaf_hash(payload)
        node = MerkleNode(hash=leaf_hash, is_leaf=True, leaf_id=leaf_id)
        self.leaves.append(node)
        self.last_updated_utc = time.time()
        self.root = self._build_tree(self.leaves)

    def _build_tree(self, leaves: List[MerkleNode]) -> Optional[MerkleNode]:
        if not leaves:
            return None
        level = leaves[:]
        while len(level) > 1:
            next_level: List[MerkleNode] = []
            for i in range(0, len(level), 2):
                left = level[i]
                right = level[i + 1] if i + 1 < len(level) else left
                combined = (left.hash + right.hash).encode("utf-8")
                parent_hash = sha256_hex(combined)
                parent = MerkleNode(hash=parent_hash, left=left, right=right, is_leaf=False)
                next_level.append(parent)
            level = next_level
        return level[0]

    def get_root_hash(self) -> Optional[str]:
        return self.root.hash if self.root else None

    def inclusion_proof(self, leaf_id: str) -> Optional[List[Tuple[str, str]]]:
        """
        Returns a list of (sibling_hash, position) where position is 'L' or 'R'.
        """
        if not self.root:
            return None

        path: List[Tuple[str, str]] = []

        def dfs(node: MerkleNode, target: str, acc: List[Tuple[str, str]]) -> bool:
            if node.is_leaf and node.leaf_id == target:
                return True
            if not node.left or not node.right:
                return False
            # search left
            if dfs(node.left, target, acc):
                acc.append((node.right.hash, "R"))
                return True
            # search right
            if dfs(node.right, target, acc):
                acc.append((node.left.hash, "L"))
                return True
            return False

        found = dfs(self.root, leaf_id, path)
        return path if found else None

    @staticmethod
    def verify_inclusion(
        leaf_hash: str,
        root_hash: str,
        proof: List[Tuple[str, str]],
    ) -> bool:
        h = leaf_hash
        for sibling_hash, pos in proof:
            if pos == "R":
                h = sha256_hex((h + sibling_hash).encode("utf-8"))
            else:
                h = sha256_hex((sibling_hash + h).encode("utf-8"))
        return h == root_hash


# ---------- Random Forest protocol (lifecycle + pruning) ----------

@dataclass
class ForestConfig:
    stale_seconds: float = 60 * 60 * 24  # 24h
    max_trees: int = 128  # cap forest size


@dataclass
class MerkleForest:
    """
    Random Forest protocol:
    - Each tree = an agentic thread / branch.
    - Trees are pruned when stale.
    - New leaves extend active branches.
    """

    config: ForestConfig = field(default_factory=ForestConfig)
    trees: Dict[str, MerkleTree] = field(default_factory=dict)

    def _now(self) -> float:
        return time.time()

    def add_fossil_to_thread(
        self,
        thread_id: str,
        leaf_id: str,
        payload: Dict[str, Any],
    ) -> MerkleTree:
        """
        Add a fossil (receipt/event) to a given agentic thread.
        Creates a new tree if needed.
        """
        if thread_id not in self.trees:
            self._maybe_prune()
            self.trees[thread_id] = MerkleTree(tree_id=thread_id)
        tree = self.trees[thread_id]
        tree.add_leaf(leaf_id, payload)
        return tree

    def _maybe_prune(self) -> None:
        """
        Lifecycle management:
        - Remove trees that have been inactive longer than stale_seconds.
        - If still over max_trees, prune oldest.
        """
        now = self._now()
        # prune stale
        stale_keys = [
            tid
            for tid, t in self.trees.items()
            if (now - t.last_updated_utc) > self.config.stale_seconds
        ]
        for tid in stale_keys:
            del self.trees[tid]

        # enforce max_trees
        if len(self.trees) > self.config.max_trees:
            # sort by last_updated_utc ascending, drop oldest
            ordered = sorted(
                self.trees.items(),
                key=lambda kv: kv[1].last_updated_utc,
            )
            to_drop = len(self.trees) - self.config.max_trees
            for tid, _ in ordered[:to_drop]:
                del self.trees[tid]

    def get_root_hash_for_thread(self, thread_id: str) -> Optional[str]:
        tree = self.trees.get(thread_id)
        return tree.get_root_hash() if tree else None

    def get_forest_roots(self) -> Dict[str, str]:
        """
        Snapshot of all active branches as {thread_id: root_hash}.
        """
        return {
            tid: t.get_root_hash()
            for tid, t in self.trees.items()
            if t.get_root_hash() is not None
        }

    def prune_thread(self, thread_id: str) -> None:
        """
        Explicitly prune a single agentic branch.
        """
        self.trees.pop(thread_id, None)
