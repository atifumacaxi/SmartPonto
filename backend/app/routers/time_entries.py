from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, date, time
from typing import List, Optional
import os
import uuid
from ..database import get_db
from app.models import User, TimeEntry
from ..schemas import TimeEntry as TimeEntrySchema, TimeEntryCreate, TimeEntryUpdate, PhotoUploadResponse, MonthlySummary, DailySummary
from ..auth import get_current_user
from ..ocr_service import OCRService
from sqlalchemy import cast, Date, func

router = APIRouter()
ocr_service = OCRService()

# Ensure uploads directory exists
UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

@router.post("/upload", response_model=PhotoUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload photo and extract time data using OCR"""

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOADS_DIR, filename)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )

    # Process photo with OCR
    try:
        ocr_result = ocr_service.process_photo(file_path)

        # Convert time objects to datetime if they exist
        suggested_start_time = None
        suggested_end_time = None

        if ocr_result["suggested_start_time"]:
            suggested_start_time = datetime.combine(date.today(), ocr_result["suggested_start_time"])

        if ocr_result["suggested_end_time"]:
            suggested_end_time = datetime.combine(date.today(), ocr_result["suggested_end_time"])

        return PhotoUploadResponse(
            photo_path=file_path,
            extracted_text=ocr_result["extracted_text"],
            suggested_start_time=suggested_start_time,
            suggested_end_time=suggested_end_time,
            suggested_date=ocr_result.get("suggested_date")
        )

    except Exception as e:
        # Clean up file if OCR fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        )

@router.post("/confirm", response_model=TimeEntrySchema)
async def confirm_time_entry(
    photo_path: str = Form(...),
    start_time: Optional[datetime] = Form(None),
    end_time: Optional[datetime] = Form(None),
    extracted_text: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm and save time entry after OCR extraction"""

    print(f"DEBUG: Received data - start_time: {start_time}, end_time: {end_time}")
    print(f"DEBUG: start_time type: {type(start_time)}, end_time type: {type(end_time)}")

    # Validate photo path
    if not os.path.exists(photo_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo file not found"
        )

            # Determine the date
    entry_date = None
    if start_time:
        entry_date = start_time.date()
        print(f"DEBUG: Using start_time date: {entry_date}")
    elif end_time:
        entry_date = end_time.date()
        print(f"DEBUG: Using end_time date: {entry_date}")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either start_time or end_time must be provided"
        )

    # Business rule: Cannot register both start_time and end_time at the same time
    if start_time and end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot register both start time and end time at the same time. Please register them separately."
        )

    # Business rule: If only end_time is provided, check if there's a start_time for the same date
    if not start_time and end_time:
        print(f"DEBUG: Trying to register end time for date: {entry_date}")
        print(f"DEBUG: End time value: {end_time}")

        # Debug: print entry_date and all unclosed entry dates for this user
        print(f"DEBUG: entry_date value: {entry_date}, type: {type(entry_date)}")
        all_unclosed = db.query(TimeEntry).filter(
            TimeEntry.user_id == current_user.id,
            TimeEntry.start_time.isnot(None),
            TimeEntry.end_time.is_(None)
        ).all()
        for entry in all_unclosed:
            print(f"DEBUG: DB entry.id={entry.id}, entry.date={entry.date}, type={type(entry.date)}")

        # Check if there's an existing start_time entry for this date
        existing_start_entry = db.query(TimeEntry).filter(
            TimeEntry.user_id == current_user.id,
            TimeEntry.date == entry_date,
            TimeEntry.start_time.isnot(None),
            TimeEntry.end_time.is_(None)
        ).first()

        if not existing_start_entry:
            # Let's also check for any start time entries for this user to provide better debugging
            all_user_entries = db.query(TimeEntry).filter(
                TimeEntry.user_id == current_user.id,
                TimeEntry.start_time.isnot(None),
                TimeEntry.end_time.is_(None)
            ).all()

            print(f"DEBUG: Found {len(all_user_entries)} unclosed entries")
            for entry in all_user_entries:
                print(f"DEBUG: Unclosed entry - Date: {entry.date}, Start: {entry.start_time}")

            if all_user_entries:
                available_dates = [entry.date.strftime('%Y-%m-%d') for entry in all_user_entries]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot register end time for {entry_date.strftime('%Y-%m-%d')} without a start time. You have unclosed start times for: {', '.join(available_dates)}"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot register end time without a start time for this date. Please register a start time first."
                )
        else:
            print(f"DEBUG: Found existing start entry, proceeding to update with end time")
        # Update the existing entry with the end time
        existing_start_entry.end_time = end_time

        # Calculate total hours
        print(f"DEBUG: Comparing times - Start: {existing_start_entry.start_time}, End: {end_time}")
        print(f"DEBUG: Start time type: {type(existing_start_entry.start_time)}, End time type: {type(end_time)}")

        if existing_start_entry.start_time and end_time > existing_start_entry.start_time:
            time_diff = end_time - existing_start_entry.start_time
            existing_start_entry.total_hours = time_diff.total_seconds() / 3600
            print(f"DEBUG: Calculated total hours: {existing_start_entry.total_hours}")
        else:
            print(f"DEBUG: Time comparison failed - end_time not greater than start_time")

        try:
            db.commit()
            db.refresh(existing_start_entry)
            print(f"DEBUG: Successfully updated entry with end time: {existing_start_entry.end_time}")
            return existing_start_entry
        except Exception as e:
            print(f"DEBUG: Error during commit: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update time entry: {str(e)}"
            )

    # If only start_time is provided, create a new entry
    if start_time and not end_time:
        # Check if there's already a start_time entry for this date
        existing_start_entry = db.query(TimeEntry).filter(
            TimeEntry.user_id == current_user.id,
            TimeEntry.date == entry_date,
            TimeEntry.start_time.isnot(None),
            TimeEntry.end_time.is_(None)
        ).first()

        if existing_start_entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an unclosed start time entry for this date. Please register an end time instead."
            )

    # Create new time entry (for start time only)
    time_entry = TimeEntry(
        user_id=current_user.id,
        date=entry_date,
        start_time=start_time,
        end_time=None,  # Always None for new entries
        total_hours=None,  # Will be calculated when end time is added
        photo_path=photo_path,
        extracted_text=extracted_text,
        is_confirmed=True
    )

    db.add(time_entry)
    db.commit()
    db.refresh(time_entry)

    return time_entry

