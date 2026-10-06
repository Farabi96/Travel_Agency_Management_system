from extensions import db


class PaymentStatus(db.Model):
    __tablename__ = "payment_statuses"

    payment_status_id = db.Column(
        db.SmallInteger,
        primary_key=True,
        autoincrement=True
    )

    status_name = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    description = db.Column(
        db.String(255),
        nullable=True
    )
