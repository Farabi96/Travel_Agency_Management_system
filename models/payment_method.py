from extensions import db


class PaymentMethod(db.Model):
    __tablename__ = "payment_methods"

    payment_method_id = db.Column(
        db.SmallInteger,
        primary_key=True,
        autoincrement=True
    )

    method_name = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    description = db.Column(
        db.String(255),
        nullable=True
    )

    is_online = db.Column(
        db.Boolean,
        nullable=False,
        server_default="0"
    )

    status = db.Column(
        db.Enum(
            "ACTIVE",
            "INACTIVE"
        ),
        nullable=False,
        server_default="ACTIVE"
    )
