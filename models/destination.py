from extensions import db


class Destination(db.Model):
    __tablename__ = "destinations"

    destination_id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    division = db.Column(
        db.String(100),
        nullable=False
    )

    district = db.Column(
        db.String(100),
        nullable=False
    )

    upazila = db.Column(
        db.String(100),
        nullable=True
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    latitude = db.Column(
        db.Numeric(10, 7),
        nullable=True
    )

    longitude = db.Column(
        db.Numeric(10, 7),
        nullable=True
    )

    image_url = db.Column(
        db.String(500),
        nullable=True
    )

    status = db.Column(
        db.Enum(
            "ACTIVE",
            "INACTIVE"
        ),
        nullable=False,
        server_default="ACTIVE"
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )
