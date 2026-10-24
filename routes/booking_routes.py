from zoneinfo import ZoneInfo
import uuid
from decimal import Decimal
from datetime import date, datetime,timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import select
from models import TourPackage, TourSchedule, Customer
from models import (
    Booking,
    BookingTraveler,
    BookingStatus,
    BookingStatusHistory,
    Payment,
    PaymentStatus,
    Refund,
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
# CUSTOMER: LIST OWN BOOKINGS
# =========================================================

@booking_bp.route("/mine", methods=["GET"])
@jwt_required()
def get_my_bookings():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found or account is not active"}), 403
    if not user.role or user.role.role_name != "CUSTOMER":
        return jsonify({"error": "This endpoint is for customer accounts only"}), 403

    customer = Customer.query.filter_by(user_id=user.user_id).first()
    if not customer:
        return jsonify({"error": "Customer profile not found"}), 404

    bookings = Booking.query.filter_by(customer_id=customer.customer_id).order_by(
        Booking.booking_date.desc(), Booking.booking_id.desc()
    ).all()

    return jsonify([
        {
            "booking_id": booking.booking_id,
            "booking_reference": booking.booking_reference,
            "package_id": booking.package_id,
            "package_name": booking.package.package_name if booking.package else "Tour package",
            "schedule_id": booking.schedule_id,
            "departure_datetime": (
                booking.schedule.departure_datetime.isoformat()
                if booking.schedule and booking.schedule.departure_datetime else None
            ),
            "return_datetime": (
                booking.schedule.return_datetime.isoformat()
                if booking.schedule and booking.schedule.return_datetime else None
            ),
            "travel_date": booking.travel_date.isoformat() if booking.travel_date else None,
            "number_of_travelers": booking.number_of_travelers,
            "total_amount": float(booking.total_amount),
            "status_id": booking.status_id,
            "status": booking.status.status_name if booking.status else "Unknown",
            "booking_date": booking.booking_date.isoformat() if booking.booking_date else None,
        }
        for booking in bookings
    ])


# =========================================================
# CUSTOMER: CANCEL OWN BOOKING (NO AUTOMATIC REFUND)
# =========================================================
 
@booking_bp.route("/<int:booking_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_my_booking(booking_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found or account is not active"}), 403

    if not user.role or user.role.role_name != "CUSTOMER":
        return jsonify({
            "error": "Only customers can cancel bookings from this endpoint"
        }), 403

    customer = Customer.query.filter_by(user_id=user.user_id).first()
    if not customer:
        return jsonify({"error": "Customer profile not found"}), 404

    booking = Booking.query.filter_by(
        booking_id=booking_id,
        customer_id=customer.customer_id
    ).first()

    if not booking:
        return jsonify({"error": "Booking not found"}), 404

    data = request.get_json(silent=True) or {}
    if data.get("terms_accepted") is not True:
        return jsonify({
            "error": "You must accept the cancellation terms"
        }), 400

    current_name = (
        booking.status.status_name.upper() if booking.status else ""
    )

    if current_name in {"CANCELLED", "CANCELED"}:
        return jsonify({"error": "This booking is already cancelled"}), 400

    if current_name in {"COMPLETED", "FINISHED"}:
        return jsonify({
            "error": "A completed booking cannot be cancelled"
        }), 400

    try:
        # Use the server date and timestamp for policy calculation.
        # Use Bangladesh local time for policy calculation.
        now = datetime.now(ZoneInfo("Asia/Dhaka")).replace(tzinfo=None)
        today = now.date()
        travel_date = (
            booking.travel_date.date()
            if isinstance(booking.travel_date, datetime)
            else booking.travel_date
        )
        days_before_travel = (travel_date - today).days

        # Only payments verified as PAID count as received money.
        payments = Payment.query.filter_by(
            booking_id=booking.booking_id
        ).all()

        paid_amount = sum(
            (
                Decimal(str(payment.amount or 0))
                for payment in payments
                if payment.payment_status
                and payment.payment_status.status_name.upper() == "PAID"
            ),
            Decimal("0.00")
        ).quantize(Decimal("0.01"))

        # Determine the proposed cancellation refund policy.
        if (
            booking.booking_date
            and now >= booking.booking_date
            and now - booking.booking_date <= timedelta(hours=24)
            and days_before_travel >= 7
        ):
            refund_percentage = Decimal("100.00")
            policy_reason = (
                "Cancelled within 24 hours of booking, "
                "at least 7 days before travel"
            )
        elif days_before_travel >= 30:
            refund_percentage = Decimal("90.00")
            policy_reason = "Cancelled 30 or more days before travel"
        elif days_before_travel >= 15:
            refund_percentage = Decimal("75.00")
            policy_reason = "Cancelled 15-29 days before travel" 
        elif days_before_travel >= 7:
            refund_percentage = Decimal("50.00")
            policy_reason = "Cancelled 7-14 days before travel"
        elif days_before_travel >= 3:
            refund_percentage = Decimal("25.00")
            policy_reason = "Cancelled 3-6 days before travel"
        else:
            refund_percentage = Decimal("0.00")
            policy_reason = "Cancelled 0-2 days before travel"

        refund_base = min(
            paid_amount,
            Decimal(str(booking.total_amount or 0))
        )

        refund_amount = (
            refund_base * refund_percentage / Decimal("100")
        ).quantize(Decimal("0.01"))

        cancelled_status = BookingStatus.query.filter(
            db.func.upper(BookingStatus.status_name).in_(
                ["CANCELLED", "CANCELED"]
            )
        ).first()

        if not cancelled_status:
            cancelled_status = BookingStatus(
                status_name="CANCELLED",
                description="Booking cancelled by customer"
            )
            db.session.add(cancelled_status)
            db.session.flush()

        old_status_id = booking.status_id
        booking.status_id = cancelled_status.status_id

        db.session.add(BookingStatusHistory(
            booking_id=booking.booking_id,
            old_status_id=old_status_id,
            new_status_id=cancelled_status.status_id,
            changed_by=user.user_id,
            change_reason=(
                f"Customer cancellation. {policy_reason}. "
                f"Calculated refund: {refund_amount:.2f} BDT."
            )
        ))

        # Close pending payment requests; they are not received money.
        pending_status = PaymentStatus.query.filter_by(
            status_name="PENDING"
        ).first()
        failed_status = PaymentStatus.query.filter_by(
            status_name="FAILED"
        ).first()

        if pending_status and failed_status:
            Payment.query.filter_by(
                booking_id=booking.booking_id,
                payment_status_id=pending_status.payment_status_id
            ).update(
                {
                    Payment.payment_status_id: failed_status.payment_status_id,
                    Payment.notes: (
                        db.func.coalesce(Payment.notes, "")
                        + "\nClosed because booking was cancelled."
                    ),
                },
                synchronize_session=False,
            )

        # Store a refund record only when some money was received.
        # A zero refund is reported separately, not marked as paid back.
        if paid_amount > 0:
            existing_refund = Refund.query.filter_by(
                booking_id=booking.booking_id
            ).first()

            if existing_refund:
                raise ValueError(
                    "A refund record already exists for this booking."
                )

            db.session.add(Refund(
                booking_id=booking.booking_id,
                paid_amount=paid_amount,
                refund_percentage=refund_percentage,
                refund_amount=refund_amount,
                days_before_travel=days_before_travel,
                policy_reason=policy_reason,
                refund_status=(
                 "PENDING" if refund_amount > 0 else "NOT_REQUIRED"
          ),
                notes=(
                    "Refund amount calculated; staff must process "
                    "any refund due."
                    if refund_amount > 0
                    else "No refund is due under the cancellation policy."
                )
            ))

        db.session.commit()

        return jsonify({
            "message": (
                "Booking cancelled. Your refund has been calculated; "
                "any refund due still requires processing."
                if refund_amount > 0
                else "Booking cancelled. No refund amount is due under the policy."
            ),
            "booking_id": booking.booking_id,
            "status": cancelled_status.status_name,
            "paid_amount": float(paid_amount),
            "days_before_travel": days_before_travel,
            "refund_percentage": float(refund_percentage),
            "refund_amount": float(refund_amount),
            "refund_status": (
                "PENDING" if refund_amount > 0
                else "NOT_REQUIRED"
            ),
            "policy_reason": policy_reason,
        }), 200

    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Customer booking cancellation failed"
        )
        return jsonify({
            "error": "Could not cancel booking. Check the server log for details."
        }), 500

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
# ADMIN / STAFF: BOOKING & TOUR TRACKING
# =========================================================

