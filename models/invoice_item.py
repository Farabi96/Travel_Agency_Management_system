from extensions import db


class InvoiceItem(db.Model):
    __tablename__ = "invoice_items"

    invoice_item_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    invoice_id = db.Column(
        db.BigInteger,
        db.ForeignKey("invoices.invoice_id"),
        nullable=False
    )

    description = db.Column(
        db.String(255),
        nullable=False
    )

    quantity = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        server_default="1.00"
    )

    unit_price = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    line_total = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    invoice = db.relationship(
        "Invoice",
        backref="items"
    )
