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

const sessionChallenges = new Map<string, string>();

app.use(cors({ origin: process.env.EXPECTED_ORIGIN, credentials: true }));
app.use(express.json());

const RP_ID = process.env.RP_ID || "localhost";
const ORIGIN = process.env.EXPECTED_ORIGIN || "http://localhost:3000";

// --- REGISTRATION ---
app.post("/api/register/options", async (req, res) => {
  const { email, name, occupation } = req.body;
  let user = await prisma.user.upsert({
    where: { email },
    update: { name, occupation },
    create: { email, name, occupation },
    include: { authenticators: true },
  });

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
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { currentChallenge: options.challenge },
  });
  res.json(options);
});

app.post("/api/register/verify", async (req, res) => {
  const { email, credential } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.currentChallenge) return res.status(400).send("Invalid session");

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: user.currentChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;
    await prisma.authenticator.create({
      data: {
        credentialID: Buffer.from(credential.id, "base64url"),
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        userId: user.id,
        credentialDeviceType,
        credentialBackedUp,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: null },
    });
    return res.json({ success: true });
  }
  res.status(400).json({ error: "Verification failed" });
});

// --- AUTHENTICATION ---
app.post("/api/login/options", async (req, res) => {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    // By omitting allowCredentials, we enable Discoverable Credentials
    // where the browser prompts the user to select their identity.
  });

  const sessionId = crypto.randomBytes(16).toString("hex");
  sessionChallenges.set(sessionId, options.challenge);

  res.json({ ...options, sessionId });
});

app.post("/api/login/verify", async (req, res) => {
  const { sessionId, credential } = req.body;
  const expectedChallenge = sessionChallenges.get(sessionId);

  if (!expectedChallenge) {
    return res.status(400).send("Session expired or invalid");
  }

  // Find the exact authenticator from the credential ID WebAuthn passed back
  let authenticator = await prisma.authenticator.findUnique({
    where: { credentialID: Buffer.from(credential.id, "base64url") },
    include: { user: true },
  });

  if (!authenticator)
    return res.status(400).send("Auth failed - no matching passkey");

  const user = authenticator.user;

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: Buffer.from(authenticator.credentialID).toString("base64url"),
      publicKey: new Uint8Array(authenticator.publicKey),
      counter: Number(authenticator.counter),
      transports: authenticator.transports
        ? (authenticator.transports.split(",") as any)
        : undefined,
    },
  });

  if (verification.verified) {
    await prisma.authenticator.update({
      where: { credentialID: authenticator.credentialID },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });
    sessionChallenges.delete(sessionId);
    return res.json({ success: true, user });
  }
  res.status(400).json({ error: "Failed" });
});

app.listen(4000, () => console.log("Backend: http://localhost:4000"));
