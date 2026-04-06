import { getFloorPlanByShareToken } from "@/lib/floor-plan-queries";
import { FloorPlanShareView } from "@/components/floor-plan-share-view";
import type { Metadata } from "next";

interface FloorPlanSharePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({
  params,
}: FloorPlanSharePageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await getFloorPlanByShareToken(token);
  if (!result) {
    return { title: "Floor Plan — Expired" };
  }
  return {
    title: `Floor Plan — ${result.plan.floorLabel.charAt(0).toUpperCase() + result.plan.floorLabel.slice(1)} Floor`,
  };
}

export default async function FloorPlanSharePage({
  params,
}: FloorPlanSharePageProps) {
  const { token } = await params;
  const result = await getFloorPlanByShareToken(token);

  if (!result) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
        style={{ colorScheme: "light" }}
      >
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">
            This floor plan link has expired or is invalid
          </h1>
          <p className="text-sm text-gray-500">
            Contact the investor for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 py-6 px-4"
      style={{ colorScheme: "light" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Branding */}
        <div className="text-center mb-4">
          <p className="text-sm font-semibold text-violet-700 tracking-wide uppercase">
            HouseFinder
          </p>
        </div>

        <FloorPlanShareView plan={result} />

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by HouseFinder &bull; Shared floor plan view
        </p>
      </div>
    </div>
  );
}
