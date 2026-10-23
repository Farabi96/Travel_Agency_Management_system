from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import Review, Customer, TourPackage, Booking, Payment, PaymentStatus, BookingStatus
from auth_utils import get_current_user, role_required


review_bp = Blueprint(
    "review",
    __name__,
    url_prefix="/api/reviews"
)


# ---------------------------------------------------------
# PUBLIC APPROVED REVIEWS FOR A PACKAGE
# ---------------------------------------------------------
@review_bp.route("/package/<int:package_id>", methods=["GET"])
def get_package_reviews(package_id):
    package = TourPackage.query.get_or_404(package_id)
    reviews = (
    Review.query.filter(
        Review.package_id == package.package_id,
        Review.review_status.notin_(["REJECTED", "HIDDEN"]),
    )
    .order_by(Review.created_at.desc())
    .all()
)
    ratings = [int(review.rating) for review in reviews]
    return jsonify({
        "package_id": package.package_id,
        "average_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
        "review_count": len(ratings),
        "reviews": [
            {
                "review_id": review.review_id,
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at.isoformat() if review.created_at else None,
                "customer_name": (
                    f"{review.customer.first_name} {review.customer.last_name or ''}".strip()
                    if review.customer else "Verified customer"
                ),
            }
            for review in reviews
        ],
    }), 200


