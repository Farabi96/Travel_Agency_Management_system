
from datetime import datetime
from zoneinfo import ZoneInfo

from extensions import db
from models import (
    Booking,
    Notice,
    CustomerNotification,
    User,
)


def create_booking_notification(booking, title, content):
    """Create a notice and deliver it only to the booking's customer."""

    if not booking or not booking.customer_id:
        return False

    # A notice requires a valid user as its creator.
    creator_id = booking.created_by
    if not creator_id or not db.session.get(User, creator_id):
        raise ValueError(
            "Cannot create booking notification: valid notice creator not found."
        )

    now = datetime.now(ZoneInfo("Asia/Dhaka")).replace(tzinfo=None)

    notice = Notice(
        title=title,
        content=content,
        notice_type="BOOKING",
        priority="HIGH",
        created_by=creator_id,
        publish_date=now,
        status="PUBLISHED",
    )

    db.session.add(notice)
    db.session.flush()

    notification = CustomerNotification(
        customer_id=booking.customer_id,
        notice_id=notice.notice_id,
    )

    db.session.add(notification)
    return True
