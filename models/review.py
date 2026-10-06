from extensions import db


class Review(db.Model):
    __tablename__ = "reviews"

    review_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
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

    booking_id = db.Column(
        db.BigInteger,
        db.ForeignKey("bookings.booking_id"),
        nullable=False
    )

    rating = db.Column(
        db.SmallInteger,
        nullable=False
    )

    comment = db.Column(
        db.Text,
        nullable=True
    )

    review_status = db.Column(
        db.Enum(
            "PENDING",
            "APPROVED",
            "REJECTED",
            "HIDDEN"
        ),
        nullable=False,
        server_default="PENDING"
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    customer = db.relationship(
        "Customer",
        backref="reviews"
    )

    package = db.relationship(
        "TourPackage",
        backref="reviews"
    )

    booking = db.relationship(
        "Booking",
        backref="reviews"
    )
