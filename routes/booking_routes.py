from datetime import date, datetime

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import select
from models import TourPackage, TourSchedule
from models import (
    Booking,
    BookingTraveler,
    BookingStatus,
    BookingStatusHistory
)
from extensions import db
from auth_utils import (
    role_required,
    booking_access_allowed,
    get_current_user
)


booking_bp = Blueprint(
    "booking",
    __name__,
    url_prefix="/api/bookings"
)


# =========================================================
# GET ALL BOOKINGS
# HIGHER_ADMIN / STAFF
# =========================================================

@booking_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def get_bookings():

    bookings = Booking.query.all()

    return jsonify([
        {
            "booking_id": booking.booking_id,
            "booking_reference": booking.booking_reference,
            "customer_id": booking.customer_id,
            "package_id": booking.package_id,
            "travel_date": booking.travel_date.isoformat(),
            "number_of_travelers": booking.number_of_travelers,
            "subtotal": float(booking.subtotal),
            "discount_amount": float(booking.discount_amount),
            "tax_amount": float(booking.tax_amount),
            "total_amount": float(booking.total_amount),
            "status_id": booking.status_id,
            "special_request": booking.special_request
        }
        for booking in bookings
    ])


# =========================================================
# GET SINGLE BOOKING
# CUSTOMER: OWN BOOKING
# STAFF / ADMIN: ANY BOOKING
# =========================================================

@booking_bp.route("/<int:booking_id>", methods=["GET"])
@jwt_required()
def get_booking(booking_id):

    booking = Booking.query.get_or_404(booking_id)

    if not booking_access_allowed(booking):
        return jsonify({
            "error": "You do not have permission to access this booking"
        }), 403

    return jsonify({
        "booking_id": booking.booking_id,
        "booking_reference": booking.booking_reference,
        "customer_id": booking.customer_id,
        "package_id": booking.package_id,
        "travel_date": booking.travel_date.isoformat(),
        "number_of_travelers": booking.number_of_travelers,
        "subtotal": float(booking.subtotal),
        "discount_amount": float(booking.discount_amount),
        "tax_amount": float(booking.tax_amount),
        "total_amount": float(booking.total_amount),
        "status_id": booking.status_id,
        "special_request": booking.special_request
    })


# =========================================================
# CREATE BOOKING
# CUSTOMER: OWN CUSTOMER PROFILE
# STAFF / ADMIN: ANY CUSTOMER
# =========================================================

# =========================
# CREATE BOOKING
# =========================

