"""Know Your Coin History - FastAPI Application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import transactions, labels, graph

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="A tool to label and explore the history of your Bitcoin coins",
    version="0.1.0",
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(labels.router, prefix="/api/labels", tags=["labels"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": settings.app_name}


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": {
            "transactions": "/api/transactions",
            "labels": "/api/labels", 
            "graph": "/api/graph",
        }
    }
