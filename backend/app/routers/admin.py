from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, date
import os
from ..database import get_db
from app.models import User, TimeEntry
from ..schemas import User as UserSchema
from ..auth import get_current_user

router = APIRouter()

def check_admin_access(current_user: User = Depends(get_current_user)):
    """Check if current user has admin/boss access"""
    if current_user.role_type not in ["boss", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    return current_user

def check_admin_only(current_user: User = Depends(get_current_user)):
    """Check if current user has admin access only"""
    if current_user.role_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    return current_user

@router.get("/users", response_model=List[UserSchema])
async def get_all_users(
    current_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db)
):
    """Get all users (admin/boss only)"""
    users = db.query(User).all()
    return users

@router.get("/time-entries")
async def get_all_time_entries(
    user_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    confirmed_only: Optional[bool] = None,
    current_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db)
):
    """Get all time entries with user details (admin/boss only)"""

    # Build query
    query = db.query(TimeEntry).join(User)

    # Filter by user if specified
    if user_id:
        query = query.filter(TimeEntry.user_id == user_id)

    # Filter by date range if specified
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(TimeEntry.date >= start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            query = query.filter(TimeEntry.date <= end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD"
            )

    # Filter by confirmation status if specified
    if confirmed_only is not None:
        query = query.filter(TimeEntry.is_confirmed == confirmed_only)

    # Order by date (newest first)
    query = query.order_by(TimeEntry.date.desc(), TimeEntry.start_time.desc())

    # Execute query
    entries = query.all()

    # Format response
    formatted_entries = []
    for entry in entries:
        formatted_entry = {
            "id": entry.id,
            "date": entry.date.strftime("%Y-%m-%d"),
            "start_time": entry.start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": entry.end_time.strftime("%Y-%m-%d %H:%M:%S") if entry.end_time else None,
            "total_hours": entry.total_hours,
            "is_confirmed": entry.is_confirmed,
            "extracted_text": entry.extracted_text,
            "photo_path": entry.photo_path,
            "created_at": entry.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "user": {
                "id": entry.user.id,
                "username": entry.user.username,
                "full_name": entry.user.full_name,
                "email": entry.user.email,
                "role_type": entry.user.role_type
            }
        }
        formatted_entries.append(formatted_entry)

    return {
        "total_entries": len(formatted_entries),
        "entries": formatted_entries
    }

@router.get("/users/{user_id}/time-entries")
async def get_user_time_entries(
    user_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    confirmed_only: Optional[bool] = None,
    current_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db)
):
    """Get all time entries for a specific user (admin/boss only)"""

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Build query
    query = db.query(TimeEntry).filter(TimeEntry.user_id == user_id)

    # Filter by date range if specified
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(TimeEntry.date >= start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD"
            )

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            query = query.filter(TimeEntry.date <= end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD"
            )

    # Filter by confirmation status if specified
    if confirmed_only is not None:
        query = query.filter(TimeEntry.is_confirmed == confirmed_only)

    # Order by date (newest first)
    query = query.order_by(TimeEntry.date.desc(), TimeEntry.start_time.desc())

    # Execute query
    entries = query.all()

    # Format response
    formatted_entries = []
    for entry in entries:
        formatted_entry = {
            "id": entry.id,
            "date": entry.date.strftime("%Y-%m-%d"),
            "start_time": entry.start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": entry.end_time.strftime("%Y-%m-%d %H:%M:%S") if entry.end_time else None,
            "total_hours": entry.total_hours,
            "is_confirmed": entry.is_confirmed,
            "extracted_text": entry.extracted_text,
            "photo_path": entry.photo_path,
            "created_at": entry.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        formatted_entries.append(formatted_entry)

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role_type": user.role_type
        },
        "total_entries": len(formatted_entries),
        "entries": formatted_entries
    }

