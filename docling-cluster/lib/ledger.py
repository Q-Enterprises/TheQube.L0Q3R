import logging
import time
from typing import Any, Dict, Optional
from .canonical import compute_hash

logger = logging.getLogger(__name__)

class Ledger:
    """
    A simple in-memory hash-chain ledger (persisted via log appending in a real system).
    """
    def __init__(self):
        self.chain = []
        self.last_hash = "0" * 64

    def record_entry(self, operation: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Records an entry in the ledger.
        """
        timestamp = time.time()
        entry = {
            "op": operation,
            "ts": timestamp,
            "prev": self.last_hash,
            "data": data
        }
        
        entry_hash = compute_hash(entry)
        self.chain.append({
            "hash": entry_hash,
            "entry": entry
        })
        self.last_hash = entry_hash
        
        logger.info(f"LEDGER | {operation} | {entry_hash[:8]} | {data}")
        return {"hash": entry_hash, "entry": entry}

# Global singleton for simplicity in this worker context
_ledger = Ledger()

def get_ledger():
    return _ledger
