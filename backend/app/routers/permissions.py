from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from ..database import get_db
from app.models import User
from ..auth import get_current_user
from ..permissions import get_user_permissions, get_available_roles, get_role_info

router = APIRouter()

@router.get("/my-permissions")
async def get_my_permissions(current_user: User = Depends(get_current_user)):
    """Get current user's permissions"""
    permissions = get_user_permissions(current_user.role_type)
    role_info = get_role_info(current_user.role_type)

    return {
        "user_id": current_user.id,
        "role": current_user.role_type,
        "role_info": role_info,
        "permissions": permissions
    }

@router.get("/available-roles")
async def get_roles(current_user: User = Depends(get_current_user)):
    """Get all available roles (for admin interface)"""
    # Only admin can see available roles
    if current_user.role_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )

    return {
        "roles": get_available_roles()
    }

@router.get("/user/{user_id}/permissions")
async def get_user_permissions_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get permissions for a specific user (admin/boss only)"""
    # Check if current user can view other users
    if current_user.role_type not in ["boss", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Boss/Admin privileges required."
        )

    # Get target user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    permissions = get_user_permissions(user.role_type)
    role_info = get_role_info(user.role_type)

    return {
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role_type,
        "role_info": role_info,
        "permissions": permissions
    }
