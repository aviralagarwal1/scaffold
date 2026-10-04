#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const defaults = {
  project: "scaffold-production",
  region: "us-east1",
  service: "scaffold",
};

const expectedLiterals = {
  APP_BASE_URL: "https://scaffold.aviralagarwal.com",
  NEXTAUTH_URL: "https://scaffold.aviralagarwal.com",
  EMAIL_FROM: "Scaffold <scaffold@aviralagarwal.com>",
  ANTHROPIC_MODEL: "claude-sonnet-4-5",
  FREE_MONTHLY_TOKEN_LIMIT: "500000",
  FREE_ACTIVE_PUBLICATION_LIMIT: "1",
  FREE_PRICE_CENTS: "0",
  PRO_MONTHLY_TOKEN_LIMIT: "2000000",
  PRO_ACTIVE_PUBLICATION_LIMIT: "3",
  PRO_PRICE_CENTS: "800",
  TOKEN_USAGE_TIME_ZONE: "America/New_York",
};

const expectedSecrets = {
  DATABASE_URL: "scaffold-database-url",
  NEXTAUTH_SECRET: "scaffold-nextauth-secret",
  RESEND_API_KEY: "scaffold-resend-api-key",
  ANTHROPIC_API_KEY: "scaffold-anthropic-api-key",
  STRIPE_SECRET_KEY: "scaffold-stripe-secret-key",
  STRIPE_PRO_PRICE_ID: "scaffold-stripe-pro-price-id",
  STRIPE_WEBHOOK_SECRET: "scaffold-stripe-webhook-secret",
};

const args = parseArgs(process.argv.slice(2));
const project = args.project ?? process.env.GCLOUD_PROJECT ?? defaults.project;
const region = args.region ?? process.env.GCLOUD_REGION ?? defaults.region;
const service = args.service ?? process.env.CLOUD_RUN_SERVICE ?? defaults.service;
const skipSecretValues = args["skip-secret-values"] === true;
const serviceConfig = JSON.parse(
  runGcloud(["run", "services", "describe", service, "--project", project, "--region", region, "--format", "json"]),
);
const actualEnv = Object.fromEntries(
  (serviceConfig.spec?.template?.spec?.containers?.[0]?.env ?? []).map((entry) => [entry.name, entry]),
);

const errors = [];
const expectedNames = new Set([...Object.keys(expectedLiterals), ...Object.keys(expectedSecrets)]);

for (const [name, value] of Object.entries(expectedLiterals)) {
  const actual = actualEnv[name];
  if (!actual) {
    errors.push(`${name} is missing`);
  } else if (actual.value !== value) {
    errors.push(`${name} expected ${quote(value)} but found ${quote(redact(name, actual.value))}`);
  } else if (actual.valueFrom) {
    errors.push(`${name} should be a literal env var, not a secret reference`);
  }
}

for (const [name, secretName] of Object.entries(expectedSecrets)) {
  const actual = actualEnv[name];
  const ref = actual?.valueFrom?.secretKeyRef;
  if (!actual) {
    errors.push(`${name} is missing`);
  } else if (!ref) {
    errors.push(`${name} should reference Secret Manager secret ${secretName}`);
  } else if (ref.name !== secretName || (name === "DATABASE_URL"
    ? (process.env.DATABASE_SECRET_VERSION ? ref.key !== process.env.DATABASE_SECRET_VERSION : !/^\d+$/.test(ref.key))
    : ref.key !== "latest")) {
    errors.push(`${name} has an unexpected secret binding (DATABASE_URL must pin the checked version; other secrets use latest).`);
  }
}

for (const name of Object.keys(actualEnv).sort()) {
  if (!expectedNames.has(name)) {
    errors.push(`${name} is not part of the expected production env contract`);
  }
}

if (!skipSecretValues && existsSync(".env")) {
  const localEnv = parseDotenv(readFileSync(".env", "utf8"));
  for (const [name, secretName] of Object.entries(expectedSecrets)) {
    const expectedValue = localEnv[name];
    if (!expectedValue) {
      errors.push(`local .env is missing ${name}, so ${secretName} cannot be fingerprint-checked`);
      continue;
    }

    const boundSecret = runGcloud([
      "secrets",
      "versions",
      "access",
      actualEnv[name]?.valueFrom?.secretKeyRef?.key ?? "latest",
      "--project",
      project,
      "--secret",
      secretName,
    ]);
    if (boundSecret !== expectedValue) {
      errors.push(
        `${name} Secret Manager fingerprint ${fingerprint(boundSecret)} does not match local .env ${fingerprint(
          expectedValue,
        )}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("Cloud Run env check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Cloud Run env check passed for ${service} in ${project}/${region}.`);

function parseArgs(values) {
  const parsed = {};
  for (const value of values) {
    if (value.startsWith("--") && value.includes("=")) {
      const [key, ...rest] = value.slice(2).split("=");
      parsed[key] = rest.join("=");
    } else if (value.startsWith("--")) {
      parsed[value.slice(2)] = true;
    }
  }
  return parsed;
}

function parseDotenv(contents) {
  const env = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    env[line.slice(0, index).trim()] = line.slice(index + 1);
  }
  return env;
}

function runGcloud(args) {
  if (process.platform === "win32") {
    return execFileSync("cmd.exe", ["/d", "/s", "/c", ["gcloud", ...args].map(cmdQuote).join(" ")], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trimEnd();
  }

  return execFileSync("gcloud", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

function cmdQuote(value) {
  if (/^[A-Za-z0-9_./:=,-]+$/.test(value)) return value;
  return `"${value.replace(/(["^&|<>])/g, "^$1")}"`;
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function quote(value) {
  return JSON.stringify(value ?? "");
}

function redact(name, value) {
  if (!value) return value;
  if (/SECRET|KEY|TOKEN|DATABASE_URL/.test(name) && name !== "TOKEN_USAGE_TIME_ZONE") return "<set>";
  return value;
}
