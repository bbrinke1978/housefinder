"use server";

import { db } from "@/db/client";
import {
  contracts,
  contractSigners,
  deals,
  campaignEnrollments,
  leads,
} from "@/db/schema";
import type { ContractRow, ContractSignerRow } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import crypto from "crypto";
import { z } from "zod/v4";
import { Resend } from "resend";
import { getMailSettings } from "@/lib/mail-settings-actions";
import { getContractById } from "@/lib/contract-queries";
import { generateContractPdf } from "@/lib/contract-pdf";
import { uploadContract } from "@/lib/blob-storage";
import type { ContractWithSigners } from "@/types";

// ── createContract ──────────────────────────────────────────────────────────

const createContractSchema = z.object({
  dealId: z.uuid(),
  contractType: z.enum(["purchase_agreement", "assignment"]),
  propertyAddress: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  county: z.string().max(100).optional(),
  parcelId: z.string().max(100).optional(),
  sellerName: z.string().max(255).optional(),
  buyerName: z.string().max(255).optional(),
  purchasePrice: z.number().int().positive().optional(),
  arv: z.number().int().positive().optional(),
  assignmentFee: z.number().int().nonnegative().optional(),
  earnestMoney: z.number().int().nonnegative().optional(),
  inspectionPeriodDays: z.number().int().positive().optional(),
  closingDays: z.number().int().positive().optional(),
  clauses: z.string().optional(), // JSON string of ContractClause[]
  signerOneName: z.string().min(1).max(255),
  signerOneEmail: z.string().email().max(255),
  signerTwoName: z.string().min(1).max(255),
  signerTwoEmail: z.string().email().max(255),
});

/**
 * createContract — create a new contract in draft status with two signers.
 * Signer order: 1 = seller/buyer (external), 2 = wholesaler (you).
 */
export async function createContract(
  formData: FormData
): Promise<{ id: string } | { error: string }> {
  try {
    const parseOptionalInt = (key: string) => {
      const val = formData.get(key) as string | null;
      if (!val || val.trim() === "") return undefined;
      const n = parseInt(val, 10);
      return isNaN(n) ? undefined : n;
    };
    const parseOptionalStr = (key: string) => {
      const val = formData.get(key) as string | null;
      return val && val.trim().length > 0 ? val.trim() : undefined;
    };

    const raw = {
      dealId: formData.get("dealId") as string,
      contractType: formData.get("contractType") as string,
      propertyAddress: formData.get("propertyAddress") as string,
      city: formData.get("city") as string,
      county: parseOptionalStr("county"),
      parcelId: parseOptionalStr("parcelId"),
      sellerName: parseOptionalStr("sellerName"),
      buyerName: parseOptionalStr("buyerName"),
      purchasePrice: parseOptionalInt("purchasePrice"),
      arv: parseOptionalInt("arv"),
      assignmentFee: parseOptionalInt("assignmentFee"),
      earnestMoney: parseOptionalInt("earnestMoney"),
      inspectionPeriodDays: parseOptionalInt("inspectionPeriodDays"),
      closingDays: parseOptionalInt("closingDays"),
      clauses: parseOptionalStr("clauses"),
      signerOneName: formData.get("signerOneName") as string,
      signerOneEmail: formData.get("signerOneEmail") as string,
      signerTwoName: formData.get("signerTwoName") as string,
      signerTwoEmail: formData.get("signerTwoEmail") as string,
    };

    const parsed = createContractSchema.parse(raw);

    const [inserted] = await db
      .insert(contracts)
      .values({
        dealId: parsed.dealId,
        contractType: parsed.contractType,
        status: "draft",
        propertyAddress: parsed.propertyAddress,
        city: parsed.city,
        county: parsed.county ?? null,
        parcelId: parsed.parcelId ?? null,
        sellerName: parsed.sellerName ?? null,
        buyerName: parsed.buyerName ?? null,
        purchasePrice: parsed.purchasePrice ?? null,
        arv: parsed.arv ?? null,
        assignmentFee: parsed.assignmentFee ?? null,
        earnestMoney: parsed.earnestMoney ?? 100,
        inspectionPeriodDays: parsed.inspectionPeriodDays ?? 10,
        closingDays: parsed.closingDays ?? 30,
        clauses: parsed.clauses ?? null,
      })
      .returning({ id: contracts.id });

    // Determine signer roles based on contract type
    const signerOneRole =
      parsed.contractType === "purchase_agreement" ? "seller" : "buyer";
    const signerTwoRole = "wholesaler";

    await db.insert(contractSigners).values([
      {
        contractId: inserted.id,
        signerOrder: 1,
        signerRole: signerOneRole,
        signerName: parsed.signerOneName,
        signerEmail: parsed.signerOneEmail,
        signingToken: crypto.randomUUID(),
        tokenExpiresAt: null, // set when sent
      },
      {
        contractId: inserted.id,
        signerOrder: 2,
        signerRole: signerTwoRole,
        signerName: parsed.signerTwoName,
        signerEmail: parsed.signerTwoEmail,
        signingToken: crypto.randomUUID(),
        tokenExpiresAt: null, // set after signer 1 completes
      },
    ]);

    revalidatePath(`/deals/${parsed.dealId}`);

    return { id: inserted.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create contract";
    return { error: message };
  }
}

// ── sendForSigning ──────────────────────────────────────────────────────────

/**
 * sendForSigning — move contract from draft to sent, activate first signer's token,
 * and email the signing invitation to signer 1.
 */
export async function sendForSigning(
  contractId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const contractRows = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);

    if (contractRows.length === 0) return { error: "Contract not found" };
    const contract = contractRows[0];

    if (contract.status !== "draft") {
      return { error: "Contract must be in draft status to send" };
    }

    // Set token expiry for signer 1 (72 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    const signerRows = await db
      .select()
      .from(contractSigners)
      .where(
        and(
          eq(contractSigners.contractId, contractId),
          eq(contractSigners.signerOrder, 1)
        )
      )
      .limit(1);

    if (signerRows.length === 0) return { error: "Signer not found" };
    const signer = signerRows[0];

    await db
      .update(contractSigners)
      .set({ tokenExpiresAt: expiresAt })
      .where(eq(contractSigners.id, signer.id));

    await db
      .update(contracts)
      .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(contracts.id, contractId));

    // Send signing invitation email
    await sendSigningInvitationEmail(signer, contract);

    revalidatePath(`/deals/${contract.dealId}`);
    revalidatePath("/contracts");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send contract";
    return { error: message };
  }
}

