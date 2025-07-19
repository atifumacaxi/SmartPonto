from typing import Dict, List, Optional
from enum import Enum

class Permission(Enum):
    # Time tracking permissions
    VIEW_OWN_TIME_ENTRIES = "view_own_time_entries"
    CREATE_OWN_TIME_ENTRIES = "create_own_time_entries"
    UPDATE_OWN_TIME_ENTRIES = "update_own_time_entries"
    DELETE_OWN_TIME_ENTRIES = "delete_own_time_entries"

    # Admin permissions
    VIEW_ALL_USERS = "view_all_users"
    VIEW_ALL_TIME_ENTRIES = "view_all_time_entries"
    MANAGE_USER_ROLES = "manage_user_roles"
    VIEW_ADMIN_DASHBOARD = "view_admin_dashboard"

    # Monthly targets permissions
    MANAGE_OWN_TARGETS = "manage_own_targets"
    VIEW_ALL_TARGETS = "view_all_targets"

# Define role permissions
ROLE_PERMISSIONS = {
    "normal": [
        Permission.VIEW_OWN_TIME_ENTRIES,
        Permission.CREATE_OWN_TIME_ENTRIES,
        Permission.UPDATE_OWN_TIME_ENTRIES,
        Permission.DELETE_OWN_TIME_ENTRIES,
        Permission.MANAGE_OWN_TARGETS,
    ],
    "boss": [
        Permission.VIEW_OWN_TIME_ENTRIES,
        Permission.CREATE_OWN_TIME_ENTRIES,
        Permission.UPDATE_OWN_TIME_ENTRIES,
        Permission.DELETE_OWN_TIME_ENTRIES,
        Permission.MANAGE_OWN_TARGETS,
        Permission.VIEW_ALL_USERS,
        Permission.VIEW_ALL_TIME_ENTRIES,
        Permission.VIEW_ADMIN_DASHBOARD,
        Permission.VIEW_ALL_TARGETS,
    ],
    "admin": [
        Permission.VIEW_OWN_TIME_ENTRIES,
        Permission.CREATE_OWN_TIME_ENTRIES,
        Permission.UPDATE_OWN_TIME_ENTRIES,
        Permission.DELETE_OWN_TIME_ENTRIES,
        Permission.MANAGE_OWN_TARGETS,
        Permission.VIEW_ALL_USERS,
        Permission.VIEW_ALL_TIME_ENTRIES,
        Permission.MANAGE_USER_ROLES,
        Permission.VIEW_ADMIN_DASHBOARD,
        Permission.VIEW_ALL_TARGETS,
    ]
}

def has_permission(user_role: str, permission: Permission) -> bool:
    """Check if a user role has a specific permission"""
    if user_role not in ROLE_PERMISSIONS:
        return False
    return permission in ROLE_PERMISSIONS[user_role]

def get_user_permissions(user_role: str) -> List[str]:
    """Get all permissions for a user role"""
    if user_role not in ROLE_PERMISSIONS:
        return []
    return [perm.value for perm in ROLE_PERMISSIONS[user_role]]

def get_available_roles() -> List[Dict[str, str]]:
    """Get all available roles with their descriptions"""
    return [
        {
            "value": "normal",
            "label": "Normal User",
            "description": "Can track time and manage own data"
        },
        {
            "value": "boss",
            "label": "Boss",
            "description": "Can view all users' data and manage team"
        },
        {
            "value": "admin",
            "label": "Admin",
            "description": "Full access to all features and user management"
        }
    ]

def get_role_info(user_role: str) -> Dict[str, str]:
    """Get information about a specific role"""
    roles = get_available_roles()
    for role in roles:
        if role["value"] == user_role:
            return role
    return {
        "value": user_role,
        "label": user_role.title(),
        "description": "Unknown role"
    }
