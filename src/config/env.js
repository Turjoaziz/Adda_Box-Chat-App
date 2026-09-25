// Validate settings before connecting to MongoDB or accepting requests.
// Report variable names only: connection strings and secrets must stay private.
export function validateEnv(env) {
  const problems = [];

  for (const name of ["MONGO_URI", "JWT_SECRET"]) {
    if (typeof env[name] !== "string" || !env[name].trim()) {
      problems.push(`${name} is required.`);
    }
  }

  if (typeof env.JWT_SECRET === "string" && env.JWT_SECRET.trim() === "replace-with-a-generated-random-secret") {
    problems.push("JWT_SECRET must be replaced with a generated secret; do not use the .env.example placeholder.");
  }

  // An omitted or empty PORT keeps the existing default of 4000.
  const rawPort = env.PORT === undefined || env.PORT === "" ? "4000" : String(env.PORT);
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push("PORT must be a whole number between 1 and 65535.");
  }

  if (problems.length) {
    throw new Error(`Invalid configuration:\n- ${problems.join("\n- ")}\nCheck your .env file or hosting environment settings.`);
  }

  return { port };
}
