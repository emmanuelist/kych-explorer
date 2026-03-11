"""BIP-329 label storage and management."""

import json
from pathlib import Path
from typing import Optional
from datetime import datetime

from app.models.schemas import Label, LabelType, LabelExport


class LabelStore:
    """In-memory label store with BIP-329 import/export."""
    
    def __init__(self, storage_path: str = "labels.jsonl"):
        self.storage_path = Path(storage_path)
        self._labels: dict[str, Label] = {}  # key: "{type}:{ref}"
        self._load()
    
    def _make_key(self, label_type: str, ref: str) -> str:
        """Create storage key from type and ref."""
        return f"{label_type}:{ref}"
    
    def _load(self):
        """Load labels from storage file."""
        if not self.storage_path.exists():
            return
        
        try:
            with open(self.storage_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    data = json.loads(line)
                    label = Label(**data)
                    key = self._make_key(label.type.value, label.ref)
                    self._labels[key] = label
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Could not load labels: {e}")
    
    def _save(self):
        """Save labels to storage file."""
        try:
            with open(self.storage_path, "w") as f:
                for label in self._labels.values():
                    f.write(label.model_dump_json() + "\n")
        except IOError as e:
            print(f"Warning: Could not save labels: {e}")
    
    def get_label(self, label_type: str, ref: str) -> Optional[str]:
        """Get label text for a reference."""
        key = self._make_key(label_type, ref)
        label = self._labels.get(key)
        return label.label if label else None
    
    def get_full_label(self, label_type: str, ref: str) -> Optional[Label]:
        """Get full label object."""
        key = self._make_key(label_type, ref)
        label = self._labels.get(key)
        if label and not label.id:
            label.id = f"{label.type.value}/{label.ref}"
        return label
    
    def set_label(
        self, 
        label_type: LabelType, 
        ref: str, 
        label_text: str,
        origin: str = None,
        spendable: bool = None,
    ) -> Label:
        """Set or update a label."""
        label = Label(
            id=f"{label_type.value}/{ref}",
            type=label_type,
            ref=ref,
            label=label_text,
            origin=origin,
            spendable=spendable if label_type == LabelType.OUTPUT else None,
        )
        key = self._make_key(label_type.value, ref)
        self._labels[key] = label
        self._save()
        return label
    
    def delete_label(self, label_type: str, ref: str) -> bool:
        """Delete a label."""
        key = self._make_key(label_type, ref)
        if key in self._labels:
            del self._labels[key]
            self._save()
            return True
        return False
    
    def get_all_labels(self, label_type: str = None, ref: str = None) -> list[Label]:
        """Get all labels, optionally filtered by type and/or ref."""
        results = list(self._labels.values())
        if label_type:
            results = [l for l in results if l.type.value == label_type]
        if ref:
            results = [l for l in results if l.ref == ref]
        # Ensure all labels have id set
        for label in results:
            if not label.id:
                label.id = f"{label.type.value}/{label.ref}"
        return results
    
    def import_bip329(self, content: str) -> int:
        """Import labels from BIP-329 JSONL format. Returns count imported."""
        count = 0
        for line in content.strip().split("\n"):
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                label = Label(**data)
                key = self._make_key(label.type.value, label.ref)
                self._labels[key] = label
                count += 1
            except (json.JSONDecodeError, ValueError):
                continue
        
        self._save()
        return count
    
    def export_bip329(self, label_type: str = None) -> str:
        """Export labels to BIP-329 JSONL format."""
        labels = self.get_all_labels(label_type)
        lines = [label.model_dump_json(exclude_none=True) for label in labels]
        return "\n".join(lines)
    
    def export_bip329_file(self, filepath: str, label_type: str = None):
        """Export labels to BIP-329 file."""
        content = self.export_bip329(label_type)
        with open(filepath, "w") as f:
            f.write(content)
    
    def clear(self):
        """Clear all labels."""
        self._labels.clear()
        self._save()
    
    def stats(self) -> dict:
        """Get label statistics."""
        stats = {"total": len(self._labels)}
        for lt in LabelType:
            stats[lt.value] = len([l for l in self._labels.values() if l.type == lt])
        return stats


# Singleton
_label_store: Optional[LabelStore] = None


def get_label_store() -> LabelStore:
    """Get or create label store singleton."""
    global _label_store
    if _label_store is None:
        _label_store = LabelStore()
    return _label_store
