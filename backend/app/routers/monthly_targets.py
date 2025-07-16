from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List
from ..database import get_db
from ..models import User, MonthlyTarget, TimeEntry
from ..schemas import MonthlyTarget as MonthlyTargetSchema, MonthlyTargetCreate, MonthlyTargetUpdate, MonthlyTargetWithProgress
from ..auth import get_current_user

router = APIRouter()

@router.post("/", response_model=MonthlyTargetSchema)
async def create_monthly_target(
    target: MonthlyTargetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new monthly target"""

    # Validate month and year
    if not (1 <= target.month <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12"
        )

    if target.year < 2020 or target.year > 2030:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Year must be between 2020 and 2030"
        )

    if target.target_hours <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target hours must be greater than 0"
        )

    # Check if target already exists for this month
    existing_target = db.query(MonthlyTarget).filter(
        MonthlyTarget.user_id == current_user.id,
        MonthlyTarget.year == target.year,
        MonthlyTarget.month == target.month
    ).first()

    if existing_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target already exists for this month"
        )

    # Create new target
    db_target = MonthlyTarget(
        user_id=current_user.id,
        year=target.year,
        month=target.month,
        target_hours=target.target_hours
    )

    db.add(db_target)
    db.commit()
    db.refresh(db_target)

    return db_target

@router.get("/", response_model=List[MonthlyTargetSchema])
async def get_monthly_targets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all monthly targets for the current user"""

    targets = db.query(MonthlyTarget).filter(
        MonthlyTarget.user_id == current_user.id
    ).order_by(MonthlyTarget.year.desc(), MonthlyTarget.month.desc()).all()

    return targets

@router.get("/current", response_model=MonthlyTargetWithProgress)
async def get_current_month_target(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current month's target with progress"""

    current_date = datetime.now()
    current_year = current_date.year
    current_month = current_date.month

    # Get target for current month
    target = db.query(MonthlyTarget).filter(
        MonthlyTarget.user_id == current_user.id,
        MonthlyTarget.year == current_year,
        MonthlyTarget.month == current_month
    ).first()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No target set for current month"
        )

    # Calculate current hours worked
    start_date = date(current_year, current_month, 1)
    if current_month == 12:
        end_date = date(current_year + 1, 1, 1)
    else:
        end_date = date(current_year, current_month + 1, 1)

    time_entries = db.query(TimeEntry).filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.date >= start_date,
        TimeEntry.date < end_date,
        TimeEntry.is_confirmed == True
    ).all()

    current_hours = sum(entry.total_hours or 0 for entry in time_entries)
    remaining_hours = max(0, target.target_hours - current_hours)
    progress_percentage = min(100, (current_hours / target.target_hours) * 100) if target.target_hours > 0 else 0

    return MonthlyTargetWithProgress(
        target=target,
        current_hours=round(current_hours, 2),
        remaining_hours=round(remaining_hours, 2),
        progress_percentage=round(progress_percentage, 1)
    )

@router.get("/{year}/{month}", response_model=MonthlyTargetWithProgress)
async def get_month_target(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get target for a specific month with progress"""

    # Validate month and year
    if not (1 <= month <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12"
        )

    # Get target for specified month
    target = db.query(MonthlyTarget).filter(
        MonthlyTarget.user_id == current_user.id,
        MonthlyTarget.year == year,
        MonthlyTarget.month == month
    ).first()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No target set for {month}/{year}"
        )

    # Calculate hours worked for that month
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)

    time_entries = db.query(TimeEntry).filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.date >= start_date,
        TimeEntry.date < end_date,
        TimeEntry.is_confirmed == True
    ).all()

    current_hours = sum(entry.total_hours or 0 for entry in time_entries)
    remaining_hours = max(0, target.target_hours - current_hours)
    progress_percentage = min(100, (current_hours / target.target_hours) * 100) if target.target_hours > 0 else 0

    return MonthlyTargetWithProgress(
        target=target,
        current_hours=round(current_hours, 2),
        remaining_hours=round(remaining_hours, 2),
        progress_percentage=round(progress_percentage, 1)
    )

@router.put("/{target_id}", response_model=MonthlyTargetSchema)
async def update_monthly_target(
    target_id: int,
    target_update: MonthlyTargetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a monthly target"""

    # Get the target
    target = db.query(MonthlyTarget).filter(
        MonthlyTarget.id == target_id,
        MonthlyTarget.user_id == current_user.id
    ).first()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target not found"
        )

    if target_update.target_hours <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target hours must be greater than 0"
        )

    # Update target
    target.target_hours = target_update.target_hours
    target.updated_at = datetime.now()

    db.commit()
    db.refresh(target)

    return target

@router.delete("/{target_id}")
async def delete_monthly_target(
    target_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a monthly target"""

    # Get the target
    target = db.query(MonthlyTarget).filter(
        MonthlyTarget.id == target_id,
        MonthlyTarget.user_id == current_user.id
    ).first()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target not found"
        )

    db.delete(target)
    db.commit()

    return {"message": "Target deleted successfully"}
