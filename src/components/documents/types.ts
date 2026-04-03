export type SiteOption = {
  id: string;
  name: string;
  code: string;
  location: string | null;
};

export type ProcessOption = {
  id: string;
  name: string;
  siteId: string;
};

export type StandardOption = {
  id: string;
  name: string;
};

/** Who must fix the draft after an ineffective decision (stored in form_data). */
export type DocumentCorrectionPhase =
  | "none"
  | "awaiting_creator_after_review"
  | "awaiting_reviewer_after_approval";

export type Step1FormData = {
  title: string;
  docType: string;
  description: string;
  loginUserName: string;
  /** Current user id from profile — used with processOwnerUserId / approverUserId for access checks. */
  loginUserId: string;
  /** Original author of the document (set on first save). */
  createdByUserId: string;
  createdByUserName: string;
  /** After review/approval returns; drives who may edit during correction. */
  correctionPhase: DocumentCorrectionPhase;
  organizationName: string;
  organizationIdentification: string;
  industryType: string;
  otherIndustry: string;
  site: string;
  siteId: string;
  location: string;
  processName: string;
  processId: string;
  processOwner: string;
  /** Member user id for Process Owner (matches teamMembers[].id). */
  processOwnerUserId: string;
  /** Top-tier approver selected at creation (excludes process owner). */
  approverName: string;
  /** Member user id for Approver. */
  approverUserId: string;
  managementStandard: string;
  clause: string;
  subClause: string;
};

/** Persisted wizard-only fields from CreateDocumentStep. */
export type DocumentWizardSnapshot = {
  previousRefNumber: string;
  priorityLevel: "high" | "low";
  documentClassification: "P" | "F" | "EXT";
  actionType: "create" | "revise" | "obsolete";
  isReviseUpdate: boolean;
  isReviseTransfer: boolean;
  reviseSubAction: "update" | "transfer";
  searchCurrentDocumentRef: string;
  revisionComment: string;
  documentEditorContent: string;
  externalDocumentFileName: string;
  restriction: "unlocked" | "locked";
  hasPinSet: boolean;
  filePin: string;
  confirmFilePin: string;
  pinError: string;
  reasons: string[];
  reasonComment: string;
  affectsOtherDocs: "yes" | "no";
  riskLevel: "high" | "medium" | "low";
  riskComments: string;
  trainingRequired: "yes" | "no";
  trainingDetails: string;
  planDate: string;
  actualDate: string;
  endDate: string;
  transferSearchRef: string;
  transferTargetSite: string;
  transferTargetSiteId: string;
  transferTargetProcess: string;
  transferTargetProcessId: string;
  transferProcessOptions: Array<{ id: string; name: string; code: string }>;
  transferStandardChange: string;
  transferDocumentClass: "P" | "F" | "EXT";
  transferInitiatorRequest: string;
  originatorConsent: "accepted" | "declined" | null;
  /** Allocated Doc# segment (e.g. D3) for preview path; persisted for table display. */
  documentNumberSegment?: string;
};

export type DocumentSaveStatus = "draft" | "submitted";

export type DocumentSavePayload = {
  savedAt: string;
  previewDocRef: string;
  formData: Step1FormData;
  wizard: DocumentWizardSnapshot;
};
