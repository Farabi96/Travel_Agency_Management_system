from extensions import db


class Role(db.Model):
    __tablename__ = "roles"

    role_id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    role_name = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    description = db.Column(
        db.String(255),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    permissions = db.relationship(
        "Permission",
        secondary="role_permissions",
        backref="roles"
    )
