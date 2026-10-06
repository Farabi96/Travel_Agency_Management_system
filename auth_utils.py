from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from models import User


def get_current_user():
    verify_jwt_in_request()

    user_id = get_jwt_identity()

    return User.query.get(int(user_id))


def role_required(*allowed_roles):

    def decorator(function):

        @wraps(function)
        def wrapper(*args, **kwargs):

            user = get_current_user()

            if not user:
                return jsonify({
                    "error": "User not found"
                }), 404

            if user.account_status != "ACTIVE":
                return jsonify({
                    "error": "Account is not active"
                }), 403

            if user.role.role_name not in allowed_roles:
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
                    "error": "User not found"
                }), 404

            if user.account_status != "ACTIVE":
                return jsonify({
                    "error": "Account is not active"
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


def user_owns_customer(customer):

    user_id = get_jwt_identity()

    return customer.user_id == int(user_id)
