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

export type Step1FormData = {
  title: string;
  docType: string;
  description: string;
  loginUserName: string;
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
};

export type DocumentSaveStatus = "draft" | "submitted";

export type DocumentSavePayload = {
  savedAt: string;
  previewDocRef: string;
  formData: Step1FormData;
  wizard: DocumentWizardSnapshot;
};
