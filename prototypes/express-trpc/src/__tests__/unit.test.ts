import { describe, it, expect, beforeEach } from "vitest";
import { createTransactionSchema } from "../router.js";

describe("createTransactionSchema", () => {
  it("accepts a valid transaction", () => {
    const input = {
      description: "Groceries",
      amount: "1250.50",
      currency: "MXN",
    };
    expect(createTransactionSchema.parse(input)).toEqual(input);
  });

  it("rejects an invalid currency", () => {
    expect(() =>
      createTransactionSchema.parse({
        description: "Groceries",
        amount: "1250.50",
        currency: "Pesos",
      })
    ).toThrow();
  });

  it("rejects malformed money", () => {
    expect(() =>
      createTransactionSchema.parse({
        description: "Groceries",
        amount: "12.50.1",
        currency: "MXN",
      })
    ).toThrow();
  });
});
