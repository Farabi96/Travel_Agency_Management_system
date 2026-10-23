import os
import uuid
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from auth_utils import role_required

upload_bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MIME_BY_EXTENSION = {
    "jpg": {"image/jpeg"},
    "jpeg": {"image/jpeg"},
    "png": {"image/png"},
    "webp": {"image/webp"},
}


@upload_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("HIGHER_ADMIN", "STAFF")
def upload_image():
    image = request.files.get("image")
    entity_type = request.form.get("entity_type", "").lower()

    if entity_type not in {"destination", "package"}:
        return jsonify({"error": "entity_type must be destination or package"}), 400
    if not image or not image.filename:
        return jsonify({"error": "Choose an image file to upload"}), 400

    original_name = secure_filename(image.filename)
    extension = Path(original_name).suffix.lower().lstrip(".")
    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Only JPG, PNG and WebP images are allowed"}), 400
    if image.mimetype not in MIME_BY_EXTENSION[extension]:
        return jsonify({"error": "The file content type does not match its extension"}), 400

    image.stream.seek(0, os.SEEK_END)
    size = image.stream.tell()
    image.stream.seek(0)
    if size == 0:
        return jsonify({"error": "The selected image is empty"}), 400
    if size > MAX_IMAGE_BYTES:
        return jsonify({"error": "Image must be 5 MB or smaller"}), 413

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)
    filename = f"{entity_type}_{uuid.uuid4().hex}.{extension}"
    image.save(os.path.join(upload_folder, filename))

    image_url = f"{request.url_root.rstrip('/')}/api/uploads/{filename}"
    return jsonify({"message": "Image uploaded successfully", "image_url": image_url}), 201


@upload_bp.route("/<path:filename>", methods=["GET"])
def serve_image(filename):
    response = send_from_directory(current_app.config["UPLOAD_FOLDER"], filename, as_attachment=False)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "public, max-age=86400"
    return response
