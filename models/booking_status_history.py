from extensions import db


class BookingStatusHistory(db.Model):
    __tablename__ = "booking_status_history"

    history_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    booking_id = db.Column(
        db.BigInteger,
        db.ForeignKey("bookings.booking_id"),
        nullable=False
    )

    old_status_id = db.Column(
        db.SmallInteger,
        db.ForeignKey("booking_statuses.status_id"),
        nullable=True
    )

    new_status_id = db.Column(
        db.SmallInteger,
        db.ForeignKey("booking_statuses.status_id"),
        nullable=False
    )

    changed_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=True
    )

    change_reason = db.Column(
        db.Text,
        nullable=True
    )

    changed_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    booking = db.relationship(
        "Booking",
        backref="status_history"
    )

    old_status = db.relationship(
        "BookingStatus",
        foreign_keys=[old_status_id],
        backref="old_status_history"
    )

    new_status = db.relationship(
        "BookingStatus",
        foreign_keys=[new_status_id],
        backref="new_status_history"
    )

    changer = db.relationship(
        "User",
        foreign_keys=[changed_by],
        backref="booking_status_changes"
    )
