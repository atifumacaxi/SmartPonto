from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Tuple
from app.models.monthly_target import MonthlyTarget
from app.models.time_entry import TimeEntry
from app.schemas import MonthlyTargetCreate, MonthlyTargetUpdate, MonthlyTargetWithProgress
import calendar

class MonthlyTargetService:
    @staticmethod
    def get_custom_month_range(target: MonthlyTarget) -> Tuple[date, date]:
        year = target.year
        month = target.month

        last_day = calendar.monthrange(year, month)[1]

        if not (1 <= target.start_day <= last_day):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Start day must be between 1 and {last_day} for month {month}"
            )
        if not (1 <= target.end_day <= last_day):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"End day must be between 1 and {last_day} for month {month}"
            )

        start_date = date(year, month, target.start_day)
        # If end_day < start_day, the range crosses into the next month
        if target.end_day >= target.start_day:
            end_date = date(year, month, target.end_day + 1)  # +1 to make it inclusive
        else:
            if month == 12:
                end_date = date(year + 1, 1, target.end_day + 1)
            else:
                end_date = date(year, month + 1, target.end_day + 1)
        return start_date, end_date

    @staticmethod
    def validate_target_data(target: MonthlyTargetCreate) -> None:
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
        last_day = calendar.monthrange(target.year, target.month)[1]
        if not (1 <= target.start_day <= last_day):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Start day must be between 1 and {last_day} for month {target.month}"
            )
        if not (1 <= target.end_day <= last_day):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"End day must be between 1 and {last_day} for month {target.month}"
            )

    @staticmethod
    def check_existing_target(db: Session, user_id: int, year: int, month: int) -> None:
        existing_target = db.query(MonthlyTarget).filter(
            MonthlyTarget.user_id == user_id,
            MonthlyTarget.year == year,
            MonthlyTarget.month == month
        ).first()
        if existing_target:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target already exists for this month"
            )

    @staticmethod
    def create_target(db: Session, user_id: int, target: MonthlyTargetCreate) -> MonthlyTarget:
        MonthlyTargetService.validate_target_data(target)
        MonthlyTargetService.check_existing_target(db, user_id, target.year, target.month)
        db_target = MonthlyTarget(
            user_id=user_id,
            year=target.year,
            month=target.month,
            start_day=target.start_day,
            end_day=target.end_day,
            target_hours=target.target_hours
        )
        db.add(db_target)
        db.commit()
        db.refresh(db_target)
        return db_target

    @staticmethod
    def get_targets_by_user(db: Session, user_id: int) -> List[MonthlyTarget]:
        return db.query(MonthlyTarget).filter(
            MonthlyTarget.user_id == user_id
        ).order_by(MonthlyTarget.year.desc(), MonthlyTarget.month.desc()).all()

    @staticmethod
    def get_target_by_month(db: Session, user_id: int, year: int, month: int) -> MonthlyTarget:
        target = db.query(MonthlyTarget).filter(
            MonthlyTarget.user_id == user_id,
            MonthlyTarget.year == year,
            MonthlyTarget.month == month
        ).first()
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No target set for {month}/{year}"
            )
        return target

    @staticmethod
    def get_current_month_target(db: Session, user_id: int) -> MonthlyTarget:
        current_date = datetime.now()
        current_year = current_date.year
        current_month = current_date.month
        target = db.query(MonthlyTarget).filter(
            MonthlyTarget.user_id == user_id,
            MonthlyTarget.year == current_year,
            MonthlyTarget.month == current_month
        ).first()
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No target set for current month"
            )
        return target

    @staticmethod
    def calculate_progress(db: Session, target: MonthlyTarget) -> MonthlyTargetWithProgress:
        start_date, end_date = MonthlyTargetService.get_custom_month_range(target)
        time_entries = db.query(TimeEntry).filter(
            TimeEntry.user_id == target.user_id,
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

    @staticmethod
    def update_target(db: Session, target_id: int, user_id: int, target_update: MonthlyTargetUpdate) -> MonthlyTarget:
        target = db.query(MonthlyTarget).filter(
            MonthlyTarget.id == target_id,
            MonthlyTarget.user_id == user_id
        ).first()
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target not found"
            )
        if target_update.target_hours is not None:
            if target_update.target_hours <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Target hours must be greater than 0"
                )
            target.target_hours = target_update.target_hours
        if target_update.start_day is not None:
            last_day = calendar.monthrange(target.year, target.month)[1]
            if not (1 <= target_update.start_day <= last_day):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Start day must be between 1 and {last_day} for month {target.month}"
                )
            target.start_day = target_update.start_day
        if target_update.end_day is not None:
            last_day = calendar.monthrange(target.year, target.month)[1]
            if not (1 <= target_update.end_day <= last_day):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"End day must be between 1 and {last_day} for month {target.month}"
                )
            target.end_day = target_update.end_day
        target.updated_at = datetime.now()
        db.commit()
        db.refresh(target)
        return target

    @staticmethod
    def delete_target(db: Session, target_id: int, user_id: int) -> None:
        target = db.query(MonthlyTarget).filter(
            MonthlyTarget.id == target_id,
            MonthlyTarget.user_id == user_id
        ).first()
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target not found"
            )
        db.delete(target)
        db.commit()
