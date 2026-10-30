 
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

from sqlalchemy import func
from models import AuditLog

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


# ---------------------------------------------------------
# DASHBOARD STATISTICS
# ---------------------------------------------------------

@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def admin_stats():
    from datetime import date, datetime, timedelta
    from decimal import Decimal

    # -----------------------------------------------------
    # 1. DATE RANGE FILTER
    # Supported: 6m, 12m, yearly, all, custom
    # -----------------------------------------------------

    selected_range = request.args.get("range", "6m").strip().lower()
    today = date.today()
    current_month = today.replace(day=1)

    if selected_range == "6m":
        start_date = (
            current_month.replace(year=current_month.year - 1, month=7)
            if current_month.month <= 6
            else current_month.replace(month=current_month.month - 5)
        )
        end_date = today

    elif selected_range == "12m":
        month_index = current_month.month - 12
        year = current_month.year + (month_index - 1) // 12
        month = (month_index - 1) % 12 + 1
        start_date = date(year, month, 1)
        end_date = today

    elif selected_range == "yearly":
        start_date = date(today.year, 1, 1)
        end_date = today

    elif selected_range == "custom":
        try:
            start_date = date.fromisoformat(
                request.args.get("start_date", "")
            )
            end_date = date.fromisoformat(
                request.args.get("end_date", "")
            )
        except ValueError:
            return jsonify({
                "error": "Custom range requires valid YYYY-MM-DD dates"
            }), 400

        if start_date > end_date:
            return jsonify({
                "error": "start_date cannot be after end_date"
            }), 400

    elif selected_range == "all":
        start_date = None
        end_date = today

    else:
        return jsonify({
            "error": "Invalid range. Use 6m, 12m, yearly, all or custom"
        }), 400

    start_datetime = (
        datetime.combine(start_date, datetime.min.time())
        if start_date else None
    )
    end_datetime = datetime.combine(
        end_date + timedelta(days=1),
        datetime.min.time()
    )

    # -----------------------------------------------------
    # 2. BASIC TOTALS
    # -----------------------------------------------------

    total_users = (
        db.session.query(func.count(User.user_id)).scalar() or 0
    )
    total_customers = (
        db.session.query(func.count(Customer.customer_id)).scalar() or 0
    )
    total_bookings = (
        db.session.query(func.count(Booking.booking_id)).scalar() or 0
    )
    total_destinations = (
        db.session.query(func.count(Destination.destination_id)).scalar() or 0
    )
    total_packages = (
        db.session.query(func.count(TourPackage.package_id)).scalar() or 0
    )

    # -----------------------------------------------------
    # 3. BOOKING STATUS BREAKDOWN
    # -----------------------------------------------------

    booking_status_rows = (
        db.session.query(
            BookingStatus.status_name,
            func.count(Booking.booking_id)
        )
        .outerjoin(
            Booking,
            Booking.status_id == BookingStatus.status_id
        )
        .group_by(BookingStatus.status_name)
        .order_by(BookingStatus.status_name)
        .all()
    )

    booking_status_breakdown = {
        status_name: count
        for status_name, count in booking_status_rows
    }

    # -----------------------------------------------------
    # 4. PAYMENT STATUS BREAKDOWN
    # -----------------------------------------------------

    payment_status_rows = (
        db.session.query(
            PaymentStatus.status_name,
            func.count(Payment.payment_id),
            func.coalesce(func.sum(Payment.amount), 0)
        )
        .outerjoin(
            Payment,
            Payment.payment_status_id
            == PaymentStatus.payment_status_id
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

    # -----------------------------------------------------
    # 5. PAID REVENUE
    # Only successful PAID payments count as collected revenue.
    # -----------------------------------------------------

    paid_status = PaymentStatus.query.filter_by(
        status_name="PAID"
    ).first()

    paid_revenue_query = db.session.query(
        func.coalesce(func.sum(Payment.amount), 0)
    )

    if paid_status:
        paid_revenue_query = paid_revenue_query.filter(
            Payment.payment_status_id == paid_status.payment_status_id
        )
    else:
        paid_revenue_query = paid_revenue_query.filter(
            Payment.payment_id == None
        )

    paid_revenue = float(paid_revenue_query.scalar() or 0)

    # -----------------------------------------------------
    # 6. COMPLETED REFUNDS ONLY
    # PROCESSING and FAILED are not counted as actual refunds.
    # -----------------------------------------------------

    completed_refunds_query = Refund.query.filter(
        func.upper(Refund.refund_status) == "COMPLETED"
    )

    refunded_amount = float(
        db.session.query(
            func.coalesce(func.sum(Refund.refund_amount), 0)
        )
        .filter(
            func.upper(Refund.refund_status) == "COMPLETED"
        )
        .scalar() or 0
    )

    net_revenue = round(paid_revenue - refunded_amount, 2)

    # -----------------------------------------------------
    # 7. MONTHLY BOOKINGS
    # Preserve the existing six-month booking trend.
    # -----------------------------------------------------

    booking_month = func.date_trunc("month", Booking.booking_date)

    booking_trend_rows = (
        db.session.query(
            booking_month.label("month"),
            func.count(Booking.booking_id)
        )
        .filter(
            Booking.booking_date >= (
                func.date_trunc("month", func.current_timestamp())
                - text("INTERVAL '5 months'")
            )
        )
        .group_by(booking_month)
        .order_by(booking_month)
        .all()
    )

    monthly_bookings = [
        {
            "month": month.strftime("%Y-%m"),
            "bookings": count
        }
        for month, count in booking_trend_rows
    ]

    # -----------------------------------------------------
    # 8. MONTHLY PAID REVENUE
    # Group payments by payment_date.
    # -----------------------------------------------------

    payment_month = func.date_trunc("month", Payment.payment_date)

    paid_month_query = db.session.query(
        payment_month.label("month"),
        func.coalesce(func.sum(Payment.amount), 0).label("amount")
    )

    if paid_status:
        paid_month_query = paid_month_query.filter(
            Payment.payment_status_id == paid_status.payment_status_id
        )
    else:
        paid_month_query = paid_month_query.filter(
            Payment.payment_id == None
        )

    if start_datetime:
        paid_month_query = paid_month_query.filter(
            Payment.payment_date >= start_datetime
        )

    paid_month_query = paid_month_query.filter(
        Payment.payment_date < end_datetime,
        Payment.payment_date.isnot(None)
    )

    paid_month_rows = (
        paid_month_query
        .group_by(payment_month)
        .order_by(payment_month)
        .all()
    )

    # -----------------------------------------------------
    # 9. MONTHLY COMPLETED REFUNDS
    # Group refunds by processed_at, not created_at.
    # -----------------------------------------------------

    refund_month = func.date_trunc("month", Refund.processed_at)

    refund_month_query = db.session.query(
        refund_month.label("month"),
        func.coalesce(func.sum(Refund.refund_amount), 0).label("amount")
    ).filter(
        func.upper(Refund.refund_status) == "COMPLETED",
        Refund.processed_at.isnot(None),
        Refund.processed_at < end_datetime
    )

    if start_datetime:
        refund_month_query = refund_month_query.filter(
            Refund.processed_at >= start_datetime
        )

    refund_month_rows = (
        refund_month_query
        .group_by(refund_month)
        .order_by(refund_month)
        .all()
    )

    # -----------------------------------------------------
    # 10. MERGE THE THREE SERIES BY MONTH
    # Missing values become zero so all lines share the same x-axis.
    # -----------------------------------------------------

    monthly_data = {}

    for month, amount in paid_month_rows:
        month_key = month.strftime("%Y-%m")
        monthly_data.setdefault(month_key, {
            "month": month_key,
            "paid_revenue": 0.0,
            "refunded_amount": 0.0,
            "net_revenue": 0.0
        })
        monthly_data[month_key]["paid_revenue"] = float(amount or 0)

    for month, amount in refund_month_rows:
        month_key = month.strftime("%Y-%m")
        monthly_data.setdefault(month_key, {
            "month": month_key,
            "paid_revenue": 0.0,
            "refunded_amount": 0.0,
            "net_revenue": 0.0
        })
        monthly_data[month_key]["refunded_amount"] = float(amount or 0)

    # Include months with no payment/refund activity.
    if start_date:
        month_cursor = start_date.replace(day=1)
    else:
        earliest_payment = db.session.query(
            func.min(Payment.payment_date)
        ).scalar()
        earliest_refund = db.session.query(
            func.min(Refund.processed_at)
        ).filter(
            func.upper(Refund.refund_status) == "COMPLETED"
        ).scalar()

        earliest_dates = [
            value.date() if isinstance(value, datetime) else value
            for value in [earliest_payment, earliest_refund]
            if value is not None
        ]

        month_cursor = (
            min(earliest_dates).replace(day=1)
            if earliest_dates else current_month
        )

    last_month = end_date.replace(day=1)

    while month_cursor <= last_month:
        month_key = month_cursor.strftime("%Y-%m")

        monthly_data.setdefault(month_key, {
            "month": month_key,
            "paid_revenue": 0.0,
            "refunded_amount": 0.0,
            "net_revenue": 0.0
        })

        month_cursor = (
            month_cursor.replace(year=month_cursor.year + 1, month=1)
            if month_cursor.month == 12
            else month_cursor.replace(month=month_cursor.month + 1)
        )

    monthly_revenue = []

    for month_key in sorted(monthly_data):
        item = monthly_data[month_key]
        item["net_revenue"] = round(
            item["paid_revenue"] - item["refunded_amount"], 2
        )
        monthly_revenue.append(item)

    # -----------------------------------------------------
    # 11. RESPONSE
    # Keep existing keys for backward compatibility.
    # -----------------------------------------------------

    return jsonify({
        "total_users": total_users,
        "total_customers": total_customers,
        "total_bookings": total_bookings,
        "total_destinations": total_destinations,
        "total_packages": total_packages,
        "booking_status_breakdown": booking_status_breakdown,
        "payment_status_breakdown": payment_status_breakdown,
        "payment_amounts": payment_amounts,
        "paid_revenue": round(paid_revenue, 2),
        "refunded_amount": round(refunded_amount, 2),
        "net_revenue": net_revenue,
        "monthly_bookings": monthly_bookings,
        "monthly_revenue": monthly_revenue,
        "selected_range": selected_range
    }), 200




@admin_bp.route("/reports/financial.pdf", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def admin_financial_report_pdf():
    from datetime import date, datetime, timedelta
    from decimal import Decimal
    from io import BytesIO
    from xml.sax.saxutils import escape

    from flask import send_file
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    )
    from sqlalchemy import or_

    start_text = (request.args.get("start_date") or "").strip()
    end_text = (request.args.get("end_date") or "").strip()

    try:
        start_date = date.fromisoformat(start_text)
        end_date = date.fromisoformat(end_text)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Provide start_date and end_date in YYYY-MM-DD format."
        }), 400

    if start_date > end_date:
        return jsonify({"error": "Start date cannot be after end date."}), 400

    if (end_date - start_date).days > 3660:
        return jsonify({"error": "The selected range cannot exceed 10 years."}), 400

    start_dt = datetime.combine(start_date, datetime.min.time())
    end_exclusive = datetime.combine(
        end_date + timedelta(days=1), datetime.min.time()
    )

    paid_status = PaymentStatus.query.filter_by(status_name="PAID").first()

    # Include all payment statuses in the detail table, but only PAID
    # transactions contribute to collected revenue.
    payment_query = (
        db.session.query(Payment, Booking, Customer, PaymentStatus)
        .outerjoin(Booking, Payment.booking_id == Booking.booking_id)
        .outerjoin(Customer, Booking.customer_id == Customer.customer_id)
        .outerjoin(
            PaymentStatus,
            Payment.payment_status_id == PaymentStatus.payment_status_id
        )
        .filter(
            Payment.payment_date >= start_dt,
            Payment.payment_date < end_exclusive,
        )
        .order_by(Payment.payment_date.asc(), Payment.payment_id.asc())
    )
    payment_rows = payment_query.all()

    paid_revenue = sum(
        (
            Decimal(str(payment.amount or 0))
            for payment, _booking, _customer, status in payment_rows
            if status and status.status_name == "PAID"
        ),
        Decimal("0.00"),
    )

    # Refund detail includes refunds created during the period (including
    # pending/failed ones) or processed during the period. Only COMPLETED
    # refunds whose processed_at is in the period reduce net revenue.
    refund_rows = (
        db.session.query(Refund, Booking, Customer)
        .outerjoin(Booking, Refund.booking_id == Booking.booking_id)
        .outerjoin(Customer, Booking.customer_id == Customer.customer_id)
        .filter(
            or_(
                (Refund.created_at >= start_dt) &
                (Refund.created_at < end_exclusive),
                (Refund.processed_at >= start_dt) &
                (Refund.processed_at < end_exclusive),
            )
        )
        .order_by(Refund.created_at.asc(), Refund.refund_id.asc())
        .all()
    )

    completed_refunds = sum(
        (
            Decimal(str(refund.refund_amount or 0))
            for refund, _booking, _customer in refund_rows
            if str(refund.refund_status or "").upper() == "COMPLETED"
            and refund.processed_at is not None
            and start_dt <= refund.processed_at < end_exclusive
        ),
        Decimal("0.00"),
    )
    net_revenue = paid_revenue - completed_refunds

    booking_count = (
        db.session.query(db.func.count(Booking.booking_id))
        .filter(
            Booking.booking_date >= start_dt,
            Booking.booking_date < end_exclusive,
        )
        .scalar()
        or 0
    )

    def money(value):
        return f"BDT {Decimal(str(value or 0)):,.2f}"

    def safe(value):
        return escape(str(value if value not in (None, "") else "—"))

    def date_text(value):
        return value.strftime("%Y-%m-%d %H:%M") if value else "—"

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=14 * mm,
        title="Travel Agency Financial Audit Report",
        author="Travel Agency Management System",
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="ReportTitle", parent=styles["Title"], alignment=TA_LEFT,
        fontSize=18, leading=22, textColor=colors.HexColor("#0f3d3e"),
        spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="SmallCell", parent=styles["BodyText"], fontSize=7.2,
        leading=9, spaceAfter=0,
    ))
    styles.add(ParagraphStyle(
        name="SectionTitle", parent=styles["Heading2"], fontSize=11,
        leading=14, textColor=colors.HexColor("#0f766e"),
        spaceBefore=12, spaceAfter=6,
    ))

    story = [
        Paragraph("Travel Agency — Financial Audit Report", styles["ReportTitle"]),
        Paragraph(
            f"Reporting period: <b>{start_date.isoformat()}</b> to "
            f"<b>{end_date.isoformat()}</b> (inclusive)",
            styles["BodyText"],
        ),
        Paragraph(
            f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            styles["BodyText"],
        ),
        Spacer(1, 8),
    ]

    summary_data = [
        ["Financial summary", "Amount / count"],
        ["Paid revenue (PAID payments by payment date)", money(paid_revenue)],
        ["Completed refunds (by processed date)", money(completed_refunds)],
        ["Net revenue (paid revenue − completed refunds)", money(net_revenue)],
        ["Bookings created in period", str(booking_count)],
        ["Payment records in period (all statuses)", str(len(payment_rows))],
        ["Refund records created/processed in period", str(len(refund_rows))],
    ]
    summary = Table(summary_data, colWidths=[105 * mm, 65 * mm], hAlign="LEFT")
    summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica"),
        ("FONTNAME", (1, 1), (1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([summary, Spacer(1, 8)])

    story.append(Paragraph("Payment transaction details", styles["SectionTitle"]))
    payment_header = ["Payment ID", "Payment date", "Booking", "Customer",
                      "Status", "Transaction reference", "Amount"]
    payment_table_data = [payment_header]
    for payment, booking, customer, status in payment_rows:
        customer_name = (
            f"{customer.first_name or ''} {customer.last_name or ''}".strip()
            if customer else "Unknown"
        )
        payment_table_data.append([
            str(payment.payment_id),
            date_text(payment.payment_date),
            safe(booking.booking_reference if booking else payment.booking_id),
            Paragraph(safe(customer_name), styles["SmallCell"]),
            safe(status.status_name if status else "Unknown"),
            Paragraph(safe(payment.transaction_reference), styles["SmallCell"]),
            money(payment.amount),
        ])

    if len(payment_table_data) == 1:
        payment_table_data.append(["—", "No payment records for this period", "", "", "", "", ""])

    payment_table = Table(
        payment_table_data,
        colWidths=[17*mm, 29*mm, 27*mm, 35*mm, 20*mm, 57*mm, 28*mm],
        repeatRows=1, hAlign="LEFT",
    )
    payment_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 7.2),
        ("FONTSIZE", (0, 1), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.white, colors.HexColor("#f8fafc")]),
        ("ALIGN", (-1, 1), (-1, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(payment_table)

    story.append(Paragraph("Refund transaction details", styles["SectionTitle"]))
    refund_header = ["Refund ID", "Created", "Processed", "Booking", "Customer",
                     "Status", "Transaction reference", "Amount"]
    refund_table_data = [refund_header]
    for refund, booking, customer in refund_rows:
        customer_name = (
            f"{customer.first_name or ''} {customer.last_name or ''}".strip()
            if customer else "Unknown"
        )
        refund_table_data.append([
            str(refund.refund_id),
            date_text(refund.created_at),
            date_text(refund.processed_at),
            safe(booking.booking_reference if booking else refund.booking_id),
            Paragraph(safe(customer_name), styles["SmallCell"]),
            safe(refund.refund_status),
            Paragraph(safe(refund.transaction_reference), styles["SmallCell"]),
            money(refund.refund_amount),
        ])

    if len(refund_table_data) == 1:
        refund_table_data.append(["—", "No refund records for this period", "", "", "", "", "", ""])

    refund_table = Table(
        refund_table_data,
        colWidths=[15*mm, 27*mm, 27*mm, 26*mm, 32*mm, 22*mm, 53*mm, 28*mm],
        repeatRows=1, hAlign="LEFT",
    )
    refund_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#7f1d1d")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 7),
        ("FONTSIZE", (0, 1), (-1, -1), 6.8),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.white, colors.HexColor("#fff7f7")]),
        ("ALIGN", (-1, 1), (-1, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(refund_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<b>Audit note:</b> Paid revenue includes only payments whose status is "
        "PAID and whose payment date falls within the selected period. Completed "
        "refunds reduce net revenue only when their processed date falls within "
        "the selected period. Pending/failed records are listed for reconciliation "
        "but are excluded from the refund total.",
        styles["BodyText"],
    ))

    def add_page_number(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawRightString(
            landscape(A4)[0] - 12 * mm, 7 * mm,
            f"Page {document.page}"
        )
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    buffer.seek(0)

    filename = f"financial_audit_{start_date.isoformat()}_to_{end_date.isoformat()}.pdf"
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


@admin_bp.route("/activity-logs", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_admin_activity_logs():
    from models.audit_log import AuditLog
    from datetime import datetime, timedelta

    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 25, type=int), 1), 100)

    staff_id = request.args.get("staff_id", type=int)
    action = request.args.get("action", "").strip()
    table_name = request.args.get("table_name", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    # Only show activities performed by STAFF accounts.
    query = (
        db.session.query(AuditLog, User, Role)
        .join(User, AuditLog.user_id == User.user_id)
        .join(Role, User.role_id == Role.role_id)
        .filter(Role.role_name == "STAFF")
    )

    if staff_id:
        query = query.filter(AuditLog.user_id == staff_id)

    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))

    if table_name:
        query = query.filter(AuditLog.table_name.ilike(f"%{table_name}%"))

    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(AuditLog.created_at >= start)
        except ValueError:
            return jsonify({"error": "Invalid start_date"}), 400

    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(AuditLog.created_at < end)
        except ValueError:
            return jsonify({"error": "Invalid end_date"}), 400

    pagination = (
        query.order_by(
            AuditLog.created_at.desc(),
            AuditLog.log_id.desc()
        )
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    logs = []

    for log, user, role in pagination.items:
        logs.append({
            "log_id": log.log_id,
            "user_id": log.user_id,
            "username": user.username,
            "role_name": role.role_name,
            "action": log.action,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "ip_address": log.ip_address,
            "created_at": (
                log.created_at.isoformat()
                if log.created_at else None
            )
        })

    return jsonify({
        "logs": logs,
        "pagination": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "total_pages": pagination.pages
        },
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages
    }), 200

  
