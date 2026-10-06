from extensions import db


class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    username = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    email = db.Column(
        db.String(150),
        unique=True,
        nullable=False
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    role_id = db.Column(
        db.Integer,
        db.ForeignKey("roles.role_id"),
        nullable=False
    )

    account_status = db.Column(
        db.Enum(
            "ACTIVE",
            "INACTIVE",
            "SUSPENDED",
            "LOCKED"
        ),
        nullable=False,
        default="ACTIVE"
    )

    last_login = db.Column(
        db.DateTime,
        nullable=True
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

    role = db.relationship(
        "Role",
        backref="users"
    )
