import { z } from "zod";
import { publicProcedure, adminProcedure } from "./_core/trpc";
import { adBanners } from "../drizzle/schema";
import { eq, asc } from "drizzle-orm";
import { router } from "./_core/trpc";

async function db() {
  const { getDb } = await import("./db");
  return await getDb();
}

export const adBannerRouter = router({
  // Public: get active banners for homepage
  getActiveBanners: publicProcedure.query(async () => {
    const d = await db();
    const banners = await d!
      .select()
      .from(adBanners)
      .where(eq(adBanners.isActive, 1))
      .orderBy(asc(adBanners.position));
    return banners;
  }),

  // Admin: get all banners
  getAll: adminProcedure.query(async () => {
    const d = await db();
    return d!.select().from(adBanners).orderBy(asc(adBanners.position));
  }),

  // Admin: create banner
  create: adminProcedure
    .input(z.object({
      title: z.string(),
      imageUrl: z.string(),
      destinationUrl: z.string(),
      position: z.number().default(1),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const d = await db();
      await d!.insert(adBanners).values({
        title: input.title,
        imageUrl: input.imageUrl,
        destinationUrl: input.destinationUrl,
        position: input.position,
        isActive: input.isActive ? 1 : 0,
      });
      return { success: true };
    }),

  // Admin: update banner
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      imageUrl: z.string().optional(),
      destinationUrl: z.string().optional(),
      position: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await db();
      const updates: any = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;
      if (input.destinationUrl !== undefined) updates.destinationUrl = input.destinationUrl;
      if (input.position !== undefined) updates.position = input.position;
      if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0;
      await d!.update(adBanners).set(updates).where(eq(adBanners.id, input.id));
      return { success: true };
    }),

  // Admin: delete banner
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await db();
      await d!.delete(adBanners).where(eq(adBanners.id, input.id));
      return { success: true };
    }),
});
