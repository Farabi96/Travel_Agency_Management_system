from extensions import db


class PackageDestination(db.Model):
    __tablename__ = "package_destinations"

    package_id = db.Column(
        db.BigInteger,
        db.ForeignKey("tour_packages.package_id"),
        primary_key=True
    )

    destination_id = db.Column(
        db.Integer,
        db.ForeignKey("destinations.destination_id"),
        primary_key=True
    )

    visit_order = db.Column(
        db.Integer,
        nullable=False
    )

    package = db.relationship(
        "TourPackage",
        backref="package_destinations"
    )

    destination = db.relationship(
        "Destination",
        backref="package_destinations"
    )
