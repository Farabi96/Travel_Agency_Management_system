from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from auth_utils import role_required, permission_required


admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin"
)


@admin_bp.route("/test", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def admin_test():

    return jsonify({
        "message": "HIGHER_ADMIN access granted"
    })


@admin_bp.route("/permission-test", methods=["GET"])
@jwt_required()
@permission_required("MANAGE_SYSTEM")
def permission_test():

    return jsonify({
        "message": "MANAGE_SYSTEM permission granted"
    })
