import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";

export const msraRouter = router({
  /**
   * Join the MSRA waitlist — stores email for launch notification.
   */
  joinWaitlist: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { sql } = await import("drizzle-orm");

      // Check if email already on waitlist
      const existing = await db.execute(
        sql`SELECT id FROM msra_waitlist WHERE email = ${input.email} LIMIT 1`
      );
      const rows = Array.isArray(existing) && Array.isArray(existing[0]) ? existing[0] : existing;
      if ((rows as any[]).length > 0) {
        return { success: true, message: "You're already on the waitlist!" };
      }

      // Insert new email
      await db.execute(
        sql`INSERT INTO msra_waitlist (email) VALUES (${input.email})`
      );
      return { success: true, message: "You've been added to the MSRA waitlist!" };
    }),
});
