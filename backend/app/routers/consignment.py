"""Consignment management router."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_admin
from app.core.db import get_db_session
from app.models.admin_models import ConsignedVehicle, Dealer

router = APIRouter(
    prefix="/admin/consignment",
    tags=["Consignment"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/")
async def list_consigned_vehicles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by vehicle status"),
    db: AsyncSession = Depends(get_db_session),
):
    query = select(ConsignedVehicle)

    if status:
        query = query.where(ConsignedVehicle.status == status)

    # Total count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginated results
    query = query.order_by(ConsignedVehicle.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    vehicles = result.scalars().all()

    # Fetch dealer names for display
    dealer_ids = list({v.dealer_id for v in vehicles})
    dealer_map = {}
    if dealer_ids:
        dealer_result = await db.execute(
            select(Dealer).where(Dealer.id.in_(dealer_ids))
        )
        for d in dealer_result.scalars().all():
            dealer_map[d.id] = d.business_name

    items = [
        {
            "id": str(v.id),
            "dealer_id": str(v.dealer_id),
            "dealer_name": dealer_map.get(v.dealer_id, "Unknown"),
            "vin": v.vin,
            "status": v.status,
            "delivery_date": str(v.delivery_date) if v.delivery_date else None,
            "sales_window_end": str(v.sales_window_end) if v.sales_window_end else None,
            "sold_price": float(v.sold_price) if v.sold_price else None,
            "penalty_amount": float(v.penalty_amount) if v.penalty_amount else None,
            "title_status": v.title_status,
            "title_holder": v.title_holder,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        }
        for v in vehicles
    ]

    return {"items": items, "total": total, "page": page, "page_size": page_size}
