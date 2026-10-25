
from extensions import db


class StaffNotification(db.Model):
    __tablename__ = "staff_notifications"

    notification_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    recipient_user_id = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=False,
        index=True,
    )

    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    notification_type = db.Column(
        db.String(50),
        nullable=False,
        default="GENERAL",
    )

    related_booking_id = db.Column(
        db.BigInteger,
        db.ForeignKey("bookings.booking_id"),
        nullable=True,
    )

    related_payment_id = db.Column(
        db.BigInteger,
        db.ForeignKey("payments.payment_id"),
        nullable=True,
    )

    is_read = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
    )

    read_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp(),
    )
