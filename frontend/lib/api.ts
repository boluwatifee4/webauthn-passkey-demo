const API_URL = "http://localhost:4000/api";

export const api = {
  post: async <T = Record<string, unknown>>(endpoint: string, data: T) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
