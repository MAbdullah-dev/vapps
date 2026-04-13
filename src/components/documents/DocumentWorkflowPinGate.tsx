"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DocumentWorkflowPinGateProps = {
  orgId: string;
  recordId: string;
  onVerified: (pin: string) => void;
};

export default function DocumentWorkflowPinGate({
  orgId,
  recordId,
  onVerified,
}: DocumentWorkflowPinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    const trimmed = pin.trim();
    if (!trimmed) {
      setError("Enter the document PIN.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/organization/${orgId}/documents/verify-workflow-pin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, pin: trimmed }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof json.error === "string" && json.error.trim() ? json.error : "Could not verify PIN.");
        return;
      }
      onVerified(trimmed);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-[#E5E7EB] py-4 shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#0A0A0A]">
          <Lock className="h-5 w-5 text-[#22B323]" aria-hidden />
          PIN required
        </CardTitle>
        <p className="text-sm font-normal text-[#6A7282] leading-relaxed">
          This document is locked. Enter the PIN set by the document initiator to open Review or Approval.
          The person who created the document does not need a PIN.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="workflow-doc-pin">Document PIN</Label>
          <Input
            id="workflow-doc-pin"
            type="password"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            className="font-mono tracking-widest"
            placeholder="Enter PIN"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="button" className="bg-[#22B323] hover:bg-[#1a8f1b]" disabled={busy} onClick={() => void submit()}>
          {busy ? "Checking…" : "Unlock document"}
        </Button>
      </CardContent>
    </Card>
  );
}
