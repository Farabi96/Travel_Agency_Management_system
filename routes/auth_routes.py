from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required
)
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db
from models import User


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


# ---------------------------------------------------------
# LOGIN
# ---------------------------------------------------------

@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    if not data.get("username") and not data.get("email"):
        return jsonify({
            "error": "Username or email is required"
        }), 400

    if not data.get("password"):
        return jsonify({
            "error": "Password is required"
        }), 400

    user = None

    if data.get("username"):
        user = User.query.filter_by(
            username=data["username"]
        ).first()

    elif data.get("email"):
        user = User.query.filter_by(
            email=data["email"]
        ).first()

    if not user:
        return jsonify({
            "error": "Invalid username/email or password"
        }), 401

    if user.account_status != "ACTIVE":
        return jsonify({
            "error": f"Account is {user.account_status.lower()}"
        }), 403

    if not check_password_hash(
        user.password_hash,
        data["password"]
    ):
        return jsonify({
            "error": "Invalid username/email or password"
        }), 401

    user.last_login = datetime.now()

    db.session.commit()

    access_token = create_access_token(
        identity=str(user.user_id)
    )

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role_id": user.role_id,
            "role_name": user.role.role_name,
            "account_status": user.account_status
        }
    })


# ---------------------------------------------------------
# CURRENT USER
# ---------------------------------------------------------

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():

    user_id = get_jwt_identity()

    user = User.query.get(int(user_id))

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    return jsonify({
        "user_id": user.user_id,
        "username": user.username,
        "email": user.email,
        "role_id": user.role_id,
        "role_name": user.role.role_name,
        "account_status": user.account_status,
        "last_login": (
            user.last_login.isoformat()
            if user.last_login else None
        )
    })


# ---------------------------------------------------------
# CHANGE PASSWORD
# ---------------------------------------------------------

@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():

    user_id = get_jwt_identity()

    user = User.query.get(int(user_id))

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return jsonify({
            "error": "Current password and new password are required"
        }), 400

    if not check_password_hash(
        user.password_hash,
        current_password
    ):
        return jsonify({
            "error": "Current password is incorrect"
        }), 401

    if len(new_password) < 8:
        return jsonify({
            "error": "New password must contain at least 8 characters"
        }), 400

    user.password_hash = generate_password_hash(
        new_password
    )

    db.session.commit()

    return jsonify({
        "message": "Password changed successfully"
    })
