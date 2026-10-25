from decimal import Decimal, InvalidOperation
from uuid import uuid4
from datetime import datetime

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required
from sqlalchemy import text

from extensions import db
from models import (
    Payment, PaymentMethod, PaymentStatus, Booking, Invoice, InvoiceItem, Customer,
    BookingStatus, BookingStatusHistory,
)
from auth_utils import get_current_user, role_required, is_staff_or_admin
from zoneinfo import ZoneInfo

payment_bp = Blueprint("payment", __name__, url_prefix="/api/payments")
CENT = Decimal("0.01")
ZERO = Decimal("0.00")


def payment_to_dict(payment):
    return {
        "payment_id": payment.payment_id,
        "booking_id": payment.booking_id,
        "invoice_id": payment.invoice_id,
        "transaction_reference": payment.transaction_reference,
        "gateway_transaction_id": payment.gateway_transaction_id,
        "amount": float(payment.amount),
        "payment_method_id": payment.payment_method_id,
        "payment_method": payment.payment_method.method_name if payment.payment_method else None,
        "payment_status_id": payment.payment_status_id,
        "payment_status": payment.payment_status.status_name if payment.payment_status else None,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "received_by": payment.received_by,
        "notes": payment.notes,
    }


def customer_for_user(user):
    return Customer.query.filter_by(user_id=user.user_id).first()


def can_access_booking(user, booking):
    if is_staff_or_admin(user):
        return True
    customer = customer_for_user(user)
    return bool(customer and booking.customer_id == customer.customer_id)


def find_payment_status(name):
    return PaymentStatus.query.filter_by(status_name=name).first()


def paid_amount_for_booking(booking_id):
    status = find_payment_status("PAID")
    if not status:
        raise ValueError("PAID payment status is not configured")
    total = db.session.query(db.func.coalesce(db.func.sum(Payment.amount), 0)).filter(
        Payment.booking_id == booking_id,
        Payment.payment_status_id == status.payment_status_id,
    ).scalar()
    return Decimal(str(total)).quantize(CENT)


def applicable_total(booking, invoice=None):
    return Decimal(str(invoice.total_amount if invoice else booking.total_amount)).quantize(CENT)


def outstanding_amount(booking, invoice=None):
    return max(ZERO, applicable_total(booking, invoice) - paid_amount_for_booking(booking.booking_id))


def get_or_create_invoice(booking, user_id=None):
    """Create the one invoice for a booking using only server-side booking values."""
    invoice = Invoice.query.filter_by(booking_id=booking.booking_id).first()
    if invoice:
        return invoice

    year = datetime.now().year
    seq = db.session.execute(text("SELECT nextval('invoice_number_seq')")).scalar_one()
    invoice = Invoice(
        invoice_number=f"INV-{year}-{seq:06d}",
        booking_id=booking.booking_id,
        subtotal=booking.subtotal,
        discount_amount=booking.discount_amount,
        tax_amount=booking.tax_amount,
        total_amount=booking.total_amount,
        invoice_status="ISSUED",
        generated_by=user_id,
    )
    db.session.add(invoice)
    db.session.flush()

    travelers = int(booking.number_of_travelers or 1)
    package_name = booking.package.package_name if booking.package else f"Tour booking #{booking.booking_id}"
    unit_price = (Decimal(str(booking.subtotal)) / Decimal(travelers)).quantize(CENT)
    line_total = (unit_price * travelers).quantize(CENT)
    db.session.add(InvoiceItem(
        invoice_id=invoice.invoice_id,
        description=package_name,
        quantity=Decimal(travelers),
        unit_price=unit_price,
        line_total=line_total,
    ))
    return invoice


