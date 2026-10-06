from extensions import db


class StaffPrivateInformation(db.Model):
    __tablename__ = "staff_private_information"

    staff_private_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    staff_id = db.Column(
        db.BigInteger,
        db.ForeignKey("staff.staff_id"),
        unique=True,
        nullable=False
    )

    personal_email = db.Column(
        db.String(150),
        nullable=True
    )

    home_address = db.Column(
        db.Text,
        nullable=True
    )

    emergency_contact_name = db.Column(
        db.String(150),
        nullable=True
    )

    emergency_contact_phone = db.Column(
        db.String(30),
        nullable=True
    )

    personal_document_type = db.Column(
        db.String(50),
        nullable=True
    )

    personal_document_number = db.Column(
        db.String(100),
        nullable=True
    )

    staff = db.relationship(
        "Staff",
        backref="private_information",
        uselist=False
    )
