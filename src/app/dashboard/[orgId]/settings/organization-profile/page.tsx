"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Info } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function OrganizationProfilePage() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    legalName: "",
    registrationId: "",
    taxId: "",
    industry: "",
    companySize: "",
    foundedDate: "",
    website: "",
    primaryEmail: "",
    supportEmail: "",
    phone: "",
    fax: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    brandColor: "#05EE07",
    brandFont: "Arial",
  });

  useEffect(() => {
    if (orgId && typeof orgId === 'string' && orgId !== 'undefined') {
      fetchOrganizationInfo();
    }
  }, [orgId]);

  const fetchOrganizationInfo = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getOrganizationInfo(orgId);
      if (response.organizationInfo) {
        const info = response.organizationInfo;
        setFormData({
          name: info.name || "",
          legalName: info.legalName || "",
          registrationId: info.registrationId || "",
          taxId: info.taxId || "",
          industry: info.industry || "",
          companySize: info.companySize || "",
          foundedDate: info.foundedDate || "",
          website: info.website || "",
          primaryEmail: info.contactEmail || "",
          supportEmail: info.supportEmail || "",
          phone: info.phone || "",
          fax: info.fax || "",
          addressLine1: info.address?.split('\n')[0] || "",
          addressLine2: info.address?.split('\n')[1] || "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
          brandColor: info.brandColor || "#05EE07",
          brandFont: info.brandFont || "Arial",
        });
        setLastUpdated(info.updatedAt);
      }
    } catch (error: any) {
      console.error("Error fetching organization info:", error);
      toast.error("Failed to load organization profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const address = [formData.addressLine1, formData.addressLine2]
        .filter(Boolean)
        .join('\n');
      
      await apiClient.updateOrganizationInfo(orgId, {
        name: formData.name,
        legalName: formData.legalName,
        registrationId: formData.registrationId,
        taxId: formData.taxId,
        industry: formData.industry,
        companySize: formData.companySize,
        foundedDate: formData.foundedDate,
        website: formData.website,
        primaryEmail: formData.primaryEmail,
        supportEmail: formData.supportEmail,
        phone: formData.phone,
        fax: formData.fax,
        address: address || undefined,
        contactName: formData.primaryEmail ? "Primary Contact" : undefined,
        contactEmail: formData.primaryEmail || undefined,
      });
      
      toast.success("Organization profile updated successfully");
      setIsEditing(false);
      fetchOrganizationInfo();
    } catch (error: any) {
      console.error("Error saving organization info:", error);
      toast.error(error.message || "Failed to update organization profile");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Don't render if orgId is not available
  if (!orgId || orgId === 'undefined') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading organization...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500 mb-1">
            Settings &gt; Organization Profile
          </div>
          <h1 className="text-2xl font-semibold">Organization Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your company information and branding.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {formatDate(lastUpdated)}
            </span>
          )}
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="dark">
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  fetchOrganizationInfo();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} variant="dark">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Branding Card */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Your company logo and visual identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Logo */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-gray-800 text-white text-xl">
                  {formData.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button variant="outline" size="sm">
                  Upload Logo
                </Button>
              )}
            </div>
          </div>

          {/* Primary Brand Color */}
          <div className="space-y-2">
            <Label>Primary Brand Color</Label>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded border border-gray-300"
                style={{ backgroundColor: formData.brandColor }}
              />
              {isEditing ? (
                <Input
                  type="color"
                  value={formData.brandColor}
                  onChange={(e) =>
                    setFormData({ ...formData, brandColor: e.target.value })
                  }
                  className="w-32"
                />
              ) : (
                <Input value={formData.brandColor} disabled className="w-32" />
              )}
            </div>
          </div>

          {/* Brand Font */}
          <div className="space-y-2">
            <Label>Brand Font</Label>
            {isEditing ? (
              <select
                value={formData.brandFont}
                onChange={(e) =>
                  setFormData({ ...formData, brandFont: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Roboto">Roboto</option>
              </select>
            ) : (
              <Input value={formData.brandFont} disabled />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Company Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>Legal and business information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={!isEditing}
                placeholder="Acme Corporation"
              />
            </div>
            <div className="space-y-2">
              <Label>Legal Name</Label>
              <Input
                value={formData.legalName}
                onChange={(e) =>
                  setFormData({ ...formData, legalName: e.target.value })
                }
                disabled={!isEditing}
                placeholder="Acme Corporation Inc."
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Registration Number
                <Info className="h-3 w-3 text-gray-400" />
              </Label>
              <Input
                value={formData.registrationId}
                onChange={(e) =>
                  setFormData({ ...formData, registrationId: e.target.value })
                }
                disabled={!isEditing}
                placeholder="REG-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Tax ID / EIN</Label>
              <Input
                value={formData.taxId}
                onChange={(e) =>
                  setFormData({ ...formData, taxId: e.target.value })
                }
                disabled={!isEditing}
                placeholder="12-3456789"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              {isEditing ? (
                <select
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select industry</option>
                  <option value="Technology & Software">Technology & Software</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Education">Education</option>
                </select>
              ) : (
                <Input value={formData.industry} disabled />
              )}
            </div>
            <div className="space-y-2">
              <Label>Company Size</Label>
              {isEditing ? (
                <select
                  value={formData.companySize}
                  onChange={(e) =>
                    setFormData({ ...formData, companySize: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select size</option>
                  <option value="1-10 employees">1-10 employees</option>
                  <option value="1-100 employees">1-100 employees</option>
                  <option value="101-500 employees">101-500 employees</option>
                  <option value="501-1000 employees">501-1000 employees</option>
                  <option value="1000+ employees">1000+ employees</option>
                </select>
              ) : (
                <Input value={formData.companySize} disabled />
              )}
            </div>
            <div className="space-y-2">
              <Label>Founded Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.foundedDate}
                  onChange={(e) =>
                    setFormData({ ...formData, foundedDate: e.target.value })
                  }
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <Input value={formData.foundedDate} disabled />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                disabled={!isEditing}
                placeholder="https://acme.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Primary contact details for your organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Email</Label>
              <Input
                type="email"
                value={formData.primaryEmail}
                onChange={(e) =>
                  setFormData({ ...formData, primaryEmail: e.target.value })
                }
                disabled={!isEditing}
                placeholder="contact@acme.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input
                type="email"
                value={formData.supportEmail}
                onChange={(e) =>
                  setFormData({ ...formData, supportEmail: e.target.value })
                }
                disabled={!isEditing}
                placeholder="support@acme.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                disabled={!isEditing}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Fax Number</Label>
              <Input
                value={formData.fax}
                onChange={(e) =>
                  setFormData({ ...formData, fax: e.target.value })
                }
                disabled={!isEditing}
                placeholder="+1 (555) 123-4568"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Address Card */}
      <Card>
        <CardHeader>
          <CardTitle>Business Address</CardTitle>
          <CardDescription>Primary business location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Address Line 1</Label>
            <Input
              value={formData.addressLine1}
              onChange={(e) =>
                setFormData({ ...formData, addressLine1: e.target.value })
              }
              disabled={!isEditing}
              placeholder="123 Business Street"
            />
          </div>
          <div className="space-y-2">
            <Label>Address Line 2</Label>
            <Input
              value={formData.addressLine2}
              onChange={(e) =>
                setFormData({ ...formData, addressLine2: e.target.value })
              }
              disabled={!isEditing}
              placeholder="Suite 100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                disabled={!isEditing}
                placeholder="New York"
              />
            </div>
            <div className="space-y-2">
              <Label>State / Province</Label>
              <Input
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                disabled={!isEditing}
                placeholder="NY"
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP / Postal Code</Label>
              <Input
                value={formData.zipCode}
                onChange={(e) =>
                  setFormData({ ...formData, zipCode: e.target.value })
                }
                disabled={!isEditing}
                placeholder="10001"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                disabled={!isEditing}
                placeholder="United States"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
