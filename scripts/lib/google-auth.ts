import { createSign } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

let cached: { token: string; exp: number } | null = null;

export function loadServiceAccount(path: string): ServiceAccount {
  return JSON.parse(readFileSync(path, "utf8")) as ServiceAccount;
}

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function jwtToken(sa: ServiceAccount, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const jwt = `${unsigned}.${sign.sign(sa.private_key, "base64url")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!json.access_token) {
    throw new Error(json.error || "Failed to obtain Google access token");
  }
  return json.access_token;
}

/** Content + Merchant API token from service account (no gcloud). */
export async function googleContentToken(credentialsPath: string): Promise<string> {
  const now = Date.now();
  if (cached && cached.exp > now + 60_000) return cached.token;
  if (!existsSync(credentialsPath)) {
    throw new Error(`Missing credentials: ${credentialsPath}`);
  }
  const sa = loadServiceAccount(credentialsPath);
  const token = await jwtToken(sa, "https://www.googleapis.com/auth/content");
  cached = { token, exp: now + 3500 * 1000 };
  return token;
}

export async function googleWebmastersToken(credentialsPath: string): Promise<string> {
  const sa = loadServiceAccount(credentialsPath);
  return jwtToken(sa, "https://www.googleapis.com/auth/webmasters");
}
