
const API_BASE_URL = "http://127.0.0.1:5000/api";

// ------------------------------
// AUTHENTICATED REQUEST HELPER
// ------------------------------

async function authenticatedRequest(path, options = {}) {
  const token = sessionStorage.getItem("access_token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.msg || `Request failed (${response.status})`
    );
  }

  return data;
}

// ------------------------------
// DESTINATIONS
// ------------------------------

export async function getDestinations() {
  const response = await fetch(`${API_BASE_URL}/destinations/`);

  if (!response.ok) {
    throw new Error("Failed to load destinations");
  }

  return response.json();
}

export async function createDestination(destination) {
  return authenticatedRequest("/destinations/", {
    method: "POST",
    body: JSON.stringify(destination),
  });
}

export async function updateDestination(destinationId, destination) {
  return authenticatedRequest(`/destinations/${destinationId}`, {
    method: "PUT",
    body: JSON.stringify(destination),
  });
}

export async function deleteDestination(destinationId) {
  return authenticatedRequest(`/destinations/${destinationId}`, {
    method: "DELETE",
  });
}

// Upload an image to Flask. Do not set Content-Type manually for FormData;
// the browser must add the multipart boundary.
export async function uploadImage(file, entityType) {
  const token = sessionStorage.getItem("access_token");
  const body = new FormData();
  body.append("image", file);
  body.append("entity_type", entityType);

  const response = await fetch(`${API_BASE_URL}/uploads/`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.msg || `Image upload failed (${response.status})`);
  }
  return data;
}


 // ------------------------------
// TOUR PACKAGES
// ------------------------------

export async function getPackages() {
  const response = await fetch(`${API_BASE_URL}/packages/`);

  if (!response.ok) {
    throw new Error("Failed to load tour packages");
  }

  return response.json();
}

export async function createPackage(packageData) {
  return authenticatedRequest("/packages/", {
    method: "POST",
    body: JSON.stringify(packageData),
  });
}

export async function updatePackage(packageId, packageData) {
  return authenticatedRequest(`/packages/${packageId}`, {
    method: "PUT",
    body: JSON.stringify(packageData),
  });
}

export async function deletePackage(packageId) {
  return authenticatedRequest(`/packages/${packageId}`, {
    method: "DELETE",
  });
}


 // ------------------------------
// TOUR SCHEDULES
// ------------------------------

export async function getSchedules(packageId) {
  const query = packageId
    ? `?package_id=${encodeURIComponent(packageId)}`
    : "";

  const response = await fetch(`${API_BASE_URL}/schedules/${query}`);

  if (!response.ok) {
    throw new Error("Failed to load tour schedules");
  }

  return response.json();
}

export async function getScheduleAvailability(scheduleId) {
  const response = await fetch(
    `${API_BASE_URL}/schedules/${encodeURIComponent(scheduleId)}/availability`
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Failed to load seat availability");
  }

  return data;
}


export async function createSchedule(scheduleData) {
  return authenticatedRequest("/schedules/", {
    method: "POST",
    body: JSON.stringify(scheduleData),
  });
}

export async function updateSchedule(scheduleId, scheduleData) {
  return authenticatedRequest(`/schedules/${scheduleId}`, {
    method: "PUT",
    body: JSON.stringify(scheduleData),
  });
}

export async function cancelSchedule(scheduleId) {
  return authenticatedRequest(`/schedules/${scheduleId}`, {
    method: "DELETE",
  });
}




// ------------------------------
// LOGIN
// ------------------------------

export async function loginUser(credentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.msg || "Login failed");
  }

  return data;
}

// ------------------------------
// CURRENT USER
// ------------------------------

export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.msg || "Failed to get current user");
  }

  return data;
}

// ------------------------------
// REGISTRATION
// ------------------------------

export async function registerUser(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.msg || "Registration failed");
  }

  return data;
}


export async function createOwnCustomerProfile(profileData) {
  return authenticatedRequest("/customers/me", {
    method: "POST",
    body: JSON.stringify(profileData),
  });
}

