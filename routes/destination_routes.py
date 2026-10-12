 
from flask import Blueprint, jsonify, request
from models import Destination
from extensions import db


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
        "latitude": float(destination.latitude) if destination.latitude is not None else None,
        "longitude": float(destination.longitude) if destination.longitude is not None else None,
        "image_url": destination.image_url,
        "status": destination.status
    }


@destination_bp.route("/", methods=["GET"])
def get_destinations():
    destinations = Destination.query.all()
    return jsonify([serialize_destination(d) for d in destinations])


@destination_bp.route("/", methods=["POST"])
def create_destination():
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
            status=data.get("status", "ACTIVE")
        )

        db.session.add(destination)
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
def update_destination(destination_id):
    destination = Destination.query.get_or_404(destination_id)
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    allowed_fields = [
        "name", "division", "district", "upazila",
        "description", "latitude", "longitude",
        "image_url", "status"
    ]

    for field in allowed_fields:
        if field in data:
            setattr(destination, field, data[field])

    try:
        db.session.commit()
        return jsonify({
            "message": "Destination updated successfully",
            "destination": serialize_destination(destination)
        })

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Destination update failed. Check supplied values and database constraints."
        }), 400
