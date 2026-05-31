import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const adminRouter = router({
  // Coupon Management
  getCoupons: adminProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // In a real app, query the coupons table
    // For now, return mock data
    return [
      {
        id: 1,
        code: "WELCOME20",
        discountPercent: 20,
        maxUses: 100,
        usedCount: 45,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      {
        id: 2,
        code: "SUMMER50",
        discountPercent: 50,
        maxUses: 50,
        usedCount: 50,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: false,
      },
    ];
  }),

  createCoupon: adminProcedure
    .input(
      z.object({
        code: z.string().min(3).max(20),
        discountPercent: z.number().min(1).max(100),
        maxUses: z.number().min(1),
        expiryDate: z.date().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      // In a real app, insert into coupons table
      console.log("[Admin] Creating coupon:", input);
      return {
        id: Math.random(),
        ...input,
        usedCount: 0,
        isActive: true,
      };
    }),

  deleteCoupon: adminProcedure
    .input(z.number())
    .mutation(async ({ input: couponId }) => {
      // In a real app, delete from coupons table
      console.log("[Admin] Deleting coupon:", couponId);
      return { success: true };
    }),

  // User Management
  getUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Mock data for now
      return {
        users: [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            role: "user",
            createdAt: new Date(),
            subscriptionStatus: "active",
          },
          {
            id: 2,
            name: "Jane Smith",
            email: "jane@example.com",
            role: "user",
            createdAt: new Date(),
            subscriptionStatus: "trial",
          },
        ],
        total: 2,
      };
    }),

  promoteToAdmin: adminProcedure
    .input(z.number())
    .mutation(async ({ input: userId }) => {
      console.log("[Admin] Promoting user to admin:", userId);
      return { success: true };
    }),

  assignFreeTrial: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        days: z.number().default(7),
      })
    )
    .mutation(async ({ input }) => {
      console.log("[Admin] Assigning free trial:", input);
      return { success: true };
    }),

  // Analytics
  getAnalytics: adminProcedure.query(async () => {
    // Mock analytics data
    return {
      dau: 1250,
      mau: 8500,
      mrr: 42500,
      churnRate: 5.2,
      retentionCohorts: [
        { cohort: "Week 1", retention: 85 },
        { cohort: "Week 2", retention: 72 },
        { cohort: "Week 3", retention: 65 },
        { cohort: "Week 4", retention: 58 },
      ],
      topSpecialties: [
        { specialty: "USMLE Step 1", users: 3200 },
        { specialty: "USMLE Step 2", users: 2800 },
        { specialty: "MRCP", users: 1500 },
        { specialty: "PLAB 2", users: 900 },
      ],
    };
  }),
});
