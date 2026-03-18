import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, MapPin, User, Home, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import type { PropertyWithLead } from "@/types";

interface PropertyOverviewProps {
  property: PropertyWithLead;
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-red-600 dark:text-red-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    follow_up: "Follow Up",
    closed: "Closed",
    dead: "Dead",
  };
  return labels[status] ?? status;
}

export function PropertyOverview({ property }: PropertyOverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Address Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="font-medium">{property.address}</p>
          <p className="text-sm text-muted-foreground">
            {property.city}, {property.state} {property.zip ?? ""}
          </p>
          <p className="text-sm text-muted-foreground">
            County: {property.county}
          </p>
        </CardContent>
      </Card>

      {/* Owner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Owner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="font-medium">
            {property.ownerName ?? "Unknown Owner"}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            Type: {property.ownerType ?? "unknown"}
          </p>
        </CardContent>
      </Card>

      {/* Property Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            Property
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm">
            <span className="text-muted-foreground">Type:</span>{" "}
            {property.propertyType ?? "Not specified"}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Parcel ID:</span>{" "}
            {property.parcelId}
          </p>
        </CardContent>
      </Card>

      {/* Lead Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Lead Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Distress Score:
            </span>
            <span className={`text-lg font-bold ${scoreColor(property.distressScore)}`}>
              {property.distressScore}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {property.isHot && (
              <Badge variant="destructive" className="gap-1">
                <Flame className="h-3 w-3" />
                Hot Lead
              </Badge>
            )}
            <Badge variant="outline">{statusLabel(property.leadStatus)}</Badge>
          </div>

          {property.firstSeenAt && (
            <p className="text-sm">
              <span className="text-muted-foreground">First seen:</span>{" "}
              {format(new Date(property.firstSeenAt), "MMM d, yyyy")}
            </p>
          )}

          {property.lastContactedAt && (
            <p className="text-sm">
              <span className="text-muted-foreground">Last contacted:</span>{" "}
              {format(new Date(property.lastContactedAt), "MMM d, yyyy")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
