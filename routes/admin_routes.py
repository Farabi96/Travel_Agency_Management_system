 
from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func, or_, text
from werkzeug.security import generate_password_hash

from auth_utils import role_required, permission_required
from extensions import db
from models.user import User
from models.refund import Refund
from models import (
    Booking,
    BookingStatus,
    Customer,
    Destination,
    Payment,
    PaymentStatus,
    Role,
    Staff,
    TourPackage,
)



admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin"
)


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------

def get_role(role_name):
    return Role.query.filter_by(role_name=role_name).first()


def active_higher_admin_count():
    return (
        db.session.query(func.count(User.user_id))
        .join(Role, User.role_id == Role.role_id)
        .filter(
            Role.role_name == "HIGHER_ADMIN",
            User.account_status == "ACTIVE"
        )
        .scalar()
        or 0
    )


# ---------------------------------------------------------
# TEST ROUTES
# ---------------------------------------------------------

@admin_bp.route("/test", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def admin_test():
    return jsonify({
        "message": "HIGHER_ADMIN access granted"
    })


@admin_bp.route("/permission-test", methods=["GET"])
@jwt_required()
@permission_required("MANAGE_SYSTEM")
def permission_test():
    return jsonify({
        "message": "MANAGE_SYSTEM permission granted"
    })


# ---------------------------------------------------------
# DASHBOARD STATISTICS
# ---------------------------------------------------------
 
@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def admin_stats():
    # Basic totals
    total_users = db.session.query(
        func.count(User.user_id)
    ).scalar() or 0

    total_customers = db.session.query(
        func.count(Customer.customer_id)
    ).scalar() or 0

    total_bookings = db.session.query(
        func.count(Booking.booking_id)
    ).scalar() or 0

    total_destinations = db.session.query(
        func.count(Destination.destination_id)
    ).scalar() or 0

    total_packages = db.session.query(
        func.count(TourPackage.package_id)
    ).scalar() or 0

    # Booking totals grouped by their lookup-table status
    booking_status_rows = (
        db.session.query(
            BookingStatus.status_name,
            func.count(Booking.booking_id),
        )
        .outerjoin(
            Booking,
            Booking.status_id == BookingStatus.status_id,
        )
        .group_by(BookingStatus.status_name)
        .order_by(BookingStatus.status_name)
        .all()
    )

    booking_status_breakdown = {
        status_name: count
        for status_name, count in booking_status_rows
    }

    # Count payment records and sum amounts by payment status.
    # PAID is counted as collected revenue; REFUNDED is reported separately.
    payment_status_rows = (
        db.session.query(
            PaymentStatus.status_name,
            func.count(Payment.payment_id),
            func.coalesce(func.sum(Payment.amount), 0),
        )
        .outerjoin(
            Payment,
            Payment.payment_status_id
            == PaymentStatus.payment_status_id,
        )
        .group_by(PaymentStatus.status_name)
        .order_by(PaymentStatus.status_name)
        .all()
    )

    payment_status_breakdown = {}
    payment_amounts = {}

    for status_name, count, amount in payment_status_rows:
        payment_status_breakdown[status_name] = count
        payment_amounts[status_name] = float(amount or 0)

    # Last six calendar months, including the current month
    month_start = func.date_trunc("month", Booking.booking_date)

    booking_trend_rows = (
        db.session.query(
            month_start.label("month"),
            func.count(Booking.booking_id),
        )
        .filter(
            Booking.booking_date
            >= func.date_trunc("month", func.current_timestamp())
            - text("INTERVAL '5 months'")
        )
        .group_by(month_start)
        .order_by(month_start)
        .all()
    )

    monthly_bookings = [
        {
            "month": month.strftime("%Y-%m"),
            "bookings": count,
        }
        for month, count in booking_trend_rows
    ]

    # Sum PAID payments by month of payment.
    payment_month = func.date_trunc("month", Payment.payment_date)

    paid_status = PaymentStatus.query.filter_by(
        status_name="PAID"
    ).first()

    monthly_revenue = []

    if paid_status:
        revenue_trend_rows = (
            db.session.query(
                payment_month.label("month"),
                func.coalesce(func.sum(Payment.amount), 0),  
            )
            .filter(
                Payment.payment_status_id
                == paid_status.payment_status_id,
                Payment.payment_date
                >= func.date_trunc(
                    "month", func.current_timestamp()
                ) - text("INTERVAL '5 months'"),
            )
            .group_by(payment_month)
            .order_by(payment_month)
            .all()
        )

        monthly_revenue = [
            {
                "month": month.strftime("%Y-%m"),
                "revenue": float(amount or 0),
            }
            for month, amount in revenue_trend_rows
        ]
 
    return jsonify({
        "total_users": total_users,
        "total_customers": total_customers,
        "total_bookings": total_bookings,
        "total_destinations": total_destinations,
        "total_packages": total_packages,
        "booking_status_breakdown": booking_status_breakdown,
        "payment_status_breakdown": payment_status_breakdown,
        "payment_amounts": payment_amounts,
        "paid_revenue": payment_amounts.get("PAID", 0),
        "refunded_amount": payment_amounts.get("REFUNDED", 0),
        "monthly_bookings": monthly_bookings,
        "monthly_revenue": monthly_revenue,
    }), 200


# ---------------------------------------------------------
# PAGINATED USER LIST
# ---------------------------------------------------------

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_admin_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search = request.args.get("search", "").strip()
    role_filter = request.args.get("role", "").strip().upper()

    if page < 1:
        return jsonify({"error": "Page must be at least 1"}), 400

    if per_page < 1 or per_page > 100:
        return jsonify({
            "error": "per_page must be between 1 and 100"
        }), 400

    allowed_roles = {"CUSTOMER", "STAFF", "HIGHER_ADMIN"}

    if role_filter and role_filter not in allowed_roles:
        return jsonify({"error": "Invalid role filter"}), 400

    query = (
        db.session.query(User, Role.role_name)
        .join(Role, User.role_id == Role.role_id)
    )

    if role_filter:
        query = query.filter(Role.role_name == role_filter)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term)
            )
        )

    total = query.count()

    users = (
        query.order_by(User.user_id.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return jsonify({
        "users": [
            {
                "user_id": user.user_id,
                "username": user.username,
                "email": user.email,
                "role_name": role_name,
                "account_status": user.account_status,
                "created_at": (
                    user.created_at.isoformat()
                    if user.created_at else None
                )
            }
            for user, role_name in users
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page
        }
    }), 200


# ---------------------------------------------------------
# CREATE STAFF OR HIGHER ADMIN
# POST /api/admin/users
# ---------------------------------------------------------

@admin_bp.route("/users", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def create_managed_user():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required"}), 400

    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role_name = data.get("role_name", "").strip().upper()

    if not all([username, email, password, role_name]):
        return jsonify({
            "error": "Username, email, password, and role_name are required"
        }), 400

    if role_name not in {"STAFF", "HIGHER_ADMIN"}:
        return jsonify({
            "error": "Only STAFF and HIGHER_ADMIN accounts can be created here"
        }), 400

    if len(username) > 50:
        return jsonify({"error": "Username must be 50 characters or fewer"}), 400

    if len(email) > 150 or "@" not in email:
        return jsonify({"error": "Please provide a valid email address"}), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must contain at least 8 characters"
        }), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username is already taken"}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email is already registered"}), 409

    role = get_role(role_name)

    if not role:
        return jsonify({
            "error": f"The {role_name} role is not configured"
        }), 500

    staff_data = None


    staff_data = None

    if role_name == "STAFF":
        required_fields = [
            "first_name",
            "phone",
            "department",
            "designation",
            "joining_date"
        ]

        allowed_designations = {
            "Travel Consultant",
            "Booking Officer",
            "Reservation Officer",
            "Tour Operations Officer",
            "Customer Support Officer",
            "Accounts Officer",
            "Operations Officer",
            "Operations Manager",
        }

        missing_fields = [
            field for field in required_fields
            if not str(data.get(field, "")).strip()
        ]

        if missing_fields:
            return jsonify({
                "error": "Required staff fields are missing",
                "missing_fields": missing_fields
            }), 400

        designation = data.get("designation", "").strip()

        if designation not in allowed_designations:
            return jsonify({
                "error": "Please select a valid employee designation."
            }), 400

        try:
            joining_date = date.fromisoformat(data["joining_date"])
        except (ValueError, TypeError):
            return jsonify({
                "error": "joining_date must use YYYY-MM-DD format"
            }), 400

      
        # Generate the next employee code automatically.
        latest_staff = Staff.query.order_by(
            Staff.staff_id.desc()
        ).first()

        next_number = 1

        if latest_staff and latest_staff.employee_code.startswith("EMP-"):
            try:
                next_number = int(
                    latest_staff.employee_code.split("-")[1]
                ) + 1
            except (ValueError, IndexError):
                next_number = latest_staff.staff_id + 1

        employee_code = f"EMP-{next_number:04d}"

        # Ensure the generated code is not already in use.
        while Staff.query.filter_by(
            employee_code=employee_code
        ).first():
            next_number += 1
            employee_code = f"EMP-{next_number:04d}"
        manager_id = data.get("manager_id")

        if manager_id not in (None, ""):
            try:
                manager_id = int(manager_id)
            except (ValueError, TypeError):
                return jsonify({"error": "manager_id must be a valid staff ID"}), 400

            if not Staff.query.filter_by(staff_id=manager_id).first():
                return jsonify({"error": "The selected manager does not exist"}), 400
        else:
            manager_id = None

               
        staff_data = {
            "employee_code": employee_code,
            "first_name": data["first_name"].strip(),
            "last_name": data.get("last_name", "").strip() or None,
            "phone": data["phone"].strip(),
            "department": data["department"].strip(),
            "designation": data["designation"].strip(),
            "joining_date": joining_date,
            "manager_id": manager_id
        }

        new_user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role_id=role.role_id,
        account_status="ACTIVE"
    )

    try:
        db.session.add(new_user)
        db.session.flush()

        if staff_data:
            from datetime import datetime

            now = datetime.now()

            new_staff = Staff(
                user_id=new_user.user_id,
                created_at=now,
                updated_at=now,
                **staff_data
            )
            db.session.add(new_staff)

        db.session.commit()

    except Exception as exc:
        db.session.rollback()
        print("EMPLOYEE CREATION ERROR:", repr(exc))
        return jsonify({
            "error": "The account could not be created. Check the Flask terminal for details."
        }), 500
    return jsonify({
        "message": f"{role_name.replace('_', ' ').title()} account created successfully",
        "user": {
            "user_id": new_user.user_id,
            "username": new_user.username,
            "email": new_user.email,
            "role_name": role.role_name,
            "account_status": new_user.account_status
        },
        "employee": {    
            "staff_id": new_staff.staff_id,
            "employee_code": new_staff.employee_code,
            "first_name": new_staff.first_name,
            "last_name": new_staff.last_name,
            "designation": new_staff.designation
        } if role_name == "STAFF" else None
    }), 201
