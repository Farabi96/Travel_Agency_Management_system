

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import (
    User,
    Staff,
    StaffPrivateInformation
)
from auth_utils import role_required


staff_bp = Blueprint(
    "staff",
    __name__,
    url_prefix="/api/staff"
)


# =========================================================
# GET ALL STAFF
# HIGHER_ADMIN ONLY
# =========================================================

@staff_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_staff():

    staff_members = Staff.query.order_by(
        Staff.staff_id.asc()
    ).all()

    return jsonify([
        {
            "staff_id": staff.staff_id,
            "user_id": staff.user_id,
            "employee_code": staff.employee_code,
            "first_name": staff.first_name,
            "last_name": staff.last_name,
            "phone": staff.phone,
            "department": staff.department,
            "designation": staff.designation,
            "joining_date": (
                staff.joining_date.isoformat()
                if staff.joining_date
                else None
            ),
            "employment_status": staff.employment_status,
            "manager_id": staff.manager_id,
            "created_at": (
                staff.created_at.isoformat()
                if staff.created_at
                else None
            ),
            "updated_at": (
                staff.updated_at.isoformat()
                if staff.updated_at
                else None
            )
        }
        for staff in staff_members
    ])


# =========================================================
# GET SINGLE STAFF
# HIGHER_ADMIN ONLY
# =========================================================

@staff_bp.route(
    "/<int:staff_id>",
    methods=["GET"]
)
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_staff_member(staff_id):

    staff = Staff.query.get_or_404(staff_id)

    return jsonify({
        "staff_id": staff.staff_id,
        "user_id": staff.user_id,
        "username": staff.user.username if staff.user else None,
        "email": staff.user.email if staff.user else None,
        "account_status": staff.user.account_status if staff.user else None,
        "employee_code": staff.employee_code,
        "first_name": staff.first_name,
        "last_name": staff.last_name,
        "phone": staff.phone,
        "department": staff.department,
        "designation": staff.designation,
        "joining_date": (
            staff.joining_date.isoformat()
            if staff.joining_date
            else None
        ),
        "employment_status": staff.employment_status,
        "manager_id": staff.manager_id,
        "created_at": (
            staff.created_at.isoformat()
            if staff.created_at
            else None
        ),
        "updated_at": (
            staff.updated_at.isoformat()
            if staff.updated_at
            else None
        )
    })


# =========================================================
# CREATE STAFF
# HIGHER_ADMIN ONLY
# =========================================================

@staff_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def create_staff():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "user_id",
        "employee_code",
        "first_name",
        "phone",
        "department",
        "designation"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "error": f"Missing field: {field}"
            }), 400

    user = User.query.get(data["user_id"])

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    if user.role.role_name != "STAFF":
        return jsonify({
            "error": "User must have STAFF role"
        }), 400

    existing_staff = Staff.query.filter_by(
        user_id=user.user_id
    ).first()

    if existing_staff:
        return jsonify({
            "error": "This user already has a staff profile",
            "staff_id": existing_staff.staff_id
        }), 409

    existing_code = Staff.query.filter_by(
        employee_code=data["employee_code"]
    ).first()

    if existing_code:
        return jsonify({
            "error": "Employee code already exists"
        }), 409

    try:

        staff = Staff(
            user_id=user.user_id,
            employee_code=data["employee_code"],
            first_name=data["first_name"],
            last_name=data.get("last_name"),
            phone=data["phone"],
            department=data["department"],
            designation=data["designation"],
            joining_date=(
                date.fromisoformat(data["joining_date"])
                if data.get("joining_date")
                else None
            ),
            employment_status=data.get(
                "employment_status",
                "ACTIVE"
            ),
            manager_id=data.get("manager_id")
        )

        db.session.add(staff)
        db.session.commit()

        return jsonify({
            "message": "Staff member created successfully",
            "staff_id": staff.staff_id,
            "user_id": staff.user_id,
            "employee_code": staff.employee_code
        }), 201

    except ValueError:
        db.session.rollback()

        return jsonify({
            "error": "Invalid joining_date format. Use YYYY-MM-DD"
        }), 400

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# UPDATE STAFF
# HIGHER_ADMIN ONLY
# =========================================================

