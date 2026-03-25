"""Models shared with OA-landing — same database, same tables.

These model definitions MUST match OA-landing's models exactly.
The admin backend reads from the same DB but does not run migrations.
Migrations are owned by OA-landing's backend.
"""

from datetime import datetime, date
import uuid

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Dealer(Base):
    __tablename__ = "dealer"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    insurance_policy: Mapped[str | None] = mapped_column(String(100), nullable=True)
    insurance_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    insurance_status: Mapped[str] = mapped_column(String(20), server_default="valid", nullable=False)
    compliance_status: Mapped[str] = mapped_column(String(20), server_default="active", nullable=False)
    role: Mapped[str] = mapped_column(String(20), server_default="dealer", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Subscription(Base):
    __tablename__ = "subscription"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dealer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dealer.id"), nullable=False)
    package: Mapped[str] = mapped_column(String(50), nullable=False)
    tier: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    monthly_fee: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    vehicle_allocation: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sales_window_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), server_default="active", nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    renewal_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ConsignedVehicle(Base):
    __tablename__ = "consigned_vehicle"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dealer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dealer.id"), nullable=False)
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("subscription.id"), nullable=True)
    vin: Mapped[str] = mapped_column(String(17), index=True, nullable=False)
    delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sales_window_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), server_default="pending", nullable=False)
    sold_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    principal_remitted: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    financing_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    cr_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recon_cost: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    recon_details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    warranty_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title_holder: Mapped[str] = mapped_column(String(50), server_default="opulent", nullable=False)
    title_status: Mapped[str] = mapped_column(String(50), server_default="held", nullable=False)
    penalty_amount: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    penalty_applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class FinancingApplication(Base):
    __tablename__ = "financing_application"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dealer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dealer.id"), nullable=False)
    consigned_vehicle_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("consigned_vehicle.id"), nullable=True)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    credit_tier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    apr: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    loan_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    term_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    monthly_payment: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    total_interest: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    dealer_kickback: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(20), server_default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class StateLicensingConfig(Base):
    __tablename__ = "state_licensing_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_code: Mapped[str] = mapped_column(String(2), unique=True, index=True, nullable=False)
    state_name: Mapped[str] = mapped_column(String(100), nullable=False)
    licensing_status: Mapped[str] = mapped_column(String(30), server_default="not_licensed", nullable=False)
    sales_tax_model: Mapped[str] = mapped_column(String(30), server_default="dealer_remits", nullable=False)
    min_garage_liability: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    min_lot_coverage: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    min_test_drive_coverage: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    compliance_notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
