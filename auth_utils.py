 
from functools import wraps

from flask import jsonify
from flask_jwt_extended import (
    get_jwt_identity,
    verify_jwt_in_request
)

from models import User


def get_current_user():
    """
    Return the authenticated, active user.
    Reject inactive accounts even if their JWT is still valid.
    """

    verify_jwt_in_request()

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user or user.account_status != "ACTIVE":
        return None

    return user


def role_required(*allowed_roles):
    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            user = get_current_user()

            if not user:
                return jsonify({
                    "error": "User not found or account is not active"
                }), 403

            if not user.role or user.role.role_name not in allowed_roles:
                return jsonify({
                    "error": "You do not have permission to access this resource"
                }), 403

            return function(*args, **kwargs)

        return wrapper
    return decorator


def permission_required(*required_permissions):
    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            user = get_current_user()

            if not user:
                return jsonify({
                    "error": "User not found or account is not active"
                }), 403

            if not user.role:
                return jsonify({
                    "error": "User role is not configured"
                }), 403

            user_permission_names = {
                permission.permission_name
                for permission in user.role.permissions
            }

            missing_permissions = [
                permission
                for permission in required_permissions
                if permission not in user_permission_names
            ]

            if missing_permissions:
                return jsonify({
                    "error": "Required permission is missing",
                    "missing_permissions": missing_permissions
                }), 403

            return function(*args, **kwargs)

        return wrapper
    return decorator


def is_staff_or_admin(user):
    return (
        user is not None
        and user.role is not None
        and user.role.role_name in ("HIGHER_ADMIN", "STAFF")
    )


def customer_access_allowed(customer):
    """
    HIGHER_ADMIN/STAFF can access any customer.
    CUSTOMER can access only their own customer profile.
    """

    user = get_current_user()

    if not user:
        return False

    if is_staff_or_admin(user):
        return True

    return customer.user_id == user.user_id


def booking_access_allowed(booking):
    """
    HIGHER_ADMIN/STAFF can access any booking.
    CUSTOMER can access only their own booking.
    """

    user = get_current_user()

    if not user:
        return False

    if is_staff_or_admin(user):
        return True

    if not user.customer:
        return False

    return booking.customer_id == user.customer.customer_id
