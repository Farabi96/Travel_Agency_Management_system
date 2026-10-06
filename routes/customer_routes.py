from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import (
    Customer,
    CustomerIdentityDocument,
    CustomerEmergencyContact,
    Booking
)

from auth_utils import role_required


customer_bp = Blueprint(
    "customer",
    __name__,
    url_prefix="/api/customers"
)


# ---------------------------------------------------------
# GET ALL CUSTOMERS
# HIGHER_ADMIN / STAFF
# ---------------------------------------------------------

@customer_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def get_customers():

    customers = Customer.query.order_by(
        Customer.customer_id.asc()
    ).all()

    return jsonify([
        {
            "customer_id": customer.customer_id,
            "user_id": customer.user_id,
            "customer_type": customer.customer_type,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "date_of_birth": (
                customer.date_of_birth.isoformat()
                if customer.date_of_birth else None
            ),
            "gender": customer.gender,
            "nationality": customer.nationality,
            "phone": customer.phone,
            "address_line": customer.address_line,
            "city": customer.city,
            "country": customer.country,
            "created_at": customer.created_at.isoformat()
        }
        for customer in customers
    ])


# ---------------------------------------------------------
# GET CUSTOMER
# ---------------------------------------------------------

@customer_bp.route("/<int:customer_id>", methods=["GET"])
@jwt_required()
def get_customer(customer_id):

    customer = Customer.query.get_or_404(customer_id)

    current_user_id = int(get_jwt_identity())

    # Customer can only see their own profile.
    # Staff/admin can see any customer.
    if (
        customer.user_id != current_user_id
    ):
        return role_required(
            "HIGHER_ADMIN",
            "STAFF"
        )(lambda: None)()

    return jsonify({
        "customer_id": customer.customer_id,
        "user_id": customer.user_id,
        "customer_type": customer.customer_type,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "date_of_birth": (
            customer.date_of_birth.isoformat()
            if customer.date_of_birth else None
        ),
        "gender": customer.gender,
        "nationality": customer.nationality,
        "phone": customer.phone,
        "address_line": customer.address_line,
        "city": customer.city,
        "country": customer.country,
        "created_at": customer.created_at.isoformat(),
        "updated_at": customer.updated_at.isoformat()
    })


# ---------------------------------------------------------
# CREATE CUSTOMER
# HIGHER_ADMIN / STAFF
# ---------------------------------------------------------

@customer_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def create_customer():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "user_id",
        "customer_type",
        "first_name",
        "nationality",
        "phone"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "error": f"Missing field: {field}"
            }), 400

    existing_customer = Customer.query.filter_by(
        user_id=data["user_id"]
    ).first()

    if existing_customer:
        return jsonify({
            "error": "This user already has a customer profile",
            "customer_id": existing_customer.customer_id
        }), 409

    try:
        customer = Customer(
            user_id=data["user_id"],
            customer_type=data["customer_type"],
            first_name=data["first_name"],
            last_name=data.get("last_name"),
            date_of_birth=(
                date.fromisoformat(data["date_of_birth"])
                if data.get("date_of_birth")
                else None
            ),
            gender=data.get("gender"),
            nationality=data["nationality"],
            phone=data["phone"],
            address_line=data.get("address_line"),
            city=data.get("city"),
            country=data.get("country", "Bangladesh")
        )

        db.session.add(customer)
        db.session.commit()

        return jsonify({
            "message": "Customer created successfully",
            "customer_id": customer.customer_id,
            "user_id": customer.user_id
        }), 201

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ---------------------------------------------------------
# IDENTITY DOCUMENTS
# ---------------------------------------------------------

@customer_bp.route(
    "/<int:customer_id>/identity-documents",
    methods=["GET"]
)
@jwt_required()
def get_identity_documents(customer_id):

    customer = Customer.query.get_or_404(customer_id)

    current_user_id = int(get_jwt_identity())

    if customer.user_id != current_user_id:
        return role_required(
            "HIGHER_ADMIN",
            "STAFF"
        )(lambda: None)()

    documents = CustomerIdentityDocument.query.filter_by(
        customer_id=customer_id
    ).all()

    return jsonify([
        {
            "document_id": document.document_id,
            "customer_id": document.customer_id,
            "document_type": document.document_type,
            "document_number": document.document_number,
            "issuing_country": document.issuing_country,
            "issue_date": (
                document.issue_date.isoformat()
                if document.issue_date else None
            ),
            "expiry_date": (
                document.expiry_date.isoformat()
                if document.expiry_date else None
            ),
            "verification_status": document.verification_status,
            "verified_by": document.verified_by,
            "verified_at": (
                document.verified_at.isoformat()
                if document.verified_at else None
            )
        }
        for document in documents
    ])


