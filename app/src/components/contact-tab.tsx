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
  MapPin,
  Activity,
} from "lucide-react";
import { saveOwnerPhone } from "@/lib/actions";
import type { OwnerContact, TimelineEntry, EmailSequenceSummary, EnrollmentWithDetails } from "@/types";
import { ContactEventForm } from "@/components/contact-event-form";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CallScriptModal } from "@/components/call-script-modal";
import { EnrollButton } from "@/components/campaigns/enroll-button";
import { SkipTraceButton } from "@/components/skip-trace-button";

interface ContactTabProps {
  ownerName: string | null;
  ownerType: string | null;
  propertyId: string;
  leadId: string;
  address: string;
  city: string;
  contacts: OwnerContact[];
  timeline: TimelineEntry[];
  /** Active campaign enrollment for this lead, if any */
  activeEnrollment?: EnrollmentWithDetails | null;
  /** Available sequences for enrollment */
  sequences?: EmailSequenceSummary[];
}

export function ContactTab({
  ownerName,
  ownerType,
  propertyId,
  leadId,
  address,
  city,
  contacts,
  timeline,
  activeEnrollment = null,
  sequences = [],
}: ContactTabProps) {
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasPhone = contacts.some((c) => c.phone !== null);
  const isEntity =
    ownerType === "llc" || ownerType === "trust" || ownerType === "estate";
  const showSkipTrace =
    !hasPhone && (ownerType === "individual" || ownerType === "unknown" || ownerType === null);
  const hasTracerfyResult = contacts.some((c) => c.source.startsWith("tracerfy"));

  /** Parse the source string and return a readable type label, or null for non-tracerfy sources. */
  function getTracerfyTypeLabel(source: string): string | null {
    if (!source.startsWith("tracerfy")) return null;
    if (source === "tracerfy") return "Phone";
    if (source === "tracerfy-address") return null; // handled as mailing address
    const mobileMatch = source.match(/^tracerfy-mobile-/);
    if (mobileMatch) return "Mobile";
    const landlineMatch = source.match(/^tracerfy-landline-/);
    if (landlineMatch) return "Landline";
    return "Phone"; // tracerfy-2, tracerfy-3 etc (additional emails have no phone type)
  }

  const phonesContacts = contacts.filter((c) => c.phone !== null);

  // Separate mailing address contacts from real email contacts
  const mailingContacts = contacts.filter(
    (c) => c.email !== null && c.email.startsWith("MAILING:")
  );
  const emailContacts = contacts.filter(
    (c) => c.email !== null && !c.email.startsWith("MAILING:")
  );

  // Extract the first mailing address for display
  const mailingAddress = mailingContacts[0]?.email
    ? mailingContacts[0].email.replace(/^MAILING:\s*/, "")
    : null;

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
                TruePeopleSearch
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://www.fastpeoplesearch.com/name/${encodeURIComponent(ownerName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-orange-700 underline hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
              >
                FastPeopleSearch
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://thatsthem.com/name/${encodeURIComponent(ownerName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-orange-700 underline hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
              >
                ThatsThem
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://www.familytreenow.com/search/genealogy/results?first=${encodeURIComponent(ownerName.split(/[\s,]+/)[0] ?? "")}&last=${encodeURIComponent(ownerName.split(/[\s,]+/).slice(-1)[0] ?? "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-orange-700 underline hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
              >
                FamilyTreeNow
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          <div className="mt-2">
            <SkipTraceButton
              propertyId={propertyId}
              hasTracerfyResult={hasTracerfyResult}
            />
          </div>
        </div>
      )}

      {/* Skip trace button when no "needs skip trace" flag but also no tracerfy result (or already traced) */}
      {!showSkipTrace && !isEntity && (
        <div className="flex items-center">
          <SkipTraceButton
            propertyId={propertyId}
            hasTracerfyResult={hasTracerfyResult}
          />
        </div>
      )}

      {/* Entity Owner badge */}
      {isEntity && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Entity Owner - {ownerType === "llc" ? "LLC" : ownerType === "trust" ? "Trust" : "Estate"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            This property is owned by an entity. Look up the registered agent:
          </p>
          {ownerName && (
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`https://secure.utah.gov/bes/index.html?searchType=ENTITY&entity=${encodeURIComponent(ownerName)}&action=SEARCH`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary underline hover:text-primary/80"
              >
                Utah Business Registry
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://opencorporates.com/companies?q=${encodeURIComponent(ownerName)}&jurisdiction_code=us_ut`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary underline hover:text-primary/80"
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

      {/* Mailing address card — shown when different from property address */}
      {mailingAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Mailing Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{mailingAddress}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Owner mails to this address (differs from property)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(mailingAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary underline hover:text-primary/80"
              >
                View on Map
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="space-y-2">
              {phonesContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between gap-2 flex-wrap"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-sm font-medium text-primary underline hover:text-primary/80"
                    >
                      {contact.phone}
                    </a>
                    <CallScriptModal
                      ownerName={ownerName}
                      address={address}
                      city={city}
                      phone={contact.phone}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {contact.source}
                    </Badge>
                    {getTracerfyTypeLabel(contact.source) && (
                      <span className="text-xs text-muted-foreground">
                        {getTracerfyTypeLabel(contact.source)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(contact.createdAt).toLocaleDateString("en-US", { timeZone: "America/Denver" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
                    className="text-sm font-medium text-primary underline hover:text-primary/80"
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

      {/* Email sequence enrollment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email Sequence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollButton
            leadId={leadId}
            hasEmail={emailContacts.length > 0}
            currentEnrollment={activeEnrollment}
            sequences={sequences}
          />
        </CardContent>
      </Card>

      {/* Contact event log form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Log Contact Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContactEventForm leadId={leadId} />
        </CardContent>
      </Card>

      {/* Activity timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Activity Timeline
            {timeline.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {timeline.length} event{timeline.length === 1 ? "" : "s"}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline entries={timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
