from extensions import db


class PackageItinerary(db.Model):
    __tablename__ = "package_itineraries"

    itinerary_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    package_id = db.Column(
        db.BigInteger,
        db.ForeignKey("tour_packages.package_id"),
        nullable=False
    )

    day_number = db.Column(
        db.Integer,
        nullable=False
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    start_time = db.Column(
        db.Time,
        nullable=True
    )

    end_time = db.Column(
        db.Time,
        nullable=True
    )

    package = db.relationship(
        "TourPackage",
        backref="itineraries"
    )
