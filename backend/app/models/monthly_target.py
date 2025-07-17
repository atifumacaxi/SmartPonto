from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class MonthlyTarget(Base):
    __tablename__ = "monthly_targets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    start_day = Column(Integer, nullable=False, default=1) # Day of month to start counting (1-31)
    end_day = Column(Integer, nullable=False, default=31)   # Day of month to end counting (1)
    target_hours = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship with user
    user = relationship("User", back_populates="monthly_targets")

    # Ensure unique target per user per month
    __table_args__ = (
        # This will be added in the migration
    )
