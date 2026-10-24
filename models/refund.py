
from extensions import db


class Refund(db.Model):
    __tablename__ = "refunds"

    refund_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    # One refund record per cancelled booking.
    booking_id = db.Column(
        db.BigInteger,
        db.ForeignKey("bookings.booking_id"),
        nullable=False,
        unique=True,
        index=True
    )

    # Total amount received and eligible for refund calculation.
    paid_amount = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    refund_percentage = db.Column(
        db.Numeric(5, 2),
        nullable=False
    )

    refund_amount = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    days_before_travel = db.Column(
        db.Integer,
        nullable=False
    )

    policy_reason = db.Column(
        db.String(255),
        nullable=False
    )

    refund_status = db.Column(
        db.String(20),
        nullable=False,
        server_default="PENDING"
    )

    transaction_reference = db.Column(
        db.String(150),
        nullable=True
    )

    processed_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=True
    )

    processed_at = db.Column(
        db.DateTime,
        nullable=True
    )

    notes = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    booking = db.relationship(
        "Booking",
        backref="refund_records"
    )

    processor = db.relationship(
        "User",
        foreign_keys=[processed_by]
    )
