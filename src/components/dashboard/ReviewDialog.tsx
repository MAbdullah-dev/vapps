"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, X, Paperclip } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useParams } from "next/navigation";

interface UploadedFile {
  id: string;
  file: File;
}

interface ActionPlanRow {
  id: string;
  action: string;
  responsible: string;
  plannedDate: string;
  actualDate: string;
  files: UploadedFile[];
}

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  issueId?: string;
  orgId?: string;
  processId?: string;
}

export default function ReviewDialog({
  open,
  onOpenChange,
  onSubmit,
  onCancel,
  issueId,
  orgId,
  processId,
}: ReviewDialogProps) {
  const params = useParams();
  const finalOrgId = orgId || (params.orgId as string);
  const finalProcessId = processId || (params.processId as string);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const [containmentText, setContainmentText] = useState("");
  const [rootCauseText, setRootCauseText] = useState("");
  const [containmentFiles, setContainmentFiles] = useState<UploadedFile[]>([]);
  const [rootCauseFiles, setRootCauseFiles] = useState<UploadedFile[]>([]);

  const [actionPlans, setActionPlans] = useState<ActionPlanRow[]>([
    {
      id: crypto.randomUUID(),
      action: "",
      responsible: "",
      plannedDate: "",
      actualDate: "",
      files: [],
    },
  ]);

  const handleFiles = (
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  ) => {
    if (!files) return;
    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
    }));
    setter((prev) => [...prev, ...newFiles]);
  };

  const handleActionFileUpload = (rowId: string, files: FileList | null) => {
    if (!files) return;
    setActionPlans((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              files: [
                ...row.files,
                ...Array.from(files).map((file) => ({
                  id: crypto.randomUUID(),
                  file,
                })),
              ],
            }
          : row
      )
    );
  };

  const removeFile = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  ) => {
    setter((prev) => prev.filter((f) => f.id !== id));
  };

  const removeActionFile = (rowId: string, fileId: string) => {
    setActionPlans((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, files: row.files.filter((f) => f.id !== fileId) }
          : row
      )
    );
  };

  const updateActionPlan = (
    id: string,
    field: keyof ActionPlanRow,
    value: string
  ) => {
    setActionPlans((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const addActionPlan = () => {
    setActionPlans((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        action: "",
        responsible: "",
        plannedDate: "",
        actualDate: "",
        files: [],
      },
    ]);
  };

  const removeActionPlan = (id: string) => {
    setActionPlans((prev) => prev.filter((row) => row.id !== id));
  };

  // Load existing review data when dialog opens
  useEffect(() => {
    const loadExistingReview = async () => {
      if (!open || !issueId || !finalOrgId || !finalProcessId) {
        return;
      }

      setIsLoadingReview(true);
      try {
        const response = await apiClient.getIssueReview(finalOrgId, finalProcessId, issueId);
        
        if (response.review) {
          console.log('[ReviewDialog] Loading existing review data:', response.review);
          
          // Load existing data into form
          setContainmentText(response.review.containmentText || "");
          setRootCauseText(response.review.rootCauseText || "");
          
          // Note: Files are stored as metadata (name, size, type) - we can't restore File objects
          // So we'll show them as read-only or allow re-upload
          // For now, we'll just show the metadata in the UI
          if (response.review.containmentFiles && Array.isArray(response.review.containmentFiles)) {
            // Store file metadata (we can't recreate File objects from metadata)
            // User can add new files if needed
            console.log('[ReviewDialog] Existing containment files:', response.review.containmentFiles);
          }
          
          if (response.review.rootCauseFiles && Array.isArray(response.review.rootCauseFiles)) {
            console.log('[ReviewDialog] Existing root cause files:', response.review.rootCauseFiles);
          }
          
          // Load action plans
          if (response.review.actionPlans && Array.isArray(response.review.actionPlans) && response.review.actionPlans.length > 0) {
            setActionPlans(
              response.review.actionPlans.map((plan: any) => ({
                id: crypto.randomUUID(), // Generate new ID for form
                action: plan.action || "",
                responsible: plan.responsible || "",
                plannedDate: plan.plannedDate || "",
                actualDate: plan.actualDate || "",
                files: [], // Can't restore File objects, user can re-upload if needed
              }))
            );
          } else {
            // If no action plans, start with one empty row
            setActionPlans([
              {
                id: crypto.randomUUID(),
                action: "",
                responsible: "",
                plannedDate: "",
                actualDate: "",
                files: [],
              },
            ]);
          }
        } else {
          // No existing review data - reset form to empty
          resetForm();
        }
      } catch (error: any) {
        console.error('[ReviewDialog] Error loading existing review:', error);
        // If error loading, start with empty form
        resetForm();
      } finally {
        setIsLoadingReview(false);
      }
    };

    loadExistingReview();
  }, [open, issueId, finalOrgId, finalProcessId]);

  // Reset form to empty state
  const resetForm = () => {
    setContainmentText("");
    setRootCauseText("");
    setContainmentFiles([]);
    setRootCauseFiles([]);
    setActionPlans([
      {
        id: crypto.randomUUID(),
        action: "",
        responsible: "",
        plannedDate: "",
        actualDate: "",
        files: [],
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!issueId || !finalOrgId || !finalProcessId) {
      toast.error("Missing required information");
      return;
    }

    // Validate that containment text is provided (required field)
    if (!containmentText.trim()) {
      toast.error("Please provide containment/immediate correction details");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare file metadata (for now, just store file info - actual file upload can be added later)
      const containmentFilesData = containmentFiles.map((f) => ({
        name: f.file.name,
        size: f.file.size,
        type: f.file.type,
      }));

      const rootCauseFilesData = rootCauseFiles.map((f) => ({
        name: f.file.name,
        size: f.file.size,
        type: f.file.type,
      }));

      const actionPlansData = actionPlans.map((plan) => ({
        action: plan.action,
        responsible: plan.responsible,
        plannedDate: plan.plannedDate,
        actualDate: plan.actualDate,
        files: plan.files.map((f) => ({
          name: f.file.name,
          size: f.file.size,
          type: f.file.type,
        })),
      }));

      // Save review data to database
      await apiClient.saveIssueReview(finalOrgId, finalProcessId, issueId, {
        containmentText,
        rootCauseText,
        containmentFiles: containmentFilesData,
        rootCauseFiles: rootCauseFilesData,
        actionPlans: actionPlansData,
      });

      toast.success("Review data saved successfully");
      
      // Call onSubmit callback to finalize status update
      // This will queue the status change and close the dialog
      // Form will be reset when dialog closes (in handleClose)
      onSubmit();
    } catch (error: any) {
      console.error("Error saving review data:", error);
      toast.error(error.message || "Failed to save review data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setContainmentText("");
    setRootCauseText("");
    setContainmentFiles([]);
    setRootCauseFiles([]);
    setActionPlans([
      {
        id: crypto.randomUUID(),
        action: "",
        responsible: "",
        plannedDate: "",
        actualDate: "",
        files: [],
      },
    ]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    handleClose();
    onCancel();
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // Prevent closing without submission - force cancel to revert status
        if (!isOpen && !isSubmitting) {
          handleCancel();
        }
      }}
    >
      <DialogContent className="max-w-4xl! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Containment / Immediate Correction</DialogTitle>
          <DialogDescription>
            Immediate actions taken to control the issue and prevent further impact until a permanent solution is applied.
            {isLoadingReview && <span className="text-sm text-muted-foreground"> (Loading existing data...)</span>}
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingReview && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading existing review data...</p>
          </div>
        )}
        
        {!isLoadingReview && (
          <>
            {/* Containment Section */}
        <div className="space-y-4">
          <Textarea
            placeholder="Describe the immediate corrective action taken..."
            value={containmentText}
            onChange={(e) => setContainmentText(e.target.value)}
          />

          <input
            type="file"
            multiple
            hidden
            ref={fileInputRef1}
            onChange={(e) => handleFiles(e.target.files, setContainmentFiles)}
          />

          <div
            onClick={() => fileInputRef1.current?.click()}
            className="cursor-pointer border border-dashed rounded-lg p-6 text-center hover:bg-muted"
          >
            <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag & drop or browse</p>
          </div>

          {containmentFiles.map(({ id, file }) => (
            <FileItem
              key={id}
              file={file}
              onRemove={() => removeFile(id, setContainmentFiles)}
            />
          ))}
        </div>

        {/* Root Cause */}
        <div className="space-y-4 pt-6">
          <h3 className="font-semibold">Root Cause of Problem (Optional)</h3>
          <Textarea
            placeholder="Explain the root cause of the issue..."
            value={rootCauseText}
            onChange={(e) => setRootCauseText(e.target.value)}
          />

          <input
            type="file"
            multiple
            hidden
            ref={fileInputRef2}
            onChange={(e) => handleFiles(e.target.files, setRootCauseFiles)}
          />

          <div
            onClick={() => fileInputRef2.current?.click()}
            className="cursor-pointer border border-dashed rounded-lg p-6 text-center hover:bg-muted"
          >
            <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag & drop or browse</p>
          </div>

          {rootCauseFiles.map(({ id, file }) => (
            <FileItem
              key={id}
              file={file}
              onRemove={() => removeFile(id, setRootCauseFiles)}
            />
          ))}
        </div>

        {/* Action Plan */}
        <div className="space-y-4 pt-6">
          <h3 className="font-semibold">Action Plan</h3>

          {actionPlans.map((row) => (
            <div key={row.id} className="border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-6 gap-3">
                <Input
                  placeholder="Action"
                  value={row.action}
                  onChange={(e) => updateActionPlan(row.id, "action", e.target.value)}
                />
                <Input
                  placeholder="Responsible"
                  value={row.responsible}
                  onChange={(e) => updateActionPlan(row.id, "responsible", e.target.value)}
                />
                <Input
                  type="date"
                  value={row.plannedDate}
                  onChange={(e) => updateActionPlan(row.id, "plannedDate", e.target.value)}
                />
                <Input
                  type="date"
                  value={row.actualDate}
                  onChange={(e) => updateActionPlan(row.id, "actualDate", e.target.value)}
                />

                <label className="flex items-center gap-2 cursor-pointer">
                  <Paperclip className="h-4 w-4" /> Upload
                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => handleActionFileUpload(row.id, e.target.files)}
                  />
                </label>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeActionPlan(row.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {row.files.map(({ id, file }) => (
                <FileItem
                  key={id}
                  file={file}
                  onRemove={() => removeActionFile(row.id, id)}
                />
              ))}
            </div>
          ))}

          <Button variant="ghost" onClick={addActionPlan} className="gap-2">
            <Plus className="h-4 w-4" /> Add Another Action
          </Button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-6">
          <Button variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingReview}>
            {isSubmitting ? "Submitting..." : "Submit to Issuer"}
          </Button>
        </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FileItem({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between border rounded-md px-3 py-2">
      <div>
        <p className="text-sm">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <Button size="icon" variant="ghost" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
