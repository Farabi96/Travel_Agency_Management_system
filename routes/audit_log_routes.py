from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import AuditLog
from auth_utils import get_current_user, role_required


audit_log_bp = Blueprint(
    "audit_log",
    __name__,
    url_prefix="/api/audit-logs"
)


@audit_log_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def get_audit_logs():
    logs = AuditLog.query.order_by(
        AuditLog.created_at.desc()
    ).all()

    return jsonify([
        {
            "log_id": log.log_id,
            "user_id": log.user_id,
            "action": log.action,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat()
            if log.created_at else None
        }
        for log in logs
    ]), 200


@audit_log_bp.route("/<int:log_id>", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def get_audit_log(log_id):
    log = db.session.get(AuditLog, log_id)

    if not log:
        return jsonify({
            "error": "Audit log not found"
        }), 404

    return jsonify({
        "log_id": log.log_id,
        "user_id": log.user_id,
        "action": log.action,
        "table_name": log.table_name,
        "record_id": log.record_id,
        "old_values": log.old_values,
        "new_values": log.new_values,
        "ip_address": log.ip_address,
        "created_at": log.created_at.isoformat()
        if log.created_at else None
    }), 200


@audit_log_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def create_audit_log():
    data = request.get_json() or {}

    action = data.get("action")
    table_name = data.get("table_name")

    if not action:
        return jsonify({
            "error": "action is required"
        }), 400

    if not table_name:
        return jsonify({
            "error": "table_name is required"
        }), 400

    user = get_current_user()

    record_id = data.get("record_id")
    old_values = data.get("old_values")
    new_values = data.get("new_values")

    log = AuditLog(
        user_id=user.user_id if user else None,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=request.remote_addr
    )

    db.session.add(log)
    db.session.commit()

    return jsonify({
        "message": "Audit log created successfully",
        "audit_log": {
            "log_id": log.log_id,
            "user_id": log.user_id,
            "action": log.action,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat()
            if log.created_at else None
        }
    }), 201


@audit_log_bp.route("/<int:log_id>", methods=["DELETE"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def delete_audit_log(log_id):
    log = db.session.get(AuditLog, log_id)

    if not log:
        return jsonify({
            "error": "Audit log not found"
        }), 404

    db.session.delete(log)
    db.session.commit()

    return jsonify({
        "message": "Audit log deleted successfully"
    }), 200
