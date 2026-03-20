"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Phone,
  Mail,
  AlertTriangle,
  ExternalLink,
  Building2,
  Plus,
} from "lucide-react";
import { saveOwnerPhone } from "@/lib/actions";
import type { OwnerContact } from "@/types";

interface ContactTabProps {
  ownerName: string | null;
  ownerType: string | null;
  propertyId: string;
  contacts: OwnerContact[];
}

export function ContactTab({
  ownerName,
  ownerType,
  propertyId,
  contacts,
}: ContactTabProps) {
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasPhone = contacts.some((c) => c.phone !== null);
  const isEntity =
    ownerType === "llc" || ownerType === "trust" || ownerType === "estate";
  const showSkipTrace =
    !hasPhone && (ownerType === "individual" || ownerType === "unknown" || ownerType === null);

  const phonesContacts = contacts.filter((c) => c.phone !== null);
  const emailContacts = contacts.filter((c) => c.email !== null);

  function handleSavePhone() {
    const trimmed = phone.trim();
    if (!trimmed) return;
    setError(null);

    startTransition(async () => {
      try {
        await saveOwnerPhone(propertyId, trimmed);
        setPhone("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save phone");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Skip trace flag */}
      {showSkipTrace && (
        <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900/50 dark:bg-orange-950/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Manual skip trace needed
            </span>
            <Badge variant="outline" className="ml-auto text-xs">
              No contact info found
            </Badge>
          </div>
          {ownerName && (
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`https://www.truepeoplesearch.com/results?name=${encodeURIComponent(ownerName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-orange-700 underline hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
              >
                Search TruePeopleSearch
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://www.fastpeoplesearch.com/name/${encodeURIComponent(ownerName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-orange-700 underline hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
              >
                Search FastPeopleSearch
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Entity Owner badge */}
      {isEntity && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Entity Owner - {ownerType === "llc" ? "LLC" : ownerType === "trust" ? "Trust" : "Estate"}
            </span>
          </div>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            This property is owned by an entity. Look up the registered agent:
          </p>
          {ownerName && (
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`https://secure.utah.gov/bes/index.html?searchType=ENTITY&entity=${encodeURIComponent(ownerName)}&action=SEARCH`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Utah Business Registry
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://opencorporates.com/companies?q=${encodeURIComponent(ownerName)}&jurisdiction_code=us_ut`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
              >
                OpenCorporates
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Owner card */}
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

      {/* Phone cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Phone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {phonesContacts.length > 0 ? (
            phonesContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between gap-2"
              >
                <a
                  href={`tel:${contact.phone}`}
                  className="text-sm font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {contact.phone}
                </a>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {contact.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No phone numbers found yet.
            </p>
          )}

          {/* Add phone form */}
          <div className="border-t pt-3">
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSavePhone();
                  }
                }}
                className="max-w-[200px]"
                disabled={isPending}
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleSavePhone}
                disabled={isPending || !phone.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                {isPending ? "Saving..." : "Add"}
              </Button>
            </div>
            {error && (
              <p className="mt-1 text-xs text-destructive">{error}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emailContacts.length > 0 ? (
            <div className="space-y-2">
              {emailContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between gap-2"
                >
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {contact.email}
                  </a>
                  <Badge variant="outline" className="text-xs capitalize">
                    {contact.source}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No email found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