@customer_bp.route(
    "/<int:customer_id>/identity-documents",
    methods=["POST"]
)
@jwt_required()
def create_identity_document(customer_id):

    customer = Customer.query.get_or_404(customer_id)

    current_user_id = int(get_jwt_identity())

    if customer.user_id != current_user_id:
        return role_required(
            "HIGHER_ADMIN",
            "STAFF"
        )(lambda: None)()

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "document_type",
        "document_number",
        "issuing_country"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "error": f"Missing field: {field}"
            }), 400

    try:
        document = CustomerIdentityDocument(
            customer_id=customer_id,
            document_type=data["document_type"],
            document_number=data["document_number"],
            issuing_country=data["issuing_country"],
            issue_date=(
                date.fromisoformat(data["issue_date"])
                if data.get("issue_date")
                else None
            ),
            expiry_date=(
                date.fromisoformat(data["expiry_date"])
                if data.get("expiry_date")
                else None
            )
        )

        db.session.add(document)
        db.session.commit()

        return jsonify({
            "message": "Identity document added successfully",
            "document_id": document.document_id
        }), 201

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ---------------------------------------------------------
# EMERGENCY CONTACTS
# ---------------------------------------------------------

@customer_bp.route(
    "/<int:customer_id>/emergency-contacts",
    methods=["GET"]
)
@jwt_required()
def get_emergency_contacts(customer_id):

    customer = Customer.query.get_or_404(customer_id)

    current_user_id = int(get_jwt_identity())

    if customer.user_id != current_user_id:
        return role_required(
            "HIGHER_ADMIN",
            "STAFF"
        )(lambda: None)()

    contacts = CustomerEmergencyContact.query.filter_by(
        customer_id=customer_id
    ).all()

    return jsonify([
        {
            "emergency_contact_id": contact.emergency_contact_id,
            "customer_id": contact.customer_id,
            "contact_name": contact.contact_name,
            "relationship": contact.relationship,
            "phone": contact.phone,
            "email": contact.email,
            "address": contact.address
        }
        for contact in contacts
    ])


@customer_bp.route(
    "/<int:customer_id>/emergency-contacts",
    methods=["POST"]
)
@jwt_required()
def create_emergency_contact(customer_id):

    customer = Customer.query.get_or_404(customer_id)

    current_user_id = int(get_jwt_identity())

    if customer.user_id != current_user_id:
        return role_required(
            "HIGHER_ADMIN",
            "STAFF"
        )(lambda: None)()

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "contact_name",
        "phone"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "error": f"Missing field: {field}"
            }), 400

    try:
        contact = CustomerEmergencyContact(
            customer_id=customer_id,
            contact_name=data["contact_name"],
            relationship=data.get("relationship"),
            phone=data["phone"],
            email=data.get("email"),
            address=data.get("address")
        )

        db.session.add(contact)
        db.session.commit()

        return jsonify({
            "message": "Emergency contact added successfully",
            "emergency_contact_id": contact.emergency_contact_id
        }), 201

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ---------------------------------------------------------
# CUSTOMER BOOKING HISTORY
# ---------------------------------------------------------

@customer_bp.route(
    "/<int:customer_id>/bookings",
    methods=["GET"]
)
@jwt_required()
def get_customer_bookings(customer_id):

    customer = Customer.query.get_or_404(customer_id)

    current_user_id = int(get_jwt_identity())

    if customer.user_id != current_user_id:
        return role_required(
            "HIGHER_ADMIN",
            "STAFF"
        )(lambda: None)()

    bookings = Booking.query.filter_by(
        customer_id=customer_id
    ).order_by(
        Booking.booking_id.desc()
    ).all()

    return jsonify([
        {
            "booking_id": booking.booking_id,
            "booking_reference": booking.booking_reference,
            "package_id": booking.package_id,
            "travel_date": booking.travel_date.isoformat(),
            "number_of_travelers": booking.number_of_travelers,
            "subtotal": float(booking.subtotal),
            "discount_amount": float(booking.discount_amount),
            "tax_amount": float(booking.tax_amount),
            "total_amount": float(booking.total_amount),
            "status_id": booking.status_id,
            "special_request": booking.special_request
        }
        for booking in bookings
    ])

