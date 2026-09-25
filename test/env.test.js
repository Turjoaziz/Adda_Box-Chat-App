import test from "node:test";
import assert from "node:assert/strict";
import { validateEnv } from "../src/config/env.js";

const valid = {
  MONGO_URI: "mongodb://127.0.0.1:27017/adda_box_test",
  JWT_SECRET: "test-only-secret-never-use-in-production"
};

test("valid configuration preserves the default port without changing input", () => {
  const env = Object.freeze({ ...valid });
  assert.deepEqual(validateEnv(env), { port: 4000 });
  assert.deepEqual(validateEnv({ ...valid, PORT: "" }), { port: 4000 });
});

test("accepts a hosting port and both valid port boundaries", () => {
  for (const port of ["1", "10000", "65535"]) {
    assert.equal(validateEnv({ ...valid, PORT: port }).port, Number(port));
  }
});

test("reports all missing required settings together", () => {
  assert.throws(() => validateEnv({}), (error) => {
    assert.match(error.message, /MONGO_URI is required/);
    assert.match(error.message, /JWT_SECRET is required/);
    assert.match(error.message, /hosting environment settings/);
    return true;
  });
});

test("rejects empty and whitespace-only required settings", () => {
  for (const name of ["MONGO_URI", "JWT_SECRET"]) {
    for (const value of [undefined, "", " \t "]) {
      assert.throws(() => validateEnv({ ...valid, [name]: value }), new RegExp(`${name} is required`));
    }
  }
});

test("rejects the sample JWT placeholder", () => {
  assert.throws(
    () => validateEnv({ ...valid, JWT_SECRET: " replace-with-a-generated-random-secret " }),
    /JWT_SECRET must be replaced/
  );
});

test("rejects invalid ports rather than treating them as named pipes", () => {
  for (const port of ["0", "-1", "65536", "4000.5", "4e3", "abc", " ", "NaN", "Infinity"]) {
    assert.throws(() => validateEnv({ ...valid, PORT: port }), /PORT must be a whole number/);
  }
});

test("configuration errors never echo supplied secrets or database credentials", () => {
  const env = {
    MONGO_URI: "mongodb://example-user:private-db-password@example.invalid/chat",
    JWT_SECRET: "private-signing-secret",
    PORT: "private-invalid-port"
  };
  assert.throws(() => validateEnv(env), (error) => {
    for (const value of Object.values(env)) assert.ok(!error.message.includes(value));
    assert.ok(!error.message.includes("private-db-password"));
    return true;
  });
});