// ── submitSignature ──────────────────────────────────────────────────────────

/**
 * submitSignature — record a signer's signature, hash the document, advance status.
 */
export async function submitSignature(
  token: string,
  signatureData: string,
  signatureType: "drawn" | "typed"
): Promise<{ success: true } | { error: string }> {
  try {
    const now = new Date();
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const userAgent = headersList.get("user-agent") ?? "unknown";

    // Verify token: exists, not expired, not already signed
    const signerRows = await db
      .select()
      .from(contractSigners)
      .where(eq(contractSigners.signingToken, token))
      .limit(1);

    if (signerRows.length === 0) {
      return { error: "Invalid signing link" };
    }

    const signer = signerRows[0];

    if (signer.signedAt) {
      return { error: "This document has already been signed" };
    }

    if (signer.tokenExpiresAt && signer.tokenExpiresAt < now) {
      return { error: "This signing link has expired" };
    }

    // Generate current PDF and hash it
    const contractData = await getContractById(signer.contractId);
    if (!contractData) return { error: "Contract not found" };

    let documentHash = "";
    try {
      const pdfBuffer = await generateContractPdf(contractData);
      documentHash = crypto
        .createHash("sha256")
        .update(pdfBuffer)
        .digest("hex");
    } catch {
      // Non-fatal: continue signing even if PDF hash fails
      documentHash = "hash-unavailable";
    }

    await db
      .update(contractSigners)
      .set({
        signedAt: now,
        signatureData,
        signatureType,
        ipAddress: ip,
        userAgent,
        documentHash,
      })
      .where(eq(contractSigners.id, signer.id));

    await advanceContractStatus(signer.contractId);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record signature";
    return { error: message };
  }
}

// ── advanceContractStatus ────────────────────────────────────────────────────

/**
 * advanceContractStatus — internal helper.
 * After each signature, check all signers and advance contract lifecycle:
 * - Signer 1 done → set status to seller_signed, activate signer 2 token, email signer 2
 * - Both done → set status to executed, generate final PDF, auto-advance deal, stop campaigns
 */