@router.post("/manual", response_model=TimeEntrySchema)
async def create_manual_time_entry(
    date: date = Form(...),
    start_time: Optional[time] = Form(None),
    end_time: Optional[time] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a manual time entry without photo"""

    # Convert time to datetime for the selected date
    start_datetime = None
    end_datetime = None

    if start_time:
        start_datetime = datetime.combine(date, start_time)
    if end_time:
        end_datetime = datetime.combine(date, end_time)

    # Business rule: Cannot register both start_time and end_time at the same time
    if start_datetime and end_datetime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot register both start time and end time at the same time. Please register them separately."
        )

    # If only end_time is provided, check if there's a start_time for the same date
    if not start_datetime and end_datetime:
        existing_start_entry = db.query(TimeEntry).filter(
            TimeEntry.user_id == current_user.id,
            TimeEntry.date == date,
            TimeEntry.start_time.isnot(None),
            TimeEntry.end_time.is_(None)
        ).first()

        if not existing_start_entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot register end time without a start time for this date. Please register a start time first."
            )

        # Update the existing entry with the end time
        existing_start_entry.end_time = end_datetime

        # Calculate total hours
        if existing_start_entry.start_time and end_datetime > existing_start_entry.start_time:
            time_diff = end_datetime - existing_start_entry.start_time
            existing_start_entry.total_hours = time_diff.total_seconds() / 3600

        db.commit()
        db.refresh(existing_start_entry)
        return existing_start_entry

    # If only start_time is provided, create a new entry
    if start_datetime and not end_datetime:
        # Check if there's already a start_time entry for this date
        existing_start_entry = db.query(TimeEntry).filter(
            TimeEntry.user_id == current_user.id,
            TimeEntry.date == date,
            TimeEntry.start_time.isnot(None),
            TimeEntry.end_time.is_(None)
        ).first()

        if existing_start_entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an unclosed start time entry for this date. Please register an end time instead."
            )

    # Create new time entry (for start time only)
    time_entry = TimeEntry(
        user_id=current_user.id,
        date=date,
        start_time=start_datetime,
        end_time=None,
        total_hours=None,
        photo_path=None,  # No photo for manual entries
        extracted_text="Manual entry",
        is_confirmed=True
    )

    db.add(time_entry)
    db.commit()
    db.refresh(time_entry)

    return time_entry

@router.get("/unclosed", response_model=List[TimeEntrySchema])
async def get_unclosed_entries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unclosed time entries (start time without end time)"""

    entries = db.query(TimeEntry).filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.start_time.isnot(None),
        TimeEntry.end_time.is_(None)
    ).order_by(TimeEntry.date.desc()).all()

    return entries

