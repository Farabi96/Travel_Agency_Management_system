 
from flask import Blueprint, jsonify, request
from datetime import datetime
from flask_jwt_extended import jwt_required

from models import TourPackage, Destination, PackageDestination
from extensions import db
from auth_utils import get_current_user, role_required


tour_package_bp = Blueprint(
    "tour_package",
    __name__,
    url_prefix="/api/packages"
)


def package_access_allowed(package, user):
    """Higher Admin can manage all packages; STAFF can manage their own."""
    if not user or not user.role:
        return False

    if user.role.role_name == "HIGHER_ADMIN":
        return True

    if user.role.role_name == "STAFF":
        return package.created_by == user.user_id

    return False


def serialize_package(package):
    ordered_destinations = sorted(
        package.package_destinations,
        key=lambda item: (
            item.visit_order if item.visit_order is not None else 0
        )
    )

    return {
        "package_id": package.package_id,
        "package_code": package.package_code,
        "package_name": package.package_name,
        "description": package.description,
        "duration_days": package.duration_days,
        "duration_nights": package.duration_nights,
        "base_price": float(package.base_price),
        "max_capacity": package.max_capacity,
        "min_travelers": package.min_travelers,
        "package_status": package.package_status,
        "created_by": package.created_by,
        "destinations": [
            {
                "destination_id": item.destination.destination_id,
                "name": item.destination.name,
                "visit_order": item.visit_order,
            }
            for item in ordered_destinations
            if item.destination is not None
        ],
        "destination_ids": [
            item.destination_id for item in ordered_destinations
        ],
    }


def validate_destination_ids(destination_ids):
    """Validate an ordered list of existing destination IDs."""
    if not isinstance(destination_ids, list):
        return None, "destination_ids must be a list"

    if any(
        isinstance(destination_id, bool)
        or not isinstance(destination_id, int)
        for destination_id in destination_ids
    ):
        return None, "Each destination ID must be an integer"

    if len(destination_ids) != len(set(destination_ids)):
        return None, "Duplicate destination IDs are not allowed"

    if destination_ids:
        found_ids = {
            destination.destination_id
            for destination in Destination.query.filter(
                Destination.destination_id.in_(destination_ids)
            ).all()
        }

        missing_ids = set(destination_ids) - found_ids

        if missing_ids:
            return None, "One or more selected destinations do not exist"

    return destination_ids, None


def replace_package_destinations(package, destination_ids):
    """Replace a package's destination list and visit order."""
    PackageDestination.query.filter_by(
        package_id=package.package_id
    ).delete(synchronize_session=False)

    for order, destination_id in enumerate(destination_ids, start=1):
        db.session.add(
            PackageDestination(
                package_id=package.package_id,
                destination_id=destination_id,
                visit_order=order
            )
        )


@tour_package_bp.route("/", methods=["GET"])
def get_packages():
    packages = TourPackage.query.all()
    return jsonify([serialize_package(package) for package in packages])


@tour_package_bp.route("/<int:package_id>", methods=["GET"])
def get_package(package_id):
    package = TourPackage.query.get_or_404(package_id)
    return jsonify(serialize_package(package))


@tour_package_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def create_package():
    user = get_current_user()

    if not user:
        return jsonify({"error": "Active user not found"}), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    required_fields = [
        "package_code",
        "package_name",
        "duration_days",
        "duration_nights",
        "base_price",
        "max_capacity"
    ]

    for field in required_fields:
        if field not in data or data[field] is None:
            return jsonify({"error": f"Missing field: {field}"}), 400

    destination_ids = data.get("destination_ids", [])
    destination_ids, validation_error = validate_destination_ids(
        destination_ids
    )

    if validation_error:
        return jsonify({"error": validation_error}), 400

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
            created_by=user.user_id,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        db.session.add(package)
        db.session.flush()

        replace_package_destinations(package, destination_ids)
        db.session.commit()

        return jsonify({
            "message": "Package created successfully",
            **serialize_package(package)
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": (
                "Package creation failed. Check supplied values "
                "and database constraints."
            )
        }), 400


@tour_package_bp.route("/<int:package_id>", methods=["PUT"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def update_package(package_id):
    package = TourPackage.query.get_or_404(package_id)
    user = get_current_user()

    if not package_access_allowed(package, user):
        return jsonify({
            "error": "You can only edit packages you created"
        }), 403

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

    destination_ids = None

    if "destination_ids" in data:
        destination_ids, validation_error = validate_destination_ids(
            data["destination_ids"]
        )

        if validation_error:
            return jsonify({"error": validation_error}), 400

    try:
        for field in allowed_fields:
            if field in data:
                setattr(package, field, data[field])

        if destination_ids is not None:
            replace_package_destinations(package, destination_ids)

        package.updated_at = datetime.now()
        db.session.commit()

        return jsonify({
            "message": "Package updated successfully",
            **serialize_package(package)
        })

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": (
                "Package update failed. Check supplied values "
                "and database constraints."
            )
        }), 400


@tour_package_bp.route("/<int:package_id>", methods=["DELETE"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def delete_package(package_id):
    package = TourPackage.query.get_or_404(package_id)
    user = get_current_user()

    if not package_access_allowed(package, user):
        return jsonify({
            "error": "You can only delete packages you created"
        }), 403

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
            "error": (
                "Package cannot be deleted. It may be referenced "
                "by bookings or other records."
            )
        }), 409
