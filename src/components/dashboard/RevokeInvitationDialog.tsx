"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MailX } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface RevokeInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  invitationId: string;
  userName: string;
  userEmail: string;
  onInvitationRevoked?: () => void;
}

export default function RevokeInvitationDialog({
  open,
  onOpenChange,
  orgId,
  invitationId,
  userName,
  userEmail,
  onInvitationRevoked,
}: RevokeInvitationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRevoke = async () => {
    setIsLoading(true);

    try {
      await apiClient.delete(
        `/organization/${orgId}/invitations/${invitationId}`
      );
      toast.success("Invitation revoked successfully");
      onOpenChange(false);
      onInvitationRevoked?.();
    } catch (error: unknown) {
      console.error("Error revoking invitation:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to revoke invitation. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <MailX className="h-5 w-5" />
            Revoke Invitation
          </DialogTitle>
          <DialogDescription>
            This will cancel the pending email invitation. The invite link will
            no longer work.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="mb-1 text-sm font-medium text-amber-900">{userName}</p>
            <p className="text-sm text-amber-700">{userEmail}</p>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            You can send a new invitation later if needed.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={isLoading}
          >
            {isLoading ? "Revoking..." : "Revoke Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
