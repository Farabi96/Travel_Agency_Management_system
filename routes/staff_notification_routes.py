
from datetime import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from models import StaffNotification
from extensions import db
from auth_utils import get_current_user, role_required


staff_notification_bp = Blueprint(
    "staff_notification",
    __name__,
    url_prefix="/api/staff-notifications",
)


def serialize_staff_notification(notification):
    return {
        "notification_id": notification.notification_id,
        "title": notification.title,
        "content": notification.content,
        "notification_type": notification.notification_type,
        "related_booking_id": notification.related_booking_id,
        "related_payment_id": notification.related_payment_id,
        "is_read": notification.is_read,
        "read_at": (
            notification.read_at.isoformat()
            if notification.read_at else None
        ),
        "created_at": (
            notification.created_at.isoformat()
            if notification.created_at else None
        ),
    }


@staff_notification_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def get_staff_notifications():
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    notifications = StaffNotification.query.filter_by(
        recipient_user_id=user.user_id
    ).order_by(
        StaffNotification.created_at.desc()
    ).all()

    return jsonify([
        serialize_staff_notification(notification)
        for notification in notifications
    ]), 200


@staff_notification_bp.route("/unread-count", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def get_staff_unread_count():
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    count = StaffNotification.query.filter_by(
        recipient_user_id=user.user_id,
        is_read=False,
    ).count()

    return jsonify({"unread_count": count}), 200


@staff_notification_bp.route(
    "/<int:notification_id>/read",
    methods=["PUT"],
)
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def mark_staff_notification_read(notification_id):
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    notification = StaffNotification.query.filter_by(
        notification_id=notification_id,
        recipient_user_id=user.user_id,
    ).first()

    if not notification:
        return jsonify({"error": "Notification not found"}), 404

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.session.commit()

    return jsonify({
        "message": "Notification marked as read",
        "notification_id": notification.notification_id,
        "is_read": notification.is_read,
    }), 200




@staff_notification_bp.route("/read-all", methods=["PUT"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def mark_all_staff_notifications_read():
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        StaffNotification.query.filter_by(
            recipient_user_id=user.user_id,
            is_read=False,
        ).update(
            {
                StaffNotification.is_read: True,
                StaffNotification.read_at: datetime.utcnow(),
            },
            synchronize_session=False,
        )

        db.session.commit()

        return jsonify({
            "message": "All notifications marked as read",
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Could not mark notifications as read",
        }), 500