@staff_bp.route(
    "/<int:staff_id>",
    methods=["PUT"]
)
@jwt_required()
@role_required("HIGHER_ADMIN")
def update_staff(staff_id):

    staff = Staff.query.get_or_404(staff_id)

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "employee_code" in data:

            existing_code = Staff.query.filter(
                Staff.employee_code == data["employee_code"],
                Staff.staff_id != staff_id
            ).first()

            if existing_code:
                return jsonify({
                    "error": "Employee code already exists"
                }), 409

            staff.employee_code = data["employee_code"]

        if "first_name" in data:
            staff.first_name = data["first_name"]

        if "last_name" in data:
            staff.last_name = data["last_name"]

        if "phone" in data:
            staff.phone = data["phone"]

        if "department" in data:
            staff.department = data["department"]

        if "designation" in data:
            staff.designation = data["designation"]

        if "joining_date" in data:
            staff.joining_date = (
                date.fromisoformat(data["joining_date"])
                if data["joining_date"]
                else None
            )

        if "employment_status" in data:
            staff.employment_status = data[
                "employment_status"
            ]

        if "manager_id" in data:
            staff.manager_id = data["manager_id"]

        db.session.commit()

        return jsonify({
            "message": "Staff member updated successfully",
            "staff_id": staff.staff_id
        })

    except ValueError:
        db.session.rollback()

        return jsonify({
            "error": "Invalid joining_date format. Use YYYY-MM-DD"
        }), 400

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# GET STAFF PRIVATE INFORMATION
# HIGHER_ADMIN ONLY
# =========================================================

@staff_bp.route(
    "/<int:staff_id>/private-information",
    methods=["GET"]
)
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_staff_private_information(staff_id):

    Staff.query.get_or_404(staff_id)

    private_info = StaffPrivateInformation.query.filter_by(
        staff_id=staff_id
    ).first()

    if not private_info:
        return jsonify({
            "error": "Private information not found"
        }), 404

    return jsonify({
        "staff_private_id": private_info.staff_private_id,
        "staff_id": private_info.staff_id,
        "personal_email": private_info.personal_email,
        "home_address": private_info.home_address,
        "emergency_contact_name": (
            private_info.emergency_contact_name
        ),
        "emergency_contact_phone": (
            private_info.emergency_contact_phone
        ),
        "personal_document_type": (
            private_info.personal_document_type
        ),
        "personal_document_number": (
            private_info.personal_document_number
        )
    })


# =========================================================
# CREATE STAFF PRIVATE INFORMATION
# HIGHER_ADMIN ONLY
# =========================================================

@staff_bp.route(
    "/<int:staff_id>/private-information",
    methods=["POST"]
)
@jwt_required()
@role_required("HIGHER_ADMIN")
def create_staff_private_information(staff_id):

    Staff.query.get_or_404(staff_id)

    existing = StaffPrivateInformation.query.filter_by(
        staff_id=staff_id
    ).first()

    if existing:
        return jsonify({
            "error": "Private information already exists",
            "staff_private_id": existing.staff_private_id
        }), 409

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        private_info = StaffPrivateInformation(
            staff_id=staff_id,
            personal_email=data.get("personal_email"),
            home_address=data.get("home_address"),
            emergency_contact_name=data.get(
                "emergency_contact_name"
            ),
            emergency_contact_phone=data.get(
                "emergency_contact_phone"
            ),
            personal_document_type=data.get(
                "personal_document_type"
            ),
            personal_document_number=data.get(
                "personal_document_number"
            )
        )

        db.session.add(private_info)
        db.session.commit()

        return jsonify({
            "message": "Staff private information created successfully",
            "staff_private_id": private_info.staff_private_id
        }), 201

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# UPDATE STAFF PRIVATE INFORMATION
# HIGHER_ADMIN ONLY
# =========================================================

@staff_bp.route(
    "/<int:staff_id>/private-information",
    methods=["PUT"]
)
@jwt_required()
@role_required("HIGHER_ADMIN")
def update_staff_private_information(staff_id):

    Staff.query.get_or_404(staff_id)

    private_info = StaffPrivateInformation.query.filter_by(
        staff_id=staff_id
    ).first()

    if not private_info:
        return jsonify({
            "error": "Private information not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "personal_email" in data:
            private_info.personal_email = data["personal_email"]

        if "home_address" in data:
            private_info.home_address = data["home_address"]

        if "emergency_contact_name" in data:
            private_info.emergency_contact_name = data[
                "emergency_contact_name"
            ]

        if "emergency_contact_phone" in data:
            private_info.emergency_contact_phone = data[
                "emergency_contact_phone"
            ]

        if "personal_document_type" in data:
            private_info.personal_document_type = data[
                "personal_document_type"
            ]

        if "personal_document_number" in data:
            private_info.personal_document_number = data[
                "personal_document_number"
            ]

        db.session.commit()

        return jsonify({
            "message": "Staff private information updated successfully",
            "staff_private_id": private_info.staff_private_id
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500