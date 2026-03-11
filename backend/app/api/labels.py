"""Label management API endpoints (BIP-329)."""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional

from app.models.schemas import Label, LabelType
from app.services.label_store import get_label_store

router = APIRouter()


class LabelCreate(BaseModel):
    """Request body for creating/updating a label."""
    type: LabelType
    ref: str
    label: str
    origin: Optional[str] = None
    spendable: Optional[bool] = None


class LabelUpdate(BaseModel):
    """Request body for updating label text."""
    type: Optional[str] = None
    ref: Optional[str] = None
    label: str
    origin: Optional[str] = None
    spendable: Optional[bool] = None
    id: Optional[str] = None


@router.get("/", response_model=list[Label])
async def list_labels(type: str = None, ref: str = None):
    """List all labels, optionally filtered by type and/or ref."""
    store = get_label_store()
    return store.get_all_labels(type, ref)


@router.get("/stats")
async def label_stats():
    """Get label statistics."""
    store = get_label_store()
    return store.stats()


@router.get("/export/bip329", response_class=PlainTextResponse)
async def export_bip329(type: str = None):
    """Export labels in BIP-329 JSONL format."""
    store = get_label_store()
    return store.export_bip329(type)


@router.post("/import/bip329")
async def import_bip329(file: UploadFile = File(...)):
    """Import labels from BIP-329 JSONL file."""
    store = get_label_store()
    content = await file.read()
    count = store.import_bip329(content.decode("utf-8"))
    return {"count": count}


@router.post("/import/bip329/raw")
async def import_bip329_raw(content: str):
    """Import labels from BIP-329 JSONL string."""
    store = get_label_store()
    count = store.import_bip329(content)
    return {"imported": count}


@router.post("/", response_model=Label)
async def create_label(body: LabelCreate):
    """Create or update a label."""
    store = get_label_store()
    return store.set_label(
        label_type=body.type,
        ref=body.ref,
        label_text=body.label,
        origin=body.origin,
        spendable=body.spendable,
    )


@router.get("/{label_type}/{ref:path}", response_model=Label)
async def get_label(label_type: str, ref: str):
    """Get a specific label."""
    store = get_label_store()
    label = store.get_full_label(label_type, ref)
    
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    
    return label


@router.put("/{label_type}/{ref:path}", response_model=Label)
async def update_label(label_type: str, ref: str, body: LabelUpdate):
    """Update an existing label's text."""
    store = get_label_store()
    existing = store.get_full_label(label_type, ref)
    
    if not existing:
        raise HTTPException(status_code=404, detail="Label not found")
    
    return store.set_label(
        label_type=existing.type,
        ref=ref,
        label_text=body.label,
        origin=existing.origin,
        spendable=existing.spendable,
    )


@router.delete("/{label_type}/{ref:path}")
async def delete_label(label_type: str, ref: str):
    """Delete a label."""
    store = get_label_store()
    deleted = store.delete_label(label_type, ref)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Label not found")
    
    return {"deleted": True}
