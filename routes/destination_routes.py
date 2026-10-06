from flask import Blueprint, jsonify

from models import Destination


destination_bp = Blueprint(
    "destination",
    __name__,
    url_prefix="/api/destinations"
)


@destination_bp.route("/", methods=["GET"])
def get_destinations():
    destinations = Destination.query.all()

    return jsonify([
        {
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
        for destination in destinations
    ])
