from extensions import db


class CustomerIdentityDocument(db.Model):
    __tablename__ = "customer_identity_documents"

    document_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    customer_id = db.Column(
        db.BigInteger,
        db.ForeignKey("customers.customer_id"),
        nullable=False
    )

    document_type = db.Column(
        db.Enum(
            "NID",
            "BIRTH_CERTIFICATE",
            "PASSPORT"
        ),
        nullable=False
    )

    document_number = db.Column(
        db.String(100),
        nullable=False
    )

    issuing_country = db.Column(
        db.String(100),
        nullable=False
    )

    issue_date = db.Column(
        db.Date,
        nullable=True
    )

    expiry_date = db.Column(
        db.Date,
        nullable=True
    )

    verification_status = db.Column(
        db.Enum(
            "PENDING",
            "VERIFIED",
            "REJECTED",
            "EXPIRED"
        ),
        nullable=False,
        server_default="PENDING"
    )

    verified_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=True
    )

    verified_at = db.Column(
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
        backref="identity_documents"
    )

    verifier = db.relationship(
        "User",
        foreign_keys=[verified_by],
        backref="verified_customer_documents"
    )
