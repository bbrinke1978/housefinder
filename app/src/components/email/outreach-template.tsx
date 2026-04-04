import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Hr,
  Preview,
} from "@react-email/components";

interface OutreachTemplateProps {
  /** The email body with merge fields already resolved — may contain \n line breaks */
  bodyHtml: string;
  /** Plain text signature — render with line breaks */
  signature: string;
}

/**
 * React-email component for owner outreach drip emails.
 * Intentionally plain — distressed property outreach should look personal, not corporate.
 */
export function OutreachTemplate({ bodyHtml, signature }: OutreachTemplateProps) {
  // Split body into paragraphs on double newlines; single newlines become <br>
  const bodyParagraphs = bodyHtml.split(/\n\n+/).filter(Boolean);
  const signatureLines = signature.split(/\n/).filter(Boolean);

  return (
    <Html lang="en">
      <Head />
      <Preview>{bodyParagraphs[0]?.slice(0, 100) ?? ""}</Preview>
      <Body
        style={{
          backgroundColor: "#ffffff",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          color: "#111827",
          margin: "0",
          padding: "0",
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            padding: "24px 16px",
          }}
        >
          {/* Body paragraphs */}
          {bodyParagraphs.map((para, i) => (
            <Text
              key={i}
              style={{
                margin: "0 0 16px 0",
                fontSize: "15px",
                lineHeight: "1.6",
                color: "#111827",
                whiteSpace: "pre-wrap",
              }}
            >
              {para}
            </Text>
          ))}

          {/* Signature separator */}
          {signatureLines.length > 0 && (
            <>
              <Hr style={{ borderColor: "#e5e7eb", margin: "20px 0" }} />
              {signatureLines.map((line, i) => (
                <Text
                  key={i}
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "#6b7280",
                  }}
                >
                  {line}
                </Text>
              ))}
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}
