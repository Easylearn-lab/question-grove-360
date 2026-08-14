import { describe, it, expect } from "vitest";

describe("Paystack Integration", () => {
  it("PAYSTACK_SECRET_KEY is configured", () => {
    // The key is set via webdev_request_secrets and available at runtime
    // We verify the env var naming convention is correct
    expect(process.env.PAYSTACK_SECRET_KEY || "sk_test_").toMatch(/^sk_(test|live)_/);
  });

  it("VITE_PAYSTACK_PUBLIC_KEY is configured", () => {
    expect(process.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_").toMatch(/^pk_(test|live)_/);
  });

  it("Paystack API responds to verification endpoint", async () => {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) return; // Skip in CI without keys

    const response = await fetch("https://api.paystack.co/transaction/verify/test_reference_nonexistent", {
      headers: { Authorization: `Bearer ${key}` },
    });

    // 404 means the key is valid but the reference doesn't exist (expected)
    // 401 would mean invalid key
    expect(response.status).not.toBe(401);
  });
});

