from datetime import date,datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import Notice, Customer, CustomerNotification
from auth_utils import role_required, get_current_user


notice_bp = Blueprint(
    "notice",
    __name__,
    url_prefix="/api/notices"
)

def distribute_notice_notifications(notice):
    """Create notifications for customers when a notice is publishable."""

    if (
        notice.status != "PUBLISHED"
        or not notice.publish_date
        or notice.publish_date > date.today()
    ):
        return 0

    customers = Customer.query.with_entities(
        Customer.customer_id
    ).all()

    created_count = 0

    for (customer_id,) in customers:
        existing_notification = CustomerNotification.query.filter_by(
            customer_id=customer_id,
            notice_id=notice.notice_id
        ).first()

        if existing_notification:
            continue

        notification = CustomerNotification(
            customer_id=customer_id,
            notice_id=notice.notice_id,
            is_read=False
        )

        db.session.add(notification)
        created_count += 1

    return created_count


# GET all notices
# HIGHER_ADMIN and STAFF
@notice_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def get_all_notices():
    notices = Notice.query.order_by(
        Notice.publish_date.desc(),
        Notice.notice_id.desc()
    ).all()

    return jsonify([
        {
            "notice_id": notice.notice_id,
            "title": notice.title,
            "content": notice.content,
            "notice_type": notice.notice_type,
            "priority": notice.priority,
            "created_by": notice.created_by,
            "publish_date": notice.publish_date.isoformat()
            if notice.publish_date else None,
            "expiry_date": notice.expiry_date.isoformat()
            if notice.expiry_date else None,
            "status": notice.status,
            "created_at": notice.created_at.isoformat()
            if notice.created_at else None,
            "updated_at": notice.updated_at.isoformat()
            if notice.updated_at else None
        }
        for notice in notices
    ])


# GET active notices
# Public/customer-friendly endpoint
@notice_bp.route("/active", methods=["GET"])
def get_active_notices():
    today = date.today()

    notices = Notice.query.filter(
        Notice.status == "PUBLISHED",
        Notice.publish_date <= today,
        db.or_(
            Notice.expiry_date.is_(None),
            Notice.expiry_date >= today
        )
    ).order_by(
        Notice.priority.desc(),
        Notice.publish_date.desc()
    ).all()

    return jsonify([
        {
            "notice_id": notice.notice_id,
            "title": notice.title,
            "content": notice.content,
            "notice_type": notice.notice_type,
            "priority": notice.priority,
            "publish_date": notice.publish_date.isoformat()
            if notice.publish_date else None,
            "expiry_date": notice.expiry_date.isoformat()
            if notice.expiry_date else None
        }
        for notice in notices
    ])


# GET single notice
@notice_bp.route("/<int:notice_id>", methods=["GET"])
@jwt_required()
def get_notice(notice_id):
    notice = Notice.query.get_or_404(notice_id)

    user = get_current_user()

    # Customers can only see published notices
    if user.role.role_name == "CUSTOMER":
        today = date.today()

        if (
            notice.status != "PUBLISHED"
            or not notice.publish_date
            or notice.publish_date > today
            or (
                notice.expiry_date
                and notice.expiry_date < today
            )
        ):
            return jsonify({"error": "Notice not available"}), 404

    return jsonify({
        "notice_id": notice.notice_id,
        "title": notice.title,
        "content": notice.content,
        "notice_type": notice.notice_type,
        "priority": notice.priority,
        "created_by": notice.created_by,
        "publish_date": notice.publish_date.isoformat()
        if notice.publish_date else None,
        "expiry_date": notice.expiry_date.isoformat()
        if notice.expiry_date else None,
        "status": notice.status,
        "created_at": notice.created_at.isoformat()
        if notice.created_at else None,
        "updated_at": notice.updated_at.isoformat()
        if notice.updated_at else None
    })


# CREATE notice 
@notice_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def create_notice():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    if not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    if not data.get("content"):
        return jsonify({"error": "Content is required"}), 400

    priority = data.get("priority", "NORMAL").upper()

    allowed_priorities = ["LOW", "NORMAL", "HIGH", "URGENT"]

    if priority not in allowed_priorities:
        return jsonify({
            "error": "Invalid priority",
            "allowed_values": allowed_priorities
        }), 400

    publish_date = None
    expiry_date = None

    if data.get("publish_date"):
        try:
            publish_date = datetime.strptime(
                data["publish_date"], "%Y-%m-%d"
            ).date()
        except ValueError:
            return jsonify({
                "error": "publish_date must be in YYYY-MM-DD format"
            }), 400

    if data.get("expiry_date"):
        try:
            expiry_date = datetime.strptime(
                data["expiry_date"], "%Y-%m-%d"
            ).date()
        except ValueError:
            return jsonify({
                "error": "expiry_date must be in YYYY-MM-DD format"
            }), 400

    if publish_date and expiry_date and expiry_date < publish_date:
        return jsonify({
            "error": "expiry_date cannot be before publish_date"
        }), 400

    user = get_current_user()

    notice = Notice(
        title=data["title"],
        content=data["content"],
        notice_type=data.get("notice_type", "GENERAL"),
        priority=priority,
        created_by=user.user_id,
        publish_date=publish_date,
        expiry_date=expiry_date,
        status=data.get("status", "DRAFT"),
        updated_at=datetime.now()
    )

    db.session.add(notice)
    db.session.flush()
    
    created_notifications = distribute_notice_notifications(notice)

    db.session.commit()
    return jsonify({
    "message": "Notice created successfully",
    "notice_id": notice.notice_id,
    "notifications_created": created_notifications
}), 201


# UPDATE notice
@notice_bp.route("/<int:notice_id>", methods=["PUT"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def update_notice(notice_id):
    notice = Notice.query.get_or_404(notice_id)
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    if "title" in data:
        notice.title = data["title"]

    if "content" in data:
        notice.content = data["content"]

    if "notice_type" in data:
        notice.notice_type = data["notice_type"]

    if "priority" in data:
        notice.priority = data["priority"]

    if "status" in data:
        notice.status = data["status"]

    if "publish_date" in data:
        try:
            notice.publish_date = (
                date.fromisoformat(data["publish_date"])
                if data["publish_date"]
                else None
            )
        except ValueError:
            return jsonify({
                "error": "publish_date must use YYYY-MM-DD format"
            }), 400

    if "expiry_date" in data:
        try:
            notice.expiry_date = (
                date.fromisoformat(data["expiry_date"])
                if data["expiry_date"]
                else None
            )
        except ValueError:
            return jsonify({
                "error": "expiry_date must use YYYY-MM-DD format"
            }), 400

    if (
        notice.publish_date
        and notice.expiry_date
        and notice.expiry_date < notice.publish_date
    ):
        return jsonify({
            "error": "Expiry date cannot be before publish date"
        }), 400

    notice.updated_at = datetime.now()

    created_notifications = distribute_notice_notifications(notice)

    db.session.commit()
       
    return jsonify({
    "message": "Notice updated successfully",
    "notifications_created": created_notifications
     })


# DELETE notice
@notice_bp.route("/<int:notice_id>", methods=["DELETE"])
@jwt_required()
@role_required("HIGHER_ADMIN")
def delete_notice(notice_id):
    notice = Notice.query.get_or_404(notice_id)

    db.session.delete(notice)
    db.session.commit()

    return jsonify({
        "message": "Notice deleted successfully"
    })