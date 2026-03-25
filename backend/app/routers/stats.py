"""Platform aggregate stats router."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_admin
from app.core.db import get_db_session
from app.models.admin_models import (
    ConsignedVehicle,
    Dealer,
    FinancingApplication,
    Subscription,
)

router = APIRouter(
    prefix="/admin/stats",
    tags=["Stats"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/")
async def get_platform_stats(db: AsyncSession = Depends(get_db_session)):
    # Total dealers (exclude admins)
    total_dealers = (
        await db.execute(
            select(func.count()).where(Dealer.role != "admin")
        )
    ).scalar() or 0

    # Active subscriptions
    active_subs = (
        await db.execute(
            select(func.count()).where(Subscription.status == "active")
        )
    ).scalar() or 0

    # Monthly revenue from active subscriptions
    monthly_revenue = (
        await db.execute(
            select(func.coalesce(func.sum(Subscription.monthly_fee), 0)).where(
                Subscription.status == "active"
            )
        )
    ).scalar() or 0

    # Vehicles on lot (active / pending statuses)
    vehicles_on_lot = (
        await db.execute(
            select(func.count()).where(
                ConsignedVehicle.status.in_(["pending", "on_lot", "active"])
            )
        )
    ).scalar() or 0

    # Vehicles sold
    vehicles_sold = (
        await db.execute(
            select(func.count()).where(ConsignedVehicle.status == "sold")
        )
    ).scalar() or 0

    # Total penalties
    total_penalties = (
        await db.execute(
            select(func.coalesce(func.sum(ConsignedVehicle.penalty_amount), 0))
        )
    ).scalar() or 0

    # Financing applications
    total_financing = (
        await db.execute(select(func.count()).select_from(FinancingApplication))
    ).scalar() or 0

    funded_financing = (
        await db.execute(
            select(func.count()).where(FinancingApplication.status == "funded")
        )
    ).scalar() or 0

    total_funded_amount = (
        await db.execute(
            select(func.coalesce(func.sum(FinancingApplication.loan_amount), 0)).where(
                FinancingApplication.status == "funded"
            )
        )
    ).scalar() or 0

    return {
        "total_dealers": total_dealers,
        "active_subscriptions": active_subs,
        "monthly_revenue": float(monthly_revenue),
        "vehicles_on_lot": vehicles_on_lot,
        "vehicles_sold": vehicles_sold,
        "total_penalties": float(total_penalties),
        "total_financing_applications": total_financing,
        "funded_financing": funded_financing,
        "total_funded_amount": float(total_funded_amount),
    }
