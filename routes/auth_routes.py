from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required
)
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db

from models import User, Role, Staff


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


# ---------------------------------------------------------
# REGISTER CUSTOMER
# ---------------------------------------------------------

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({
            "error": "Username, email, and password are required"
        }), 400

    if len(username) > 50:
        return jsonify({
            "error": "Username must be 50 characters or fewer"
        }), 400

    if len(email) > 150 or "@" not in email:
        return jsonify({
            "error": "Please provide a valid email address"
        }), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must contain at least 8 characters"
        }), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username is already taken"}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email is already registered"}), 409

    customer_role = Role.query.filter_by(
        role_name="CUSTOMER"
    ).first()

    if not customer_role:
        return jsonify({
            "error": "Customer role is not configured"
        }), 500

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role_id=customer_role.role_id,
        account_status="ACTIVE"
    )

    try:
        db.session.add(user)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        print("Registration database error:", repr(exc))
        return jsonify({
            "error": "Registration could not be completed"
        }), 500

    return jsonify({
        "message": "Registration successful. You can now sign in.",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role_name": customer_role.role_name
        }
    }), 201


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


# ---------------------------------------------------------
# CURRENT USER PROFILE
# ---------------------------------------------------------

@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_own_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    role_name = user.role.role_name if user.role else None
    if role_name not in ("HIGHER_ADMIN", "STAFF"):
        return jsonify({"error": "This profile endpoint is only available to Admin and Staff"}), 403

    response = {
        "user_id": user.user_id,
        "username": user.username,
        "email": user.email,
        "role_name": role_name,
        "account_status": user.account_status,
    }

    if role_name == "STAFF":
        staff = Staff.query.filter_by(user_id=user.user_id).first()
        if not staff:
            return jsonify({"error": "Staff profile not found"}), 404
        response["staff"] = {
            "staff_id": staff.staff_id,
            "first_name": staff.first_name,
            "last_name": staff.last_name,
            "employee_code": staff.employee_code,
            "phone": staff.phone,
            "department": staff.department,
            "designation": staff.designation,
            "joining_date": staff.joining_date.isoformat() if staff.joining_date else None,
            "employment_status": staff.employment_status,
        }

    return jsonify(response)


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_own_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    role_name = user.role.role_name if user.role else None
    if role_name not in ("HIGHER_ADMIN", "STAFF"):
        return jsonify({"error": "This profile endpoint is only available to Admin and Staff"}), 403

    data = request.get_json()
    if not isinstance(data, dict) or not data:
        return jsonify({"error": "Request body is required"}), 400

    allowed_fields = {"email"}
    if role_name == "STAFF":
        allowed_fields.add("phone")
    if set(data.keys()) - allowed_fields:
        return jsonify({
            "error": "Only email" + (" and phone" if role_name == "STAFF" else "") + " can be updated"
        }), 400

    if "email" in data:
        email = data.get("email")
        if not isinstance(email, str):
            return jsonify({"error": "A valid email address is required"}), 400
        email = email.strip().lower()
        if not email or len(email) > 150 or "@" not in email:
            return jsonify({"error": "Please provide a valid email address"}), 400

        existing_email = User.query.filter(
            User.email == email,
            User.user_id != user.user_id
        ).first()
        if existing_email:
            return jsonify({"error": "Email is already registered"}), 409
        user.email = email

    if "phone" in data:
        phone = data.get("phone")
        if not isinstance(phone, str):
            return jsonify({"error": "A valid phone number is required"}), 400
        phone = phone.strip()
        if not phone or len(phone) > 30:
            return jsonify({"error": "Phone number must be between 1 and 30 characters"}), 400

        staff = Staff.query.filter_by(user_id=user.user_id).first()
        if not staff:
            return jsonify({"error": "Staff profile not found"}), 404
        staff.phone = phone

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Profile could not be updated"}), 500

    response = {"message": "Profile updated successfully", "email": user.email}
    if role_name == "STAFF":
        staff = Staff.query.filter_by(user_id=user.user_id).first()
        response["phone"] = staff.phone if staff else None
    return jsonify(response)
