from datetime import datetime

from flask import Blueprint, jsonify, request

from extensions import db
from models import Invoice, InvoiceItem, Booking


invoice_bp = Blueprint(
    "invoice",
    __name__,
    url_prefix="/api/invoices"
)


# =========================
# GET ALL INVOICES
# =========================

@invoice_bp.route("/", methods=["GET"])
def get_invoices():

    invoices = Invoice.query.order_by(
        Invoice.invoice_id.desc()
    ).all()

    return jsonify([
        {
            "invoice_id": invoice.invoice_id,
            "invoice_number": invoice.invoice_number,
            "booking_id": invoice.booking_id,
            "invoice_date": invoice.invoice_date.isoformat(),
            "due_date": (
                invoice.due_date.isoformat()
                if invoice.due_date
                else None
            ),
            "subtotal": float(invoice.subtotal),
            "discount_amount": float(invoice.discount_amount),
            "tax_amount": float(invoice.tax_amount),
            "total_amount": float(invoice.total_amount),
            "invoice_status": invoice.invoice_status,
            "generated_by": invoice.generated_by
        }
        for invoice in invoices
    ])


# =========================
# GET SINGLE INVOICE
# =========================

@invoice_bp.route("/<int:invoice_id>", methods=["GET"])
def get_invoice(invoice_id):

    invoice = Invoice.query.get_or_404(invoice_id)

    return jsonify({
        "invoice_id": invoice.invoice_id,
        "invoice_number": invoice.invoice_number,
        "booking_id": invoice.booking_id,
        "invoice_date": invoice.invoice_date.isoformat(),
        "due_date": (
            invoice.due_date.isoformat()
            if invoice.due_date
            else None
        ),
        "subtotal": float(invoice.subtotal),
        "discount_amount": float(invoice.discount_amount),
        "tax_amount": float(invoice.tax_amount),
        "total_amount": float(invoice.total_amount),
        "invoice_status": invoice.invoice_status,
        "generated_by": invoice.generated_by,

        "items": [
            {
                "invoice_item_id": item.invoice_item_id,
                "description": item.description,
                "quantity": float(item.quantity),
                "unit_price": float(item.unit_price),
                "line_total": float(item.line_total)
            }
            for item in invoice.items
        ]
    })


# =========================
# GET INVOICE BY BOOKING
# =========================

@invoice_bp.route("/booking/<int:booking_id>", methods=["GET"])
def get_invoice_by_booking(booking_id):

    Booking.query.get_or_404(booking_id)

    invoice = Invoice.query.filter_by(
        booking_id=booking_id
    ).first()

    if not invoice:
        return jsonify({
            "error": "Invoice not found for this booking"
        }), 404

    return jsonify({
        "invoice_id": invoice.invoice_id,
        "invoice_number": invoice.invoice_number,
        "booking_id": invoice.booking_id,
        "invoice_date": invoice.invoice_date.isoformat(),
        "due_date": (
            invoice.due_date.isoformat()
            if invoice.due_date
            else None
        ),
        "subtotal": float(invoice.subtotal),
        "discount_amount": float(invoice.discount_amount),
        "tax_amount": float(invoice.tax_amount),
        "total_amount": float(invoice.total_amount),
        "invoice_status": invoice.invoice_status,
        "generated_by": invoice.generated_by,

        "items": [
            {
                "invoice_item_id": item.invoice_item_id,
                "description": item.description,
                "quantity": float(item.quantity),
                "unit_price": float(item.unit_price),
                "line_total": float(item.line_total)
            }
            for item in invoice.items
        ]
    })


# =========================
# CREATE INVOICE
# =========================

@invoice_bp.route("/", methods=["POST"])
def create_invoice():

    data = request.get_json()

    required_fields = [
        "booking_id",
        "subtotal",
        "total_amount"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "error": f"Missing field: {field}"
            }), 400

    booking = Booking.query.get(data["booking_id"])

    if not booking:
        return jsonify({
            "error": "Booking not found"
        }), 404

    existing_invoice = Invoice.query.filter_by(
        booking_id=booking.booking_id
    ).first()

    if existing_invoice:
        return jsonify({
            "error": "An invoice already exists for this booking",
            "invoice_id": existing_invoice.invoice_id,
            "invoice_number": existing_invoice.invoice_number
        }), 409

    try:
        current_year = datetime.now().year

        invoice_count = Invoice.query.filter(
            Invoice.invoice_number.like(
                f"INV-{current_year}-%"
            )
        ).count()

        invoice_number = (
            f"INV-{current_year}-{invoice_count + 1:06d}"
        )

        invoice = Invoice(
            invoice_number=invoice_number,
            booking_id=booking.booking_id,
            subtotal=data["subtotal"],
            discount_amount=data.get("discount_amount", 0),
            tax_amount=data.get("tax_amount", 0),
            total_amount=data["total_amount"],
            invoice_status=data.get("invoice_status", "ISSUED"),
            generated_by=data.get("generated_by")
        )

        db.session.add(invoice)
        db.session.flush()

        items = data.get("items", [])

        for item in items:

            quantity = item.get("quantity", 1)
            unit_price = item["unit_price"]
            line_total = item.get(
                "line_total",
                quantity * unit_price
            )

            invoice_item = InvoiceItem(
                invoice_id=invoice.invoice_id,
                description=item["description"],
                quantity=quantity,
                unit_price=unit_price,
                line_total=line_total
            )

            db.session.add(invoice_item)

        db.session.commit()

        return jsonify({
            "message": "Invoice created successfully",
            "invoice_id": invoice.invoice_id,
            "invoice_number": invoice.invoice_number,
            "booking_id": invoice.booking_id,
            "total_amount": float(invoice.total_amount)
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500