@booking_bp.route("/tracking", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def get_booking_tracking():
    now = datetime.now(ZoneInfo("Asia/Dhaka")).replace(tzinfo=None)

    bookings = (
        Booking.query
        .order_by(Booking.booking_date.desc(), Booking.booking_id.desc())
        .all()
    )

    results = []

    for booking in bookings:
        customer = booking.customer
        package = booking.package
        schedule = booking.schedule

        customer_name = "Unknown customer"
        customer_phone = None

        if customer:
            customer_name = " ".join(
                part for part in [
                    customer.first_name,
                    customer.last_name
                ]
                if part
            ).strip() or "Unknown customer"

            customer_phone = customer.phone

        booking_status = (
            booking.status.status_name.upper()
            if booking.status else "UNKNOWN"
        )

        departure = schedule.departure_datetime if schedule else None
        return_time = schedule.return_datetime if schedule else None

        # Determine journey status separately from booking status.
        if booking_status in ("CANCELLED", "CANCELED"):
            journey_status = "Cancelled"
        elif (
            booking_status in ("COMPLETED", "FINISHED")
            or (return_time is not None and return_time <= now)
        ):
            journey_status = "Completed"
        elif departure is None or return_time is None:
            journey_status = "Schedule unavailable"
        elif departure > now:
            journey_status = "Upcoming"
        elif departure <= now < return_time:
            journey_status = "Ongoing"
        else:
            journey_status = "Schedule unavailable"

        # Count only PAID transactions as received money.
        paid_amount = sum(
            (
                payment.amount or 0
                for payment in booking.payments
                if payment.payment_status
                and payment.payment_status.status_name.upper() == "PAID"
            ),
            start=Decimal("0.00")
        )

        pending_amount = sum(
            (
                payment.amount or 0
                for payment in booking.payments
                if payment.payment_status
                and payment.payment_status.status_name.upper() == "PENDING"
            ),
            start=Decimal("0.00")
        )

        total_amount = Decimal(str(booking.total_amount or 0))

        if paid_amount >= total_amount:
            payment_status = "Paid"
        elif paid_amount > 0:
            payment_status = "Partially Paid"
        elif pending_amount > 0:
            payment_status = "Payment Pending"
        else:
            payment_status = "Unpaid"

        results.append({
            "booking_id": booking.booking_id,
            "booking_reference": booking.booking_reference,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "package_name": (
                package.package_name if package else "Package unavailable"
            ),
            "booking_status": booking_status,
            "payment_status": payment_status,
            "total_amount": float(total_amount),
            "paid_amount": float(paid_amount),
            "remaining_amount": float(max(
                Decimal("0.00"), total_amount - paid_amount
            )),
            "number_of_travelers": booking.number_of_travelers,
            "departure_datetime": (
                departure.isoformat() if departure else None
            ),
            "return_datetime": (
                return_time.isoformat() if return_time else None
            ),
            "journey_status": journey_status,
        })

    return jsonify(results), 200


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
# CUSTOMER ONLY
# =========================

@booking_bp.route("/", methods=["POST"])
@jwt_required()
def create_booking():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON object is required"}), 400

    # 1. Authenticate the current user
    user = get_current_user()

    if not user:
        return jsonify({
            "error": "User not found or account is not active"
        }), 403

    # 2. Only customers can create their own bookings
    if not user.role or user.role.role_name != "CUSTOMER":
        return jsonify({
            "error": "Only customers can create bookings"
        }), 403

    # 3. Find the customer's profile
    customer = Customer.query.filter_by(
        user_id=user.user_id
    ).first()

    if not customer:
        return jsonify({
            "error": "Customer profile not found"
        }), 404

    # 4. Validate customer-provided fields
    try:
        package_id = int(data["package_id"])
        schedule_id = int(data["schedule_id"])
        number_of_travelers = int(data["number_of_travelers"])

        if package_id <= 0 or schedule_id <= 0:
            raise ValueError("IDs must be positive")

        if number_of_travelers <= 0:
            raise ValueError("Traveler count must be positive")

    except (KeyError, TypeError, ValueError, OverflowError):
        return jsonify({
            "error": (
                "Valid package_id, schedule_id, and "
                "number_of_travelers are required"
            )
        }), 400

    try:
        # 5. Lock the selected schedule to help prevent overbooking
        schedule = db.session.execute(
            select(TourSchedule)
            .where(TourSchedule.schedule_id == schedule_id)
            .with_for_update()
        ).scalar_one_or_none()

        if not schedule:
            return jsonify({"error": "Schedule not found"}), 404

        # 6. Validate the package
        package = db.session.get(TourPackage, package_id)

        if not package:
            return jsonify({"error": "Package not found"}), 404

        if schedule.package_id != package.package_id:
            return jsonify({
                "error": "The selected schedule does not belong to this package"
            }), 400

        # Your TourPackage model uses package_status, not is_active
        if package.package_status != "ACTIVE":
            return jsonify({
                "error": "This package is not available for booking"
            }), 400

        # 7. Validate the schedule
        if schedule.schedule_status != "SCHEDULED":
            return jsonify({
                "error": "This schedule is not available for booking"
            }), 400

        if not schedule.departure_datetime:
            return jsonify({
                "error": "The schedule has no departure date"
            }), 400

        departure = schedule.departure_datetime

        if departure.date() <= date.today():
            return jsonify({
                "error": "Bookings are only available for future departures"
            }), 400

        if number_of_travelers > schedule.max_capacity:
            return jsonify({
                "error": "Traveler count exceeds schedule capacity"
            }), 400

        # 8. Check remaining seats.
        # Status IDs 1 and 2 are assumed to mean pending and confirmed,
        # matching the existing availability logic in your project.
        booked_seats = db.session.query(
            db.func.coalesce(
                db.func.sum(Booking.number_of_travelers), 0
            )
        ).filter(
            Booking.schedule_id == schedule_id,
            Booking.status_id.in_([1, 2])
        ).scalar()

        available_seats = max(
            0,
            schedule.max_capacity - int(booked_seats or 0)
        )

        if number_of_travelers > available_seats:
            db.session.rollback()
            return jsonify({
                "error": "Not enough seats available",
                "available_seats": available_seats,
                "requested_seats": number_of_travelers
            }), 409

        # 9. Retrieve the pending booking status
        pending_status = db.session.get(BookingStatus, 1)

        if not pending_status:
            current_app.logger.error(
                "Pending booking status ID 1 was not found"
            )
            return jsonify({
                "error": "Pending booking status is not configured"
            }), 500

        # 10. Calculate the booking price on the backend
        unit_price = Decimal(str(package.base_price))
        subtotal = unit_price * number_of_travelers
        discount_amount = Decimal("0.00")
        tax_amount = Decimal("0.00")
        total_amount = subtotal - discount_amount + tax_amount

        # 11. Create the booking.
        # Never accept the booking reference, customer ID, status,
        # or price from the frontend.
        booking = Booking(
            booking_reference=f"BK-{uuid.uuid4().hex[:12].upper()}",
            customer_id=customer.customer_id,
            package_id=package.package_id,
            schedule_id=schedule.schedule_id,
            travel_date=departure.date(),
            number_of_travelers=number_of_travelers,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            status_id=pending_status.status_id,
            special_request=data.get("special_request"),
            created_by=user.user_id,
        )

        db.session.add(booking)
        db.session.commit()

        # 12. Return the saved booking details
        return jsonify({
            "message": "Booking created successfully",
            "booking_id": booking.booking_id,
            "booking_reference": booking.booking_reference,
            "package_id": booking.package_id,
            "schedule_id": booking.schedule_id,
            "travel_date": (
                booking.travel_date.isoformat()
                if booking.travel_date else None
            ),
            "number_of_travelers": booking.number_of_travelers,
            "subtotal": str(booking.subtotal),
            "total_amount": str(booking.total_amount),
            "status_id": booking.status_id,
            "status_name": pending_status.status_name,
        }), 201

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Booking creation failed")
        return jsonify({
            "error": "Could not create booking"
        }), 500


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