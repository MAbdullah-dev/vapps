/** Human-readable verb for `document.*` actions from `document_module_history`. */
export function documentActivityVerb(action: string): string {
  const key = action.startsWith("document.") ? action.slice("document.".length) : action;
  switch (key) {
    case "draft_created":
      return "created document draft";
    case "draft_updated":
      return "updated document draft";
    case "submitted_for_review":
      return "submitted document for review";
    case "revision_created":
      return "created document revision";
    case "review_submitted":
      return "submitted review for document";
    case "review_returned_for_correction":
      return "returned document for correction (review)";
    case "approval_returned_for_correction":
      return "returned document for correction (approval)";
    case "approved":
      return "approved document";
    case "annual_review_requested":
      return "requested annual review for document";
    case "annual_review_accepted":
      return "accepted annual re-review for document";
    case "annual_review_declined":
      return "declined annual re-review for document";
    default:
      return `updated document (${key.replace(/_/g, " ")})`;
  }
}
