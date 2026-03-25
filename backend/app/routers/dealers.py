"""Dealer management router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
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
    prefix="/admin/dealers",
    tags=["Dealers"],
    dependencies=[Depends(get_current_admin)],
)


class ApproveDeclineRequest(BaseModel):
    action: str  # "approve" or "decline"
    notes: Optional[str] = None


class ComplianceUpdateRequest(BaseModel):
    status: str


@router.get("/")
async def list_dealers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by compliance_status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    db: AsyncSession = Depends(get_db_session),
):
    query = select(Dealer)

    if status:
        query = query.where(Dealer.compliance_status == status)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            (Dealer.business_name.ilike(pattern))
            | (Dealer.email.ilike(pattern))
            | (Dealer.contact_name.ilike(pattern))
        )

    # Total count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginated results
    query = query.order_by(Dealer.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    dealers = result.scalars().all()

    # Fetch subscriptions for these dealers
    dealer_ids = [d.id for d in dealers]
    sub_result = await db.execute(
        select(Subscription).where(Subscription.dealer_id.in_(dealer_ids))
    )
    subs_by_dealer = {}
    for sub in sub_result.scalars().all():
        subs_by_dealer[sub.dealer_id] = sub

    items = []
    for d in dealers:
        sub = subs_by_dealer.get(d.id)
        items.append({
            "id": str(d.id),
            "email": d.email,
            "business_name": d.business_name,
            "contact_name": d.contact_name,
            "phone": d.phone,
            "state": d.state,
            "compliance_status": d.compliance_status,
            "insurance_status": d.insurance_status,
            "insurance_expiry": str(d.insurance_expiry) if d.insurance_expiry else None,
            "is_active": d.is_active,
            "role": d.role,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "subscription": {
                "id": str(sub.id),
                "package": sub.package,
                "tier": sub.tier,
                "status": sub.status,
                "monthly_fee": float(sub.monthly_fee) if sub.monthly_fee else None,
                "vehicle_allocation": sub.vehicle_allocation,
            } if sub else None,
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{dealer_id}")
async def get_dealer(
    dealer_id: UUID,
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(select(Dealer).where(Dealer.id == dealer_id))
    dealer = result.scalar_one_or_none()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    # Subscription
    sub_result = await db.execute(
        select(Subscription).where(Subscription.dealer_id == dealer_id)
    )
    subscription = sub_result.scalar_one_or_none()

    # Consigned vehicles
    veh_result = await db.execute(
        select(ConsignedVehicle)
        .where(ConsignedVehicle.dealer_id == dealer_id)
        .order_by(ConsignedVehicle.created_at.desc())
    )
    vehicles = veh_result.scalars().all()

    # Financing applications
    fin_result = await db.execute(
        select(FinancingApplication)
        .where(FinancingApplication.dealer_id == dealer_id)
        .order_by(FinancingApplication.created_at.desc())
    )
    financing_apps = fin_result.scalars().all()

    return {
        "dealer": {
            "id": str(dealer.id),
            "email": dealer.email,
            "business_name": dealer.business_name,
            "contact_name": dealer.contact_name,
            "phone": dealer.phone,
            "address": dealer.address,
            "city": dealer.city,
            "state": dealer.state,
            "zip_code": dealer.zip_code,
            "insurance_policy": dealer.insurance_policy,
            "insurance_expiry": str(dealer.insurance_expiry) if dealer.insurance_expiry else None,
            "insurance_status": dealer.insurance_status,
            "compliance_status": dealer.compliance_status,
            "role": dealer.role,
            "is_active": dealer.is_active,
            "created_at": dealer.created_at.isoformat() if dealer.created_at else None,
            "updated_at": dealer.updated_at.isoformat() if dealer.updated_at else None,
        },
        "subscription": {
            "id": str(subscription.id),
            "package": subscription.package,
            "tier": subscription.tier,
            "category": subscription.category,
            "monthly_fee": float(subscription.monthly_fee) if subscription.monthly_fee else None,
            "vehicle_allocation": subscription.vehicle_allocation,
            "sales_window_days": subscription.sales_window_days,
            "status": subscription.status,
            "start_date": str(subscription.start_date) if subscription.start_date else None,
            "renewal_date": str(subscription.renewal_date) if subscription.renewal_date else None,
        } if subscription else None,
        "consigned_vehicles": [
            {
                "id": str(v.id),
                "vin": v.vin,
                "status": v.status,
                "delivery_date": str(v.delivery_date) if v.delivery_date else None,
                "sales_window_end": str(v.sales_window_end) if v.sales_window_end else None,
                "sold_price": float(v.sold_price) if v.sold_price else None,
                "penalty_amount": float(v.penalty_amount) if v.penalty_amount else None,
                "title_status": v.title_status,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in vehicles
        ],
        "financing_applications": [
            {
                "id": str(f.id),
                "customer_name": f.customer_name,
                "credit_tier": f.credit_tier,
                "loan_amount": float(f.loan_amount) if f.loan_amount else None,
                "apr": float(f.apr) if f.apr else None,
                "term_months": f.term_months,
                "status": f.status,
                "dealer_kickback": float(f.dealer_kickback) if f.dealer_kickback else None,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in financing_apps
        ],
    }


@router.put("/{dealer_id}/approve")
async def approve_decline_dealer(
    dealer_id: UUID,
    body: ApproveDeclineRequest,
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(select(Dealer).where(Dealer.id == dealer_id))
    dealer = result.scalar_one_or_none()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    if body.action == "approve":
        dealer.compliance_status = "active"
        dealer.is_active = True
    elif body.action == "decline":
        dealer.compliance_status = "declined"
        dealer.is_active = False
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="action must be 'approve' or 'decline'",
        )

    await db.commit()
    await db.refresh(dealer)

    return {
        "message": f"Dealer {body.action}d successfully",
        "dealer_id": str(dealer.id),
        "compliance_status": dealer.compliance_status,
        "is_active": dealer.is_active,
    }


@router.put("/{dealer_id}/compliance")
async def update_compliance(
    dealer_id: UUID,
    body: ComplianceUpdateRequest,
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(select(Dealer).where(Dealer.id == dealer_id))
    dealer = result.scalar_one_or_none()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    dealer.compliance_status = body.status
    await db.commit()
    await db.refresh(dealer)

    return {
        "message": "Compliance status updated",
        "dealer_id": str(dealer.id),
        "compliance_status": dealer.compliance_status,
    }
