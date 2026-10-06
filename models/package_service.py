from extensions import db


class PackageService(db.Model):
    __tablename__ = "package_services"

    package_id = db.Column(
        db.BigInteger,
        db.ForeignKey("tour_packages.package_id"),
        primary_key=True
    )

    service_id = db.Column(
        db.Integer,
        db.ForeignKey("services.service_id"),
        primary_key=True
    )

    quantity = db.Column(
        db.Integer,
        nullable=False,
        server_default="1"
    )

    additional_cost = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        server_default="0.00"
    )

    package = db.relationship(
        "TourPackage",
        backref="package_services"
    )

    service = db.relationship(
        "Service",
        backref="package_services"
    )
