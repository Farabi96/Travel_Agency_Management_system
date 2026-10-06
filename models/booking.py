from extensions import db


class Booking(db.Model):
    __tablename__ = "bookings"

    booking_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    booking_reference = db.Column(
        db.String(30),
        unique=True,
        nullable=False
    )

    customer_id = db.Column(
        db.BigInteger,
        db.ForeignKey("customers.customer_id"),
        nullable=False
    )

    package_id = db.Column(
        db.BigInteger,
        db.ForeignKey("tour_packages.package_id"),
        nullable=False
    )

    booking_date = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    travel_date = db.Column(
        db.Date,
        nullable=False
    )

    number_of_travelers = db.Column(
        db.Integer,
        nullable=False
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

    status_id = db.Column(
        db.SmallInteger,
        db.ForeignKey("booking_statuses.status_id"),
        nullable=False
    )

    special_request = db.Column(
        db.Text,
        nullable=True
    )

    created_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=True
    )

    confirmed_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=True
    )

    confirmed_at = db.Column(
        db.DateTime,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp()
    )

    customer = db.relationship(
        "Customer",
        backref="bookings"
    )

    package = db.relationship(
        "TourPackage",
        backref="bookings"
    )

    status = db.relationship(
        "BookingStatus",
        backref="bookings"
    )

    creator = db.relationship(
        "User",
        foreign_keys=[created_by],
        backref="created_bookings"
    )

    confirmer = db.relationship(
        "User",
        foreign_keys=[confirmed_by],
        backref="confirmed_bookings"
    )
