
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import CustomerNotification, Customer, Notice
from auth_utils import get_current_user, role_required


customer_notification_bp = Blueprint(
    "customer_notification",
    __name__,
    url_prefix="/api/notifications"
)


# ---------------------------------------------------------
# HELPER: GET CUSTOMER PROFILE FOR A USER
# ---------------------------------------------------------
def get_customer_for_user(user):
    """Return the customer profile associated with a user."""
    return Customer.query.filter_by(
        user_id=user.user_id
    ).first()


# ---------------------------------------------------------
# HELPER: SERIALIZE A NOTIFICATION
# ---------------------------------------------------------
def serialize_notification(notification):
    """Convert a notification and its related notice to JSON."""
    notice = notification.notice

    return {
        "notification_id": notification.notification_id,
        "customer_id": notification.customer_id,
        "notice_id": notification.notice_id,
        "title": notice.title if notice else None,
        "content": notice.content if notice else None,
        "notice_type": notice.notice_type if notice else None,
        "priority": notice.priority if notice else None,
        "is_read": notification.is_read,
        "read_at": (
            notification.read_at.isoformat()
            if notification.read_at else None
        ),
        "created_at": (
            notification.created_at.isoformat()
            if notification.created_at else None
        )
    }


# ---------------------------------------------------------
# GET ALL NOTIFICATIONS
# CUSTOMER: OWN NOTIFICATIONS
# HIGHER_ADMIN / STAFF: ALL NOTIFICATIONS
# ---------------------------------------------------------
@customer_notification_bp.route("/", methods=["GET"])
@jwt_required()
def get_notifications():
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role.role_name == "CUSTOMER":
        customer = get_customer_for_user(user)

        if not customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        notifications = CustomerNotification.query.filter_by(
            customer_id=customer.customer_id
        ).order_by(
            CustomerNotification.created_at.desc()
        ).all()

    elif user.role.role_name in ("HIGHER_ADMIN", "STAFF"):
        notifications = CustomerNotification.query.order_by(
            CustomerNotification.created_at.desc()
        ).all()

    else:
        return jsonify({"error": "Access denied"}), 403

    return jsonify([
        serialize_notification(notification)
        for notification in notifications
    ]), 200


# ---------------------------------------------------------
# GET SINGLE NOTIFICATION
# ---------------------------------------------------------
@customer_notification_bp.route(
    "/<int:notification_id>",
    methods=["GET"]
)
@jwt_required()
def get_notification(notification_id):
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    notification = CustomerNotification.query.get_or_404(
        notification_id
    )

    if user.role.role_name == "CUSTOMER":
        customer = get_customer_for_user(user)

        if not customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        if notification.customer_id != customer.customer_id:
            return jsonify({"error": "Access denied"}), 403

    elif user.role.role_name not in ("HIGHER_ADMIN", "STAFF"):
        return jsonify({"error": "Access denied"}), 403

    return jsonify(serialize_notification(notification)), 200


# ---------------------------------------------------------
# CREATE CUSTOMER NOTIFICATION
# HIGHER_ADMIN / STAFF ONLY
# ---------------------------------------------------------
@customer_notification_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def create_notification():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    customer_id = data.get("customer_id")
    notice_id = data.get("notice_id")

    if not customer_id:
        return jsonify({
            "error": "customer_id is required"
        }), 400

    if not notice_id:
        return jsonify({
            "error": "notice_id is required"
        }), 400

    customer = db.session.get(Customer, customer_id)

    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    notice = db.session.get(Notice, notice_id)

    if not notice:
        return jsonify({"error": "Notice not found"}), 404

    # Avoid creating duplicate notifications.
    existing_notification = CustomerNotification.query.filter_by(
        customer_id=customer_id,
        notice_id=notice_id
    ).first()

    if existing_notification:
        return jsonify({
            "message": "Notification already exists",
            "notification_id": existing_notification.notification_id
        }), 200

    notification = CustomerNotification(
        customer_id=customer_id,
        notice_id=notice_id,
        is_read=False
    )

    db.session.add(notification)
    db.session.commit()

    return jsonify({
        "message": "Customer notification created successfully",
        "notification_id": notification.notification_id
    }), 201


# ---------------------------------------------------------
# MARK AS READ
# ---------------------------------------------------------
@customer_notification_bp.route(
    "/<int:notification_id>/read",
    methods=["PUT"]
)
@jwt_required()
def mark_notification_read(notification_id):
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    notification = CustomerNotification.query.get_or_404(
        notification_id
    )

    if user.role.role_name == "CUSTOMER":
        customer = get_customer_for_user(user)

        if not customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        if notification.customer_id != customer.customer_id:
            return jsonify({"error": "Access denied"}), 403

    elif user.role.role_name not in ("HIGHER_ADMIN", "STAFF"):
        return jsonify({"error": "Access denied"}), 403

    notification.is_read = True
    notification.read_at = datetime.now()

    db.session.commit()

    return jsonify({
        "message": "Notification marked as read",
        "notification_id": notification.notification_id
    }), 200


# ---------------------------------------------------------
# MARK AS UNREAD
# ---------------------------------------------------------
@customer_notification_bp.route(
    "/<int:notification_id>/unread",
    methods=["PUT"]
)
@jwt_required()
def mark_notification_unread(notification_id):
    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    notification = CustomerNotification.query.get_or_404(
        notification_id
    )

    if user.role.role_name == "CUSTOMER":
        customer = get_customer_for_user(user)

        if not customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        if notification.customer_id != customer.customer_id:
            return jsonify({"error": "Access denied"}), 403

    elif user.role.role_name not in ("HIGHER_ADMIN", "STAFF"):
        return jsonify({"error": "Access denied"}), 403

    notification.is_read = False
    notification.read_at = None

    db.session.commit()

    return jsonify({
        "message": "Notification marked as unread",
        "notification_id": notification.notification_id
    }), 200
