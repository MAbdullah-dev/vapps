"use client";

import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2,
  Calendar as CalendarIcon,
  Camera,
  Copy,
  Download,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { downloadRecoveryCodesPdfClient } from "@/lib/two-factor-recovery-pdf";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  jobTitle: string | null;
  department: string | null;
  employeeId: string | null;
  reportsTo: string | null;
  joinDate: string | null;
  createdAt: string;
};

type TwoFactorSetup = {
  secret: string;
  qrCodeDataUrl: string;
};

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const emptyProfile: Profile = {
  id: "",
  name: null,
  email: null,
  image: null,
  phone: null,
  location: null,
  bio: null,
  jobTitle: null,
  department: null,
  employeeId: null,
  reportsTo: null,
  joinDate: null,
  createdAt: "",
};

function profileToForm(p: Profile) {
  const name = p.name ?? "";
  const [firstName, lastName] = name ? name.trim().split(/\s+/, 2) : ["", ""];
  return {
    firstName: firstName || "",
    lastName: lastName || "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    location: p.location ?? "",
    bio: p.bio ?? "",
    jobTitle: p.jobTitle ?? "",
    department: p.department ?? "",
    employeeId: p.employeeId ?? "",
    joinDate: p.joinDate ? format(new Date(p.joinDate), "yyyy-MM-dd") : "",
    reportsTo: p.reportsTo ?? "",
  };
}

