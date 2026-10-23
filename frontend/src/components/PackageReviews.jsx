import { useCallback, useEffect, useState } from "react";
import {
  getPackageReviews,
  getReviewEligibility,
  createReview,
} from "../services/api";

function Stars({ value = 0 }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span aria-label={`${Number(value || 0).toFixed(1)} out of 5 stars`} className="whitespace-nowrap text-amber-500">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>{star <= rounded ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

function PackageReviews({ packageId }) {
  const [data, setData] = useState({ average_rating: null, review_count: 0, reviews: [] });
  const [eligibility, setEligibility] = useState({ eligible: false, bookings: [] });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const reviews = await getPackageReviews(packageId);
      setData(reviews);
      if (sessionStorage.getItem("access_token")) {
        try {
          setEligibility(await getReviewEligibility(packageId));
        } catch {
          setEligibility({ eligible: false, bookings: [] });
        }
      } else {
        setEligibility({ eligible: false, bookings: [] });
      }
    } catch (err) {
      setError(err.message || "Could not load package reviews.");
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await createReview({
        package_id: Number(packageId),
        booking_id: Number(bookingId),
        rating: Number(rating),
        comment: comment.trim(),
      });
      setMessage(result.message || "Review submitted for moderation.");
      setComment("");
      setBookingId("");
      setEligibility({ eligible: false, bookings: [], already_reviewed: true });
    } catch (err) {
      setError(err.message || "Could not submit review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 border-t border-slate-100 pt-4" aria-label="Package reviews">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <Stars value={data.average_rating || 0} />
          <span className="ml-2 font-semibold text-slate-700">
            {data.average_rating == null ? "No ratings yet" : `${Number(data.average_rating).toFixed(1)} / 5`}
          </span>
          <span className="ml-1 text-slate-500">({data.review_count} reviews)</span>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="text-sm font-semibold text-teal-700 hover:underline">
          {open ? "Hide reviews" : "See reviews"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-4">
          {loading ? <p className="text-sm text-slate-500">Loading reviews...</p> : null}
          {!loading && data.reviews.length === 0 ? <p className="text-sm text-slate-500">No approved reviews yet.</p> : null}
          {data.reviews.map((review) => (
            <article key={review.review_id} className="rounded-lg bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-800">{review.customer_name || "Verified customer"}</p>
                <Stars value={review.rating} />
              </div>
              {review.comment ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{review.comment}</p> : <p className="mt-2 text-sm italic text-slate-500">Rating only</p>}
              {review.created_at ? <p className="mt-2 text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString("en-GB")}</p> : null}
            </article>
          ))}

          {eligibility.eligible && eligibility.bookings?.length > 0 && (
            <form onSubmit={submit} className="space-y-3 rounded-lg border border-teal-100 p-4">
              <h4 className="font-semibold text-slate-900">Rate your completed journey</h4>
              <p className="text-xs text-slate-500">Only fully paid, completed journeys can be reviewed. Your review will appear after staff approval.</p>
              <label className="block text-sm font-medium text-slate-700">
                Completed booking
                <select required value={bookingId} onChange={(event) => setBookingId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2">
                  <option value="">Select booking</option>
                  {eligibility.bookings.map((booking) => <option key={booking.booking_id} value={booking.booking_id}>{booking.booking_reference} · {booking.travel_date || "Completed journey"}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Rating
                <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 p-2">
                  <option value={5}>5 - Excellent</option><option value={4}>4 - Very good</option><option value={3}>3 - Good</option><option value={2}>2 - Fair</option><option value={1}>1 - Poor</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Review (optional)
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={3} placeholder="Share your experience..." className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
              </label>
              <button type="submit" disabled={saving || !bookingId} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Submitting..." : "Submit review"}</button>
            </form>
          )}
          {eligibility.already_reviewed && <p className="text-sm text-slate-500">You have already submitted a review for this package.</p>}
          {!eligibility.eligible && !eligibility.already_reviewed && sessionStorage.getItem("access_token") && <p className="text-xs text-slate-500">Reviewing is available after your journey is marked COMPLETED and fully paid.</p>}
          {!sessionStorage.getItem("access_token") && <p className="text-xs text-slate-500">Sign in as a customer to submit a review after completing a journey.</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
        </div>
      )}
      {error && !open && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

export default PackageReviews;