def payment_summary_for_booking(booking, invoice=None):
    invoice = invoice or Invoice.query.filter_by(
        booking_id=booking.booking_id
    ).first()

    total = applicable_total(booking, invoice)
    paid = paid_amount_for_booking(booking.booking_id)

    booking_status = (
        booking.status.status_name.upper()
        if booking.status and booking.status.status_name
        else "UNKNOWN"
    )

    is_cancelled = booking_status in {"CANCELLED", "CANCELED"}

    # Cancelled bookings remain in history, but are not active receivables.
    balance = ZERO if is_cancelled else max(ZERO, total - paid)

    pending_status = find_payment_status("PENDING")
    pending = []

    if pending_status:
        pending = [
            payment_to_dict(payment)
            for payment in Payment.query.filter_by(
                booking_id=booking.booking_id,
                payment_status_id=pending_status.payment_status_id,
            ).order_by(Payment.payment_id.desc()).all()
        ]

    if is_cancelled:
        payment_summary = "CANCELLED"
    elif balance <= ZERO:
        payment_summary = "PAID"
    elif paid > ZERO:
        payment_summary = "PARTIALLY_PAID"
    elif pending:
        payment_summary = "PENDING"
    else:
        payment_summary = "UNPAID"

    return {
        "total_amount": float(total),
        "paid_amount": float(paid),
        "balance": float(balance),
        "pending_payments": pending,
        "payment_summary": payment_summary,
    }



@payment_bp.route("/methods", methods=["GET"])
def get_payment_methods():
    methods = PaymentMethod.query.filter_by(status="ACTIVE").order_by(PaymentMethod.payment_method_id.asc()).all()
    return jsonify([{
        "payment_method_id": m.payment_method_id,
        "method_name": m.method_name,
        "description": m.description,
        "is_online": bool(m.is_online),
        "available_for_request": not bool(m.is_online),
    } for m in methods]), 200


@payment_bp.route("/statuses", methods=["GET"])
@role_required("HIGHER_ADMIN", "STAFF")
def get_payment_statuses():
    return jsonify([{
        "payment_status_id": s.payment_status_id,
        "status_name": s.status_name,
        "description": s.description,
    } for s in PaymentStatus.query.order_by(PaymentStatus.payment_status_id.asc()).all()]), 200


@payment_bp.route("/mine", methods=["GET"])
@role_required("CUSTOMER")
def get_my_payments():
    user = get_current_user()
    customer = customer_for_user(user) if user else None
    if not customer:
        return jsonify({"error": "Customer profile not found"}), 404
    payments = Payment.query.join(Booking, Payment.booking_id == Booking.booking_id).filter(
        Booking.customer_id == customer.customer_id
    ).order_by(Payment.payment_id.desc()).all()
    return jsonify([payment_to_dict(p) for p in payments]), 200


@payment_bp.route("/", methods=["GET"])
@role_required("HIGHER_ADMIN", "STAFF")
def get_payments():
    return jsonify([payment_to_dict(p) for p in Payment.query.order_by(Payment.payment_id.desc()).all()]), 200


@payment_bp.route("/overview", methods=["GET"])
@role_required("HIGHER_ADMIN", "STAFF")
def get_payment_overview():
    results = []
    for booking in Booking.query.order_by(Booking.booking_id.desc()).all():
        invoice = Invoice.query.filter_by(booking_id=booking.booking_id).first()
        summary = payment_summary_for_booking(booking, invoice)
        customer = booking.customer
        results.append({
            "booking_id": booking.booking_id,
            "booking_reference": booking.booking_reference,
            "customer_name": f"{customer.first_name} {customer.last_name or ''}".strip() if customer else "Unknown customer",
            "package_name": booking.package.package_name if booking.package else None,
            "travel_date": booking.travel_date.isoformat() if booking.travel_date else None,
            "booking_status": booking.status.status_name if booking.status else None,
            "invoice_id": invoice.invoice_id if invoice else None,
            "invoice_number": invoice.invoice_number if invoice else None,
            **summary,
        })
    return jsonify(results), 200


