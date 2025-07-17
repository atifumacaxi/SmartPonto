from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.monthly_target import MonthlyTarget
from ..schemas.monthly_target import (
    MonthlyTarget as MonthlyTargetSchema,
    MonthlyTargetCreate,
    MonthlyTargetUpdate,
    MonthlyTargetWithProgress
)
from ..auth import get_current_user
from ..services.monthly_target_service import MonthlyTargetService
from typing import List

router = APIRouter()

@router.post("/", response_model=MonthlyTargetSchema)
async def create_monthly_target(
    target: MonthlyTargetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return MonthlyTargetService.create_target(db, current_user.id, target)

@router.get("/", response_model=List[MonthlyTargetSchema])
async def get_monthly_targets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return MonthlyTargetService.get_targets_by_user(db, current_user.id)

@router.get("/current", response_model=MonthlyTargetWithProgress)
async def get_current_month_target(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target = MonthlyTargetService.get_current_month_target(db, current_user.id)
    return MonthlyTargetService.calculate_progress(db, target)

@router.get("/{year}/{month}", response_model=MonthlyTargetWithProgress)
async def get_month_target(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target = MonthlyTargetService.get_target_by_month(db, current_user.id, year, month)
    return MonthlyTargetService.calculate_progress(db, target)

@router.put("/{target_id}", response_model=MonthlyTargetSchema)
async def update_monthly_target(
    target_id: int,
    target_update: MonthlyTargetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return MonthlyTargetService.update_target(db, target_id, current_user.id, target_update)

@router.delete("/{target_id}")
async def delete_monthly_target(
    target_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    MonthlyTargetService.delete_target(db, target_id, current_user.id)
    return {"message": "Target deleted successfully"}
