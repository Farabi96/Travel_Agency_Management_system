from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import Favorite, Customer, TourPackage
from auth_utils import get_current_user, role_required


favorite_bp = Blueprint(
    "favorite",
    __name__,
    url_prefix="/api/favorites"
)


@favorite_bp.route("/", methods=["GET"])
@jwt_required()
def get_favorites():
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role.role_name in ("HIGHER_ADMIN", "STAFF"):
        favorites = Favorite.query.order_by(
            Favorite.created_at.desc()
        ).all()
    else:
        if not user.customer:
            return jsonify({"error": "Customer profile not found"}), 404

        favorites = Favorite.query.filter_by(
            customer_id=user.customer.customer_id
        ).order_by(
            Favorite.created_at.desc()
        ).all()

    return jsonify([
        {
            "favorite_id": favorite.favorite_id,
            "customer_id": favorite.customer_id,
            "package_id": favorite.package_id,
            "package_name": favorite.package.package_name,
            "created_at": favorite.created_at.isoformat()
            if favorite.created_at else None
        }
        for favorite in favorites
    ]), 200


@favorite_bp.route("/<int:favorite_id>", methods=["GET"])
@jwt_required()
def get_favorite(favorite_id):
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    favorite = db.session.get(Favorite, favorite_id)

    if not favorite:
        return jsonify({"error": "Favorite not found"}), 404

    if user.role.role_name not in ("HIGHER_ADMIN", "STAFF"):
        if not user.customer:
            return jsonify({"error": "Customer profile not found"}), 404

        if favorite.customer_id != user.customer.customer_id:
            return jsonify({"error": "You do not have access to this favorite"}), 403

    return jsonify({
        "favorite_id": favorite.favorite_id,
        "customer_id": favorite.customer_id,
        "package_id": favorite.package_id,
        "package_name": favorite.package.package_name,
        "created_at": favorite.created_at.isoformat()
        if favorite.created_at else None
    }), 200


@favorite_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("CUSTOMER")
def add_favorite():
    user = get_current_user()

    if not user.customer:
        return jsonify({"error": "Customer profile not found"}), 404

    data = request.get_json() or {}

    package_id = data.get("package_id")

    if not package_id:
        return jsonify({
            "error": "package_id is required"
        }), 400

    package = db.session.get(TourPackage, package_id)

    if not package:
        return jsonify({
            "error": "Tour package not found"
        }), 404

    customer_id = user.customer.customer_id

    existing_favorite = Favorite.query.filter_by(
        customer_id=customer_id,
        package_id=package_id
    ).first()

    if existing_favorite:
        return jsonify({
            "error": "Package is already in your favorites",
            "favorite_id": existing_favorite.favorite_id
        }), 409

    favorite = Favorite(
        customer_id=customer_id,
        package_id=package_id
    )

    db.session.add(favorite)
    db.session.commit()

    return jsonify({
        "message": "Package added to favorites",
        "favorite": {
            "favorite_id": favorite.favorite_id,
            "customer_id": favorite.customer_id,
            "package_id": favorite.package_id,
            "package_name": package.package_name,
            "created_at": favorite.created_at.isoformat()
            if favorite.created_at else None
        }
    }), 201


@favorite_bp.route("/<int:favorite_id>", methods=["DELETE"])
@jwt_required()
def delete_favorite(favorite_id):
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    favorite = db.session.get(Favorite, favorite_id)

    if not favorite:
        return jsonify({"error": "Favorite not found"}), 404

    if user.role.role_name not in ("HIGHER_ADMIN", "STAFF"):
        if not user.customer:
            return jsonify({"error": "Customer profile not found"}), 404

        if favorite.customer_id != user.customer.customer_id:
            return jsonify({
                "error": "You do not have permission to remove this favorite"
            }), 403

    db.session.delete(favorite)
    db.session.commit()

    return jsonify({
        "message": "Favorite removed successfully"
    }), 200


@favorite_bp.route("/package/<int:package_id>", methods=["DELETE"])
@jwt_required()
@role_required("CUSTOMER")
def delete_favorite_by_package(package_id):
    user = get_current_user()

    if not user.customer:
        return jsonify({"error": "Customer profile not found"}), 404

    favorite = Favorite.query.filter_by(
        customer_id=user.customer.customer_id,
        package_id=package_id
    ).first()

    if not favorite:
        return jsonify({
            "error": "Package is not in your favorites"
        }), 404

    db.session.delete(favorite)
    db.session.commit()

    return jsonify({
        "message": "Package removed from favorites"
    }), 200
