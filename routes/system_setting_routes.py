from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import SystemSetting
from auth_utils import get_current_user, role_required


system_setting_bp = Blueprint(
    "system_setting",
    __name__,
    url_prefix="/api/settings"
)


@system_setting_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_settings():
    settings = SystemSetting.query.order_by(
        SystemSetting.setting_id.asc()
    ).all()

    return jsonify([
        {
            "setting_id": setting.setting_id,
            "setting_key": setting.setting_key,
            "setting_value": setting.setting_value,
            "description": setting.description,
            "updated_by": setting.updated_by,
            "updated_at": setting.updated_at.isoformat()
            if setting.updated_at else None
        }
        for setting in settings
    ]), 200


@system_setting_bp.route("/<string:setting_key>", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def get_setting(setting_key):
    setting = SystemSetting.query.filter_by(
        setting_key=setting_key
    ).first()

    if not setting:
        return jsonify({
            "error": "System setting not found"
        }), 404

    return jsonify({
        "setting_id": setting.setting_id,
        "setting_key": setting.setting_key,
        "setting_value": setting.setting_value,
        "description": setting.description,
        "updated_by": setting.updated_by,
        "updated_at": setting.updated_at.isoformat()
        if setting.updated_at else None
    }), 200


@system_setting_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def create_setting():
    data = request.get_json() or {}

    setting_key = data.get("setting_key")
    setting_value = data.get("setting_value")
    description = data.get("description")

    if not setting_key:
        return jsonify({
            "error": "setting_key is required"
        }), 400

    existing_setting = SystemSetting.query.filter_by(
        setting_key=setting_key
    ).first()

    if existing_setting:
        return jsonify({
            "error": "A setting with this key already exists"
        }), 409

    user = get_current_user()

    setting = SystemSetting(
        setting_key=setting_key,
        setting_value=setting_value,
        description=description,
        updated_by=user.user_id if user else None
    )

    db.session.add(setting)
    db.session.commit()

    return jsonify({
        "message": "System setting created successfully",
        "setting": {
            "setting_id": setting.setting_id,
            "setting_key": setting.setting_key,
            "setting_value": setting.setting_value,
            "description": setting.description,
            "updated_by": setting.updated_by,
            "updated_at": setting.updated_at.isoformat()
            if setting.updated_at else None
        }
    }), 201


@system_setting_bp.route("/<string:setting_key>", methods=["PUT"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def update_setting(setting_key):
    setting = SystemSetting.query.filter_by(
        setting_key=setting_key
    ).first()

    if not setting:
        return jsonify({
            "error": "System setting not found"
        }), 404

    data = request.get_json() or {}

    if "setting_value" in data:
        setting.setting_value = data["setting_value"]

    if "description" in data:
        setting.description = data["description"]

    user = get_current_user()

    setting.updated_by = user.user_id if user else None

    db.session.commit()

    return jsonify({
        "message": "System setting updated successfully",
        "setting": {
            "setting_id": setting.setting_id,
            "setting_key": setting.setting_key,
            "setting_value": setting.setting_value,
            "description": setting.description,
            "updated_by": setting.updated_by,
            "updated_at": setting.updated_at.isoformat()
            if setting.updated_at else None
        }
    }), 200


@system_setting_bp.route("/<string:setting_key>", methods=["DELETE"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def delete_setting(setting_key):
    setting = SystemSetting.query.filter_by(
        setting_key=setting_key
    ).first()

    if not setting:
        return jsonify({
            "error": "System setting not found"
        }), 404

    db.session.delete(setting)
    db.session.commit()

    return jsonify({
        "message": "System setting deleted successfully"
    }), 200