export default function AccountPage() {
  const { data: session, status, update: updateSession } = useSession();
  const params = useParams();
  const orgId = params?.orgId as string;

  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(profileToForm(emptyProfile));
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(0);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState("");
  const [unusedRecoveryCodes, setUnusedRecoveryCodes] = useState(0);
  const [recoveryCodesDialogOpen, setRecoveryCodesDialogOpen] = useState(false);
  const [displayedRecoveryCodes, setDisplayedRecoveryCodes] = useState<string[]>([]);
  const [regenerateCode, setRegenerateCode] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordStatusLoading, setPasswordStatusLoading] = useState(true);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [orgMembership, setOrgMembership] = useState<{
    leadershipTier: string;
    systemRole: string;
    jobTitle: string | null;
    isOwner: boolean;
  } | null>(null);
  const hasLoadedProfileOnce = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async (showError = true) => {
    try {
      setLoading(true);
      const data = await apiClient.getProfile();
      hasLoadedProfileOnce.current = true;
      setProfile(data);
      setForm(profileToForm(data));
    } catch {
      if (showError) toast.error("Failed to load profile");
      // Don't overwrite with empty if we had already loaded a profile (e.g. refetch failed)
      if (!hasLoadedProfileOnce.current) {
        setProfile(emptyProfile);
        setForm(profileToForm(emptyProfile));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTwoFactorStatus = useCallback(async () => {
    try {
      setTwoFactorLoading(true);
      const data = await apiClient.getTwoFactorStatus();
      setTwoFactorEnabled(data.enabled);
      setUnusedRecoveryCodes(data.unusedRecoveryCodes ?? 0);
      if (data.enabled) {
        setTwoFactorSetup(null);
        setTwoFactorCode("");
      } else if (data.pendingSetup) {
        const pending = await apiClient.getPendingTwoFactorSetup();
        if (pending.pending && pending.secret && pending.qrCodeDataUrl) {
          setTwoFactorSetup({
            secret: pending.secret,
            qrCodeDataUrl: pending.qrCodeDataUrl,
          });
        }
      }
    } catch {
      toast.error("Failed to load two-step verification status");
    } finally {
      setTwoFactorLoading(false);
    }
  }, []);

  const fetchPasswordStatus = useCallback(async () => {
    try {
      setPasswordStatusLoading(true);
      const data = await apiClient.getPasswordStatus();
      setHasPassword(data.hasPassword);
    } catch {
      toast.error("Failed to load password status");
    } finally {
      setPasswordStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchProfile(true);
  }, [status, fetchProfile]);

  useEffect(() => {
    if (status === "authenticated") fetchTwoFactorStatus();
  }, [status, fetchTwoFactorStatus]);

  useEffect(() => {
    if (status === "authenticated") fetchPasswordStatus();
  }, [status, fetchPasswordStatus]);

  useEffect(() => {
    if (!orgId || status !== "authenticated") return;
    apiClient
      .getMyOrgMembership(orgId)
      .then(setOrgMembership)
      .catch(() => setOrgMembership(null));
  }, [orgId, status]);

  // Refetch when user returns to this tab so we show latest saved data after login
  useEffect(() => {
    const onFocus = () => {
      if (status === "authenticated") fetchProfile(false);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, fetchProfile]);

  const handleEdit = () => {
    setForm(profileToForm(profile));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm(profileToForm(profile));
    setIsEditing(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setAvatarUploading(true);
      const uploaded = await apiClient.uploadProfileAvatar(file);
      await fetchProfile(false);
      setAvatarTimestamp(Date.now());
      // Do not put data URLs in the session — JWT cookie size limit. Profile UI uses API state.
      if (!uploaded.image.startsWith("data:image/")) {
        await updateSession?.({ image: `/api/user/avatar?t=${Date.now()}` });
      }
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload picture");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleStartTwoFactorSetup = async () => {
    try {
      setTwoFactorSaving(true);
      const setup = await apiClient.startTwoFactorSetup();
      setTwoFactorSetup({
        secret: setup.secret,
        qrCodeDataUrl: setup.qrCodeDataUrl,
      });
      setTwoFactorCode("");
      toast.success("Scan the QR code with your authenticator app");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start 2FA setup");
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    try {
      setTwoFactorSaving(true);
      const result = await apiClient.enableTwoFactor(twoFactorCode);
      setTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      setUnusedRecoveryCodes(result.recoveryCodes.length);
      if (result.recoveryCodes.length > 0) {
        setDisplayedRecoveryCodes(result.recoveryCodes);
        setRecoveryCodesDialogOpen(true);
      }
      toast.success(
        result.emailSent
          ? "Two-step verification enabled. Recovery codes emailed as PDF."
          : "Two-step verification enabled"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enable 2FA");
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const handleCopyRecoveryCodes = async () => {
    if (displayedRecoveryCodes.length === 0) return;
    try {
      await navigator.clipboard.writeText(displayedRecoveryCodes.join("\n"));
      toast.success("Recovery codes copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleDownloadRecoveryCodes = () => {
    const email = profile.email ?? "";
    if (!email || displayedRecoveryCodes.length === 0) return;
    downloadRecoveryCodesPdfClient({
      email,
      recoveryCodes: displayedRecoveryCodes,
    });
  };

  const handleRegenerateRecoveryCodes = async () => {
    try {
      setTwoFactorSaving(true);
      const result = await apiClient.regenerateTwoFactorRecoveryCodes(regenerateCode);
      setRegenerateCode("");
      setUnusedRecoveryCodes(result.recoveryCodes.length);
      setDisplayedRecoveryCodes(result.recoveryCodes);
      setRecoveryCodesDialogOpen(true);
      toast.success(
        result.emailSent
          ? "New recovery codes generated and emailed as PDF."
          : "New recovery codes generated"
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to regenerate recovery codes"
      );
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    try {
      setTwoFactorSaving(true);
      await apiClient.disableTwoFactor(twoFactorDisableCode);
      setTwoFactorEnabled(false);
      setTwoFactorDisableCode("");
      setUnusedRecoveryCodes(0);
      setDisplayedRecoveryCodes([]);
      toast.success("Two-step verification disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    try {
      setPasswordSaving(true);
      const result = await apiClient.updatePassword({
        ...(hasPassword
          ? { currentPassword: passwordForm.currentPassword }
          : {}),
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setHasPassword(result.hasPassword);
      setPasswordForm(emptyPasswordForm);
      toast.success(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSave = async () => {
    const name = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ") || undefined;
    try {
      setSaving(true);
      const updated = await apiClient.updateProfile({
        name,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        location: form.location.trim() || undefined,
        bio: form.bio.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        department: form.department.trim() || undefined,
        employeeId: form.employeeId.trim() || undefined,
        reportsTo: form.reportsTo.trim() || undefined,
        joinDate: form.joinDate ? form.joinDate : undefined,
      }) as typeof profile & { emailVerificationSent?: boolean; message?: string };
      setProfile(updated);
      setIsEditing(false);
      if (updated.emailVerificationSent && updated.message) {
        toast.success(updated.message);
        await fetchProfile(false);
      } else {
        await updateSession?.({
          name: updated.name != null ? updated.name : undefined,
          email: updated.email != null ? updated.email : undefined,
          image:
            updated.image != null && !updated.image.startsWith("data:image/")
              ? updated.image
              : undefined,
        });
        toast.success("Profile updated");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const user = session?.user as { name?: string | null; email?: string | null; image?: string | null } | undefined;
  const displayName = (profile.name || user?.name) ?? "";
  const displayEmail = (profile.email || user?.email) ?? "";
  const [firstName, lastName] = displayName ? displayName.trim().split(/\s+/, 2) : ["", ""];
  // S3 key: use app avatar URL; external URL (OAuth): use as-is
  const displayImage =
    profile.image?.startsWith("data:image/")
      ? profile.image
      : profile.image && !profile.image.startsWith("http")
        ? `/api/user/avatar?t=${avatarTimestamp || ""}`
        : (profile.image || user?.image) ?? null;
  const roleTags = orgMembership
    ? [orgMembership.jobTitle, orgMembership.leadershipTier, orgMembership.systemRole].filter(
        (t): t is string => t != null && String(t).trim() !== ""
      )
    : [];

  if (loading && !profile.id) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6A7282]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#0A0A0A] tracking-tight">My Profile</h1>
        <p className="text-sm text-[#6A7282] mt-1">Manage your personal information and preferences</p>
      </div>

      <div className="space-y-6">
          {/* User Profile Card */}
          <Card className="border border-[#0000001A] shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="relative shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <Avatar className="h-20 w-20 rounded-full border-2 border-[#F3F3F5]">
                    <AvatarImage src={displayImage ?? undefined} alt={displayName || "Profile"} />
                    <AvatarFallback className="bg-[#E5E7EB] text-[#374151] text-lg">
                      {firstName && lastName ? `${firstName[0]}${lastName[0]}` : displayEmail?.slice(0, 2)?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#0A0A0A] text-white shadow hover:bg-[#333] transition-colors disabled:opacity-60 disabled:pointer-events-none"
                    aria-label="Change profile picture"
                  >
                    {avatarUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg text-[#0A0A0A]">{displayName || "—"}</h2>
                  <p className="text-sm text-[#6A7282] mt-0.5">{displayEmail || "—"}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {roleTags.length > 0 ? (
                      roleTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-full bg-[#F3F3F5] px-3 py-1 text-xs font-medium text-[#374151]">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#6A7282]">No role assigned in this organization</span>
                    )}
                  </div>
                </div>
                {!isEditing ? (
                  <Button className="rounded-lg bg-[#0A0A0A] text-white hover:bg-[#333] shrink-0" size="sm" onClick={handleEdit}>
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                      Cancel
                    </Button>
                    <Button className="rounded-lg bg-[#0A0A0A] text-white hover:bg-[#333]" size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border border-[#0000001A] shadow-sm rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
                {twoFactorEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-[#6A7282]" />
                )}
                Two-Step Verification
              </CardTitle>
              <CardDescription>
                Protect your account with a 6-digit code from Google Authenticator,
                Microsoft Authenticator, Authy, or another TOTP app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {twoFactorLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#6A7282]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading security status...
                </div>
              ) : twoFactorEnabled ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    Two-step verification is enabled for your account.
                    {unusedRecoveryCodes > 0 && (
                      <span className="block mt-1">
                        {unusedRecoveryCodes} unused recovery code
                        {unusedRecoveryCodes === 1 ? "" : "s"} remaining.
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-3">
                    <div className="text-sm font-medium text-[#0A0A0A]">
                      Regenerate recovery codes
                    </div>
                    <p className="text-sm text-[#6A7282]">
                      This invalidates all previous recovery codes and emails you a new PDF.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <Input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Authenticator code"
                        value={regenerateCode}
                        onChange={(event) =>
                          setRegenerateCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={handleRegenerateRecoveryCodes}
                        disabled={twoFactorSaving || regenerateCode.length !== 6}
                      >
                        {twoFactorSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Regenerate"
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Enter 6-digit code to disable"
                      value={twoFactorDisableCode}
                      onChange={(event) =>
                        setTwoFactorDisableCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={handleDisableTwoFactor}
                      disabled={twoFactorSaving || twoFactorDisableCode.length !== 6}
                    >
                      {twoFactorSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Disable"
                      )}
                    </Button>
                  </div>
                </div>
              ) : twoFactorSetup ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                    <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
                      <Image
                        src={twoFactorSetup.qrCodeDataUrl}
                        alt="Authenticator app QR code"
                        width={240}
                        height={240}
                        unoptimized
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-[#0A0A0A]">
                          1. Scan this QR code
                        </div>
                        <p className="text-sm text-[#6A7282]">
                          Open your authenticator app, add a new account, and scan
                          the QR code. This QR stays the same until you finish setup
                          or disable two-step verification.
                        </p>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#0A0A0A]">
                          Manual setup key
                        </div>
                        <code className="mt-1 block break-all rounded bg-[#F3F3F5] px-3 py-2 text-xs text-[#374151]">
                          {twoFactorSetup.secret}
                        </code>
                      </div>
                      <div>
                        <Label className="text-[#374151] text-sm">
                          2. Enter the 6-digit code
                        </Label>
                        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
                          <Input
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="123456"
                            value={twoFactorCode}
                            onChange={(event) =>
                              setTwoFactorCode(
                                event.target.value.replace(/\D/g, "").slice(0, 6)
                              )
                            }
                          />
                          <Button
                            className="bg-[#0A0A0A] text-white hover:bg-[#333]"
                            onClick={handleEnableTwoFactor}
                            disabled={twoFactorSaving || twoFactorCode.length !== 6}
                          >
                            {twoFactorSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Verify & Enable"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-[#6A7282]">
                    Two-step verification is not enabled yet. After setup, login
                    will require your password plus a 6-digit authenticator code.
                  </div>
                  <Button
                    className="bg-[#0A0A0A] text-white hover:bg-[#333] shrink-0"
                    onClick={handleStartTwoFactorSetup}
                    disabled={twoFactorSaving}
                  >
                    {twoFactorSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4 mr-2" />
                        Enable Authenticator
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="border border-[#0000001A] shadow-sm rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-[#6A7282]" />
                Password
              </CardTitle>
              <CardDescription>
                {hasPassword
                  ? "Change the password used for email login."
                  : "Set a password so you can also sign in with email and password."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordStatusLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#6A7282]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading password status...
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm text-[#6A7282]">
                    {hasPassword
                      ? "Your account has a password. Use your current password to change it."
                      : "Your account does not have a password yet. This is common for SSO accounts."}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {hasPassword && (
                      <div className="space-y-2">
                        <Label className="text-[#374151] text-sm">
                          Current Password
                        </Label>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          value={passwordForm.currentPassword}
                          onChange={(event) =>
                            setPasswordForm((form) => ({
                              ...form,
                              currentPassword: event.target.value,
                            }))
                          }
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-[#374151] text-sm">
                        New Password
                      </Label>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                          setPasswordForm((form) => ({
                            ...form,
                            newPassword: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#374151] text-sm">
                        Confirm New Password
                      </Label>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) =>
                          setPasswordForm((form) => ({
                            ...form,
                            confirmPassword: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#6A7282]">
                      Password must be at least 8 characters. Use a unique
                      password that you do not use on other websites.
                    </p>
                    <Button
                      className="bg-[#0A0A0A] text-white hover:bg-[#333] shrink-0"
                      onClick={handleUpdatePassword}
                      disabled={
                        passwordSaving ||
                        (hasPassword && !passwordForm.currentPassword) ||
                        passwordForm.newPassword.length < 8 ||
                        passwordForm.newPassword !== passwordForm.confirmPassword
                      }
                    >
                      {passwordSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : hasPassword ? (
                        "Change Password"
                      ) : (
                        "Set Password"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="border border-[#0000001A] shadow-sm rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A]">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#374151] text-sm">First Name</Label>
                  <Input
                    readOnly={!isEditing}
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#0A0A0A] read-only:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#374151] text-sm">Last Name</Label>
                  <Input
                    readOnly={!isEditing}
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#0A0A0A] read-only:cursor-default"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#374151] text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#6A7282]" /> Email Address
                </Label>
                <Input
                  readOnly={!isEditing}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#0A0A0A] read-only:cursor-default"
                />
                <p className="text-xs text-[#6A7282]">
                  Changing your email will send a verification link to the new address. Your email will update after you confirm.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-[#374151] text-sm flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#6A7282]" /> Phone Number
                </Label>
                <Input
                  readOnly={!isEditing}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#0A0A0A] read-only:cursor-default"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#374151] text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#6A7282]" /> Location
                </Label>
                <Input
                  readOnly={!isEditing}
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#0A0A0A] read-only:cursor-default"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#374151] text-sm">Bio</Label>
                <textarea
                  readOnly={!isEditing}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#0A0A0A] resize-none read-only:cursor-default"
                />
              </div>
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card className="border border-[#0000001A] shadow-sm rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-[#0A0A0A]">Work Information</CardTitle>
              <CardDescription>Your role and department details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#374151] text-sm">Job Title</Label>
                  <Input
                    readOnly={!isEditing}
                    value={form.jobTitle}
                    onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                    className="bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#0A0A0A] read-only:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#374151] text-sm">Department</Label>
                  <Input
                    readOnly={!isEditing}
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    className="bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#0A0A0A] read-only:cursor-default"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#374151] text-sm">Employee ID</Label>
                  <Input
                    readOnly={!isEditing}
                    value={form.employeeId}
                    onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                    className="bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#0A0A0A] read-only:cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#374151] text-sm flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-[#6A7282]" /> Join Date
                  </Label>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#0A0A0A] hover:bg-[#F3F3F5]"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-[#6A7282]" />
                          {form.joinDate
                            ? format(new Date(form.joinDate), "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.joinDate ? new Date(form.joinDate) : undefined}
                          onSelect={(date) => {
                            if (!date) return;
                            setForm((f) => ({
                              ...f,
                              joinDate: format(date, "yyyy-MM-dd"),
                            }));
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex h-9 w-full items-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#0A0A0A]">
                      {form.joinDate
                        ? format(new Date(form.joinDate), "PPP")
                        : "—"}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#374151] text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#6A7282]" /> Reports To
                </Label>
                <Input
                  readOnly={!isEditing}
                  value={form.reportsTo}
                  onChange={(e) => setForm((f) => ({ ...f, reportsTo: e.target.value }))}
                  className="bg-[#F9FAFB] border-[#E5E7EB] rounded-lg text-[#0A0A0A] read-only:cursor-default"
                />
              </div>
            </CardContent>
          </Card>
      </div>

      <Dialog
        open={recoveryCodesDialogOpen}
        onOpenChange={setRecoveryCodesDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save your recovery codes</DialogTitle>
            <DialogDescription>
              These codes are shown only once. Store them securely. Each code works
              one time if you lose your authenticator app. A copy was also emailed
              as a PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2 max-h-48 overflow-y-auto">
            {displayedRecoveryCodes.map((code) => (
              <code
                key={code}
                className="block font-mono text-sm tracking-wide text-foreground"
              >
                {code}
              </code>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleCopyRecoveryCodes}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button type="button" onClick={handleDownloadRecoveryCodes}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
