from extensions import db


class CustomerEmergencyContact(db.Model):
    __tablename__ = "customer_emergency_contacts"

    emergency_contact_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    customer_id = db.Column(
        db.BigInteger,
        db.ForeignKey("customers.customer_id"),
        nullable=False
    )

    contact_name = db.Column(
        db.String(150),
        nullable=False
    )

    relationship = db.Column(
        db.String(50),
        nullable=True
    )

    phone = db.Column(
        db.String(30),
        nullable=False
    )

    email = db.Column(
        db.String(150),
        nullable=True
    )

    address = db.Column(
        db.Text,
        nullable=True
    )

    customer = db.relationship(
        "Customer",
        backref="emergency_contacts"
    )
