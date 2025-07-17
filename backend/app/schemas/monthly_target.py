from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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
