"use client";

import { useState } from "react";
import { differenceInDays, addDays, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Circle, FileText, DollarSign, Clock, Calendar } from "lucide-react";
import { updateDeal } from "@/lib/deal-actions";
import type { DealWithBuyer } from "@/types";
import { CONTRACT_STATUSES } from "@/types";

interface DealContractTrackerProps {
  deal: DealWithBuyer;
}

const CONTRACT_STEPS = [
  { value: "sent", label: "Sent" },
  { value: "signed", label: "Signed" },
  { value: "in_escrow", label: "In Escrow" },
  { value: "title_clear", label: "Title Clear" },
  { value: "closing_scheduled", label: "Closing Scheduled" },
] as const;

type ContractStatusValue = (typeof CONTRACT_STATUSES)[number];

function getCurrentStepIndex(contractStatus: string | null): number {
  if (!contractStatus) return -1;
  return CONTRACT_STEPS.findIndex((s) => s.value === contractStatus);
}

function countdownColor(daysLeft: number): string {
  if (daysLeft < 0) return "text-red-600 dark:text-red-400";
  if (daysLeft < 3) return "text-red-600 dark:text-red-400";
  if (daysLeft < 7) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function daysLeftLabel(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)} days overdue`;
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "1 day remaining";
  return `${daysLeft} days remaining`;
}

export function DealContractTracker({ deal }: DealContractTrackerProps) {
  const [contractStatus, setContractStatus] = useState<string | null>(
    deal.contractStatus
  );
  const [earnestMoney, setEarnestMoney] = useState(deal.earnestMoney ?? 100);
  const [earnestRefundable, setEarnestRefundable] = useState(
    deal.earnestMoneyRefundable ?? true
  );
  const [editingEarnest, setEditingEarnest] = useState(false);
  const [inspectionDeadline, setInspectionDeadline] = useState(
    deal.inspectionDeadline ?? ""
  );
  const [closingDate, setClosingDate] = useState(deal.closingDate ?? "");
  const [saving, setSaving] = useState(false);

  const currentStepIndex = getCurrentStepIndex(contractStatus);

  async function handleStepClick(stepValue: ContractStatusValue) {
    const newStatus = stepValue;
    setContractStatus(newStatus);
    const fd = new FormData();
    fd.set("contractStatus", newStatus);
    await updateDeal(deal.id, fd);
  }

  async function saveEarnest() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("earnestMoney", String(earnestMoney));
      fd.set("earnestMoneyRefundable", String(earnestRefundable));
      await updateDeal(deal.id, fd);
      setEditingEarnest(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveInspectionDeadline(dateStr: string) {
    setInspectionDeadline(dateStr);
    const fd = new FormData();
    fd.set("inspectionDeadline", dateStr);
    await updateDeal(deal.id, fd);
  }

  async function saveClosingDate(dateStr: string) {
    setClosingDate(dateStr);
    const fd = new FormData();
    fd.set("closingDate", dateStr);
    await updateDeal(deal.id, fd);
  }

  const defaultInspectionDeadline = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const defaultClosingDate = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const inspectionDaysLeft = inspectionDeadline
    ? differenceInDays(new Date(inspectionDeadline + "T00:00:00"), new Date())
    : null;
  const closingDaysLeft = closingDate
    ? differenceInDays(new Date(closingDate + "T00:00:00"), new Date())
    : null;

  if (!contractStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Contract
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No contract yet. Click below to mark contract as sent.
          </p>
          <Button
            onClick={() => handleStepClick("sent")}
            variant="outline"
          >
            Mark Contract Sent
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contract Status Stepper */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Contract Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative flex items-center justify-between">
            {/* Connector line */}
            <div className="absolute left-0 right-0 top-5 h-0.5 bg-border -z-0" />
            {CONTRACT_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isFuture = idx > currentStepIndex;
              return (
                <button
                  key={step.value}
                  onClick={() => handleStepClick(step.value as ContractStatusValue)}
                  className="relative z-10 flex flex-col items-center gap-1.5 group"
                  title={`Mark as ${step.label}`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleted
                        ? "border-green-500 bg-green-500 text-white"
                        : isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground group-hover:border-primary/50"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Circle className={`h-4 w-4 ${isCurrent ? "fill-current" : ""}`} />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium text-center max-w-[60px] leading-tight ${
                      isCurrent
                        ? "text-primary"
                        : isCompleted
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Earnest Money */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Earnest Money
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingEarnest ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="earnestAmount">Amount ($)</Label>
                <Input
                  id="earnestAmount"
                  type="number"
                  value={earnestMoney}
                  onChange={(e) =>
                    setEarnestMoney(parseInt(e.target.value, 10) || 0)
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="earnestRefundable"
                  checked={earnestRefundable}
                  onChange={(e) => setEarnestRefundable(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="earnestRefundable">Refundable during inspection</Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEarnest} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingEarnest(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  ${earnestMoney.toLocaleString()}
                </p>
                <Badge
                  variant={earnestRefundable ? "secondary" : "outline"}
                  className={
                    earnestRefundable
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : ""
                  }
                >
                  {earnestRefundable ? "Refundable" : "Non-refundable"}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingEarnest(true)}
              >
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspection Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Inspection Period
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inspectionDeadline ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Deadline</span>
                <span className="text-sm font-medium">
                  {format(new Date(inspectionDeadline + "T00:00:00"), "MMM d, yyyy")}
                </span>
              </div>
              {inspectionDaysLeft !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span
                    className={`text-sm font-medium ${countdownColor(inspectionDaysLeft)}`}
                  >
                    {daysLeftLabel(inspectionDaysLeft)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No inspection deadline set.</p>
          )}
          <div>
            <Label htmlFor="inspectionDeadline">Set Deadline</Label>
            <Input
              id="inspectionDeadline"
              type="date"
              value={inspectionDeadline}
              defaultValue={defaultInspectionDeadline}
              onChange={(e) => saveInspectionDeadline(e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Closing Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Closing Date
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {closingDate ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm font-medium">
                  {format(new Date(closingDate + "T00:00:00"), "MMM d, yyyy")}
                </span>
              </div>
              {closingDaysLeft !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span
                    className={`text-sm font-medium ${countdownColor(closingDaysLeft)}`}
                  >
                    {daysLeftLabel(closingDaysLeft)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No closing date set.</p>
          )}
          <div>
            <Label htmlFor="closingDate">Set Closing Date</Label>
            <Input
              id="closingDate"
              type="date"
              value={closingDate}
              defaultValue={defaultClosingDate}
              onChange={(e) => saveClosingDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