@admin_bp.route("/staff-activity", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_staff_activity_list():
    """List staff accounts with the count and latest timestamp of recorded audit events."""
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 10, type=int), 1), 100)
    search = request.args.get("search", "").strip()
    status_filter = request.args.get("status", "").strip().upper()

    staff_role = Role.query.filter_by(role_name="STAFF").first()
    if not staff_role:
        return jsonify({"staff": [], "pagination": {
            "page": page, "per_page": per_page, "total": 0, "total_pages": 0
        }}), 200

    activity_counts = (
        db.session.query(
            AuditLog.user_id.label("user_id"),
            func.count(AuditLog.log_id).label("activity_count"),
            func.max(AuditLog.created_at).label("last_activity_at")
        )
        .group_by(AuditLog.user_id)
        .subquery()
    )

    query = (
        db.session.query(
            User,
            activity_counts.c.activity_count,
            activity_counts.c.last_activity_at
        )
        .outerjoin(activity_counts, activity_counts.c.user_id == User.user_id)
        .filter(User.role_id == staff_role.role_id)
    )

    if search:
        term = f"%{search}%"
        query = query.filter(or_(User.username.ilike(term), User.email.ilike(term)))
    if status_filter in {"ACTIVE", "SUSPENDED", "INACTIVE"}:
        query = query.filter(func.upper(User.account_status) == status_filter)

    total = query.count()
    rows = (
        query.order_by(User.user_id.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return jsonify({
        "staff": [{
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "account_status": user.account_status,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "activity_count": int(activity_count or 0),
            "last_activity_at": last_activity.isoformat() if last_activity else None,
        } for user, activity_count, last_activity in rows],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    }), 200


@admin_bp.route("/staff-activity/<int:staff_id>", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_staff_activity_detail(staff_id):
    """Return one staff profile and its recorded audit history, with filters and pagination."""
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 20, type=int), 1), 100)
    action = request.args.get("action", "").strip()
    table_name = request.args.get("table_name", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    staff_role = Role.query.filter_by(role_name="STAFF").first()
    staff = db.session.get(User, staff_id)
    if not staff or not staff_role or staff.role_id != staff_role.role_id:
        return jsonify({"error": "Staff member not found"}), 404

    query = AuditLog.query.filter(AuditLog.user_id == staff_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if table_name:
        query = query.filter(AuditLog.table_name.ilike(f"%{table_name}%"))

    from datetime import datetime, timedelta
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid start_date; use YYYY-MM-DD"}), 400
        query = query.filter(AuditLog.created_at >= start)
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        except ValueError:
            return jsonify({"error": "Invalid end_date; use YYYY-MM-DD"}), 400
        query = query.filter(AuditLog.created_at < end)

    pagination = query.order_by(AuditLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    logs = [{
        "log_id": log.log_id,
        "user_id": log.user_id,
        "action": log.action,
        "table_name": log.table_name,
        "record_id": log.record_id,
        "old_values": log.old_values,
        "new_values": log.new_values,
        "ip_address": log.ip_address,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    } for log in pagination.items]

    return jsonify({
        "staff": {
            "user_id": staff.user_id,
            "username": staff.username,
            "email": staff.email,
            "account_status": staff.account_status,
            "created_at": staff.created_at.isoformat() if staff.created_at else None,
        },
        "logs": logs,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "total_pages": pagination.pages,
        },
    }), 200
