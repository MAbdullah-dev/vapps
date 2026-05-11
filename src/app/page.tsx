"use client";

import { useEffect, useState } from "react";
import Header from "@/components/common/Header";
import { Button } from "@/components/ui/button";
import { UsersRound, Plus, Check, ArrowRight, Mail, Star, Building2, ChevronRight } from 'lucide-react';
import Link from "next/link";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import axios from "axios";
import { getOrgDashboardUrl } from "@/lib/subdomain";
import { useTranslate } from "@/components/providers/translation-provider";

interface Organization {
  id: string;
  slug?: string;
  name: string;
  role: string;
  createdAt: string;
  memberCount: number;
}

const HomePage = () => {
  const { t } = useTranslate();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await axios.get("/api/organization/list", {
        withCredentials: true,
      });
      setOrganizations(response.data.organizations || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role.toLowerCase()) {
      case "owner":
        return "text-[#432DD7] px-4 py-1 text-sm rounded-2xl bg-[#E0E7FF]";
      case "admin":
        return "text-[#155DFC] px-4 py-1 text-sm rounded-2xl bg-[#DBEAFE]";
      case "member":
        return "text-green-700 px-4 py-1 text-sm rounded-2xl bg-[#DCFCE7]";
      default:
        return "text-gray-700 px-4 py-1 text-sm rounded-2xl bg-gray-100";
    }
  };

  const getIconGradient = (index: number) => {
    const gradients = [
      "bg-[linear-gradient(135deg,#615FFF_0%,#9810FA_100%)]",
      "bg-[linear-gradient(135deg,#2B7FFF_0%,#4F39F6_100%)]",
      "bg-[linear-gradient(135deg,#00C950_0%,#009966_100%)]",
    ];
    return gradients[index % gradients.length];
  };

  // Check if user owns any organization
  const hasOwnedOrg = organizations.some(org => org.role.toLowerCase() === "owner");

  return (
    <>
      <Header />
      <section className="your-sites py-10">
        <div className="container mx-auto px-5">
          <div className="inner">
            <div className="all-sites mt-8">
              <h2 className="flex items-center gap-2 text-lg font-semibold mb-4 capitalize text-foreground">
                <Star size={20} fill="hsl(var(--primary))" stroke="hsl(var(--primary))" /> {t("Your organizations")}
              </h2>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("Loading organizations...")}
                </div>
              ) : organizations.length === 0 ? (
                <div className="
                  no-sites-box flex flex-col items-center gap-4 
                  rounded-2xl p-8 md:p-10
                  text-center
                  bg-muted/50 border-2 border-border
                  dark:bg-muted/70 dark:border-border
                ">
                  <div className="
                    user-icon 
                    w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center
                    bg-gradient-to-br from-primary to-violet-700
                  ">
                    <UsersRound size={40} className="text-background" />
                  </div>
                  <h1 className="text-lg md:text-xl font-semibold text-foreground">{t("You're Not Part of Any Organization Yet")}</h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-md">
                    {t("Sites help you collaborate with your organization. Create a new site or join an existing one to get started.")}
                  </p>
                </div>
              ) : (
                <div className="site-cards flex flex-wrap gap-4">
                  {organizations.map((org, index) => (
                    <div
                      key={org.id}
                      onClick={() => {
                        const slug = org.slug ?? org.id;
                        const url = getOrgDashboardUrl(slug);
                        if (url.startsWith("http")) {
                          window.location.href = url;
                        } else {
                          router.push(url);
                        }
                      }}
                      className={`
                        site-card 
                        w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]
                        border rounded-2xl p-5 
                        bg-card shadow-sm flex flex-col justify-between
                        cursor-pointer hover:shadow-md transition-shadow
                        border-border
                        dark:bg-card dark:border-border`}
                    >
                      {/* Header */}
                      <div className="card-header mb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-4">
                            <div className={`
                              site-icon 
                              bg-gradient-to-br ${
                                index % 3 === 0
                                  ? 'from-primary to-violet-700'
                                  : index % 3 === 1
                                  ? 'from-blue-500 to-indigo-700'
                                  : 'from-green-500 to-emerald-700'
                              }
                              p-3 rounded-lg
                            `}>
                              <Building2 className="text-background" />
                            </div>
                            <div>
                              <h2 className="font-semibold text-base text-card-foreground">{org.name}</h2>
                              <span
                                className={`
                                  px-4 py-1 text-sm rounded-2xl
                                  ${
                                    org.role.toLowerCase() === "owner" 
                                      ? "bg-primary/15 text-primary font-medium"
                                      : org.role.toLowerCase() === "admin"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                                      : org.role.toLowerCase() === "member"
                                      ? "bg-green-100 text-emerald-700 dark:bg-green-900/40 dark:text-green-200"
                                      : "bg-muted-foreground/10 text-muted-foreground"
                                  }
                                `}
                              >
                                {org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="text-muted-foreground" />
                        </div>
                      </div>
                      {/* Footer */}
                      <div>
                        <p className="flex items-center gap-2 text-muted-foreground text-sm">
                          <UsersRound size={18} /> {org.memberCount} {org.memberCount === 1 ? t('Member') : t('Members')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
 
      <section className="py-8">
        <div className="container mx-auto px-5">
          <div
            className={`flex flex-col ${hasOwnedOrg ? "md:flex-row md:justify-center" : "md:flex-row"} gap-6`}
          >
            {/* Create New Organization Card - Only show if user doesn't own an org */}
            {!hasOwnedOrg && (
              <div
                className="
                  w-full md:w-1/2
                  rounded-2xl
                  border
                  border-border
                  bg-card
                  shadow
                  p-6 py-8
                  flex flex-col justify-between
                  transition-colors
                "
              >
                {/* Top content */}
                <div className="flex flex-col items-center">
                  {/* Icon */}
                  <div
                    className="
                      w-20 h-20 rounded-full flex items-center justify-center
                      bg-gradient-to-br from-primary to-green-700 dark:from-primary dark:to-green-500
                      shadow mb-4
                    "
                  >
                    <Plus size={32} className="text-white" />
                  </div>
                  {/* Title */}
                  <h2 className="text-lg lg:text-xl font-semibold mb-2 text-center text-card-foreground dark:text-card-foreground">
                    {t("Create a New Organization")}
                  </h2>
                  {/* Description */}
                  <p className="text-sm md:text-base text-muted-foreground mb-6 text-center">
                    {t("Start fresh with your own Organization")}
                  </p>
                  {/* Features */}
                  <div className="flex flex-col gap-4 w-full my-5">
                    <ul className="flex items-start gap-4">
                      <li>
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                      </li>
                      <li>
                        <span className="font-medium text-foreground">{t("Full Control")}</span>
                        <p className="text-sm text-muted-foreground">
                          {t("You'll be the owner with full administrative rights")}
                        </p>
                      </li>
                    </ul>
                    <ul className="flex items-start gap-4">
                      <li>
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                      </li>
                      <li>
                        <span className="font-medium text-foreground">{t("Instant Access")}</span>
                        <p className="text-sm text-muted-foreground">{t("Join immediately with an invite code")}</p>
                      </li>
                    </ul>
                    <ul className="flex items-start gap-4">
                      <li>
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                      </li>
                      <li>
                        <span className="font-medium text-foreground">{t("Collaborate")}</span>
                        <p className="text-sm text-muted-foreground">{t("Work together with your colleagues")}</p>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Button stuck to bottom */}
                <Button
                  asChild
                  variant="default"
                  size="lg"
                  className="w-full flex items-center justify-center gap-2 mt-6"
                >
                  <Link href="/organization-setup/step1">
                    {t("Create Organization")} <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
            {/* (Join Existing Organization card is commented out for future implementation; be sure to also use shadcn/ui design and tokens there) */}
          </div>
          {/* Support Text */}
          <p className="text-sm text-center mt-6 text-muted-foreground">
            {t("Need help? Contact")}{" "}<span className="text-primary font-medium">support@vie.com</span>
          </p>
        </div>
      </section>
 
    </>
  )
}

export default HomePage