@payment_bp.route("/<int:payment_id>", methods=["GET"])
@jwt_required()
def get_payment(payment_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found or inactive"}), 403
    payment = Payment.query.get_or_404(payment_id)
    if not can_access_booking(user, payment.booking):
        return jsonify({"error": "Access denied"}), 403
    return jsonify(payment_to_dict(payment)), 200


@payment_bp.route("/booking/<int:booking_id>", methods=["GET"])
@jwt_required()
def get_booking_payments(booking_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found or inactive"}), 403
    booking = Booking.query.get_or_404(booking_id)
    if not can_access_booking(user, booking):
        return jsonify({"error": "Access denied"}), 403
    payments = Payment.query.filter_by(booking_id=booking_id).order_by(Payment.payment_id.desc()).all()
    return jsonify([payment_to_dict(p) for p in payments]), 200


@payment_bp.route("/invoice/<int:invoice_id>", methods=["GET"])
@jwt_required()
def get_invoice_payments(invoice_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found or inactive"}), 403
    invoice = Invoice.query.get_or_404(invoice_id)
    booking = Booking.query.get_or_404(invoice.booking_id)
    if not can_access_booking(user, booking):
        return jsonify({"error": "Access denied"}), 403
    payments = Payment.query.filter_by(booking_id=booking.booking_id).order_by(Payment.payment_id.desc()).all()
    return jsonify([payment_to_dict(p) for p in payments]), 200


@payment_bp.route("/", methods=["POST"])
@role_required("CUSTOMER")
def create_payment():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found or inactive"}), 403
    data = request.get_json(silent=True) or {}
    booking_id = data.get("booking_id")
    method_id = data.get("payment_method_id")
    reference = data.get("transaction_reference")
    raw_amount = data.get("amount")



    if not booking_id or not method_id or raw_amount is None:
        return jsonify({"error": "booking_id, payment_method_id, and amount are required"}), 400
    if not isinstance(reference, str) or not reference.strip():
        return jsonify({"error": "Enter the actual transaction/reference ID from your payment provider or receipt"}), 400
    reference = reference.strip()
    if len(reference) > 100:
        return jsonify({"error": "Transaction reference must be 100 characters or fewer"}), 400
    try:
        amount = Decimal(str(raw_amount)).quantize(CENT)
        if not amount.is_finite() or amount <= ZERO:
            raise InvalidOperation
    except (InvalidOperation, ValueError, TypeError):
        return jsonify({"error": "Amount must be a valid positive number"}), 400

    # Lock the booking row to serialize requests for the same booking on PostgreSQL.
    booking = Booking.query.filter_by(booking_id=booking_id).with_for_update().first()
    if not booking:
        return jsonify({"error": "Booking not found"}), 404
    if not can_access_booking(user, booking):
        return jsonify({"error": "Access denied"}), 403
        # Prevent payments for cancelled bookings.
    booking_status = (
        booking.status.status_name.upper()
        if booking.status and booking.status.status_name
        else ""
    )

    if booking_status in {"CANCELLED", "CANCELED"}:
        return jsonify({
            "error": "Payments cannot be submitted for a cancelled booking."
        }), 400


    # Reject new payment requests after the booking deadline.
    if (
        booking.payment_deadline
        and datetime.now(ZoneInfo("Asia/Dhaka")).replace(tzinfo=None) >= booking.payment_deadline
    ):
        return jsonify({
            "error": (
                "The 45-minute payment deadline has expired. "
                "Please create a new booking."
            )
        }), 400

    method = db.session.get(PaymentMethod, method_id)
    if not method or method.status != "ACTIVE":
        return jsonify({"error": "Invalid or inactive payment method"}), 400
    if method.is_online:
        return jsonify({"error": "Online payments are not available yet"}), 400
    if Payment.query.filter_by(transaction_reference=reference).first():
        return jsonify({"error": "This transaction/reference ID has already been submitted"}), 409

    try:
        invoice = Invoice.query.filter_by(booking_id=booking.booking_id).first()
        if invoice and invoice.invoice_status in ("VOID", "REFUNDED"):
            return jsonify({"error": "This invoice cannot receive payments"}), 400

        pending = find_payment_status("PENDING")
        if not pending:
            return jsonify({"error": "PENDING payment status is not configured"}), 500
        existing_pending = Payment.query.filter_by(
            booking_id=booking.booking_id,
            payment_status_id=pending.payment_status_id,
        ).first()
        if existing_pending:
            return jsonify({"error": "A payment request is already awaiting verification for this booking. Wait for staff to verify or fail it before submitting another."}), 409

        # Validate against the final invoice total if present, otherwise booking total.
        existing_invoice = invoice
        total = applicable_total(booking, existing_invoice)
        paid = paid_amount_for_booking(booking.booking_id)
        balance = max(ZERO, total - paid)
        if balance <= ZERO:
            return jsonify({"error": "No outstanding balance remains"}), 400
        # Require full payment of the entire outstanding balance.
        if amount != balance:
            return jsonify({
                "error": (
                    "Full payment is required. "
                    f"Please pay the entire outstanding balance of {balance:.2f}."
                ),
                "required_amount": float(balance),
            }), 400

        # Create invoice only after validation, then attach the request to it.
        invoice = get_or_create_invoice(booking, user.user_id)
        payment = Payment(
            booking_id=booking.booking_id,
            invoice_id=invoice.invoice_id,
            transaction_reference=reference,
            amount=amount,
            payment_method_id=method.payment_method_id,
            payment_status_id=pending.payment_status_id,
            notes=(data.get("notes") or "Customer-submitted payment awaiting staff verification").strip()[:2000],
        )
        db.session.add(payment)
        db.session.commit()
        return jsonify({"message": "Payment request submitted and awaiting verification", "payment": payment_to_dict(payment), "invoice_id": invoice.invoice_id}), 201
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Unable to create payment request. Check the server log for details."}), 500


@payment_bp.route("/record", methods=["POST"])
@role_required("HIGHER_ADMIN", "STAFF")
def record_offline_payment():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    booking_id = data.get("booking_id")
    method_id = data.get("payment_method_id")
    raw_amount = data.get("amount")
    reference = (data.get("transaction_reference") or "").strip()
    notes = (data.get("notes") or "").strip()

    if not booking_id or not method_id or raw_amount is None:
        return jsonify({"error": "booking_id, payment_method_id, and amount are required"}), 400
    try:
        amount = Decimal(str(raw_amount)).quantize(CENT)
        if not amount.is_finite() or amount <= ZERO:
            raise InvalidOperation
    except (InvalidOperation, ValueError, TypeError):
        return jsonify({"error": "Amount must be a valid positive number"}), 400

    booking = (
    Booking.query
    .filter_by(booking_id=booking_id)
    .with_for_update()
    .first()
)
    method = db.session.get(PaymentMethod, method_id)
    paid_status = find_payment_status("PAID")
    if not booking:
        return jsonify({"error": "Booking not found"}), 404
    booking_status = (
    booking.status.status_name.upper()
    if booking.status and booking.status.status_name
    else ""
)

    if booking_status in {"CANCELLED", "CANCELED"}:
     return jsonify({
        "error": "Offline payments cannot be recorded for a cancelled booking."
    }), 400


    if not method or method.status != "ACTIVE" or method.is_online:
        return jsonify({"error": "Choose an active offline payment method"}), 400
    if not paid_status:
        return jsonify({"error": "PAID payment status is not configured"}), 500

    try:
        invoice = Invoice.query.filter_by(booking_id=booking.booking_id).first()
        if invoice and invoice.invoice_status in ("VOID", "REFUNDED"):
            return jsonify({"error": "This invoice cannot receive payments"}), 400
        balance = outstanding_amount(booking, invoice)
        if balance <= ZERO:
            return jsonify({"error": "No outstanding balance remains"}), 400
        if amount > balance:
            return jsonify({"error": f"Amount exceeds the outstanding balance ({balance:.2f})"}), 400
        invoice = get_or_create_invoice(booking, user.user_id)
        if not reference:
            reference = f"OFFLINE-{uuid4().hex.upper()}"
        if len(reference) > 100:
            return jsonify({"error": "Reference must be 100 characters or fewer"}), 400
        if Payment.query.filter_by(transaction_reference=reference).first():
            return jsonify({"error": "That transaction/reference ID already exists"}), 409
        payment = Payment(
            booking_id=booking.booking_id,
            invoice_id=invoice.invoice_id,
            transaction_reference=reference,
            amount=amount,
            payment_method_id=method.payment_method_id,
            payment_status_id=paid_status.payment_status_id,
            received_by=user.user_id,
            notes=notes or "Offline payment recorded by staff",
        )
        db.session.add(payment)
        db.session.flush()
        update_invoice_status(booking.booking_id, invoice)
        confirm_booking_if_fully_paid(booking, user.user_id)
        db.session.commit()
        return jsonify({"message": "Offline payment recorded", "payment": payment_to_dict(payment)}), 201
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Unable to record offline payment. Check the server log for details."}), 500


def update_invoice_status(booking_id, invoice):
    if not invoice:
        return
    paid = paid_amount_for_booking(booking_id)
    total = Decimal(str(invoice.total_amount)).quantize(CENT)
    if paid >= total:
        invoice.invoice_status = "PAID"
    elif paid > ZERO:
        invoice.invoice_status = "PARTIALLY_PAID"
    else:
        invoice.invoice_status = "ISSUED"


def confirm_booking_if_fully_paid(booking, user_id):
    """Auto-confirm a booking only when verified payments cover its full total."""
    invoice = Invoice.query.filter_by(booking_id=booking.booking_id).first()
    total = applicable_total(booking, invoice)
    paid = paid_amount_for_booking(booking.booking_id)
    if paid < total:
        return False

    current_status = db.session.get(BookingStatus, booking.status_id)
    current_name = (current_status.status_name if current_status else "").upper()
    # Never reactivate cancelled or completed bookings through payment verification.
    if current_name in {"CANCELLED", "CANCELED", "COMPLETED", "FINISHED"}:
        return False

    confirmed_status = BookingStatus.query.filter(
        db.func.upper(BookingStatus.status_name) == "CONFIRMED"
    ).first()
    if not confirmed_status:
        raise ValueError("CONFIRMED booking status is not configured in booking_statuses")

    if booking.status_id != confirmed_status.status_id:
        old_status_id = booking.status_id
        booking.status_id = confirmed_status.status_id
        if hasattr(booking, "confirmed_by"):
            booking.confirmed_by = user_id
        if hasattr(booking, "confirmed_at"):
            booking.confirmed_at = datetime.now()
        db.session.add(BookingStatusHistory(
            booking_id=booking.booking_id,
            old_status_id=old_status_id,
            new_status_id=confirmed_status.status_id,
            changed_by=user_id,
            change_reason="Automatically confirmed after full payment verification",
        ))
        return True
    return False


@payment_bp.route("/<int:payment_id>/status", methods=["PUT"])
@role_required("HIGHER_ADMIN", "STAFF")
def update_payment_status(payment_id):
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    status_name = data.get("status_name")

    if status_name not in {"PAID", "FAILED", "REFUNDED"}:
        return jsonify({
            "error": "status_name must be PAID, FAILED, or REFUNDED"
        }), 400

    try:
        # Find the payment to identify its booking.
        initial_payment = db.session.get(Payment, payment_id)
        if not initial_payment:
            return jsonify({"error": "Payment not found"}), 404

        booking_id = initial_payment.booking_id

        # Always lock the booking first, matching the expiry/payment-creation flow.
        booking = (
            Booking.query
            .filter_by(booking_id=booking_id)
            .with_for_update()
            .first()
        )
        if not booking:
            db.session.rollback()
            return jsonify({"error": "Booking not found"}), 404

        # Lock and re-read the payment after locking its booking.
        payment = (
            Payment.query
            .filter_by(payment_id=payment_id)
            .with_for_update()
            .first()
        )
        if not payment or payment.booking_id != booking.booking_id:
            db.session.rollback()
            return jsonify({"error": "Payment not found"}), 404

        current = (
            payment.payment_status.status_name
            if payment.payment_status
            else None
        )

        if current != "PENDING" and not (
            current == "PAID" and status_name == "REFUNDED"
        ):
            db.session.rollback()
            return jsonify({
                "error": f"Cannot change payment from {current} to {status_name}"
            }), 400

        new_status = find_payment_status(status_name)
        if not new_status:
            db.session.rollback()
            return jsonify({
                "error": f"{status_name} payment status is not configured"
            }), 500

        # Do not accept payment for a booking already cancelled or completed.
        booking_status = (
            booking.status.status_name.upper()
            if booking.status and booking.status.status_name
            else ""
        )
        if status_name == "PAID" and booking_status in {
            "CANCELLED", "CANCELED", "COMPLETED"
        }:
            db.session.rollback()
            return jsonify({
                "error": (
                    "Payment cannot be verified for a cancelled or "
                    "completed booking."
                )
            }), 409

        payment.payment_status_id = new_status.payment_status_id

        if status_name == "PAID":
            payment.received_by = user.user_id

        invoice = Invoice.query.filter_by(booking_id=booking.booking_id).first()
        update_invoice_status(booking.booking_id, invoice)

        if status_name == "PAID":
            confirm_booking_if_fully_paid(booking, user.user_id)

        db.session.commit()

        return jsonify({
            "message": "Payment status updated successfully",
            "payment": payment_to_dict(payment),
        }), 200

    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Unable to update payment status for payment_id=%s",
            payment_id,
        )
        return jsonify({"error": "Unable to update payment status"}), 500
