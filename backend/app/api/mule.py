import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.services.mule_service import mule_service

logger = logging.getLogger("fraudlens.api.mule")

router = APIRouter(prefix="/mule", tags=["Mule Account Detection"])


@router.get("/summary", response_model=Dict[str, Any])
async def get_mule_summary():
    """
    Returns live summary KPI metrics for suspected mule accounts and networks.
    Safe terminology: Only refers to accounts as 'Suspected Mule Account'.
    """
    try:
        return mule_service.get_summary()
    except Exception as e:
        logger.error(f"Error fetching mule summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch mule summary: {str(e)}")


@router.get("/graph", response_model=Dict[str, Any])
async def get_mule_graph(
    filter: Optional[str] = Query(
        default="ALL",
        description="Filter graph by entity type: ALL, SUSPECTED, ACCOUNT, DEVICE, BENEFICIARY",
    )
):
    """
    Returns node-link topology graph data for the Entity Graph Explorer.
    Includes accounts, shared devices, aggregation beneficiaries, and transfer edges.
    """
    try:
        return mule_service.get_graph(filter_type=filter)
    except Exception as e:
        logger.error(f"Error fetching mule graph with filter '{filter}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch mule graph: {str(e)}")


@router.get("/accounts", response_model=List[Dict[str, Any]])
async def get_suspected_mule_accounts():
    """
    Returns all detected suspected mule accounts with their risk scores,
    collusion patterns, and trigger reasons.
    """
    try:
        return mule_service.get_suspected_accounts()
    except Exception as e:
        logger.error(f"Error fetching suspected mule accounts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch suspected mule accounts: {str(e)}")


@router.get("/entity/{entity_id}", response_model=Dict[str, Any])
async def get_mule_entity_details(entity_id: str):
    """
    Returns comprehensive details, connected nodes, reasons, and related transactions
    for an individual entity inspected in the Entity Graph Explorer.
    """
    try:
        entity = mule_service.get_entity_details(entity_id)
        if not entity:
            raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found in mule topology")
        return entity
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching entity details for '{entity_id}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch entity details: {str(e)}")
