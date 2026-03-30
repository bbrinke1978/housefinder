import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from "@azure/ai-form-recognizer";

export interface OcrResult {
  vendor: string | null;
  date: string | null;
  totalCents: number | null;
}

/**
 * analyzeReceipt — call Azure Document Intelligence prebuilt-receipt model.
 * Extracts MerchantName, TransactionDate, and Total from the first receipt.
 * Returns nulls for any field not detected (graceful degradation).
 * Never throws — always returns an OcrResult.
 */
export async function analyzeReceipt(blobUrl: string): Promise<OcrResult> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    console.error(
      "analyzeReceipt: AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT or AZURE_DOCUMENT_INTELLIGENCE_KEY not set"
    );
    return { vendor: null, date: null, totalCents: null };
  }

  try {
    const client = new DocumentAnalysisClient(
      endpoint,
      new AzureKeyCredential(key)
    );

    const poller = await client.beginAnalyzeDocumentFromUrl(
      "prebuilt-receipt",
      blobUrl
    );
    const result = await poller.pollUntilDone();

    if (!result.documents || result.documents.length === 0) {
      return { vendor: null, date: null, totalCents: null };
    }

    const receipt = result.documents[0];
    const fields = receipt.fields;

    // Extract vendor
    let vendor: string | null = null;
    const merchantField = fields?.["MerchantName"];
    if (merchantField?.kind === "string" && merchantField.value) {
      vendor = merchantField.value;
    }

    // Extract date
    let date: string | null = null;
    const dateField = fields?.["TransactionDate"];
    if (dateField?.kind === "date" && dateField.value) {
      // Format as YYYY-MM-DD
      const d = dateField.value as Date;
      date = d.toISOString().split("T")[0];
    }

    // Extract total — convert float dollars to integer cents
    let totalCents: number | null = null;
    const totalField = fields?.["Total"];
    if (totalField?.kind === "currency" && totalField.value) {
      const currencyValue = totalField.value as { amount?: number };
      if (typeof currencyValue.amount === "number") {
        totalCents = Math.round(currencyValue.amount * 100);
      }
    } else if (totalField?.kind === "number" && totalField.value) {
      totalCents = Math.round((totalField.value as number) * 100);
    }

    return { vendor, date, totalCents };
  } catch (err) {
    console.error("analyzeReceipt error:", err);
    return { vendor: null, date: null, totalCents: null };
  }
}