export async function getOwnCustomerProfile() {
  const token = sessionStorage.getItem("access_token");

  const response = await fetch(`${API_BASE_URL}/customers/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 404 && data.profile_exists === false) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      data.error || data.msg || `Request failed (${response.status})`
    );
  }

  return data.customer;
}

export async function updateOwnCustomerProfile(profileData) {
  return authenticatedRequest("/customers/me", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
}


export async function changePassword(passwordData) {
  return authenticatedRequest("/auth/change-password", {
    method: "PUT",
    body: JSON.stringify(passwordData),
  });
}


// ------------------------------
// CUSTOMER PAYMENT WORKFLOW
// ------------------------------
export async function getPaymentMethods() {
  return authenticatedRequest("/payments/methods");
}

export async function createPaymentRequest(paymentData) {
  return authenticatedRequest("/payments/", {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
}

export async function getBookingPayments(bookingId) {
  return authenticatedRequest(`/payments/booking/${encodeURIComponent(bookingId)}`);
}

export async function recordOfflinePayment(paymentData) {
  return authenticatedRequest("/payments/record", {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
}


/* ==============================
   BOOKINGS
============================== */

export async function getBookings() {
  return authenticatedRequest("/bookings/");
}

export async function createBooking(bookingData) {
  return authenticatedRequest("/bookings/", {
    method: "POST",
    body: JSON.stringify({
      package_id: bookingData.package_id,
      schedule_id: bookingData.schedule_id,
      number_of_travelers: bookingData.number_of_travelers,
      special_request: bookingData.special_request || "",
    }),
  });
}

export async function getBooking(bookingId) {
  return authenticatedRequest(
    `/bookings/${encodeURIComponent(bookingId)}`
  );
}

export async function getMyBookings() {
  return authenticatedRequest("/bookings/mine");
}

export async function getMyPayments() {
  return authenticatedRequest("/payments/mine");
}



/* ==============================
   INVOICES
============================== */

export async function getInvoices() {
  return authenticatedRequest("/invoices/");
}

export async function getInvoice(invoiceId) {
  return authenticatedRequest(
    `/invoices/${encodeURIComponent(invoiceId)}`
  );
}

export async function getInvoiceByBooking(bookingId) {
  return authenticatedRequest(
    `/invoices/booking/${encodeURIComponent(bookingId)}`
  );
}

export async function createInvoice(invoiceData) {
  return authenticatedRequest("/invoices/", {
    method: "POST",
    body: JSON.stringify(invoiceData),
  });
}

/* ==============================
   PAYMENT MANAGEMENT
============================== */

export async function getPaymentOverview() {
  return authenticatedRequest("/payments/overview");
}

export async function updatePaymentStatus(paymentId, statusName) {
  return authenticatedRequest(
    `/payments/${encodeURIComponent(paymentId)}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ status_name: statusName }),
    }
  );
}


/* ==============================
   PACKAGE REVIEWS
============================== */

export async function getPackageReviews(packageId) {
  const response = await fetch(`${API_BASE_URL}/reviews/package/${encodeURIComponent(packageId)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Failed to load package reviews");
  return data;
}

export async function getReviewEligibility(packageId) {
  return authenticatedRequest(`/reviews/eligibility/${encodeURIComponent(packageId)}`);
}

export async function createReview(reviewData) {
  return authenticatedRequest("/reviews/", {
    method: "POST",
    body: JSON.stringify(reviewData),
  });
}

export async function cancelBooking(bookingId) {
  return authenticatedRequest(`/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ terms_accepted: true }),
  });
}



export async function getBookingTracking() {
  return authenticatedRequest("/bookings/tracking");
}


/* ==============================
   CUSTOMER NOTIFICATIONS
============================== */

export async function getNotifications() {
  return authenticatedRequest("/notifications/");
}

export async function markNotificationRead(notificationId) {
  return authenticatedRequest(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "PUT",
    }
  );
}


/* ==============================
   STAFF / ADMIN NOTIFICATIONS
============================== */

export async function getStaffNotifications() {
  return authenticatedRequest("/staff-notifications/");
}

export async function getStaffUnreadNotificationCount() {
  return authenticatedRequest("/staff-notifications/unread-count");
}

export async function markStaffNotificationRead(notificationId) {
  return authenticatedRequest(
    `/staff-notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "PUT",
    }
  );
}


// Get reviews submitted by the currently logged-in customer
export async function getMyReviews() {
  return authenticatedRequest("/reviews/");
}

// Update an existing customer review
export async function updateReview(reviewId, reviewData) {
  return authenticatedRequest(
    `/reviews/${encodeURIComponent(reviewId)}`,
    {
      method: "PUT",
      body: JSON.stringify(reviewData),
    }
  );
}



/* ==============================
   REFUND MANAGEMENT
============================== */

export async function getRefunds() {
  return authenticatedRequest("/admin/refunds");
}

export async function updateRefund(refundId, refundData) {
  return authenticatedRequest(
    `/admin/refunds/${encodeURIComponent(refundId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(refundData),
    }
  );
}
export async function getAuditLogs() {
  return authenticatedRequest('/audit-logs/');
}

export async function getTravelCalendar() {
  return authenticatedRequest("/bookings/travel-calendar");
}


export async function markAllStaffNotificationsRead() {
  return authenticatedRequest("/staff-notifications/read-all", {
    method: "PUT",
  });
}
