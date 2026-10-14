
const API_BASE_URL = "http://127.0.0.1:5000/api";

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
    throw new Error(data.error || "Login failed");
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
    throw new Error(data.error || "Failed to get current user");
  }

  return data;
}



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
    throw new Error(data.error || "Registration failed");
  }

  return data;
}
