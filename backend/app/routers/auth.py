"""Admin authentication router."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_access_token,
    get_current_admin,
    verify_password,
)
from app.core.db import get_db_session
from app.models.admin_models import Dealer

router = APIRouter(prefix="/admin/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminProfile(BaseModel):
    id: str
    email: str
    role: str


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(Dealer).where(Dealer.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role}
    )
    return LoginResponse(access_token=token)


@router.get("/me", response_model=AdminProfile)
async def me(current_admin: dict = Depends(get_current_admin)):
    return AdminProfile(
        id=current_admin["id"],
        email=current_admin["email"],
        role=current_admin["role"],
    )
