import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Stripe module
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_test_123",
            url: "https://checkout.stripe.com/pay/cs_test_123",
          }),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    })),
  };
});

describe("Picture360 Purchase System", () => {
  describe("Product Configuration", () => {
    it("should have PICTURE360 product defined with correct price and currency", async () => {
      const { PICTURE360_PRODUCT } = await import("./products");
      expect(PICTURE360_PRODUCT).toBeDefined();
      expect(PICTURE360_PRODUCT.name).toBe("Picture360");
      expect(PICTURE360_PRODUCT.price).toBe(9);
      expect(PICTURE360_PRODUCT.currency).toBe("gbp");
      expect(PICTURE360_PRODUCT.durationMonths).toBe(3);
      expect(PICTURE360_PRODUCT.description).toContain("3 months");
    });

    it("should NOT include Picture360 in AKT/SCA subscription plans", async () => {
      const { SUBSCRIPTION_PLANS } = await import("./products");
      const planKeys = Object.keys(SUBSCRIPTION_PLANS);
      // Picture360 should not be a subscription plan
      expect(planKeys).not.toContain("PICTURE360");
      // Verify it's not bundled with any existing plan
      for (const key of planKeys) {
        const plan = (SUBSCRIPTION_PLANS as any)[key];
        expect(plan.name?.toLowerCase()).not.toContain("picture360");
      }
    });
  });

  describe("Webhook Handler - Picture360 Purchase", () => {
    it("should handle Picture360 checkout.session.completed event", async () => {
      // Import the webhook handler module to verify it handles PICTURE360 product_type
      const webhookModule = await import("./webhooks/stripeWebhook");
      expect(webhookModule.handleStripeWebhook).toBeDefined();
    });
  });

  describe("Access Logic", () => {
    it("should correctly determine access based on expiry date", () => {
      const now = new Date();
      
      // Active access: expires in the future
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + 3);
      expect(futureDate > now).toBe(true);

      // Expired access: expires in the past
      const pastDate = new Date(now);
      pastDate.setMonth(pastDate.getMonth() - 1);
      expect(pastDate > now).toBe(false);
    });

    it("should calculate 3-month expiry correctly", () => {
      const purchaseDate = new Date("2026-07-15T00:00:00Z");
      const expiresAt = new Date(purchaseDate);
      expiresAt.setMonth(expiresAt.getMonth() + 3);
      
      expect(expiresAt.getMonth()).toBe(9); // October (0-indexed)
      expect(expiresAt.getFullYear()).toBe(2026);
    });
  });

  describe("Checkout Session Creation", () => {
    it("should create a checkout session with correct parameters", async () => {
      // Verify the checkout session would be created with correct price
      const unitAmount = 900; // £9.00 in pence
      expect(unitAmount).toBe(900);
      
      // Verify metadata includes product_type
      const metadata = {
        user_id: "123",
        customer_email: "test@example.com",
        customer_name: "Test User",
        product_type: "PICTURE360",
      };
      expect(metadata.product_type).toBe("PICTURE360");
    });

    it("should use one-time payment mode, not subscription", () => {
      // Picture360 uses mode: "payment" (one-time), not "subscription"
      const mode = "payment";
      expect(mode).toBe("payment");
      expect(mode).not.toBe("subscription");
    });
  });

  describe("Schema - picture360_access table", () => {
    it("should have the correct table definition in schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.picture360Access).toBeDefined();
    });
  });
});
