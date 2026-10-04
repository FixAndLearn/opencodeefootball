import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, listingSchema } from "@/lib/validation/schemas";

describe("registerSchema", () => {
  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      first_name: "Ada",
      last_name: "M",
      username: "ada_m",
      email: "ada@example.com",
      country_code: "KE",
      phone: "254700000000",
      password: "Password1",
      confirm_password: "Password2",
      accept_terms: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      first_name: "Ada",
      last_name: "M",
      username: "ada_m",
      email: "ada@example.com",
      country_code: "KE",
      phone: "254700000000",
      password: "Password1",
      confirm_password: "Password1",
      accept_terms: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("requires a valid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("listingSchema", () => {
  it("requires a positive price", () => {
    const result = listingSchema.safeParse({
      title: "Fresh account",
      description: "A complete account with many players",
      price_amount: -5,
      platform_id: crypto.randomUUID(),
    });
    expect(result.success).toBe(false);
  });
});
