from datetime import date

from flask import Blueprint, jsonify, request

from models import (
    Booking,
    BookingTraveler,
    BookingStatus,
    BookingStatusHistory
)
from extensions import db


booking_bp = Blueprint(
    "booking",
    __name__,
    url_prefix="/api/bookings"
)


# =========================
# GET ALL BOOKINGS
# =========================

@booking_bp.route("/", methods=["GET"])
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


# =========================
# GET SINGLE BOOKING
# =========================

@booking_bp.route("/<int:booking_id>", methods=["GET"])
def get_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)

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


# =========================
# CREATE BOOKING
# =========================

@booking_bp.route("/", methods=["POST"])
def create_booking():
    data = request.get_json()

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
            return jsonify({
                "error": f"Missing field: {field}"
            }), 400

    try:
        booking = Booking(
            booking_reference=data["booking_reference"],
            customer_id=data["customer_id"],
            package_id=data["package_id"],
            travel_date=date.fromisoformat(data["travel_date"]),
            number_of_travelers=data["number_of_travelers"],
            subtotal=data["subtotal"],
            discount_amount=data.get("discount_amount", 0),
            tax_amount=data.get("tax_amount", 0),
            total_amount=data["total_amount"],
            status_id=data["status_id"],
            special_request=data.get("special_request"),
            created_by=data.get("created_by")
        )

        db.session.add(booking)
        db.session.commit()

        return jsonify({
            "message": "Booking created successfully",
            "booking_id": booking.booking_id,
            "booking_reference": booking.booking_reference
        }), 201

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================
# GET BOOKING TRAVELERS
# =========================

@booking_bp.route("/<int:booking_id>/travelers", methods=["GET"])
def get_booking_travelers(booking_id):

    Booking.query.get_or_404(booking_id)

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


# =========================
# ADD BOOKING TRAVELER
# =========================

@booking_bp.route("/<int:booking_id>/travelers", methods=["POST"])
def create_booking_traveler(booking_id):

    Booking.query.get_or_404(booking_id)

    data = request.get_json()

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

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================
# GET ALL BOOKING STATUSES
# =========================

@booking_bp.route("/statuses", methods=["GET"])
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


# =========================
# UPDATE BOOKING STATUS
# =========================

@booking_bp.route("/<int:booking_id>/status", methods=["PUT"])
def update_booking_status(booking_id):

    booking = Booking.query.get_or_404(booking_id)

    data = request.get_json()

    if not data or "status_id" not in data:
        return jsonify({
            "error": "status_id is required"
        }), 400

    new_status_id = data["status_id"]

    status = BookingStatus.query.get(new_status_id)

    if not status:
        return jsonify({
            "error": "Invalid status_id"
        }), 400

    old_status_id = booking.status_id

    if old_status_id == new_status_id:
        return jsonify({
            "error": "Booking already has this status"
        }), 400

    try:
        history = BookingStatusHistory(
            booking_id=booking.booking_id,
            old_status_id=old_status_id,
            new_status_id=new_status_id,
            changed_by=data.get("changed_by"),
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

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================
# GET BOOKING STATUS HISTORY
# =========================

@booking_bp.route("/<int:booking_id>/status-history", methods=["GET"])
def get_booking_status_history(booking_id):

    Booking.query.get_or_404(booking_id)

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
