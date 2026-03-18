import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, AlertTriangle } from "lucide-react";

interface ContactTabProps {
  ownerName: string | null;
}

export function ContactTab({ ownerName }: ContactTabProps) {
  return (
    <div className="space-y-4">
      {/* Skip trace flag */}
      <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900/50 dark:bg-orange-950/20">
        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
          Manual skip trace needed
        </span>
        <Badge variant="outline" className="ml-auto text-xs">
          No contact info found
        </Badge>
      </div>

      {/* Owner info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Owner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{ownerName ?? "Unknown Owner"}</p>
        </CardContent>
      </Card>

      {/* Placeholder sections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Phone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Phone number will be available once owner lookup is configured.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Contact information will be available once owner lookup is configured.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
