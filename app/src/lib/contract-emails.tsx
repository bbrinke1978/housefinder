/**
 * contract-emails.tsx
 * Plain HTML email builders for the contract e-signature workflow.
 * All functions return { subject, html } — no JSX, no react-email.
 * Consistent with Phase 12-05 pattern (Resend text/html strings in scraper context).
 */

export interface SigningInvitationParams {
  signerName: string;
  signerRole: "seller" | "buyer" | "wholesaler" | string;
  contractTitle: string;
  propertyAddress: string;
  city: string;
  signingUrl: string;
  fromName: string;
  phone?: string;
  signature?: string;
}

export interface CountersignNotificationParams {
  firstSignerName: string;
  contractTitle: string;
  propertyAddress: string;
  city: string;
  signingUrl: string;
  fromName: string;
  phone?: string;
  signature?: string;
}

export interface ExecutedContractParams {
  contractTitle: string;
  propertyAddress: string;
  city: string;
  dealUrl: string;
  fromName: string;
  phone?: string;
  signature?: string;
}

// ── Signing invitation ───────────────────────────────────────────────────────

/**
 * buildSigningInvitationHtml — invitation to first (or second) signer.
 * Subject: "Please sign: [Contract Type] for [Property Address]"
 */
export function buildSigningInvitationHtml(
  params: SigningInvitationParams
): { subject: string; html: string } {
  const roleLabel =
    params.signerRole === "seller"
      ? "Seller"
      : params.signerRole === "buyer"
      ? "Buyer"
      : "Wholesaler";

  const subject = `Please sign: ${params.contractTitle} for ${params.propertyAddress}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h2 style="color: #1a1a1a; margin-top: 0;">Please Sign: ${params.contractTitle}</h2>
      <p>Hi ${params.signerName},</p>
      <p>You have been invited to sign the following document as <strong>${roleLabel}</strong>:</p>
      <div style="background: #f5f5f5; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
        <strong>${params.contractTitle}</strong><br/>
        Property: ${params.propertyAddress}, ${params.city}, UT
      </div>
      <p>Please click the button below to review and sign the document. This link expires in <strong>72 hours</strong>.</p>
      <p style="margin: 28px 0;">
        <a href="${params.signingUrl}"
           style="background: #6d28d9; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 7px; display: inline-block; font-weight: 600; font-size: 15px;">
          Sign Now
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${params.signingUrl}" style="color: #6d28d9;">${params.signingUrl}</a>
      </p>
      <p style="color: #666; font-size: 13px;">
        If you have questions, reply to this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px; margin: 0;">
        ${params.fromName}${params.phone ? `<br/>${params.phone}` : ""}${params.signature ? `<br/>${params.signature}` : ""}
      </p>
    </div>
  `;

  return { subject, html };
}

// ── Countersign notification ─────────────────────────────────────────────────

/**
 * buildCountersignNotificationHtml — sent to signer 2 when signer 1 has completed.
 * Subject: "[Signer Name] has signed — your countersignature is needed"
 */
export function buildCountersignNotificationHtml(
  params: CountersignNotificationParams
): { subject: string; html: string } {
  const subject = `${params.firstSignerName} has signed — your countersignature is needed`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h2 style="color: #1a1a1a; margin-top: 0;">Countersignature Needed</h2>
      <p>Hello,</p>
      <p><strong>${params.firstSignerName}</strong> has signed the <strong>${params.contractTitle}</strong>
         for the property at <strong>${params.propertyAddress}, ${params.city}, UT</strong>.</p>
      <p>Your countersignature is needed to fully execute the contract. Please click below to review and countersign.</p>
      <p style="margin: 28px 0;">
        <a href="${params.signingUrl}"
           style="background: #6d28d9; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 7px; display: inline-block; font-weight: 600; font-size: 15px;">
          Countersign Now
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        If the button doesn't work, copy and paste this link:<br/>
        <a href="${params.signingUrl}" style="color: #6d28d9;">${params.signingUrl}</a>
      </p>
      <p style="color: #666; font-size: 13px;">
        This link expires in <strong>72 hours</strong>.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px; margin: 0;">
        ${params.fromName}${params.phone ? `<br/>${params.phone}` : ""}${params.signature ? `<br/>${params.signature}` : ""}
      </p>
    </div>
  `;

  return { subject, html };
}

// ── Executed contract delivery ───────────────────────────────────────────────

/**
 * buildExecutedContractHtml — sent to all parties when contract is fully executed.
 * Subject: "Fully executed: [Contract Type] for [Property Address]"
 */
export function buildExecutedContractHtml(
  params: ExecutedContractParams
): { subject: string; html: string } {
  const subject = `Fully executed: ${params.contractTitle} for ${params.propertyAddress}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h2 style="color: #1a1a1a; margin-top: 0;">Fully Executed: ${params.contractTitle}</h2>
      <p>All parties have signed. The fully executed contract is attached to this email as a PDF.</p>
      <div style="background: #f0fdf4; padding: 14px 16px; border-radius: 8px; border-left: 4px solid #16a34a; margin: 16px 0;">
        <strong>${params.contractTitle}</strong><br/>
        Property: ${params.propertyAddress}, ${params.city}, UT<br/>
        <span style="color: #16a34a; font-weight: 600;">Status: Fully Executed</span>
      </div>
      <p>Please retain this copy for your records.</p>
      <p style="margin: 20px 0;">
        <a href="${params.dealUrl}"
           style="color: #6d28d9; text-decoration: underline; font-size: 14px;">
          View contract in No BS Workbench
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px; margin: 0;">
        ${params.fromName}${params.phone ? `<br/>${params.phone}` : ""}${params.signature ? `<br/>${params.signature}` : ""}
      </p>
    </div>
  `;

  return { subject, html };
}
