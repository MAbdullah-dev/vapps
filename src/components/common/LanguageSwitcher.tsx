"use client";

import { Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, type LocaleMeta } from "@/i18n/locales";
import { useTranslate } from "@/components/providers/translation-provider";

type Props = {
  variant?: "icon" | "toolbar";
};

export default function LanguageSwitcher({ variant = "icon" }: Props) {
  const { locale, setLocale, t } = useTranslate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent"
          title={t("Language")}
          aria-label={t("Language")}
        >
          <Globe className={variant === "toolbar" ? "h-5 w-5" : "h-5 w-5"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-lg shadow-md border bg-popover">
        {LOCALES.map((meta: LocaleMeta) => {
          const selected = locale === meta.code;
          return (
            <DropdownMenuItem
              key={meta.code}
              onClick={() => setLocale(meta.code)}
              className="flex justify-between items-center cursor-pointer text-foreground text-sm"
            >
              {t(meta.label)}
              {selected && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
