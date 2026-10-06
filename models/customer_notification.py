from extensions import db


class CustomerNotification(db.Model):
    __tablename__ = "customer_notifications"

    notification_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    customer_id = db.Column(
        db.BigInteger,
        db.ForeignKey("customers.customer_id"),
        nullable=False
    )

    notice_id = db.Column(
        db.BigInteger,
        db.ForeignKey("notices.notice_id"),
        nullable=False
    )

    is_read = db.Column(
        db.Boolean,
        nullable=False,
        server_default="0"
    )

    read_at = db.Column(
        db.DateTime,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    customer = db.relationship(
        "Customer",
        backref="notifications"
    )

    notice = db.relationship(
        "Notice",
        backref="customer_notifications"
    )
