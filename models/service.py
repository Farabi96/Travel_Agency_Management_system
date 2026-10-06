from extensions import db


class Service(db.Model):
    __tablename__ = "services"

    service_id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    service_name = db.Column(
        db.String(150),
        unique=True,
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    service_type = db.Column(
        db.Enum(
            "ACCOMMODATION",
            "TRANSPORT",
            "MEAL",
            "GUIDE",
            "ACTIVITY",
            "OTHER"
        ),
        nullable=False
    )

    status = db.Column(
        db.Enum(
            "ACTIVE",
            "INACTIVE"
        ),
        nullable=False,
        server_default="ACTIVE"
    )
