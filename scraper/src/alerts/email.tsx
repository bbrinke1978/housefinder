import {
  Html,
  Body,
  Head,
  Heading,
  Section,
  Text,
  Button,
  Hr,
  Container,
} from "@react-email/components";
import { Resend } from "resend";

// ── Types ───────────────────────────────────────────────────────────────────

export interface AlertLead {
  leadId: string;
  propertyId: string;
  address: string;
  city: string;
  ownerName: string | null;
  distressScore: number;
  signals: string[];
  firstSeenAt: Date | null;
}

// ── Email Template ──────────────────────────────────────────────────────────

function scoreBadgeColor(score: number): string {
  if (score >= 4) return "#dc2626"; // red
  if (score >= 3) return "#ea580c"; // orange
  return "#ca8a04"; // yellow
}

function daysSince(date: Date | null): string {
  if (!date) return "Unknown";
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function HotLeadDigest({
  leads,
  appUrl,
}: {
  leads: AlertLead[];
  appUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            padding: "24px",
          }}
        >
          <Heading
            style={{ color: "#1a1a2e", fontSize: "24px", marginBottom: "8px" }}
          >
            HouseFinder
          </Heading>
          <Text style={{ color: "#6b7280", margin: "0 0 24px 0" }}>
            {leads.length} hot lead{leads.length !== 1 ? "s" : ""} found on{" "}
            {new Date().toLocaleDateString()}
          </Text>

          <Hr style={{ borderColor: "#e5e7eb" }} />

          {leads.map((lead) => (
            <Section key={lead.leadId} style={{ padding: "16px 0" }}>
              <Heading
                as="h3"
                style={{ fontSize: "18px", margin: "0 0 8px 0" }}
              >
                {lead.address}, {lead.city}
              </Heading>
              <Text style={{ margin: "4px 0", color: "#374151" }}>
                <strong>Owner:</strong> {lead.ownerName ?? "Unknown Owner"}
              </Text>
              <Text style={{ margin: "4px 0" }}>
                <span
                  style={{
                    backgroundColor: scoreBadgeColor(lead.distressScore),
                    color: "#ffffff",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  Score: {lead.distressScore}
                </span>
              </Text>
              {lead.signals.length > 0 && (
                <Text style={{ margin: "4px 0", color: "#374151" }}>
                  <strong>Signals:</strong> {lead.signals.join(", ")}
                </Text>
              )}
              <Text style={{ margin: "4px 0", color: "#6b7280" }}>
                Discovered: {daysSince(lead.firstSeenAt)}
              </Text>
              <Button
                href={`${appUrl}/properties/${lead.propertyId}`}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  textDecoration: "none",
                  marginTop: "8px",
                  display: "inline-block",
                }}
              >
                View Lead
              </Button>
              <Hr style={{ borderColor: "#e5e7eb", marginTop: "16px" }} />
            </Section>
          ))}

          <Text
            style={{
              color: "#9ca3af",
              fontSize: "12px",
              marginTop: "24px",
              textAlign: "center" as const,
            }}
          >
            Sent on {new Date().toLocaleDateString()} &mdash; You&apos;re
            receiving this because you have email alerts enabled in HouseFinder.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ── Send Function ───────────────────────────────────────────────────────────

export async function sendDigestEmail(
  leads: AlertLead[],
  appUrl: string
): Promise<{ sent: boolean; count: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  const alertEmail = process.env.ALERT_EMAIL;

  if (!apiKey || !alertEmail) {
    console.warn(
      "RESEND_API_KEY or ALERT_EMAIL not set -- skipping email digest"
    );
    return { sent: false, count: 0 };
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "HouseFinder <onboarding@resend.dev>",
    to: alertEmail,
    subject: `HouseFinder: ${leads.length} Hot Lead${leads.length > 1 ? "s" : ""} - ${new Date().toLocaleDateString()}`,
    react: HotLeadDigest({ leads, appUrl }),
  });

  return { sent: true, count: leads.length };
}
