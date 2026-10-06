from flask import Blueprint, jsonify

from models import TourPackage


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
