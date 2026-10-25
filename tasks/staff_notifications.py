
from extensions import db
from models import StaffNotification, User


def notify_staff_and_admins(
    title,
    content,
    notification_type="GENERAL",
    booking_id=None,
    payment_id=None,
):
    """
    Create notifications for active staff and higher admins.
    Call after the main booking/payment transaction commits.
    """
    recipients = (
        User.query
        .join(User.role)
        .filter(User.role.has(role_name="STAFF"))
        .all()
    )

    admins = (
        User.query
        .join(User.role)
        .filter(User.role.has(role_name="HIGHER_ADMIN"))
        .all()
    )

    recipient_ids = {user.user_id for user in recipients + admins}

    if not recipient_ids:
        return

    notifications = [
        StaffNotification(
            recipient_user_id=user_id,
            title=title,
            content=content,
            notification_type=notification_type,
            related_booking_id=booking_id,
            related_payment_id=payment_id,
        )
        for user_id in recipient_ids
    ]

    try:
        db.session.add_all(notifications)
        db.session.commit()
    except Exception:
        db.session.rollback()
        # Notification failure must not undo the already-committed
        # booking or payment.
        raise
