from datetime import datetime
from zoneinfo import ZoneInfo
from tasks.booking_notifications import create_booking_notification
from extensions import db
from models import (
    Booking,
    BookingStatus,
    BookingStatusHistory,
    Payment,
    PaymentStatus,
)


def expire_unpaid_bookings():
    """Cancel expired pending bookings that have no payment request or payment."""

    now = datetime.now(ZoneInfo("Asia/Dhaka")).replace(tzinfo=None)

    pending_booking_status = BookingStatus.query.filter_by(
        status_name="PENDING"
    ).first()

    cancelled_booking_status = BookingStatus.query.filter_by(
        status_name="CANCELLED"
    ).first()

    pending_payment_status = PaymentStatus.query.filter_by(
        status_name="PENDING"
    ).first()

    paid_payment_status = PaymentStatus.query.filter_by(
        status_name="PAID"
    ).first()

    if not all([
        pending_booking_status,
        cancelled_booking_status,
        pending_payment_status,
        paid_payment_status,
    ]):
        raise RuntimeError("Required booking or payment statuses are missing.")

    try:
        expired_bookings = (
            Booking.query
            .filter(
                Booking.status_id == pending_booking_status.status_id,
                Booking.payment_deadline.isnot(None),
                Booking.payment_deadline <= now,
            )
            .with_for_update()
            .all()
        )

        cancelled_count = 0

        for booking in expired_bookings:
            # Lock and inspect every payment belonging to this booking.
            payments = (
                Payment.query
                .filter_by(booking_id=booking.booking_id)
                .with_for_update()
                .all()
            )

            # Never cancel if a payment is paid or awaiting verification.
            protected_status_ids = {
                pending_payment_status.payment_status_id,
                paid_payment_status.payment_status_id,
            }

            if any(
                payment.payment_status_id in protected_status_ids
                for payment in payments
            ):
                continue

            old_status_id = booking.status_id
            booking.status_id = cancelled_booking_status.status_id

            db.session.add(
                BookingStatusHistory(
                    booking_id=booking.booking_id,
                    old_status_id=old_status_id,
                    new_status_id=cancelled_booking_status.status_id,
                    changed_by=booking.created_by,
                    change_reason=(
                        "Automatically cancelled because the 45-minute "
                        "payment deadline expired without a pending or "
                        "verified payment."
                    ),
                )
            )

            create_booking_notification(
                booking,
                title="Booking Cancelled Automatically",
                content=(
                    f"Your booking {booking.booking_reference} was cancelled "
                    "because the 45-minute payment deadline expired. "
                    "No payment was recorded or awaiting verification. "
                    "Please create a new booking if you still wish to travel."
                ),
            )

            cancelled_count += 1


        db.session.commit()
        return cancelled_count

    except Exception:
        db.session.rollback()
        raise