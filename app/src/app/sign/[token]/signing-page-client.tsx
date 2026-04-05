"use client";

import { useTransition, useState } from "react";
import { SignatureCanvas } from "@/components/signature-canvas";
import { submitSignature } from "@/lib/contract-actions";

interface SigningPageClientProps {
  token: string;
}

export function SigningPageClient({ token }: SigningPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (
    signatureData: string,
    signatureType: "drawn" | "typed"
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await submitSignature(token, signatureData, signatureType);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSubmitted(true);
      }
    });
  };

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-2">
          Signature Recorded
        </h3>
        <p className="text-sm text-gray-600">
          Thank you! Your signature has been recorded. You will receive a copy
          of the fully executed contract by email once all parties have signed.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      <SignatureCanvas onSubmit={handleSubmit} isPending={isPending} />
    </div>
  );
}
