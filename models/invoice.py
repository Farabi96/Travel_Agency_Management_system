from extensions import db


class Invoice(db.Model):
    __tablename__ = "invoices"

    invoice_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    invoice_number = db.Column(
        db.String(40),
        unique=True,
        nullable=False
    )

    booking_id = db.Column(
        db.BigInteger,
        db.ForeignKey("bookings.booking_id"),
        unique=True,
        nullable=False
    )

    invoice_date = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    due_date = db.Column(
        db.DateTime,
        nullable=True
    )

    subtotal = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    discount_amount = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        server_default="0.00"
    )

    tax_amount = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        server_default="0.00"
    )

    total_amount = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    invoice_status = db.Column(
        db.Enum(
            "ISSUED",
            "PAID",
            "PARTIALLY_PAID",
            "VOID",
            "REFUNDED"
        ),
        nullable=False,
        server_default="ISSUED"
    )

    generated_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    booking = db.relationship(
        "Booking",
        backref="invoice",
        uselist=False
    )

    generator = db.relationship(
        "User",
        foreign_keys=[generated_by],
        backref="generated_invoices"
    )
