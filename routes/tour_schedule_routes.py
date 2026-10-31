
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import TourPackage, TourSchedule, Booking
from auth_utils import get_current_user, role_required
from routes.tour_package_routes import package_access_allowed


tour_schedule_bp = Blueprint(
    "tour_schedule",
    __name__,
    url_prefix="/api/schedules"
)

VALID_STATUSES = {
    "SCHEDULED",
    "FULL",
    "CANCELLED",
    "COMPLETED"
}


def serialize_schedule(schedule):
    return {
        "schedule_id": schedule.schedule_id,
        "package_id": schedule.package_id,
        "package_name": schedule.package.package_name,
        "departure_datetime": schedule.departure_datetime.isoformat(),
        "return_datetime": schedule.return_datetime.isoformat(),
        "max_capacity": schedule.max_capacity,
        "schedule_status": schedule.schedule_status,
        "created_at": (
            schedule.created_at.isoformat()
            if schedule.created_at else None
        )
    }


def parse_datetime(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("A valid ISO date/time is required")

    try:
        return datetime.fromisoformat(value)
    except ValueError:
        raise ValueError(
            "Use ISO format, for example 2026-11-20T08:00:00"
        )


def get_manageable_package(package_id, user):
    package = db.session.get(TourPackage, package_id)

    if not package:
        return None, (jsonify({"error": "Package not found"}), 404)

    if not package_access_allowed(package, user):
        return None, (
            jsonify({"error": "You can only manage schedules for packages you created"}),
            403
        )

    return package, None


@tour_schedule_bp.route("/", methods=["GET"])
def list_schedules():
    query = TourSchedule.query

    package_id = request.args.get("package_id", type=int)
    if package_id is not None:
        query = query.filter_by(package_id=package_id)

    schedules = query.order_by(
        TourSchedule.departure_datetime.asc()
    ).all()

    return jsonify([serialize_schedule(item) for item in schedules]), 200


@tour_schedule_bp.route("/<int:schedule_id>", methods=["GET"])
def get_schedule(schedule_id):
    schedule = db.session.get(TourSchedule, schedule_id)

    if not schedule:
        return jsonify({"error": "Schedule not found"}), 404

    return jsonify(serialize_schedule(schedule)), 200


@tour_schedule_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def create_schedule():
    user = get_current_user()
    data = request.get_json(silent=True) or {}

    try:
        package_id = int(data.get("package_id"))
        max_capacity = int(data.get("max_capacity"))

        departure = parse_datetime(data.get("departure_datetime"))
        return_time = parse_datetime(data.get("return_datetime"))
    except (TypeError, ValueError):
        return jsonify({
            "error": "Provide a valid package_id, positive max_capacity, "
                     "departure_datetime, and return_datetime"
        }), 400

    if max_capacity <= 0:
        return jsonify({"error": "max_capacity must be greater than zero"}), 400

    if return_time <= departure:
        return jsonify({
            "error": "return_datetime must be later than departure_datetime"
        }), 400

    package = db.session.get(TourPackage, package_id)

    if not package:
       return jsonify({"error": "Package not found"}), 404

    schedule = TourSchedule(
        package_id=package.package_id,
        departure_datetime=departure,
        return_datetime=return_time,
        max_capacity=max_capacity,
        schedule_status="SCHEDULED"
    )

    try:
        db.session.add(schedule)
        db.session.commit()
        return jsonify(serialize_schedule(schedule)), 201
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Could not create schedule"}), 500


@tour_schedule_bp.route("/<int:schedule_id>", methods=["PUT"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def update_schedule(schedule_id):
    user = get_current_user()
    schedule = db.session.get(TourSchedule, schedule_id)

    if not schedule:
        return jsonify({"error": "Schedule not found"}), 404

    package, error = get_manageable_package(schedule.package_id, user)
    if error:
        return error

    data = request.get_json(silent=True) or {}

    departure = schedule.departure_datetime
    return_time = schedule.return_datetime
    max_capacity = schedule.max_capacity
    status = schedule.schedule_status

    try:
        if "departure_datetime" in data:
            departure = parse_datetime(data["departure_datetime"])

        if "return_datetime" in data:
            return_time = parse_datetime(data["return_datetime"])

        if "max_capacity" in data:
            max_capacity = int(data["max_capacity"])
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid date/time or max_capacity"}), 400

    if max_capacity <= 0:
        return jsonify({"error": "max_capacity must be greater than zero"}), 400

    if return_time <= departure:
        return jsonify({
            "error": "return_datetime must be later than departure_datetime"
        }), 400

    if "schedule_status" in data:
        status = str(data["schedule_status"]).upper()
        if status not in VALID_STATUSES:
            return jsonify({"error": "Invalid schedule_status"}), 400

    # Do not reduce capacity below the number of travelers already booked.
        booked_result = db.session.query(
        db.func.coalesce(
            db.func.sum(Booking.number_of_travelers), 0
        )
    ).filter(
        Booking.schedule_id == schedule_id,
        Booking.status_id.in_([1, 2])
    ).scalar()

    if max_capacity < int(booked_result or 0):
        return jsonify({
            "error": "Capacity cannot be lower than already booked travelers"
        }), 400

    schedule.departure_datetime = departure
    schedule.return_datetime = return_time
    schedule.max_capacity = max_capacity
    schedule.schedule_status = status

    try:
        db.session.commit()
        return jsonify(serialize_schedule(schedule)), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Could not update schedule"}), 500


@tour_schedule_bp.route("/<int:schedule_id>", methods=["DELETE"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def cancel_schedule(schedule_id):
    user = get_current_user()
    schedule = db.session.get(TourSchedule, schedule_id)

    if not schedule:
        return jsonify({"error": "Schedule not found"}), 404

    package, error = get_manageable_package(schedule.package_id, user)
    if error:
        return error

    # Preserve bookings: cancel the schedule instead of deleting its record.
    schedule.schedule_status = "CANCELLED"

    try:
        db.session.commit()
        return jsonify({
            "message": "Schedule cancelled successfully",
            "schedule_id": schedule.schedule_id,
            "schedule_status": schedule.schedule_status
        }), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Could not cancel schedule"}), 500



@tour_schedule_bp.route("/<int:schedule_id>/availability", methods=["GET"])
def get_schedule_availability(schedule_id):
    schedule = db.session.get(TourSchedule, schedule_id)

    if not schedule:
        return jsonify({"error": "Schedule not found"}), 404

    # PENDING and CONFIRMED bookings reserve seats.
    booked_result = db.session.query(
        db.func.coalesce(
            db.func.sum(Booking.number_of_travelers), 0
        )
    ).filter(
        Booking.schedule_id == schedule_id,
        Booking.status_id.in_([1, 2])
    ).scalar()

    booked_seats = int(booked_result or 0)
    available_seats = max(0, schedule.max_capacity - booked_seats)

    return jsonify({
        "schedule_id": schedule.schedule_id,
        "package_id": schedule.package_id,
        "departure_datetime": schedule.departure_datetime.isoformat(),
        "return_datetime": schedule.return_datetime.isoformat(),
        "max_capacity": schedule.max_capacity,
        "booked_seats": booked_seats,
        "available_seats": available_seats,
        "schedule_status": schedule.schedule_status,
        "is_bookable": (
            schedule.schedule_status == "SCHEDULED"
            and available_seats > 0
        )
    }), 200