@booking_bp.route("/", methods=["POST"])
def create_booking():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON object is required"}), 400

    required_fields = [
        "booking_reference",
        "customer_id",
        "package_id",
        "travel_date",
        "number_of_travelers",
        "subtotal",
        "total_amount",
        "status_id"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        customer_id = int(data["customer_id"])
        package_id = int(data["package_id"])
        number_of_travelers = int(data["number_of_travelers"])
        status_id = int(data["status_id"])
        travel_date_value = date.fromisoformat(data["travel_date"])

        if customer_id <= 0 or package_id <= 0:
            raise ValueError("IDs must be positive")

        if number_of_travelers <= 0:
            raise ValueError("number_of_travelers must be positive")

        if status_id not in (1, 2, 3, 4):
            raise ValueError("Invalid status_id")

        subtotal = float(data["subtotal"])
        total_amount = float(data["total_amount"])
        discount_amount = float(data.get("discount_amount", 0))
        tax_amount = float(data.get("tax_amount", 0))

        if min(subtotal, total_amount, discount_amount, tax_amount) < 0:
            raise ValueError("Amounts cannot be negative")

    except (TypeError, ValueError, OverflowError):
        return jsonify({"error": "Invalid booking data"}), 400

    schedule_id = data.get("schedule_id")
    schedule = None

    try:
        # Schedule selection is optional for backward compatibility.
        if schedule_id is not None:
            try:
                schedule_id = int(schedule_id)
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid schedule_id"}), 400

            # Lock the schedule row to prevent concurrent overbooking.
            schedule = db.session.execute(
                select(TourSchedule)
                .where(TourSchedule.schedule_id == schedule_id)
                .with_for_update()
            ).scalar_one_or_none()

            if not schedule:
                return jsonify({"error": "Schedule not found"}), 404

            if schedule.package_id != package_id:
                return jsonify({
                    "error": "The selected schedule does not belong to this package"
                }), 400

            if schedule.schedule_status != "SCHEDULED":
                return jsonify({
                    "error": "This schedule is not available for booking"
                }), 400

            if schedule.departure_datetime.date() != travel_date_value:
                return jsonify({
                    "error": "travel_date must match the selected schedule's departure date"
                }), 400

            # Count seats reserved by pending and confirmed bookings.
            booked_seats = db.session.query(
                db.func.coalesce(
                    db.func.sum(Booking.number_of_travelers), 0
                )
            ).filter(
                Booking.schedule_id == schedule_id,
                Booking.status_id.in_([1, 2])
            ).scalar()

            available_seats = max(
                0, schedule.max_capacity - int(booked_seats or 0)
            )

            if number_of_travelers > available_seats:
                db.session.rollback()
                return jsonify({
                    "error": "Not enough seats available",
                    "available_seats": available_seats,
                    "requested_seats": number_of_travelers
                }), 409

        booking = Booking(
            booking_reference=data["booking_reference"],
            customer_id=customer_id,
            package_id=package_id,
            schedule_id=schedule_id,
            travel_date=datetime.combine(
                travel_date_value, datetime.min.time()
            ),
            number_of_travelers=number_of_travelers,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            status_id=status_id,
            special_request=data.get("special_request"),
            created_by=data.get("created_by")
        )

        db.session.add(booking)
        db.session.commit()

        return jsonify({
            "message": "Booking created successfully",
            "booking_id": booking.booking_id,
            "booking_reference": booking.booking_reference,
            "schedule_id": booking.schedule_id,
            "number_of_travelers": booking.number_of_travelers
        }), 201

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Booking creation failed")
        return jsonify({"error": "Could not create booking"}), 500
# =========================================================
# GET BOOKING TRAVELERS
# =========================================================

@booking_bp.route(
    "/<int:booking_id>/travelers",
    methods=["GET"]
)
@jwt_required()
def get_booking_travelers(booking_id):

    booking = Booking.query.get_or_404(booking_id)

    if not booking_access_allowed(booking):
        return jsonify({
            "error": "You do not have permission to access this booking"
        }), 403

    travelers = BookingTraveler.query.filter_by(
        booking_id=booking_id
    ).all()

    return jsonify([
        {
            "traveler_id": traveler.traveler_id,
            "booking_id": traveler.booking_id,
            "full_name": traveler.full_name,
            "date_of_birth": (
                traveler.date_of_birth.isoformat()
                if traveler.date_of_birth
                else None
            ),
            "gender": traveler.gender,
            "nationality": traveler.nationality,
            "document_type": traveler.document_type,
            "document_number": traveler.document_number,
            "special_requirements": traveler.special_requirements
        }
        for traveler in travelers
    ])


# =========================================================
# ADD BOOKING TRAVELER
# =========================================================

@booking_bp.route(
    "/<int:booking_id>/travelers",
    methods=["POST"]
)
@jwt_required()
def create_booking_traveler(booking_id):

    booking = Booking.query.get_or_404(booking_id)

    if not booking_access_allowed(booking):
        return jsonify({
            "error": "You do not have permission to modify this booking"
        }), 403

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "full_name",
        "nationality"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "error": f"Missing field: {field}"
            }), 400

    try:

        traveler = BookingTraveler(
            booking_id=booking_id,
            full_name=data["full_name"],
            date_of_birth=(
                date.fromisoformat(data["date_of_birth"])
                if data.get("date_of_birth")
                else None
            ),
            gender=data.get("gender"),
            nationality=data["nationality"],
            document_type=data.get("document_type"),
            document_number=data.get("document_number"),
            special_requirements=data.get("special_requirements")
        )

        db.session.add(traveler)
        db.session.commit()

        return jsonify({
            "message": "Traveler added successfully",
            "traveler_id": traveler.traveler_id,
            "booking_id": traveler.booking_id
        }), 201

    except ValueError:
        db.session.rollback()

        return jsonify({
            "error": "Invalid date_of_birth format. Use YYYY-MM-DD"
        }), 400

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# GET ALL BOOKING STATUSES
# =========================================================

