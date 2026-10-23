from datetime import datetime
from zoneinfo import ZoneInfo

from extensions import db
from models import Booking, BookingStatus, BookingStatusHistory, TourSchedule


def complete_returned_journeys():
    """
    Mark bookings COMPLETED when their linked schedule's return time has passed.
    Cancelled bookings are never changed. Each transition is written to history.
    This function is intended to run inside app.app_context().
    """
    completed_status = BookingStatus.query.filter_by(
        status_name="COMPLETED"
    ).first()
    cancelled_status = BookingStatus.query.filter_by(
        status_name="CANCELLED"
    ).first()

    if completed_status is None:
        raise RuntimeError("Booking status COMPLETED was not found in booking_statuses.")
    if cancelled_status is None:
        raise RuntimeError("Booking status CANCELLED was not found in booking_statuses.")

    now = datetime.now(ZoneInfo("Asia/Dhaka")).replace(tzinfo=None)

    # Use the linked schedule's return_datetime, not the booking creation date.
    eligible_bookings = (
        db.session.query(Booking, TourSchedule)
        .join(TourSchedule, Booking.schedule_id == TourSchedule.schedule_id)
        .filter(
            Booking.status_id != cancelled_status.status_id,
            Booking.status_id != completed_status.status_id,
            TourSchedule.return_datetime.isnot(None),
            TourSchedule.return_datetime <= now,
        )
        .with_for_update()
        .all()
    )

    changed = 0
    try:
        for booking, schedule in eligible_bookings:
            old_status_id = booking.status_id
            booking.status_id = completed_status.status_id
            db.session.add(
                BookingStatusHistory(
                    booking_id=booking.booking_id,
                    old_status_id=old_status_id,
                    new_status_id=completed_status.status_id,
                    changed_by=None,
                    change_reason="Automatically completed after scheduled return time.",
                )
            )
            changed += 1

        db.session.commit()
        if changed:
            print(f"[booking completion] Marked {changed} booking(s) COMPLETED.")
        return changed
    except Exception:
        db.session.rollback()
        raise