async function advanceContractStatus(contractId: string): Promise<void> {
  const signerRows = await db
    .select()
    .from(contractSigners)
    .where(eq(contractSigners.contractId, contractId))
    .then((rows) => rows.sort((a, b) => a.signerOrder - b.signerOrder));

  const contractRows = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (contractRows.length === 0) return;
  const contract = contractRows[0];

  const signer1 = signerRows.find((s) => s.signerOrder === 1);
  const signer2 = signerRows.find((s) => s.signerOrder === 2);

  if (!signer1 || !signer2) return;

  const allSigned = signer1.signedAt && signer2.signedAt;

  if (allSigned) {
    // Both signed — execute contract
    const now = new Date();

    await db
      .update(contracts)
      .set({ status: "executed", executedAt: now, updatedAt: now })
      .where(
        and(
          eq(contracts.id, contractId),
          eq(contracts.status, "countersigned")
        )
      );

    // Generate final PDF with audit trail and upload to blob storage
    try {
      const contractWithSigners = await getContractById(contractId);
      if (contractWithSigners) {
        const finalPdfBuffer = await generateContractPdf(contractWithSigners);
        const blobName = `${contract.dealId}/${contractId}-executed.pdf`;
        await uploadContract(finalPdfBuffer, blobName);

        const finalHash = crypto
          .createHash("sha256")
          .update(finalPdfBuffer)
          .digest("hex");

        await db
          .update(contracts)
          .set({
            signedPdfBlobName: blobName,
            documentHash: finalHash,
            updatedAt: now,
          })
          .where(eq(contracts.id, contractId));

        // Email final PDF to both parties
        await sendExecutedContractEmails(
          contractWithSigners,
          finalPdfBuffer,
          blobName
        );
      }
    } catch {
      // Non-fatal: blob upload failure doesn't block execution status
    }

    // Auto-advance deal to under_contract if purchase_agreement
    if (contract.contractType === "purchase_agreement") {
      await db.execute(
        sql`UPDATE deals SET status = 'under_contract', updated_at = NOW()
            WHERE id = ${contract.dealId}
            AND status NOT IN ('under_contract', 'assigned', 'closing', 'closed', 'dead')`
      );
    }

    // Auto-stop active campaign enrollments for the deal's property
    const dealRows = await db
      .select({ propertyId: deals.propertyId })
      .from(deals)
      .where(eq(deals.id, contract.dealId))
      .limit(1);

    if (dealRows.length > 0 && dealRows[0].propertyId) {
      const propertyId = dealRows[0].propertyId;

      // Find leads for this property
      const leadRows = await db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.propertyId, propertyId));

      for (const lead of leadRows) {
        await db
          .update(campaignEnrollments)
          .set({
            status: "stopped",
            stoppedAt: new Date(),
            stopReason: "contract_executed",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(campaignEnrollments.leadId, lead.id),
              eq(campaignEnrollments.status, "active")
            )
          );
      }
    }
  } else if (signer1.signedAt && !signer2.signedAt) {
    // Signer 1 done — advance to seller_signed and activate signer 2
    const intermediateStatus =
      contract.contractType === "purchase_agreement"
        ? "seller_signed"
        : "countersigned";

    await db
      .update(contracts)
      .set({ status: intermediateStatus, updatedAt: new Date() })
      .where(eq(contracts.id, contractId));

    // Activate signer 2's token (72 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    await db
      .update(contractSigners)
      .set({ tokenExpiresAt: expiresAt })
      .where(eq(contractSigners.id, signer2.id));

    // Email signer 2
    await sendSigningInvitationEmail(signer2, contract);
  }
}

// ── voidContract ─────────────────────────────────────────────────────────────

export async function voidContract(
  contractId: string,
  reason: string
): Promise<{ success: true } | { error: string }> {
  try {
    const contractRows = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);

    if (contractRows.length === 0) return { error: "Contract not found" };
    const contract = contractRows[0];

    if (contract.status === "executed") {
      return { error: "Cannot void an executed contract" };
    }

    await db
      .update(contracts)
      .set({
        status: "voided",
        voidedAt: new Date(),
        voidReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, contractId));

    revalidatePath(`/deals/${contract.dealId}`);
    revalidatePath("/contracts");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to void contract";
    return { error: message };
  }
}

// ── resendSigningLink ─────────────────────────────────────────────────────────

export async function resendSigningLink(
  signerId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const signerRows = await db
      .select()
      .from(contractSigners)
      .where(eq(contractSigners.id, signerId))
      .limit(1);

    if (signerRows.length === 0) return { error: "Signer not found" };
    const signer = signerRows[0];

    if (signer.signedAt) {
      return { error: "Signer has already signed" };
    }

    // Reset expiry to 72 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    await db
      .update(contractSigners)
      .set({ tokenExpiresAt: expiresAt })
      .where(eq(contractSigners.id, signerId));

    // Fetch contract to send email
    const contractRows = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, signer.contractId))
      .limit(1);

    if (contractRows.length > 0) {
      await sendSigningInvitationEmail(signer, contractRows[0]);
    }

    revalidatePath(`/deals`);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resend link";
    return { error: message };
  }
}

// ── extendSigningDeadline ─────────────────────────────────────────────────────

