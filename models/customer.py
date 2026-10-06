from extensions import db


class Customer(db.Model):
    __tablename__ = "customers"

    customer_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    user_id = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        unique=True,
        nullable=False
    )

    customer_type = db.Column(
        db.Enum(
            "BANGLADESHI",
            "FOREIGN"
        ),
        nullable=False
    )

    first_name = db.Column(
        db.String(80),
        nullable=False
    )

    last_name = db.Column(
        db.String(80),
        nullable=True
    )

    date_of_birth = db.Column(
        db.Date,
        nullable=True
    )

    gender = db.Column(
        db.Enum(
            "MALE",
            "FEMALE",
            "OTHER",
            "PREFER_NOT_TO_SAY"
        ),
        nullable=True
    )

    nationality = db.Column(
        db.String(80),
        nullable=False
    )

    phone = db.Column(
        db.String(30),
        nullable=False
    )

    address_line = db.Column(
        db.Text,
        nullable=True
    )

    city = db.Column(
        db.String(100),
        nullable=True
    )

    country = db.Column(
        db.String(100),
        nullable=False,
        server_default="Bangladesh"
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

    user = db.relationship(
        "User",
        backref="customer",
        uselist=False
    )
