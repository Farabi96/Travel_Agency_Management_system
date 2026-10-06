from datetime import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import CustomerNotification
from auth_utils import get_current_user


customer_notification_bp = Blueprint(
    "customer_notification",
    __name__,
    url_prefix="/api/notifications"
)


# GET notifications
# CUSTOMER -> own notifications
# STAFF/HIGHER_ADMIN -> all notifications
@customer_notification_bp.route("/", methods=["GET"])
@jwt_required()
def get_notifications():
    user = get_current_user()

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    if user.role.role_name == "CUSTOMER":

        if not user.customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        notifications = CustomerNotification.query.filter_by(
            customer_id=user.customer.customer_id
        ).order_by(
            CustomerNotification.created_at.desc()
        ).all()

    elif user.role.role_name in ("HIGHER_ADMIN", "STAFF"):

        notifications = CustomerNotification.query.order_by(
            CustomerNotification.created_at.desc()
        ).all()

    else:
        return jsonify({
            "error": "You do not have permission to access this resource"
        }), 403

    return jsonify([
        {
            "notification_id": notification.notification_id,
            "customer_id": notification.customer_id,
            "notice_id": notification.notice_id,
            "is_read": notification.is_read,
            "read_at": notification.read_at.isoformat()
            if notification.read_at else None,
            "created_at": notification.created_at.isoformat()
            if notification.created_at else None
        }
        for notification in notifications
    ])


# GET single notification
@customer_notification_bp.route(
    "/<int:notification_id>",
    methods=["GET"]
)
@jwt_required()
def get_notification(notification_id):
    notification = CustomerNotification.query.get_or_404(
        notification_id
    )

    user = get_current_user()

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    if user.role.role_name == "CUSTOMER":

        if not user.customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        if notification.customer_id != user.customer.customer_id:
            return jsonify({
                "error": "You do not have permission to access this notification"
            }), 403

    elif user.role.role_name not in (
        "HIGHER_ADMIN",
        "STAFF"
    ):
        return jsonify({
            "error": "You do not have permission to access this resource"
        }), 403

    return jsonify({
        "notification_id": notification.notification_id,
        "customer_id": notification.customer_id,
        "notice_id": notification.notice_id,
        "is_read": notification.is_read,
        "read_at": notification.read_at.isoformat()
        if notification.read_at else None,
        "created_at": notification.created_at.isoformat()
        if notification.created_at else None
    })


# MARK AS READ
@customer_notification_bp.route(
    "/<int:notification_id>/read",
    methods=["PUT"]
)
@jwt_required()
def mark_notification_read(notification_id):
    notification = CustomerNotification.query.get_or_404(
        notification_id
    )

    user = get_current_user()

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    if user.role.role_name == "CUSTOMER":

        if not user.customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        if notification.customer_id != user.customer.customer_id:
            return jsonify({
                "error": "You do not have permission to modify this notification"
            }), 403

    elif user.role.role_name not in (
        "HIGHER_ADMIN",
        "STAFF"
    ):
        return jsonify({
            "error": "You do not have permission to access this resource"
        }), 403

    notification.is_read = True
    notification.read_at = datetime.now()

    db.session.commit()

    return jsonify({
        "message": "Notification marked as read"
    })


# MARK AS UNREAD
@customer_notification_bp.route(
    "/<int:notification_id>/unread",
    methods=["PUT"]
)
@jwt_required()
def mark_notification_unread(notification_id):
    notification = CustomerNotification.query.get_or_404(
        notification_id
    )

    user = get_current_user()

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    if user.role.role_name == "CUSTOMER":

        if not user.customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        if notification.customer_id != user.customer.customer_id:
            return jsonify({
                "error": "You do not have permission to modify this notification"
            }), 403

    elif user.role.role_name not in (
        "HIGHER_ADMIN",
        "STAFF"
    ):
        return jsonify({
            "error": "You do not have permission to access this resource"
        }), 403

    notification.is_read = False
    notification.read_at = None

    db.session.commit()

    return jsonify({
        "message": "Notification marked as unread"
    })
