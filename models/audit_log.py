from extensions import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    log_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    user_id = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=True
    )

    action = db.Column(
        db.String(100),
        nullable=False
    )

    table_name = db.Column(
        db.String(100),
        nullable=False
    )

    record_id = db.Column(
        db.BigInteger,
        nullable=True
    )

    old_values = db.Column(
        db.JSON,
        nullable=True
    )

    new_values = db.Column(
        db.JSON,
        nullable=True
    )

    ip_address = db.Column(
        db.String(45),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    user = db.relationship(
        "User",
        backref="audit_logs"
    )
