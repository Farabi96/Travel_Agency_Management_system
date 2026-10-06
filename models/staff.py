from extensions import db


class Staff(db.Model):
    __tablename__ = "staff"

    staff_id = db.Column(
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

    employee_code = db.Column(
        db.String(30),
        unique=True,
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

    phone = db.Column(
        db.String(30),
        nullable=False
    )

    department = db.Column(
        db.String(100),
        nullable=False
    )

    designation = db.Column(
        db.String(100),
        nullable=False
    )

    joining_date = db.Column(
        db.Date,
        nullable=False
    )

    employment_status = db.Column(
        db.Enum(
            "ACTIVE",
            "ON_LEAVE",
            "SUSPENDED",
            "RESIGNED",
            "TERMINATED"
        ),
        nullable=False,
        server_default="ACTIVE"
    )

    manager_id = db.Column(
        db.BigInteger,
        db.ForeignKey("staff.staff_id"),
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

    user = db.relationship(
        "User",
        backref="staff",
        uselist=False
    )

    manager = db.relationship(
        "Staff",
        remote_side=[staff_id],
        backref="subordinates"
    )