# ---------------------------------------------------------
# CUSTOMER REVIEW ELIGIBILITY
# Only completed journeys with fully verified payment qualify.
# One review per customer per package.
# ---------------------------------------------------------
@review_bp.route("/eligibility/<int:package_id>", methods=["GET"])
@jwt_required()
def get_review_eligibility(package_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.role.role_name != "CUSTOMER" or not user.customer:
        return jsonify({"eligible": False, "bookings": []}), 200

    package = TourPackage.query.get_or_404(package_id)
    paid_status = PaymentStatus.query.filter_by(status_name="PAID").first()
    if not paid_status:
        return jsonify({"error": "PAID payment status is not configured"}), 500

    completed_bookings = Booking.query.filter_by(
        customer_id=user.customer.customer_id,
        package_id=package.package_id,
    ).filter(
        Booking.status.has(BookingStatus.status_name == "COMPLETED")
    ).all()

    eligible_bookings = []
    for booking in completed_bookings:
        paid_total = db.session.query(
            db.func.coalesce(db.func.sum(Payment.amount), 0)
        ).filter(
            Payment.booking_id == booking.booking_id,
            Payment.payment_status_id == paid_status.payment_status_id,
        ).scalar()
        if float(paid_total or 0) < float(booking.total_amount):
            continue

        eligible_bookings.append({
            "booking_id": booking.booking_id,
            "booking_reference": booking.booking_reference,
            "travel_date": booking.travel_date.isoformat() if booking.travel_date else None,
        })

    existing_review = Review.query.filter_by(
        customer_id=user.customer.customer_id,
        package_id=package.package_id,
    ).first()
    if existing_review:
        eligible_bookings = []

    return jsonify({
        "eligible": bool(eligible_bookings) and existing_review is None,
        "already_reviewed": existing_review is not None,
        "bookings": eligible_bookings,
    }), 200


# ---------------------------------------------------------
# GET ALL REVIEWS
# ---------------------------------------------------------
@review_bp.route("/", methods=["GET"])
@jwt_required()
def get_reviews():

    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role.role_name == "CUSTOMER":

        if not user.customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        reviews = Review.query.filter_by(
            customer_id=user.customer.customer_id
        ).order_by(
            Review.created_at.desc()
        ).all()

    elif user.role.role_name in ("HIGHER_ADMIN", "STAFF"):

        reviews = Review.query.order_by(
            Review.created_at.desc()
        ).all()

    else:
        return jsonify({"error": "Access denied"}), 403

    return jsonify([
        {
            "review_id": review.review_id,
            "customer_id": review.customer_id,
            "package_id": review.package_id,
            "booking_id": review.booking_id,
            "rating": review.rating,
            "comment": review.comment,
            "review_status": review.review_status,
            "created_at": review.created_at
        }
        for review in reviews
    ])


# ---------------------------------------------------------
# GET SINGLE REVIEW
# ---------------------------------------------------------
@review_bp.route("/<int:review_id>", methods=["GET"])
@jwt_required()
def get_review(review_id):

    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    review = Review.query.get_or_404(review_id)

    if user.role.role_name == "CUSTOMER":

        if not user.customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        if review.customer_id != user.customer.customer_id:
            return jsonify({"error": "Access denied"}), 403

    elif user.role.role_name not in ("HIGHER_ADMIN", "STAFF"):
        return jsonify({"error": "Access denied"}), 403

    return jsonify({
        "review_id": review.review_id,
        "customer_id": review.customer_id,
        "package_id": review.package_id,
        "booking_id": review.booking_id,
        "rating": review.rating,
        "comment": review.comment,
        "review_status": review.review_status,
        "created_at": review.created_at
    })


# ---------------------------------------------------------
# CREATE REVIEW
# CUSTOMER ONLY
# ---------------------------------------------------------
@review_bp.route("/", methods=["POST"])
@jwt_required()
def create_review():

    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role.role_name != "CUSTOMER":
        return jsonify({
            "error": "Only customers can create reviews"
        }), 403

    if not user.customer:
        return jsonify({
            "error": "Customer profile not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    package_id = data.get("package_id")
    booking_id = data.get("booking_id")
    rating = data.get("rating")
    comment = data.get("comment")

    if not package_id:
        return jsonify({
            "error": "package_id is required"
        }), 400

    if not booking_id:
        return jsonify({
            "error": "booking_id is required"
        }), 400

    if rating is None:
        return jsonify({
            "error": "rating is required"
        }), 400

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return jsonify({
            "error": "rating must be an integer between 1 and 5"
        }), 400

    if rating < 1 or rating > 5:
        return jsonify({
            "error": "rating must be between 1 and 5"
        }), 400

    package = TourPackage.query.get(package_id)

    if not package:
        return jsonify({
            "error": "Tour package not found"
        }), 404

    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({
            "error": "Booking not found"
        }), 404

    if booking.customer_id != user.customer.customer_id:
        return jsonify({
            "error": "You can only review your own booking"
        }), 403

    if booking.package_id != package_id:
        return jsonify({
            "error": "Booking does not belong to the selected package"
        }), 400

    # Reviews are allowed only after the journey is completed and fully paid.
    if not booking.status or str(booking.status.status_name).upper() != "COMPLETED":
        return jsonify({
            "error": "You can review this package only after completing the journey"
        }), 403

    paid_status = PaymentStatus.query.filter_by(status_name="PAID").first()
    if not paid_status:
        return jsonify({"error": "PAID payment status is not configured"}), 500

    paid_total = db.session.query(
        db.func.coalesce(db.func.sum(Payment.amount), 0)
    ).filter(
        Payment.booking_id == booking.booking_id,
        Payment.payment_status_id == paid_status.payment_status_id,
    ).scalar()
    if float(paid_total or 0) < float(booking.total_amount):
        return jsonify({
            "error": "A fully paid booking is required to submit a review"
        }), 403

    existing_review = Review.query.filter_by(
        customer_id=user.customer.customer_id,
        package_id=package_id
    ).first()

    if existing_review:
        return jsonify({
            "error": "You have already reviewed this package"
        }), 409

    review = Review(
        customer_id=user.customer.customer_id,
        package_id=package_id,
        booking_id=booking_id,
        rating=rating,
        comment=comment,
        review_status="APPROVED"
    )

    db.session.add(review)
    db.session.commit()

    return jsonify({
        "message": "Review submitted successfully",
        "review_id": review.review_id,
        "review_status": review.review_status
    }), 201


# ---------------------------------------------------------
# UPDATE REVIEW
# ---------------------------------------------------------
@review_bp.route("/<int:review_id>", methods=["PUT"])
@jwt_required()
def update_review(review_id):

    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    review = Review.query.get_or_404(review_id)

    if user.role.role_name == "CUSTOMER":

        if not user.customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        if review.customer_id != user.customer.customer_id:
            return jsonify({
                "error": "Access denied"
            }), 403

    elif user.role.role_name not in ("HIGHER_ADMIN", "STAFF"):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    if "rating" in data:

        try:
            rating = int(data["rating"])
        except (TypeError, ValueError):
            return jsonify({
                "error": "rating must be an integer between 1 and 5"
            }), 400

        if rating < 1 or rating > 5:
            return jsonify({
                "error": "rating must be between 1 and 5"
            }), 400

        review.rating = rating

    if "comment" in data:
        review.comment = data["comment"]

    if user.role.role_name == "CUSTOMER":
        review.review_status = "APPROVED"

    db.session.commit()

    return jsonify({
        "message": "Review updated successfully",
        "review_id": review.review_id,
        "review_status": review.review_status
    })


# ---------------------------------------------------------
# UPDATE REVIEW STATUS
# HIGHER_ADMIN / STAFF ONLY
# ---------------------------------------------------------
@review_bp.route("/<int:review_id>/status", methods=["PUT"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def update_review_status(review_id):

    review = Review.query.get_or_404(review_id)

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    status = data.get("review_status")

    allowed_statuses = [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "HIDDEN"
    ]

    if not status:
        return jsonify({
            "error": "review_status is required"
        }), 400

    status = status.upper()

    if status not in allowed_statuses:
        return jsonify({
            "error": "Invalid review status",
            "allowed_statuses": allowed_statuses
        }), 400

    review.review_status = status

    db.session.commit()

    return jsonify({
        "message": "Review status updated successfully",
        "review_id": review.review_id,
        "review_status": review.review_status
    })


# ---------------------------------------------------------
# DELETE REVIEW
# ---------------------------------------------------------
@review_bp.route("/<int:review_id>", methods=["DELETE"])
@jwt_required()
def delete_review(review_id):

    user = get_current_user()

    if not user:
        return jsonify({"error": "User not found"}), 404

    review = Review.query.get_or_404(review_id)

    if user.role.role_name == "CUSTOMER":

        if not user.customer:
            return jsonify({
                "error": "Customer profile not found"
            }), 404

        if review.customer_id != user.customer.customer_id:
            return jsonify({
                "error": "Access denied"
            }), 403

    elif user.role.role_name not in ("HIGHER_ADMIN", "STAFF"):
        return jsonify({"error": "Access denied"}), 403

    db.session.delete(review)
    db.session.commit()

    return jsonify({
        "message": "Review deleted successfully",
        "review_id": review_id
    })
