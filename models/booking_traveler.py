from extensions import db


class BookingTraveler(db.Model):
    __tablename__ = "booking_travelers"

    traveler_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    booking_id = db.Column(
        db.BigInteger,
        db.ForeignKey("bookings.booking_id"),
        nullable=False
    )

    full_name = db.Column(
        db.String(150),
        nullable=False
    )

    date_of_birth = db.Column(
        db.Date,
        nullable=True
    )

    gender = db.Column(
        db.Enum(
            "MALE",
            "FEMALE",
            "OTHER",
            "PREFER_NOT_TO_SAY"
        ),
        nullable=True
    )

    nationality = db.Column(
        db.String(80),
        nullable=False
    )

    document_type = db.Column(
        db.Enum(
            "NID",
            "BIRTH_CERTIFICATE",
            "PASSPORT"
        ),
        nullable=True
    )

    document_number = db.Column(
        db.String(100),
        nullable=True
    )

    special_requirements = db.Column(
        db.Text,
        nullable=True
    )

    booking = db.relationship(
        "Booking",
        backref="travelers"
    )
