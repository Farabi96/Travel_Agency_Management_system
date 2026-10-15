 
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
