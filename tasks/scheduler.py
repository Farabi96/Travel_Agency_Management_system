import os
import time
import logging

from apscheduler.schedulers.blocking import BlockingScheduler

from app import app, run_completion_job

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_scheduled_tasks():
    """Run booking completion and expiry tasks inside Flask context."""
    try:
        run_completion_job(app)
    except Exception:
        logger.exception("Scheduled booking tasks failed")


if __name__ == "__main__":
    scheduler = BlockingScheduler(timezone="Asia/Dhaka")

    scheduler.add_job(
        run_scheduled_tasks,
        trigger="interval",
        minutes=1,
        id="booking_maintenance",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    logger.info("Booking maintenance scheduler started.")
    scheduler.start()