@router.get("/all", response_model=List[TimeEntrySchema])
async def get_all_entries(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all time entries for a specific month"""

    # Calculate date range for the month
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)

    entries = db.query(TimeEntry).filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.date >= start_date,
        TimeEntry.date < end_date
    ).order_by(TimeEntry.date.desc(), TimeEntry.start_time.desc()).all()

    return entries

@router.get("/daily", response_model=List[TimeEntrySchema])
async def get_daily_entries(
    date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get time entries for a specific date (defaults to today)"""

    if date is None:
        date = datetime.now().date()

    entries = db.query(TimeEntry).filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.date == date
    ).order_by(TimeEntry.start_time).all()

    return entries

@router.get("/monthly", response_model=MonthlySummary)
async def get_monthly_summary(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly summary with daily breakdown"""

    # Get all entries for the month
    entries = db.query(TimeEntry).filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.date >= date(year, month, 1),
        TimeEntry.date < date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)
    ).all()

    # Group by date
    daily_data = {}
    for entry in entries:
        date_str = entry.date.isoformat()
        if date_str not in daily_data:
            daily_data[date_str] = {"total_hours": 0, "entries_count": 0}

        if entry.total_hours:
            daily_data[date_str]["total_hours"] += entry.total_hours
        daily_data[date_str]["entries_count"] += 1

    # Create daily breakdown
    daily_breakdown = [
        DailySummary(
            date=date_str,
            total_hours=round(data["total_hours"], 2),
            entries_count=data["entries_count"]
        )
        for date_str, data in sorted(daily_data.items())
    ]

    # Calculate totals
    total_hours = sum(data["total_hours"] for data in daily_data.values())
    total_days = len(daily_data)

    return MonthlySummary(
        month=datetime(year, month, 1).strftime("%B"),
        year=year,
        total_hours=round(total_hours, 2),
        total_days=total_days,
        daily_breakdown=daily_breakdown
    )

@router.put("/{entry_id}", response_model=TimeEntrySchema)
async def update_time_entry(
    entry_id: int,
    time_entry_update: TimeEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a time entry"""

    # Get the time entry
    time_entry = db.query(TimeEntry).filter(
        TimeEntry.id == entry_id,
        TimeEntry.user_id == current_user.id
    ).first()

    if not time_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )

    # Update fields
    update_data = time_entry_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(time_entry, field, value)

    # Recalculate total hours if end time changed
    if time_entry.end_time and time_entry.start_time and time_entry.end_time > time_entry.start_time:
        time_diff = time_entry.end_time - time_entry.start_time
        time_entry.total_hours = time_diff.total_seconds() / 3600

    db.commit()
    db.refresh(time_entry)

    return time_entry

@router.delete("/{entry_id}")
async def delete_time_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a time entry"""

    # Get the time entry
    time_entry = db.query(TimeEntry).filter(
        TimeEntry.id == entry_id,
        TimeEntry.user_id == current_user.id
    ).first()

    if not time_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )

    # Delete associated photo file
    if time_entry.photo_path and os.path.exists(time_entry.photo_path):
        try:
            os.remove(time_entry.photo_path)
        except:
            pass  # Don't fail if file deletion fails

    db.delete(time_entry)
    db.commit()

    return {"message": "Time entry deleted successfully"}
