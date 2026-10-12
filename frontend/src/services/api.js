 
const API_BASE_URL = "http://127.0.0.1:5000/api";

export async function getDestinations() {
  const response = await fetch(`${API_BASE_URL}/destinations/`);

  if (!response.ok) {
    throw new Error("Failed to load destinations");
  }

  return response.json();
}

export async function getPackages() {
  const response = await fetch(`${API_BASE_URL}/packages/`);

  if (!response.ok) {
    throw new Error("Failed to load tour packages");
  }

  return response.json();
}
