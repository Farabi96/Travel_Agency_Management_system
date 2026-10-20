from flask import Blueprint, jsonify, request

from extensions import db
from models import (
    Payment,
    PaymentMethod,
    PaymentStatus,
    Booking,
    Invoice
)


payment_bp = Blueprint(
    "payment",
    __name__,
    url_prefix="/api/payments"
)


# =========================
# GET ALL PAYMENT METHODS
# =========================

@payment_bp.route("/methods", methods=["GET"])
def get_payment_methods():

    methods = PaymentMethod.query.order_by(
        PaymentMethod.payment_method_id.asc()
    ).all()

    return jsonify([
        {
            "payment_method_id": method.payment_method_id,
            "method_name": method.method_name,
            "description": method.description,
            "is_online": bool(method.is_online),
            "status": method.status
        }
        for method in methods
    ])


# =========================
# GET ALL PAYMENT STATUSES
# =========================

@payment_bp.route("/statuses", methods=["GET"])
def get_payment_statuses():

    statuses = PaymentStatus.query.order_by(
        PaymentStatus.payment_status_id.asc()
    ).all()

    return jsonify([
        {
            "payment_status_id": status.payment_status_id,
            "status_name": status.status_name,
            "description": status.description
        }
        for status in statuses
    ])


# =========================
# GET ALL PAYMENTS
# =========================

@payment_bp.route("/", methods=["GET"])
def get_payments():

    payments = Payment.query.order_by(
        Payment.payment_id.desc()
    ).all()

    return jsonify([
        {
            "payment_id": payment.payment_id,
            "booking_id": payment.booking_id,
            "invoice_id": payment.invoice_id,
            "transaction_reference": payment.transaction_reference,
            "gateway_transaction_id": payment.gateway_transaction_id,
            "amount": float(payment.amount),
            "payment_method_id": payment.payment_method_id,
            "payment_method": (
                payment.payment_method.method_name
                if payment.payment_method
                else None
            ),
            "payment_status_id": payment.payment_status_id,
            "payment_status": (
                payment.payment_status.status_name
                if payment.payment_status
                else None
            ),
            "payment_date": (
                payment.payment_date.isoformat()
                if payment.payment_date
                else None
            ),
            "received_by": payment.received_by,
            "notes": payment.notes
        }
        for payment in payments
    ])


# =========================
# GET SINGLE PAYMENT
# =========================

@payment_bp.route("/<int:payment_id>", methods=["GET"])
def get_payment(payment_id):

    payment = Payment.query.get_or_404(payment_id)

    return jsonify({
        "payment_id": payment.payment_id,
        "booking_id": payment.booking_id,
        "invoice_id": payment.invoice_id,
        "transaction_reference": payment.transaction_reference,
        "gateway_transaction_id": payment.gateway_transaction_id,
        "amount": float(payment.amount),
        "payment_method_id": payment.payment_method_id,
        "payment_method": (
            payment.payment_method.method_name
            if payment.payment_method
            else None
        ),
        "payment_status_id": payment.payment_status_id,
        "payment_status": (
            payment.payment_status.status_name
            if payment.payment_status
            else None
        ),
        "payment_date": (
            payment.payment_date.isoformat()
            if payment.payment_date
            else None
        ),
        "received_by": payment.received_by,
        "notes": payment.notes
    })


# =========================
# GET PAYMENTS BY BOOKING
# =========================

@payment_bp.route("/booking/<int:booking_id>", methods=["GET"])
def get_booking_payments(booking_id):

    Booking.query.get_or_404(booking_id)

    payments = Payment.query.filter_by(
        booking_id=booking_id
    ).order_by(
        Payment.payment_id.desc()
    ).all()

    return jsonify([
        {
            "payment_id": payment.payment_id,
            "booking_id": payment.booking_id,
            "invoice_id": payment.invoice_id,
            "transaction_reference": payment.transaction_reference,
            "amount": float(payment.amount),
            "payment_method_id": payment.payment_method_id,
            "payment_method": (
                payment.payment_method.method_name
                if payment.payment_method
                else None
            ),
            "payment_status_id": payment.payment_status_id,
            "payment_status": (
                payment.payment_status.status_name
                if payment.payment_status
                else None
            ),
            "payment_date": (
                payment.payment_date.isoformat()
                if payment.payment_date
                else None
            ),
            "received_by": payment.received_by,
            "notes": payment.notes
        }
        for payment in payments
    ])


