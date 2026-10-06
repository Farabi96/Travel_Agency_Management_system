from extensions import db


class TourPackage(db.Model):
    __tablename__ = "tour_packages"

    package_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    package_code = db.Column(
        db.String(30),
        unique=True,
        nullable=False
    )

    package_name = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    duration_days = db.Column(
        db.Integer,
        nullable=False
    )

    duration_nights = db.Column(
        db.Integer,
        nullable=False
    )

    base_price = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    max_capacity = db.Column(
        db.Integer,
        nullable=False
    )

    min_travelers = db.Column(
        db.Integer,
        nullable=False,
        server_default="1"
    )

    package_status = db.Column(
        db.Enum(
            "DRAFT",
            "ACTIVE",
            "INACTIVE",
            "ARCHIVED"
        ),
        nullable=False,
        server_default="DRAFT"
    )

    created_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=False
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

    creator = db.relationship(
        "User",
        backref="created_packages"
    )
