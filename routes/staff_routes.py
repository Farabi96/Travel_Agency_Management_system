from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import Staff, StaffPrivateInformation, User
from auth_utils import role_required


staff_bp = Blueprint(
    "staff",
    __name__,
    url_prefix="/api/staff"
)


# GET ALL STAFF
@staff_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_all_staff():
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
            "joining_date": staff.joining_date.isoformat()
            if staff.joining_date else None,
            "employment_status": staff.employment_status,
            "manager_id": staff.manager_id,
            "created_at": staff.created_at.isoformat()
            if staff.created_at else None,
            "updated_at": staff.updated_at.isoformat()
            if staff.updated_at else None
        }
        for staff in staff_members
    ])


# GET SINGLE STAFF
@staff_bp.route("/<int:staff_id>", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_staff(staff_id):
    staff = Staff.query.get_or_404(staff_id)

    return jsonify({
        "staff_id": staff.staff_id,
        "user_id": staff.user_id,
        "employee_code": staff.employee_code,
        "first_name": staff.first_name,
        "last_name": staff.last_name,
        "phone": staff.phone,
        "department": staff.department,
        "designation": staff.designation,
        "joining_date": staff.joining_date.isoformat()
        if staff.joining_date else None,
        "employment_status": staff.employment_status,
        "manager_id": staff.manager_id,
        "created_at": staff.created_at.isoformat()
        if staff.created_at else None,
        "updated_at": staff.updated_at.isoformat()
        if staff.updated_at else None
    })


# CREATE STAFF
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
        if data.get(field) is None or data.get(field) == "":
            return jsonify({
                "error": f"{field} is required"
            }), 400

    user = User.query.get(data["user_id"])

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    if user.role.role_name != "STAFF":
        return jsonify({
            "error": "The selected user must have STAFF role"
        }), 400

    existing_user_staff = Staff.query.filter_by(
        user_id=data["user_id"]
    ).first()

    if existing_user_staff:
        return jsonify({
            "error": "This user already has a staff profile"
        }), 409

    existing_employee = Staff.query.filter_by(
        employee_code=data["employee_code"]
    ).first()

    if existing_employee:
        return jsonify({
            "error": "Employee code already exists"
        }), 409

    joining_date = data.get("joining_date")

    if joining_date:
        try:
            joining_date = date.fromisoformat(joining_date)
        except ValueError:
            return jsonify({
                "error": "joining_date must use YYYY-MM-DD format"
            }), 400

    staff = Staff(
        user_id=data["user_id"],
        employee_code=data["employee_code"],
        first_name=data["first_name"],
        last_name=data.get("last_name"),
        phone=data["phone"],
        department=data["department"],
        designation=data["designation"],
        joining_date=joining_date,
        employment_status=data.get(
            "employment_status",
            "ACTIVE"
        ),
        manager_id=data.get("manager_id")
    )

    db.session.add(staff)
    db.session.commit()

    return jsonify({
        "message": "Staff profile created successfully",
        "staff_id": staff.staff_id
    }), 201


# UPDATE STAFF
@staff_bp.route("/<int:staff_id>", methods=["PUT"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def update_staff(staff_id):
    staff = Staff.query.get_or_404(staff_id)

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    if "employee_code" in data:
        existing = Staff.query.filter(
            Staff.employee_code == data["employee_code"],
            Staff.staff_id != staff_id
        ).first()

        if existing:
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
        try:
            staff.joining_date = (
                date.fromisoformat(data["joining_date"])
                if data["joining_date"]
                else None
            )
        except ValueError:
            return jsonify({
                "error": "joining_date must use YYYY-MM-DD format"
            }), 400

    if "employment_status" in data:
        staff.employment_status = data["employment_status"]

    if "manager_id" in data:
        staff.manager_id = data["manager_id"]

    db.session.commit()

    return jsonify({
        "message": "Staff profile updated successfully"
    })


# GET PRIVATE INFORMATION
@staff_bp.route(
    "/<int:staff_id>/private-information",
    methods=["GET"]
)
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_staff_private_information(staff_id):
    staff = Staff.query.get_or_404(staff_id)

    private_info = StaffPrivateInformation.query.filter_by(
        staff_id=staff.staff_id
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
        "emergency_contact_name": private_info.emergency_contact_name,
        "emergency_contact_phone": private_info.emergency_contact_phone,
        "personal_document_type": private_info.personal_document_type,
        "personal_document_number": private_info.personal_document_number
    })


# CREATE PRIVATE INFORMATION
@staff_bp.route(
    "/<int:staff_id>/private-information",
    methods=["POST"]
)
@jwt_required()
@role_required("HIGHER_ADMIN")
def create_staff_private_information(staff_id):
    staff = Staff.query.get_or_404(staff_id)

    existing = StaffPrivateInformation.query.filter_by(
        staff_id=staff.staff_id
    ).first()

    if existing:
        return jsonify({
            "error": "Private information already exists"
        }), 409

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    private_info = StaffPrivateInformation(
        staff_id=staff.staff_id,
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


# UPDATE PRIVATE INFORMATION
@staff_bp.route(
    "/<int:staff_id>/private-information",
    methods=["PUT"]
)
@jwt_required()
@role_required("HIGHER_ADMIN")
def update_staff_private_information(staff_id):
    staff = Staff.query.get_or_404(staff_id)

    private_info = StaffPrivateInformation.query.filter_by(
        staff_id=staff.staff_id
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
        "message": "Staff private information updated successfully"
    })