# =========================
# GET PAYMENTS BY INVOICE
# =========================

@payment_bp.route("/invoice/<int:invoice_id>", methods=["GET"])
def get_invoice_payments(invoice_id):

    Invoice.query.get_or_404(invoice_id)

    payments = Payment.query.filter_by(
        invoice_id=invoice_id
    ).order_by(
        Payment.payment_id.desc()
    ).all()

    return jsonify([
        {
            "payment_id": payment.payment_id,
            "booking_id": payment.booking_id,
            "invoice_id": payment.invoice_id,
            "transaction_reference": payment.transaction_reference,
            "gateway_transaction_id": payment.gateway_transaction_id,
            "amount": float(payment.amount),
            "payment_method_id": payment.payment_method_id,
            "payment_method": (
                payment.payment_method.method_name
                if payment.payment_method
                else None
            ),
            "payment_status_id": payment.payment_status_id,
            "payment_status": (
                payment.payment_status.status_name
                if payment.payment_status
                else None
            ),
            "payment_date": (
                payment.payment_date.isoformat()
                if payment.payment_date
                else None
            ),
            "received_by": payment.received_by,
            "notes": payment.notes
        }
        for payment in payments
    ])


# =========================
# CREATE PAYMENT
# =========================

@payment_bp.route("/", methods=["POST"])
def create_payment():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "booking_id",
        "transaction_reference",
        "amount",
        "payment_method_id",
        "payment_status_id"
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

    payment_method = PaymentMethod.query.get(
        data["payment_method_id"]
    )

    if not payment_method:
        return jsonify({
            "error": "Payment method not found"
        }), 404

    if payment_method.status != "ACTIVE":
        return jsonify({
            "error": "Payment method is inactive"
        }), 400

    payment_status = PaymentStatus.query.get(
        data["payment_status_id"]
    )

    if not payment_status:
        return jsonify({
            "error": "Payment status not found"
        }), 404

    existing_payment = Payment.query.filter_by(
        transaction_reference=data["transaction_reference"]
    ).first()

    if existing_payment:
        return jsonify({
            "error": "Transaction reference already exists",
            "payment_id": existing_payment.payment_id
        }), 409

    invoice_id = data.get("invoice_id")

    if invoice_id is not None:

        invoice = Invoice.query.get(invoice_id)

        if not invoice:
            return jsonify({
                "error": "Invoice not found"
            }), 404

        if invoice.booking_id != booking.booking_id:
            return jsonify({
                "error": "Invoice does not belong to this booking"
            }), 400

    try:

        payment = Payment(
            booking_id=booking.booking_id,
            invoice_id=invoice_id,
            transaction_reference=data["transaction_reference"],
            gateway_transaction_id=data.get(
                "gateway_transaction_id"
            ),
            amount=data["amount"],
            payment_method_id=data["payment_method_id"],
            payment_status_id=data["payment_status_id"],
            received_by=data.get("received_by"),
            notes=data.get("notes")
        )

        db.session.add(payment)
        db.session.commit()

        return jsonify({
            "message": "Payment created successfully",
            "payment_id": payment.payment_id,
            "transaction_reference": payment.transaction_reference,
            "booking_id": payment.booking_id,
            "invoice_id": payment.invoice_id,
            "amount": float(payment.amount)
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================
# UPDATE PAYMENT STATUS
# =========================

@payment_bp.route("/<int:payment_id>/status", methods=["PUT"])
def update_payment_status(payment_id):

    payment = Payment.query.get_or_404(payment_id)

    data = request.get_json()

    if not data or "payment_status_id" not in data:
        return jsonify({
            "error": "payment_status_id is required"
        }), 400

    new_status_id = data["payment_status_id"]

    status = PaymentStatus.query.get(
        new_status_id
    )

    if not status:
        return jsonify({
            "error": "Invalid payment_status_id"
        }), 400

    if payment.payment_status_id == new_status_id:
        return jsonify({
            "error": "Payment already has this status"
        }), 400

    try:

        old_status_id = payment.payment_status_id

        payment.payment_status_id = new_status_id

        db.session.commit()

        return jsonify({
            "message": "Payment status updated successfully",
            "payment_id": payment.payment_id,
            "old_status_id": old_status_id,
            "new_status_id": new_status_id,
            "new_status": status.status_name
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500
