"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, CheckCircle, FileText, Save, Search } from "lucide-react";
import { getDashboardPath } from "@/lib/subdomain";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

export default function DocumentsCreateContent() {
  const params = useParams();
  const orgId = (params?.orgId as string) || "";

  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("P");
  const [site, setSite] = useState("");
  const [processName, setProcessName] = useState("");
  const [description, setDescription] = useState("");

  const steps = useMemo(
    () => [
      { step: 1 as const, label: "Create Document", icon: FileText },
      { step: 2 as const, label: "Review", icon: Search },
      { step: 3 as const, label: "Approval", icon: CheckCircle },
    ],
    []
  );

  const listHref = orgId ? getDashboardPath(orgId, "documents") : "/";

  return (
    <div className="space-y-6">
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
            <h2 className="text-lg font-bold text-[#0A0A0A]">Document Management</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Save size={14} />
                Save Draft
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={listHref}>Exit to Dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {steps.map(({ step: s, label, icon: Icon }) => {
              const isCurrent = step === s;
              const isDone = step > s;
              const DisplayIcon = isDone ? Check : Icon;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={cn(
                    "rounded-lg border px-4 py-3 transition-all",
                    "flex flex-col items-center justify-center min-h-[92px] gap-2",
                    isCurrent
                      ? "bg-[#22B323] border-[#22B323] text-white"
                      : isDone
                      ? "bg-[#EEFFF3] border-[#22B323] text-[#15803D]"
                      : "bg-[#F3F4F6] border-[#E5E7EB] text-[#6B7280] hover:bg-[#EBEEF2]"
                  )}
                >
                  <span
                    className={cn(
                      "h-8 w-8 rounded-full border flex items-center justify-center",
                      isCurrent
                        ? "border-white/70 bg-white/15"
                        : isDone
                        ? "border-[#22B323] bg-[#22B323]"
                        : "border-[#D1D5DB] bg-white"
                    )}
                  >
                    <DisplayIcon size={15} className={cn(isCurrent || isDone ? "text-white" : "text-[#9CA3AF]")} />
                  </span>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardContent className="space-y-5">
          {step === 1 && (
            <>
              <h3 className="text-base font-semibold">Create Document</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Title</Label>
                  <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Environment Policy" />
                </div>
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P">Type P (Maintained Document)</SelectItem>
                      <SelectItem value="F">Type F (Retained Record)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-site">Site</Label>
                  <Input id="doc-site" value={site} onChange={(e) => setSite(e.target.value)} placeholder="S001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-process">Process</Label>
                  <Input id="doc-process" value={processName} onChange={(e) => setProcessName(e.target.value)} placeholder="P1-Quality" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="doc-description">Description</Label>
                  <Textarea id="doc-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Write document scope..." />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>Next: Review</Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-base font-semibold">Review</h3>
              <div className="rounded-lg border border-[#0000001A] p-4 text-sm space-y-2">
                <div><span className="font-medium">Title:</span> {title || "-"}</div>
                <div><span className="font-medium">Type:</span> {docType}</div>
                <div><span className="font-medium">Site:</span> {site || "-"}</div>
                <div><span className="font-medium">Process:</span> {processName || "-"}</div>
                <div><span className="font-medium">Description:</span> {description || "-"}</div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>Send to Approval</Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-base font-semibold">Approval</h3>
              <div className="rounded-lg border border-[#0000001A] p-4 text-sm">
                Document is ready for approval.
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button asChild>
                  <Link href={listHref}>Approve & Finish</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

