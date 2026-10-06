from datetime import date

from flask import Blueprint, jsonify, request

from models import Booking, BookingTraveler
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
