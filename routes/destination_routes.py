
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models import Destination
from extensions import db
from auth_utils import get_current_user, role_required
from backend.utils.audit_logger import log_activity


destination_bp = Blueprint(
    "destination",
    __name__,
    url_prefix="/api/destinations"
)


def serialize_destination(destination):
    return {
        "destination_id": destination.destination_id,
        "name": destination.name,
        "division": destination.division,
        "district": destination.district,
        "upazila": destination.upazila,
        "description": destination.description,
        "latitude": (
            float(destination.latitude)
            if destination.latitude is not None else None
        ),
        "longitude": (
            float(destination.longitude)
            if destination.longitude is not None else None
        ),
        "image_url": destination.image_url,
        "status": destination.status,
        "created_by": destination.created_by
    }


def destination_access_allowed(destination, user):
    if not user or not user.role:
        return False

    if user.role.role_name == "HIGHER_ADMIN":
        return True

    if user.role.role_name == "STAFF":
        return destination.created_by == user.user_id

    return False


@destination_bp.route("/", methods=["GET"])
def get_destinations():
    destinations = Destination.query.all()
    return jsonify([serialize_destination(d) for d in destinations])


@destination_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def create_destination():
    user = get_current_user()

    if not user:
        return jsonify({"error": "Active user not found"}), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    required_fields = ["name", "division", "district"]

    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        destination = Destination(
            name=data["name"],
            division=data["division"],
            district=data["district"],
            upazila=data.get("upazila"),
            description=data.get("description"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            image_url=data.get("image_url"),
            status=data.get("status", "ACTIVE"),
            created_by=user.user_id
        )

        db.session.add(destination)
        db.session.flush()

        # Record destination creation.
        log_activity(
            action="DESTINATION_CREATED",
            table_name="destinations",
            record_id=destination.destination_id,
            new_values={
                "name": destination.name,
                "division": destination.division,
                "district": destination.district,
                "status": destination.status,
            },
        )

        db.session.commit()

        return jsonify({
            "message": "Destination created successfully",
            "destination": serialize_destination(destination)
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Destination creation failed. Check supplied values and database constraints."
        }), 400


@destination_bp.route("/<int:destination_id>", methods=["PUT"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def update_destination(destination_id):
    destination = Destination.query.get_or_404(destination_id)
    user = get_current_user()

    if not destination_access_allowed(destination, user):
        return jsonify({
            "error": "You can only edit destinations you created"
        }), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    allowed_fields = [
        "name",
        "division",
        "district",
        "upazila",
        "description",
        "latitude",
        "longitude",
        "image_url",
        "status"
    ]

    # Capture existing values before applying updates.
    old_values = {
        field: (
            float(getattr(destination, field))
            if field in ["latitude", "longitude"]
            and getattr(destination, field) is not None
            else getattr(destination, field)
        )
        for field in allowed_fields
    }

    for field in allowed_fields:
        if field in data:
            setattr(destination, field, data[field])

    try:
        log_activity(
            action="DESTINATION_UPDATED",
            table_name="destinations",
            record_id=destination.destination_id,
            old_values=old_values,
            new_values={
                field: (
                    float(getattr(destination, field))
                    if field in ["latitude", "longitude"]
                    and getattr(destination, field) is not None
                    else getattr(destination, field)
                )
                for field in allowed_fields
            },
        )

        db.session.commit()

        return jsonify({
            "message": "Destination updated successfully",
            "destination": serialize_destination(destination)
        })

    except Exception as e:
        db.session.rollback()

        print("DESTINATION UPDATE ERROR:", repr(e))

        return jsonify({
            "error": "Destination update failed."
        }), 400

@destination_bp.route("/<int:destination_id>", methods=["DELETE"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def delete_destination(destination_id):
    destination = Destination.query.get_or_404(destination_id)
    user = get_current_user()

    if not destination_access_allowed(destination, user):
        return jsonify({
            "error": "You can only delete destinations you created"
        }), 403

    try:
        # Save destination details before deletion.
        old_values = {
            "name": destination.name,
            "division": destination.division,
            "district": destination.district,
            "status": destination.status,
        }

        # Record destination deletion before removing the record.
        log_activity(
            action="DESTINATION_DELETED",
            table_name="destinations",
            record_id=destination.destination_id,
            old_values=old_values,
        )

        db.session.delete(destination)
        db.session.commit()

        return jsonify({
            "message": "Destination deleted successfully",
            "destination_id": destination_id
        })

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Destination cannot be deleted. It may be referenced by tour packages."
        }), 409
