"""Compliance management router."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_admin
from app.core.db import get_db_session
from app.models.admin_models import (
    ConsignedVehicle,
    Dealer,
    StateLicensingConfig,
)

router = APIRouter(
    prefix="/admin/compliance",
    tags=["Compliance"],
    dependencies=[Depends(get_current_admin)],
)


class StateConfigUpsert(BaseModel):
    state_name: str
    licensing_status: str = "not_licensed"
    sales_tax_model: str = "dealer_remits"
    min_garage_liability: float | None = None
    min_lot_coverage: float | None = None
    min_test_drive_coverage: float | None = None
    compliance_notes: str | None = None
    is_active: bool = False


@router.get("/insurance-alerts")
async def insurance_alerts(db: AsyncSession = Depends(get_db_session)):
    """Dealers with insurance expiring within 30 days."""
    today = date.today()
    threshold = today + timedelta(days=30)

    result = await db.execute(
        select(Dealer).where(
            Dealer.insurance_expiry.isnot(None),
            Dealer.insurance_expiry <= threshold,
            Dealer.role != "admin",
        ).order_by(Dealer.insurance_expiry.asc())
    )
    dealers = result.scalars().all()

    return {
        "alerts": [
            {
                "id": str(d.id),
                "business_name": d.business_name,
                "contact_name": d.contact_name,
                "email": d.email,
                "state": d.state,
                "insurance_policy": d.insurance_policy,
                "insurance_expiry": str(d.insurance_expiry),
                "insurance_status": d.insurance_status,
                "days_until_expiry": (d.insurance_expiry - today).days,
            }
            for d in dealers
        ],
        "total": len(dealers),
    }


@router.post("/run-checks")
async def run_compliance_checks(db: AsyncSession = Depends(get_db_session)):
    """Trigger penalty checks for overdue vehicles and insurance status updates."""
    today = date.today()
    penalties_applied = 0
    insurance_flags = 0

    # --- Penalty checks: vehicles past sales window ---
    overdue_result = await db.execute(
        select(ConsignedVehicle).where(
            ConsignedVehicle.sales_window_end.isnot(None),
            ConsignedVehicle.sales_window_end < today,
            ConsignedVehicle.status.in_(["pending", "on_lot", "active"]),
            ConsignedVehicle.penalty_amount.is_(None),
        )
    )
    overdue_vehicles = overdue_result.scalars().all()

    from datetime import datetime, timezone

    for vehicle in overdue_vehicles:
        days_overdue = (today - vehicle.sales_window_end).days
        # $50/day penalty
        vehicle.penalty_amount = days_overdue * 50.0
        vehicle.penalty_applied_at = datetime.now(timezone.utc)
        penalties_applied += 1

    # --- Insurance checks ---
    expired_result = await db.execute(
        select(Dealer).where(
            Dealer.insurance_expiry.isnot(None),
            Dealer.insurance_expiry < today,
            Dealer.insurance_status != "expired",
            Dealer.role != "admin",
        )
    )
    expired_dealers = expired_result.scalars().all()

    for dealer in expired_dealers:
        dealer.insurance_status = "expired"
        insurance_flags += 1

    # Flag expiring-soon dealers
    threshold = today + timedelta(days=30)
    warning_result = await db.execute(
        select(Dealer).where(
            Dealer.insurance_expiry.isnot(None),
            Dealer.insurance_expiry >= today,
            Dealer.insurance_expiry <= threshold,
            Dealer.insurance_status == "valid",
            Dealer.role != "admin",
        )
    )
    warning_dealers = warning_result.scalars().all()

    for dealer in warning_dealers:
        dealer.insurance_status = "expiring_soon"
        insurance_flags += 1

    await db.commit()

    return {
        "message": "Compliance checks completed",
        "penalties_applied": penalties_applied,
        "insurance_flags_updated": insurance_flags,
    }


@router.get("/states")
async def list_state_configs(db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(
        select(StateLicensingConfig).order_by(StateLicensingConfig.state_code.asc())
    )
    configs = result.scalars().all()

    return {
        "states": [
            {
                "id": str(c.id),
                "state_code": c.state_code,
                "state_name": c.state_name,
                "licensing_status": c.licensing_status,
                "sales_tax_model": c.sales_tax_model,
                "min_garage_liability": float(c.min_garage_liability) if c.min_garage_liability else None,
                "min_lot_coverage": float(c.min_lot_coverage) if c.min_lot_coverage else None,
                "min_test_drive_coverage": float(c.min_test_drive_coverage) if c.min_test_drive_coverage else None,
                "compliance_notes": c.compliance_notes,
                "is_active": c.is_active,
            }
            for c in configs
        ],
        "total": len(configs),
    }


@router.put("/states/{state_code}")
async def upsert_state_config(
    state_code: str,
    body: StateConfigUpsert,
    db: AsyncSession = Depends(get_db_session),
):
    state_code = state_code.upper()
    if len(state_code) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="state_code must be a 2-letter code",
        )

    result = await db.execute(
        select(StateLicensingConfig).where(StateLicensingConfig.state_code == state_code)
    )
    config = result.scalar_one_or_none()

    if config:
        config.state_name = body.state_name
        config.licensing_status = body.licensing_status
        config.sales_tax_model = body.sales_tax_model
        config.min_garage_liability = body.min_garage_liability
        config.min_lot_coverage = body.min_lot_coverage
        config.min_test_drive_coverage = body.min_test_drive_coverage
        config.compliance_notes = body.compliance_notes
        config.is_active = body.is_active
    else:
        config = StateLicensingConfig(
            state_code=state_code,
            state_name=body.state_name,
            licensing_status=body.licensing_status,
            sales_tax_model=body.sales_tax_model,
            min_garage_liability=body.min_garage_liability,
            min_lot_coverage=body.min_lot_coverage,
            min_test_drive_coverage=body.min_test_drive_coverage,
            compliance_notes=body.compliance_notes,
            is_active=body.is_active,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)

    return {
        "message": "State config saved",
        "state_code": config.state_code,
        "state_name": config.state_name,
        "licensing_status": config.licensing_status,
        "is_active": config.is_active,
    }