export async function extendSigningDeadline(
  signerId: string,
  hours: number
): Promise<{ success: true } | { error: string }> {
  try {
    const signerRows = await db
      .select()
      .from(contractSigners)
      .where(eq(contractSigners.id, signerId))
      .limit(1);

    if (signerRows.length === 0) return { error: "Signer not found" };
    const signer = signerRows[0];

    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + hours);

    await db
      .update(contractSigners)
      .set({ tokenExpiresAt: newExpiry })
      .where(eq(contractSigners.id, signerId));

    const contractRows = await db
      .select({ dealId: contracts.dealId })
      .from(contracts)
      .where(eq(contracts.id, signer.contractId))
      .limit(1);

    if (contractRows.length > 0) {
      revalidatePath(`/deals/${contractRows[0].dealId}`);
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to extend deadline";
    return { error: message };
  }
}

// ── Email helpers ─────────────────────────────────────────────────────────────

async function sendSigningInvitationEmail(
  signer: ContractSignerRow,
  contract: ContractRow
): Promise<void> {
  try {
    const mailSettings = await getMailSettings();
    const resendApiKey =
      mailSettings.resendApiKey || process.env.RESEND_API_KEY || "";

    if (!resendApiKey) return;

    const resend = new Resend(resendApiKey);
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const signingUrl = `${baseUrl}/sign/${signer.signingToken}`;

    const contractTitle =
      contract.contractType === "purchase_agreement"
        ? "Real Estate Purchase Agreement"
        : "Assignment of Contract";

    const roleLabel =
      signer.signerRole === "seller"
        ? "Seller"
        : signer.signerRole === "buyer"
        ? "Buyer"
        : "Wholesaler";

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Please Sign: ${contractTitle}</h2>
        <p>Hello ${signer.signerName},</p>
        <p>You have been requested to sign the following document as <strong>${roleLabel}</strong>:</p>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 6px;">
          <strong>${contractTitle}</strong><br/>
          Property: ${contract.propertyAddress}, ${contract.city}, UT
        </p>
        <p>Please click the button below to review and sign the document. This link will expire in 72 hours.</p>
        <p style="margin: 24px 0;">
          <a href="${signingUrl}" style="background: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review &amp; Sign Document
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">
          If the button doesn't work, copy and paste this link:<br/>
          <a href="${signingUrl}">${signingUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">
          ${mailSettings.fromName}<br/>
          ${mailSettings.phone || ""}<br/>
          ${mailSettings.signature || ""}
        </p>
      </div>
    `;

    await resend.emails.send({
      from: `${mailSettings.fromName} <${mailSettings.fromEmail}>`,
      to: [signer.signerEmail],
      subject: `Please sign: ${contractTitle} for ${contract.propertyAddress}`,
      html,
    });
  } catch {
    // Non-fatal: email failure doesn't block contract state changes
  }
}

async function sendExecutedContractEmails(
  contract: ContractWithSigners,
  pdfBuffer: Buffer,
  _blobName: string
): Promise<void> {
  try {
    const mailSettings = await getMailSettings();
    const resendApiKey =
      mailSettings.resendApiKey || process.env.RESEND_API_KEY || "";

    if (!resendApiKey) return;

    const resend = new Resend(resendApiKey);

    const contractTitle =
      contract.contractType === "purchase_agreement"
        ? "Real Estate Purchase Agreement"
        : "Assignment of Contract";

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Fully Executed: ${contractTitle}</h2>
        <p>All parties have signed. Please find the fully executed document attached.</p>
        <p style="background: #f0fdf4; padding: 12px; border-radius: 6px; border-left: 4px solid #16a34a;">
          <strong>${contractTitle}</strong><br/>
          Property: ${contract.propertyAddress}, ${contract.city}, UT<br/>
          Status: Fully Executed
        </p>
        <p>Please retain this copy for your records.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">
          ${mailSettings.fromName}<br/>
          ${mailSettings.phone || ""}<br/>
          ${mailSettings.signature || ""}
        </p>
      </div>
    `;

    const recipients = contract.signers.map((s) => s.signerEmail);
    const uniqueRecipients = [...new Set(recipients)];

    const pdfBase64 = pdfBuffer.toString("base64");

    for (const email of uniqueRecipients) {
      await resend.emails.send({
        from: `${mailSettings.fromName} <${mailSettings.fromEmail}>`,
        to: [email],
        subject: `Fully Executed: ${contractTitle} — ${contract.propertyAddress}`,
        html,
        attachments: [
          {
            filename: `contract-${contract.id}-executed.pdf`,
            content: pdfBase64,
          },
        ],
      });
    }
  } catch {
    // Non-fatal
  }
}

