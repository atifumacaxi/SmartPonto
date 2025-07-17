from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Time Entry schemas
class TimeEntryBase(BaseModel):
    date: datetime
    start_time: datetime
    end_time: Optional[datetime] = None
    total_hours: Optional[float] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class TimeEntryCreate(TimeEntryBase):
    pass

class TimeEntryUpdate(BaseModel):
    end_time: Optional[datetime] = None
    total_hours: Optional[float] = None
    is_confirmed: Optional[bool] = None

class TimeEntry(TimeEntryBase):
    id: int
    user_id: int
    photo_path: Optional[str] = None
    extracted_text: Optional[str] = None
    is_confirmed: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Photo upload schemas
class PhotoUploadResponse(BaseModel):
    photo_path: str
    extracted_text: str
    suggested_start_time: Optional[datetime] = None
    suggested_end_time: Optional[datetime] = None
    suggested_date: Optional[str] = None

# Monthly summary schemas
class DailySummary(BaseModel):
    date: str
    total_hours: float
    entries_count: int

class MonthlySummary(BaseModel):
    month: str
    year: int
    total_hours: float
    total_days: int
    daily_breakdown: List[DailySummary]

# Monthly target schemas
class MonthlyTargetBase(BaseModel):
    year: int
    month: int
    start_day: int =1  # Default to1t day of month
    end_day: int =31 # Default to last day of month
    target_hours: float

class MonthlyTargetCreate(MonthlyTargetBase):
    pass

class MonthlyTargetUpdate(BaseModel):
    start_day: Optional[int] = None
    end_day: Optional[int] = None
    target_hours: Optional[float] = None

class MonthlyTarget(MonthlyTargetBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MonthlyTargetWithProgress(BaseModel):
    target: MonthlyTarget
    current_hours: float
    remaining_hours: float
    progress_percentage: float