# ---------------------------------------------------------
# BLOCK OR REACTIVATE AN ACCOUNT
# PATCH /api/admin/users/<user_id>/status
# ---------------------------------------------------------

@admin_bp.route("/users/<int:user_id>/status", methods=["PATCH"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def update_user_status(user_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required"}), 400

    new_status = data.get("account_status", "").strip().upper()

    if new_status not in {"ACTIVE", "SUSPENDED"}:
        return jsonify({
            "error": "account_status must be ACTIVE or SUSPENDED"
        }), 400

    current_user_id = int(get_jwt_identity())

    if user_id == current_user_id and new_status != "ACTIVE":
        return jsonify({
            "error": "You cannot suspend your own account"
        }), 400

    target_user = db.session.get(User, user_id)

    if not target_user:
        return jsonify({"error": "User not found"}), 404

    target_role_name = (
        target_user.role.role_name if target_user.role else None
    )

    if (
        target_role_name == "HIGHER_ADMIN"
        and target_user.account_status == "ACTIVE"
        and new_status != "ACTIVE"
        and active_higher_admin_count() <= 1
    ):
        return jsonify({
            "error": "You cannot suspend the last active Higher Admin"
        }), 400

    try:
        target_user.account_status = new_status

        # When access is suspended/reactivated, synchronize the
        # employee's employment status where appropriate.
        if target_role_name == "STAFF":
            staff_profile = Staff.query.filter_by(
                user_id=target_user.user_id
            ).first()

            if staff_profile:
                if new_status == "SUSPENDED":
                    staff_profile.employment_status = "TERMINATED"
                elif staff_profile.employment_status == "TERMINATED":
                    staff_profile.employment_status = "ACTIVE"

        db.session.commit()

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Account status could not be updated"
        }), 500

    return jsonify({
        "message": (
            "Account suspended successfully"
            if new_status == "SUSPENDED"
            else "Account reactivated successfully"
        ),
        "user_id": target_user.user_id,
        "account_status": target_user.account_status
    }), 200




# ---------------------------------------------------------
# REFUND MANAGEMENT
# ---------------------------------------------------------

@admin_bp.route("/refunds", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def get_refunds():
    refunds = (
        Refund.query
        .join(Booking, Refund.booking_id == Booking.booking_id)
        .order_by(Refund.created_at.desc())
        .all()
    )

    result = []

    for refund in refunds:
        booking = refund.booking
        customer = booking.customer if booking else None

        result.append({
            "refund_id": refund.refund_id,
            "booking_id": refund.booking_id,
            "booking_reference": (
                booking.booking_reference if booking else None
            ),
            "customer_name": (
                f"{customer.first_name} {customer.last_name or ''}".strip()
                if customer else "Unknown"
            ),
            "paid_amount": str(refund.paid_amount),
            "refund_percentage": str(refund.refund_percentage),
            "refund_amount": str(refund.refund_amount),
            "days_before_travel": refund.days_before_travel,
            "policy_reason": refund.policy_reason,
            "refund_status": refund.refund_status,
            "transaction_reference": refund.transaction_reference,
            "notes": refund.notes,
            "created_at": (
                refund.created_at.isoformat()
                if refund.created_at else None
            ),
            "processed_at": (
                refund.processed_at.isoformat()
                if refund.processed_at else None
            ),
        })

    return jsonify(result), 200


@admin_bp.route("/refunds/<int:refund_id>", methods=["PATCH"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def update_refund(refund_id):
    from datetime import datetime
    from decimal import Decimal

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A JSON request body is required"
        }), 400

    refund = db.session.get(Refund, refund_id)

    if not refund:
        return jsonify({"error": "Refund not found"}), 404

    new_status = str(
        data.get("refund_status", "")
    ).strip().upper()

    if new_status not in {"PROCESSING", "COMPLETED", "FAILED"}:
        return jsonify({
            "error": "Status must be PROCESSING, COMPLETED or FAILED"
        }), 400

    if Decimal(str(refund.refund_amount or 0)) <= 0:
        return jsonify({
            "error": "A zero-value refund cannot be processed"
        }), 400

    if refund.refund_status in {"COMPLETED", "NOT_REQUIRED"}:
        return jsonify({
            "error": "This refund can no longer be modified"
        }), 409

    reference = data.get("transaction_reference")
    notes = data.get("notes")

    if reference is not None and not isinstance(reference, str):
        return jsonify({
            "error": "transaction_reference must be text"
        }), 400

    if notes is not None and not isinstance(notes, str):
        return jsonify({"error": "notes must be text"}), 400

    reference = reference.strip() if reference else None
    notes = notes.strip() if notes else None

    if new_status == "COMPLETED" and not reference:
        return jsonify({
            "error": "Enter the refund transaction reference before completing"
        }), 400

    if new_status == "COMPLETED" and refund.refund_status == "FAILED":
        return jsonify({
            "error": "A failed refund must be moved to PROCESSING before completion"
        }), 409

    try:
        current_user_id = int(get_jwt_identity())

        refund.refund_status = new_status
        refund.processed_by = current_user_id
        refund.processed_at = datetime.now() if new_status == "COMPLETED" else None

        if reference is not None:
            refund.transaction_reference = reference

        if notes is not None:
            refund.notes = notes

        db.session.commit()

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Could not update the refund"
        }), 500

    return jsonify({
        "message": f"Refund marked {new_status.lower()}",
        "refund_id": refund.refund_id,
        "refund_status": refund.refund_status
    }), 200