@router.get("/users/{user_id}/time-summary")
async def get_user_time_summary(
    user_id: int,
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db)
):
    """Get time summary for a specific user (admin/boss only)"""

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Set default year and month if not provided
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month

    # Build query for time entries
    query = db.query(TimeEntry).filter(
        TimeEntry.user_id == user_id
    )

    # Add date filters
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    query = query.filter(
        and_(
            TimeEntry.date >= start_date,
            TimeEntry.date < end_date
        )
    )

    # Get all entries for the month
    entries = query.all()

    # Calculate summary
    total_hours = sum(entry.total_hours or 0 for entry in entries if entry.total_hours)
    total_entries = len(entries)
    confirmed_entries = len([e for e in entries if e.is_confirmed])

    # Group by day for daily breakdown
    daily_breakdown = {}
    for entry in entries:
        day_key = entry.date.strftime('%Y-%m-%d')
        if day_key not in daily_breakdown:
            daily_breakdown[day_key] = {
                'date': day_key,
                'total_hours': 0,
                'entries_count': 0
            }
        daily_breakdown[day_key]['total_hours'] += entry.total_hours or 0
        daily_breakdown[day_key]['entries_count'] += 1

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email
        },
        "summary": {
            "year": year,
            "month": month,
            "total_hours": round(total_hours, 2),
            "total_entries": total_entries,
            "confirmed_entries": confirmed_entries,
            "pending_entries": total_entries - confirmed_entries
        },
        "daily_breakdown": list(daily_breakdown.values())
    }

@router.get("/all-users-summary")
async def get_all_users_summary(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db)
):
    """Get time summary for all users (admin/boss only)"""

    # Set default year and month if not provided
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month

    # Get all users
    users = db.query(User).filter(User.role_type == "normal").all()

    all_users_summary = []

    for user in users:
        # Build query for time entries
        query = db.query(TimeEntry).filter(
            TimeEntry.user_id == user.id
        )

        # Add date filters
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        query = query.filter(
            and_(
                TimeEntry.date >= start_date,
                TimeEntry.date < end_date
            )
        )

        # Get all entries for the month
        entries = query.all()

        # Calculate summary
        total_hours = sum(entry.total_hours or 0 for entry in entries if entry.total_hours)
        total_entries = len(entries)
        confirmed_entries = len([e for e in entries if e.is_confirmed])

        all_users_summary.append({
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "email": user.email
            },
            "summary": {
                "year": year,
                "month": month,
                "total_hours": round(total_hours, 2),
                "total_entries": total_entries,
                "confirmed_entries": confirmed_entries,
                "pending_entries": total_entries - confirmed_entries
            }
        })

    # Sort by total hours (descending)
    all_users_summary.sort(key=lambda x: x["summary"]["total_hours"], reverse=True)

    return {
        "period": {
            "year": year,
            "month": month
        },
        "total_users": len(all_users_summary),
        "total_hours_all_users": round(sum(u["summary"]["total_hours"] for u in all_users_summary), 2),
        "users_summary": all_users_summary
    }

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role_type: str,
    current_user: User = Depends(check_admin_only),
    db: Session = Depends(get_db)
):
    """Update user role (admin/boss only)"""

    # Validate role type
    if role_type not in ["normal", "boss", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role type. Must be 'normal', 'boss', or 'admin'"
        )

        # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admin from removing their own admin privileges
    if user.id == current_user.id and role_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin privileges"
        )

    # Update role
    user.role_type = role_type
    db.commit()
    db.refresh(user)

    return {"message": f"User role updated to {role_type}", "user": user}

@router.get("/photos/{photo_path:path}")
async def serve_photo(
    photo_path: str,
    current_user: User = Depends(check_admin_access)
):
    """Serve photo files (admin/boss only)"""

    # Security: prevent directory traversal
    if ".." in photo_path or photo_path.startswith("/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid photo path"
        )

    # Construct full path
    full_path = os.path.join("uploads", photo_path)

    # Check if file exists
    if not os.path.exists(full_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )

    # Return the file
    return FileResponse(full_path, media_type="image/*")
