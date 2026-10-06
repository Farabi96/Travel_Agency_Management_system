from extensions import db


class Favorite(db.Model):
    __tablename__ = "favorites"

    favorite_id = db.Column(
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

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    customer = db.relationship(
        "Customer",
        backref="favorites"
    )

    package = db.relationship(
        "TourPackage",
        backref="favorites"
    )
