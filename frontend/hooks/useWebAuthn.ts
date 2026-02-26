import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

const API_BASE = "http://localhost:4000/api";

export const useWebAuthn = () => {
  return {
    register: async (email: string, name: string, occupation: string) => {
      try {
        const res = await fetch(`${API_BASE}/register/options`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, occupation }),
        });
        if (!res.ok) throw new Error(await res.text());
        const options = await res.json();

        const credential = await startRegistration(options);

        const verifyRes = await fetch(`${API_BASE}/register/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, credential }),
        });

        const result = await verifyRes.json();
        if (result.success) return true;
        throw new Error("Verification failed on server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(err);
        throw new Error(err.message || "Registration failed");
      }
    },

    login: async () => {
      try {
        const res = await fetch(`${API_BASE}/login/options`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        // Capture sessionId to authenticate the backend verification state
        const sessionId = data.sessionId;

        // startAuthentication seamlessly allows the WebAuthn API to ask the user
        // which credentials they want to login with if allowCredentials was empty.
        const credential = await startAuthentication(data);

        const verifyRes = await fetch(`${API_BASE}/login/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, credential }),
        });

        const result = await verifyRes.json();
        if (result.success) {
          // Store user details in localStorage for the dashboard page to consume
          if (typeof window !== "undefined") {
            localStorage.setItem("passkey_user", JSON.stringify(result.user));
          }
          return result.user;
        }
        throw new Error("Verification failed on server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(err);
        throw new Error(err.message || "Login failed");
      }
    },
  };
};
