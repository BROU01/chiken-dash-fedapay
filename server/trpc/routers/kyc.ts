import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client";
import { kycDocumentTypeValues, kycDocuments } from "../../../db/schema";
import { createUploadUrl } from "../../r2";
import { protectedProcedure, router } from "../trpc";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB, enforced client-side before requesting the URL

export const kycRouter = router({
  myDocuments: protectedProcedure.query(({ ctx }) =>
    db
      .select({ id: kycDocuments.id, documentType: kycDocuments.documentType, status: kycDocuments.status, createdAt: kycDocuments.createdAt })
      .from(kycDocuments)
      .where(eq(kycDocuments.userId, ctx.userId))
      .orderBy(desc(kycDocuments.createdAt)),
  ),

  requestUploadUrl: protectedProcedure
    .input(z.object({ documentType: z.enum(kycDocumentTypeValues), contentType: z.enum(ALLOWED_CONTENT_TYPES) }))
    .mutation(async ({ ctx, input }) => {
      const extension = input.contentType === "application/pdf" ? "pdf" : input.contentType === "image/png" ? "png" : "jpg";
      const key = `kyc/${ctx.userId}/${input.documentType}/${randomUUID()}.${extension}`;
      const uploadUrl = await createUploadUrl(key, input.contentType);
      return { uploadUrl, key, maxBytes: MAX_UPLOAD_BYTES };
    }),

  confirmUpload: protectedProcedure
    .input(z.object({ documentType: z.enum(kycDocumentTypeValues), key: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(kycDocuments).values({ userId: ctx.userId, documentType: input.documentType, r2Key: input.key, status: "pending" });
      return { status: "pending" as const };
    }),
});
