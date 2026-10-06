from extensions import db


class Notice(db.Model):
    __tablename__ = "notices"

    notice_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    content = db.Column(
        db.Text,
        nullable=False
    )

    notice_type = db.Column(
        db.Enum(
            "TRAVEL",
            "BOOKING",
            "PACKAGE",
            "EMERGENCY",
            "HOLIDAY",
            "SYSTEM",
            "GENERAL"
        ),
        nullable=False,
        server_default="GENERAL"
    )

    priority = db.Column(
        db.Enum(
            "LOW",
            "NORMAL",
            "HIGH",
            "URGENT"
        ),
        nullable=False,
        server_default="NORMAL"
    )

    created_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    publish_date = db.Column(
        db.DateTime,
        nullable=True
    )

    expiry_date = db.Column(
        db.DateTime,
        nullable=True
    )

    status = db.Column(
        db.Enum(
            "DRAFT",
            "PUBLISHED",
            "EXPIRED",
            "ARCHIVED"
        ),
        nullable=False,
        server_default="DRAFT"
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
        backref="notices"
    )
