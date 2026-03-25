"""Financing management router."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_admin
from app.core.db import get_db_session
from app.models.admin_models import ConsignedVehicle, Dealer, FinancingApplication

router = APIRouter(
    prefix="/admin/financing",
    tags=["Financing"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/")
async def list_financing_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by application status"),
    db: AsyncSession = Depends(get_db_session),
):
    query = select(FinancingApplication)

    if status:
        query = query.where(FinancingApplication.status == status)

    # Total count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginated results
    query = query.order_by(FinancingApplication.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    applications = result.scalars().all()

    # Fetch dealer names
    dealer_ids = list({a.dealer_id for a in applications})
    dealer_map = {}
    if dealer_ids:
        dealer_result = await db.execute(
            select(Dealer).where(Dealer.id.in_(dealer_ids))
        )
        for d in dealer_result.scalars().all():
            dealer_map[d.id] = d.business_name

    items = [
        {
            "id": str(a.id),
            "dealer_id": str(a.dealer_id),
            "dealer_name": dealer_map.get(a.dealer_id, "Unknown"),
            "customer_name": a.customer_name,
            "credit_tier": a.credit_tier,
            "apr": float(a.apr) if a.apr else None,
            "loan_amount": float(a.loan_amount) if a.loan_amount else None,
            "term_months": a.term_months,
            "monthly_payment": float(a.monthly_payment) if a.monthly_payment else None,
            "total_interest": float(a.total_interest) if a.total_interest else None,
            "dealer_kickback": float(a.dealer_kickback) if a.dealer_kickback else None,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in applications
    ]

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/stats")
async def financing_stats(db: AsyncSession = Depends(get_db_session)):
    # Total funded amount
    total_funded = (
        await db.execute(
            select(func.coalesce(func.sum(FinancingApplication.loan_amount), 0)).where(
                FinancingApplication.status == "funded"
            )
        )
    ).scalar() or 0

    # Total applications
    total_apps = (
        await db.execute(select(func.count()).select_from(FinancingApplication))
    ).scalar() or 0

    # Funded count
    funded_count = (
        await db.execute(
            select(func.count()).where(FinancingApplication.status == "funded")
        )
    ).scalar() or 0

    # Penetration rate: funded / total vehicles sold
    vehicles_sold = (
        await db.execute(
            select(func.count()).where(ConsignedVehicle.status == "sold")
        )
    ).scalar() or 0

    penetration_rate = (funded_count / vehicles_sold * 100) if vehicles_sold > 0 else 0.0

    # Total kickbacks
    total_kickbacks = (
        await db.execute(
            select(func.coalesce(func.sum(FinancingApplication.dealer_kickback), 0)).where(
                FinancingApplication.status == "funded"
            )
        )
    ).scalar() or 0

    return {
        "total_funded_amount": float(total_funded),
        "total_applications": total_apps,
        "funded_count": funded_count,
        "vehicles_sold": vehicles_sold,
        "penetration_rate": round(float(penetration_rate), 2),
        "total_kickbacks": float(total_kickbacks),
    }
