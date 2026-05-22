/** Shadcn theme-aware class strings for the document module (light + dark). */

export const docDropdownContent =
  "rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-md";

export const docMenuItemAccent =
  "gap-2 cursor-pointer rounded-lg py-2 text-sm text-foreground focus:bg-accent focus:text-accent-foreground";

export const docMenuItemPrimary =
  "gap-2 cursor-pointer rounded-lg py-2 text-sm text-primary focus:bg-accent focus:text-accent-foreground [&_svg]:text-primary";

export const docAlertNote =
  "rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground";

export const docAlertNoteTitle = "font-semibold text-foreground";

export const docAlertInfo =
  "rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground";

export const docAlertSuccess =
  "rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground";

export const docSelectTrigger =
  "w-full border border-border rounded-xl bg-background text-foreground px-3 py-2 text-sm";

export const docSearchInput = "pl-9 border-border bg-muted/50 text-foreground w-[260px]";

export const docStepCurrent =
  "bg-primary border-primary text-primary-foreground";

export const docStepDone =
  "bg-primary/10 border-primary text-primary";

export const docStepIdle =
  "bg-muted border-border text-muted-foreground hover:bg-muted/80";

export const docStepIconCurrent =
  "border-primary-foreground/30 bg-primary-foreground/15";

export const docStepIconDone = "border-primary bg-primary text-primary-foreground";

export const docStepIconIdle = "border-border bg-muted text-muted-foreground";

export const docChoiceCardBase =
  "flex gap-3 rounded-lg border-2 p-4 text-left transition-colors";

export const docChoiceCardIdle = "border-border bg-card hover:bg-muted/50";

export const docChoiceCardEffective =
  "border-primary bg-primary/10 dark:bg-primary/15";

export const docChoiceCardIneffective =
  "border-destructive bg-destructive/10 dark:bg-destructive/15";

export const docChoiceRadioEffective =
  "border-primary bg-primary text-primary-foreground";

export const docChoiceRadioIneffective =
  "border-destructive bg-destructive text-destructive-foreground";

export const docChoiceRadioIdle = "border-border bg-background";

export const docSelectionActive =
  "border-primary bg-primary/10 text-primary dark:text-primary";

export const docSelectionIdle = "border-border bg-card text-foreground";

export const docStatusBadgeSuccess =
  "border-transparent bg-primary text-primary-foreground shadow-none hover:bg-primary/90";

export const docStatusBadgeWarning =
  "border-transparent bg-amber-600 text-white shadow-none hover:bg-amber-600/90 dark:bg-amber-700";

export const docStatusBadgeDanger =
  "border-transparent bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90";

export const docDocStatus: Record<string, string> = {
  "In-Progress":
    "bg-sky-500/15 text-sky-800 dark:text-sky-200 border border-sky-500/30",
  Success:
    "bg-primary/15 text-primary dark:text-primary border border-primary/30",
  Pending:
    "bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30",
  Fail: "bg-destructive/15 text-destructive border border-destructive/30",
};

export const docPositionBadge: Record<string, string> = {
  Draft: "bg-amber-600 text-white dark:bg-amber-700",
  "Review Pending": "bg-amber-600 text-white dark:bg-amber-700",
  "Approval Pending": "bg-primary text-primary-foreground",
  "Needs Review Again": "bg-destructive text-destructive-foreground",
  default: "bg-muted-foreground text-primary-foreground",
};

export const docBadgeActive =
  "bg-primary/15 text-primary border border-primary/30 font-medium hover:bg-primary/15";

export const docCalloutInfo =
  "rounded-lg border-l-4 border-l-primary bg-primary/10 pl-4 pr-4 py-4 text-sm text-foreground";

export const docCalloutSuccess =
  "rounded-lg border-l-4 border-l-primary bg-primary/10 pl-4 pr-4 py-4 text-sm text-foreground";

export const docCalloutWarning =
  "rounded-lg border-l-4 border-l-amber-500 bg-amber-500/10 pl-4 pr-4 py-4 flex gap-3 items-start text-foreground";

export const docAlertDestructive =
  "rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive shadow-sm";

export const docAlertDestructiveTitle = "text-sm font-semibold text-destructive";

export const docAlertDestructiveBody = "text-sm leading-relaxed text-destructive/90";

export const docEvidenceStepCurrent =
  "rounded-lg border px-4 py-3 bg-primary border-primary text-primary-foreground flex flex-col items-center justify-center min-h-[92px] gap-2";

export const docEvidenceStepIdle =
  "rounded-lg border px-4 py-3 border-border bg-card text-muted-foreground flex flex-col items-center justify-center min-h-[92px] gap-2 hover:bg-muted/50";

export const docEvidenceStepIconCurrent =
  "h-8 w-8 rounded-full border border-primary-foreground/30 bg-primary-foreground/15 flex items-center justify-center";

export const docAckBox =
  "rounded-lg border border-primary/30 bg-primary/10 px-4 py-3";

export const docAckBoxTitle = "text-sm font-semibold text-primary";

export const docAckBoxBody = "mt-2 space-y-1.5 text-sm text-foreground list-disc pl-5";

export const docSectionNumber = "text-primary";

export const docInfoCard =
  "border border-primary/25 bg-primary/10";

export const docInfoCardIcon =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-background font-semibold text-primary";

export const docWarningBanner =
  "rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-3 items-start text-sm text-foreground";
