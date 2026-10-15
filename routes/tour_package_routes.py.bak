from flask import Blueprint, jsonify, request
from datetime import datetime

from models import TourPackage
from extensions import db

tour_package_bp = Blueprint(
    "tour_package",
    __name__,
    url_prefix="/api/packages"
)


@tour_package_bp.route("/", methods=["GET"])
def get_packages():
    packages = TourPackage.query.all()

    return jsonify([
        {
            "package_id": package.package_id,
            "package_code": package.package_code,
            "package_name": package.package_name,
            "description": package.description,
            "duration_days": package.duration_days,
            "duration_nights": package.duration_nights,
            "base_price": float(package.base_price),
            "max_capacity": package.max_capacity,
            "min_travelers": package.min_travelers,
            "package_status": package.package_status
        }
        for package in packages
    ])


@tour_package_bp.route("/<int:package_id>", methods=["GET"])
def get_package(package_id):
    package = TourPackage.query.get_or_404(package_id)

    return jsonify({
        "package_id": package.package_id,
        "package_code": package.package_code,
        "package_name": package.package_name,
        "description": package.description,
        "duration_days": package.duration_days,
        "duration_nights": package.duration_nights,
        "base_price": float(package.base_price),
        "max_capacity": package.max_capacity,
        "min_travelers": package.min_travelers,
        "package_status": package.package_status
    })


@tour_package_bp.route("/", methods=["POST"])
def create_package():

    
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    required_fields = [
        "package_code",
        "package_name",
        "duration_days",
        "duration_nights",
        "base_price",
        "max_capacity",
        "created_by"
    ]

    for field in required_fields:
        if field not in data or data[field] is None:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        package = TourPackage(
            package_code=data["package_code"],
            package_name=data["package_name"],
            description=data.get("description"),
            duration_days=data["duration_days"],
            duration_nights=data["duration_nights"],
            base_price=data["base_price"],
            max_capacity=data["max_capacity"],
            min_travelers=data.get("min_travelers", 1),
            package_status=data.get("package_status", "DRAFT"),
            created_by=data["created_by"],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        db.session.add(package)
        db.session.commit()

        return jsonify({
            "message": "Package created successfully",
            "package_id": package.package_id,
            "package_code": package.package_code
        }), 201



    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Package creation failed. Check the supplied values and database constraints."
        }), 400

    
@tour_package_bp.route("/<int:package_id>", methods=["PUT"])
def update_package(package_id):
    package = TourPackage.query.get_or_404(package_id)
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    allowed_fields = [
        "package_code",
        "package_name",
        "description",
        "duration_days",
        "duration_nights",
        "base_price",
        "max_capacity",
        "min_travelers",
        "package_status"
    ]

    for field in allowed_fields:
        if field in data:
            setattr(package, field, data[field])

    package.updated_at = datetime.now()

    try:
        db.session.commit()
        return jsonify({
            "message": "Package updated successfully",
            "package_id": package.package_id,
            "package_code": package.package_code
        })
    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Package update failed. Check values and database constraints."
        }), 400



@tour_package_bp.route("/<int:package_id>", methods=["DELETE"])
def delete_package(package_id):
    package = TourPackage.query.get_or_404(package_id)

    try:
        db.session.delete(package)
        db.session.commit()

        return jsonify({
            "message": "Package deleted successfully",
            "package_id": package_id
        })

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Package cannot be deleted. It may be referenced by bookings or other records."
        }), 409
