from extensions import db


class SystemSetting(db.Model):
    __tablename__ = "system_settings"

    setting_id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    setting_key = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    setting_value = db.Column(
        db.Text,
        nullable=True
    )

    description = db.Column(
        db.String(255),
        nullable=True
    )

    updated_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=True
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp()
    )

    updater = db.relationship(
        "User",
        backref="updated_settings"
    )
