import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { prisma } from "./lib/prisma";
import crypto from "crypto";

dotenv.config();
const app = express();

// WebAuthn (Web Authentication) is a standard for passwordless authentication using public-key cryptography.
// RP stands for Relying Party - the website/service that relies on WebAuthn for user authentication.
// ORIGIN is the expected website origin (e.g., https://example.com) for security verification.
const RP_ID = process.env.RP_ID || "localhost";
const ORIGIN = process.env.EXPECTED_ORIGIN || "http://localhost:3000";

// Temporary storage for authentication challenges during sessions.
// Maps session IDs to challenge strings for verification.
const sessionChallenges = new Map<string, string>();

app.use(cors({ origin: process.env.EXPECTED_ORIGIN, credentials: true }));
app.use(express.json());

// --- REGISTRATION ---
// Endpoint to generate WebAuthn registration options for creating a new passkey.
app.post("/api/register/options", async (req, res) => {
  const { email, name, occupation } = req.body;
  // Upsert user: create if doesn't exist, update if exists.
  let user = await prisma.user.upsert({
    where: { email },
    update: { name, occupation },
    create: { email, name, occupation },
    include: { authenticators: true },
  });

  // Generate registration options for WebAuthn.
  // rpName: Display name of the Relying Party.
  // rpID: Domain identifier for the RP.
  // userID: Unique identifier for the user (converted to Uint8Array).
  // excludeCredentials: Prevents registering the same credential twice.
  // authenticatorSelection: Preferences for the authenticator (e.g., platform vs cross-platform).
  const options = await generateRegistrationOptions({
    rpName: "Stack@CS Systems Demo",
    rpID: RP_ID,
    userID: new Uint8Array(Buffer.from(user.id)),
    userName: email,
    userDisplayName: name || email,
    attestationType: "none",
    excludeCredentials: user.authenticators.map(
      (auth: { credentialID: any }) => ({
        id: Buffer.from(auth.credentialID).toString("base64url"),
        type: "public-key",
      }),
    ),
    authenticatorSelection: {
      residentKey: "preferred", // Allows passkeys to be discoverable (username not required for login).
      userVerification: "preferred", // Prefers biometric/PIN verification.
      authenticatorAttachment: "platform", // Prefers platform authenticators (built-in to device).
    },
  });

  // Store the challenge in the database for later verification.
  await prisma.user.update({
    where: { id: user.id },
    data: { currentChallenge: options.challenge },
  });
  res.json(options);
});

// Endpoint to verify the WebAuthn registration response from the client.
app.post("/api/register/verify", async (req, res) => {
  const { email, credential } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.currentChallenge) return res.status(400).send("Invalid session");

  // Verify the registration response against the stored challenge and expected parameters.
  // expectedChallenge: The challenge sent during registration options.
  // expectedOrigin: The website origin for security.
  // expectedRPID: The Relying Party ID.
  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: user.currentChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });

  if (verification.verified && verification.registrationInfo) {
    // Extract credential details from the verified response.
    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;
    // Store the authenticator in the database.
    await prisma.authenticator.create({
      data: {
        credentialID: Buffer.from(credential.id, "base64url"), // Unique credential identifier.
        publicKey: Buffer.from(credential.publicKey), // Public key for verification.
        counter: BigInt(credential.counter), // Signature counter to prevent replay attacks.
        userId: user.id,
        credentialDeviceType, // Type of device (e.g., platform, cross-platform).
        credentialBackedUp, // Whether the credential is backed up (for passkey syncing).
      },
    });
    // Clear the challenge after successful registration.
    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: null },
    });
    return res.json({ success: true });
  }
  res.status(400).json({ error: "Verification failed" });
});

// --- AUTHENTICATION ---
// Endpoint to generate WebAuthn authentication options for login.
app.post("/api/login/options", async (req, res) => {
  // Generate authentication options.
  // rpID: Relying Party ID.
  // userVerification: Prefers biometric/PIN verification.
  // By omitting allowCredentials, we enable Discoverable Credentials (passkeys),
  // allowing the browser to prompt the user to select their identity without specifying credentials.
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
  });

  // Create a session ID and store the challenge temporarily.
  const sessionId = crypto.randomBytes(16).toString("hex");
  sessionChallenges.set(sessionId, options.challenge);

  res.json({ ...options, sessionId });
});

// Endpoint to verify the WebAuthn authentication response from the client.
app.post("/api/login/verify", async (req, res) => {
  const { sessionId, credential } = req.body;
  const expectedChallenge = sessionChallenges.get(sessionId);

  if (!expectedChallenge) {
    return res.status(400).send("Session expired or invalid");
  }

  // Find the authenticator matching the credential ID from the response.
  let authenticator = await prisma.authenticator.findUnique({
    where: { credentialID: Buffer.from(credential.id, "base64url") },
    include: { user: true },
  });

  if (!authenticator)
    return res.status(400).send("Auth failed - no matching passkey");

  const user = authenticator.user;

  // Verify the authentication response.
  // expectedChallenge: The challenge from the session.
  // expectedOrigin: Website origin for security.
  // expectedRPID: Relying Party ID.
  // credential: Stored authenticator data for verification.
  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: Buffer.from(authenticator.credentialID).toString("base64url"),
      publicKey: new Uint8Array(authenticator.publicKey),
      counter: Number(authenticator.counter), // Current signature counter.
      transports: authenticator.transports
        ? (authenticator.transports.split(",") as any) // Transport methods (e.g., usb, nfc).
        : undefined,
    },
  });

  if (verification.verified) {
    // Update the counter to prevent replay attacks.
    await prisma.authenticator.update({
      where: { credentialID: authenticator.credentialID },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });
    // Clean up the session challenge.
    sessionChallenges.delete(sessionId);
    return res.json({ success: true, user });
  }
  res.status(400).json({ error: "Failed" });
});

app.listen(4000, () => console.log("Backend: http://localhost:4000"));
