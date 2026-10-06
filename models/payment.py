from extensions import db


class Payment(db.Model):
    __tablename__ = "payments"

    payment_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    booking_id = db.Column(
        db.BigInteger,
        db.ForeignKey("bookings.booking_id"),
        nullable=False
    )

    invoice_id = db.Column(
        db.BigInteger,
        db.ForeignKey("invoices.invoice_id"),
        nullable=True
    )

    transaction_reference = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    gateway_transaction_id = db.Column(
        db.String(150),
        nullable=True
    )

    amount = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    payment_method_id = db.Column(
        db.SmallInteger,
        db.ForeignKey("payment_methods.payment_method_id"),
        nullable=False
    )

    payment_status_id = db.Column(
        db.SmallInteger,
        db.ForeignKey("payment_statuses.payment_status_id"),
        nullable=False
    )

    payment_date = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    received_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
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
        backref="payments"
    )

    invoice = db.relationship(
        "Invoice",
        backref="payments"
    )

    payment_method = db.relationship(
        "PaymentMethod",
        backref="payments"
    )

    payment_status = db.relationship(
        "PaymentStatus",
        backref="payments"
    )

    receiver = db.relationship(
        "User",
        foreign_keys=[received_by],
        backref="received_payments"
    )
