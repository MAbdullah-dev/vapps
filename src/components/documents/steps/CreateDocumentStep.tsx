"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CreateDocumentStepProps = {
  title: string;
  setTitle: (value: string) => void;
  docType: string;
  setDocType: (value: string) => void;
  site: string;
  setSite: (value: string) => void;
  processName: string;
  setProcessName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  onNext: () => void;
};

export default function CreateDocumentStep({
  title,
  setTitle,
  docType,
  setDocType,
  site,
  setSite,
  processName,
  setProcessName,
  description,
  setDescription,
  onNext,
}: CreateDocumentStepProps) {
  return (
    <>
      <h3 className="text-base font-semibold">Create Document</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="doc-title">Title</Label>
          <Input
            id="doc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Environment Policy"
          />
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
          <Input
            id="doc-site"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="S001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-process">Process</Label>
          <Input
            id="doc-process"
            value={processName}
            onChange={(e) => setProcessName(e.target.value)}
            placeholder="P1-Quality"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="doc-description">Description</Label>
          <Textarea
            id="doc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write document scope..."
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext}>Next: Review</Button>
      </div>
    </>
  );
}

