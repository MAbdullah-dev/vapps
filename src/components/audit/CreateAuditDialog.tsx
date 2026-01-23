"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Target,
  Users,
  Calendar,
  Check,
  ArrowLeft,
  ArrowRight,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CreateAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { id: 1, label: "Audit Details", icon: FileText },
  { id: 2, label: "Audit Context", icon: Target },
  { id: 3, label: "Audit Team", icon: Users },
  { id: 4, label: "Schedule", icon: Calendar },
];

const isoClauses = [
  "4. Context of Organization",
  "5. Leadership",
  "6. Planning",
  "7. Support",
  "8. Operation",
  "9. Performance Evaluation",
  "10. Improvement",
];

export default function CreateAuditDialog({
  open,
  onOpenChange,
}: CreateAuditDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1
    auditTitle: "",
    auditType: "",
    isoStandard: "",
    auditModel: "Onsite",
    auditScope: "",
    auditObjectives: "",
    // Step 2
    organization: "Acme Corporation",
    site: "",
    process: "",
    // Step 3
    leadAuditor: "",
    additionalAuditors: "",
    auditees: "",
    technicalExpert: "",
    observer: "",
    traineeAuditor: "",
    // Step 4
    plannedStartDate: "",
    plannedEndDate: "",
    estimatedDuration: "2 Weeks",
    leadAuditorComments: "",
  });

  const progress = (currentStep / 4) * 100;

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = () => {
    // TODO: Implement audit creation logic
    console.log("Creating audit with data:", formData);
    onOpenChange(false);
    // Reset form
    setCurrentStep(1);
    setFormData({
      auditTitle: "",
      auditType: "",
      isoStandard: "",
      auditModel: "Onsite",
      auditScope: "",
      auditObjectives: "",
      organization: "Acme Corporation",
      site: "",
      process: "",
      leadAuditor: "",
      additionalAuditors: "",
      auditees: "",
      technicalExpert: "",
      observer: "",
      traineeAuditor: "",
      plannedStartDate: "",
      plannedEndDate: "",
      estimatedDuration: "2 Weeks",
      leadAuditorComments: "",
    });
    setSelectedClauses([]);
  };

  const toggleClause = (clause: string) => {
    setSelectedClauses((prev) =>
      prev.includes(clause)
        ? prev.filter((c) => c !== clause)
        : [...prev, clause]
    );
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              Define the basic information and scope for this ISO audit
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="auditTitle">
                  Audit Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="auditTitle"
                  placeholder="e.g., Q1 2025 ISO 9001 Internal Audit"
                  value={formData.auditTitle}
                  onChange={(e) => updateFormData("auditTitle", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="auditType">
                    Audit Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.auditType}
                    onValueChange={(value) => updateFormData("auditType", value)}
                  >
                    <SelectTrigger id="auditType" className="mt-1">
                      <SelectValue placeholder="Select type.." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Audit</SelectItem>
                      <SelectItem value="external">External Audit</SelectItem>
                      <SelectItem value="fpa">FPA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="isoStandard">
                    ISO Standard <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.isoStandard}
                    onValueChange={(value) =>
                      updateFormData("isoStandard", value)
                    }
                  >
                    <SelectTrigger id="isoStandard" className="mt-1">
                      <SelectValue placeholder="Select standard.." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iso9001">ISO 9001:2015</SelectItem>
                      <SelectItem value="iso14001">ISO 14001:2015</SelectItem>
                      <SelectItem value="iso45001">ISO 45001:2018</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="auditModel">
                  Audit Model <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.auditModel}
                  onValueChange={(value) => updateFormData("auditModel", value)}
                >
                  <SelectTrigger id="auditModel" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Onsite">Onsite</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="auditScope">Audit Scope</Label>
                <Textarea
                  id="auditScope"
                  placeholder="Define what will be covered in this audit..."
                  value={formData.auditScope}
                  onChange={(e) => updateFormData("auditScope", e.target.value)}
                  className="mt-1 min-h-[100px]"
                />
              </div>
              <div>
                <Label htmlFor="auditObjectives">Audit Objectives</Label>
                <Textarea
                  id="auditObjectives"
                  placeholder="What are the goals and expected outcomes..."
                  value={formData.auditObjectives}
                  onChange={(e) =>
                    updateFormData("auditObjectives", e.target.value)
                  }
                  className="mt-1 min-h-[100px]"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              Define the organizational context and audit criteria
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="organization">Organization (Read-only)</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  readOnly
                  className="mt-1 bg-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="site">
                    Site <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.site}
                    onValueChange={(value) => updateFormData("site", value)}
                  >
                    <SelectTrigger id="site" className="mt-1">
                      <SelectValue placeholder="Select site.." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site1">Site 1 - Main Facility</SelectItem>
                      <SelectItem value="site2">Site 2 - Secondary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="process">
                    Process <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.process}
                    onValueChange={(value) => updateFormData("process", value)}
                  >
                    <SelectTrigger id="process" className="mt-1">
                      <SelectValue placeholder="Select process.." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quality">Quality Management</SelectItem>
                      <SelectItem value="environmental">Environmental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Audit Criteria (Auto-mapped from selected ISO standard)
                </p>
                <Label className="mb-3 block">ISO Clauses to be audited:</Label>
                <div className="flex flex-wrap gap-2">
                  {isoClauses.map((clause) => (
                    <Badge
                      key={clause}
                      variant={selectedClauses.includes(clause) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        selectedClauses.includes(clause)
                          ? "bg-blue-600 text-white"
                          : "bg-white border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => toggleClause(clause)}
                    >
                      {clause}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              Assign the audit team and responsible parties
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="leadAuditor">
                  Lead Auditor <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.leadAuditor}
                  onValueChange={(value) =>
                    updateFormData("leadAuditor", value)
                  }
                >
                  <SelectTrigger id="leadAuditor" className="mt-1">
                    <SelectValue placeholder="Select lead auditor.." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jane">Jane Smith</SelectItem>
                    <SelectItem value="john">John Doe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="additionalAuditors">
                  Additional Auditors (Optional)
                </Label>
                <Select
                  value={formData.additionalAuditors}
                  onValueChange={(value) =>
                    updateFormData("additionalAuditors", value)
                  }
                >
                  <SelectTrigger id="additionalAuditors" className="mt-1">
                    <SelectValue placeholder="Select auditors.." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auditor1">Auditor 1</SelectItem>
                    <SelectItem value="auditor2">Auditor 2</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  You can add multiple auditors to the team
                </p>
              </div>
              <div>
                <Label htmlFor="auditees">
                  Auditees (Process Owners) (Optional)
                </Label>
                <Select
                  value={formData.auditees}
                  onValueChange={(value) => updateFormData("auditees", value)}
                >
                  <SelectTrigger id="auditees" className="mt-1">
                    <SelectValue placeholder="Select auditees.." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner1">Process Owner 1</SelectItem>
                    <SelectItem value="owner2">Process Owner 2</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  People who will be audited
                </p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-4">
                  Additional Personnel (Optional)
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="technicalExpert">
                      Technical Expert (If any)
                    </Label>
                    <Input
                      id="technicalExpert"
                      placeholder="Enter technical expert name and role..."
                      value={formData.technicalExpert}
                      onChange={(e) =>
                        updateFormData("technicalExpert", e.target.value)
                      }
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Subject matter expert for specific technical areas
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="observer">Observer (If any)</Label>
                    <Input
                      id="observer"
                      placeholder="Enter observer name and affiliation..."
                      value={formData.observer}
                      onChange={(e) => updateFormData("observer", e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      External observer or witness from regulatory body
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="traineeAuditor">
                      Trainee Auditor (If any)
                    </Label>
                    <Input
                      id="traineeAuditor"
                      placeholder="Enter trainee auditor name..."
                      value={formData.traineeAuditor}
                      onChange={(e) =>
                        updateFormData("traineeAuditor", e.target.value)
                      }
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Auditor in training participating for development
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              Set the audit timeline and schedule
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plannedStartDate">
                    Planned Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="plannedStartDate"
                    type="date"
                    value={formData.plannedStartDate}
                    onChange={(e) =>
                      updateFormData("plannedStartDate", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="plannedEndDate">
                    Planned End Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="plannedEndDate"
                    type="date"
                    value={formData.plannedEndDate}
                    onChange={(e) =>
                      updateFormData("plannedEndDate", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="estimatedDuration">Estimated Duration</Label>
                <Select
                  value={formData.estimatedDuration}
                  onValueChange={(value) =>
                    updateFormData("estimatedDuration", value)
                  }
                >
                  <SelectTrigger id="estimatedDuration" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 Week">1 Week</SelectItem>
                    <SelectItem value="2 Weeks">2 Weeks</SelectItem>
                    <SelectItem value="3 Weeks">3 Weeks</SelectItem>
                    <SelectItem value="1 Month">1 Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="leadAuditorComments">
                  Lead Auditor Comments (Optional)
                </Label>
                <Textarea
                  id="leadAuditorComments"
                  placeholder="Add any special instructions, focus areas, or preliminary notes for this audit..."
                  value={formData.leadAuditorComments}
                  onChange={(e) =>
                    updateFormData("leadAuditorComments", e.target.value)
                  }
                  className="mt-1 min-h-[120px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  These comments will be visible to the audit team and included
                  in the audit plan
                </p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Audit Summary</p>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Title:</span>
                    <span className="font-medium">
                      {formData.auditTitle || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">
                      {formData.auditType
                        ? formData.auditType.charAt(0).toUpperCase() +
                          formData.auditType.slice(1) + " Audit"
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ISO Standard:</span>
                    <span className="font-medium">
                      {formData.isoStandard === "iso9001"
                        ? "ISO 9001:2015"
                        : formData.isoStandard === "iso14001"
                        ? "ISO 14001:2015"
                        : formData.isoStandard === "iso45001"
                        ? "ISO 45001:2018"
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Site:</span>
                    <span className="font-medium">
                      {formData.site === "site1"
                        ? "Site 1 - Main Facility"
                        : formData.site === "site2"
                        ? "Site 2 - Secondary"
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Process:</span>
                    <span className="font-medium">
                      {formData.process === "quality"
                        ? "Quality Management"
                        : formData.process === "environmental"
                        ? "Environmental"
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lead Auditor:</span>
                    <span className="font-medium">
                      {formData.leadAuditor === "jane"
                        ? "Jane Smith"
                        : formData.leadAuditor === "john"
                        ? "John Doe"
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">
                      {formData.plannedStartDate && formData.plannedEndDate
                        ? `${formData.plannedStartDate} to ${formData.plannedEndDate}`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-8">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-blue-600" size={24} />
            <DialogTitle className="text-2xl">Create New ISO Audit</DialogTitle>
          </div>
          <DialogDescription>
            Complete the 4-step ISO-compliant audit creation process
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Step {currentStep} of 4</span>
            <span className="text-gray-600">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="flex items-center justify-between mt-6 mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isPending = currentStep < step.id;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center flex-1 cursor-pointer"
                onClick={() => {
                  // Allow navigation to completed or previous steps
                  if (step.id <= currentStep || isCompleted) {
                    setCurrentStep(step.id);
                  }
                }}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={20} />
                  ) : (
                    <Icon size={20} />
                  )}
                </div>
                <p
                  className={`text-xs mt-2 text-center ${
                    isActive ? "text-blue-600 font-medium" : "text-gray-600"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">{renderStepContent()}</div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-6 border-t mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2"
          >
            <X size={16} /> Cancel
          </Button>
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Back
              </Button>
            )}
            {currentStep < 4 ? (
              <Button
                variant="dark"
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                Next <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                variant="dark"
                onClick={handleCreate}
                className="flex items-center gap-2"
              >
                <Check size={16} /> Create Audit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