@booking_bp.route(
    "/statuses",
    methods=["GET"]
)
@jwt_required()
def get_booking_statuses():

    statuses = BookingStatus.query.all()

    return jsonify([
        {
            "status_id": status.status_id,
            "status_name": status.status_name,
            "description": status.description
        }
        for status in statuses
    ])


# =========================================================
# UPDATE BOOKING STATUS
# HIGHER_ADMIN / STAFF ONLY
# =========================================================

@booking_bp.route(
    "/<int:booking_id>/status",
    methods=["PUT"]
)
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def update_booking_status(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    data = request.get_json(silent=True)

    if not isinstance(data, dict) or "status_id" not in data:
        return jsonify({"error": "status_id is required"}), 400

    try:
        new_status_id = int(data["status_id"])
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid status_id"}), 400

    status = db.session.get(BookingStatus, new_status_id)
    if not status:
        return jsonify({"error": "Invalid status_id"}), 400

    old_status_id = booking.status_id

    if old_status_id == new_status_id:
        return jsonify({
            "error": "Booking already has this status"
        }), 400

    try:
        # Pending (1) and Confirmed (2) reserve seats.
        reserves_seats = new_status_id in (1, 2)
        previously_reserved = old_status_id in (1, 2)

        # Only a transition from a non-reserving status to a
        # reserving status needs additional capacity.
        if (
            reserves_seats
            and not previously_reserved
            and booking.schedule_id is not None
        ):
            schedule = db.session.execute(
                select(TourSchedule)
                .where(
                    TourSchedule.schedule_id == booking.schedule_id
                )
                .with_for_update()
            ).scalar_one_or_none()

            if schedule is None:
                return jsonify({
                    "error": "The booking schedule no longer exists"
                }), 409

            if schedule.schedule_status != "SCHEDULED":
                return jsonify({
                    "error": "This schedule is not available for booking"
                }), 409

            booked_seats = db.session.query(
                db.func.coalesce(
                    db.func.sum(Booking.number_of_travelers), 0
                )
            ).filter(
                Booking.schedule_id == schedule.schedule_id,
                Booking.status_id.in_([1, 2]),
                Booking.booking_id != booking.booking_id
            ).scalar()

            available_seats = max(
                0, schedule.max_capacity - int(booked_seats or 0)
            )

            if booking.number_of_travelers > available_seats:
                db.session.rollback()
                return jsonify({
                    "error": "Not enough seats available to restore this booking",
                    "available_seats": available_seats,
                    "requested_seats": booking.number_of_travelers
                }), 409

        user = get_current_user()

        history = BookingStatusHistory(
            booking_id=booking.booking_id,
            old_status_id=old_status_id,
            new_status_id=new_status_id,
            changed_by=user.user_id,
            change_reason=data.get("change_reason")
        )

        booking.status_id = new_status_id
        db.session.add(history)
        db.session.commit()

        return jsonify({
            "message": "Booking status updated successfully",
            "booking_id": booking.booking_id,
            "old_status_id": old_status_id,
            "new_status_id": new_status_id,
            "new_status": status.status_name
        })

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Booking status update failed")
        return jsonify({
            "error": "Could not update booking status"
        }), 500

# =========================================================
# GET BOOKING STATUS HISTORY
# =========================================================

@booking_bp.route(
    "/<int:booking_id>/status-history",
    methods=["GET"]
)
@jwt_required()
def get_booking_status_history(booking_id):

    booking = Booking.query.get_or_404(booking_id)

    if not booking_access_allowed(booking):
        return jsonify({
            "error": "You do not have permission to access this booking"
        }), 403

    history = BookingStatusHistory.query.filter_by(
        booking_id=booking_id
    ).order_by(
        BookingStatusHistory.changed_at.asc()
    ).all()

    return jsonify([
        {
            "history_id": item.history_id,
            "booking_id": item.booking_id,
            "old_status_id": item.old_status_id,
            "old_status": (
                item.old_status.status_name
                if item.old_status
                else None
            ),
            "new_status_id": item.new_status_id,
            "new_status": item.new_status.status_name,
            "changed_by": item.changed_by,
            "change_reason": item.change_reason,
            "changed_at": item.changed_at.isoformat()
        }
        for item in history
    ])