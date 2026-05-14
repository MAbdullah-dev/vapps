"use client";

import { useMemo, useState } from "react";
import { Check, Globe, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LOCALES,
  localeMatchesQuery,
  type LocaleCode,
  type LocaleMeta,
} from "@/i18n/locales";
import { useTranslate } from "@/components/providers/translation-provider";

type Props = {
  variant?: "icon" | "toolbar";
};

export default function LanguageSwitcher({ variant = "icon" }: Props) {
  const { locale, setLocale, t } = useTranslate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => LOCALES.filter((meta: LocaleMeta) => localeMatchesQuery(meta, query)),
    [query]
  );

  const pick = (code: LocaleCode) => {
    setLocale(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent"
          title={t("Language")}
          aria-label={t("Language")}
          aria-expanded={open}
        >
          <Globe className={variant === "toolbar" ? "h-5 w-5" : "h-5 w-5"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(calc(100vw-2rem),22rem)] p-0 rounded-lg shadow-md border bg-popover"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search languages...")}
              className="h-9 pl-8"
              autoComplete="off"
              aria-label={t("Search languages")}
            />
          </div>
        </div>
        <ScrollArea className="h-[min(50vh,280px)]">
          <div className="p-1 pr-2">
            {filtered.length === 0 ? (
              <p className="py-8 px-2 text-center text-sm text-muted-foreground">
                {t("No languages match your search.")}
              </p>
            ) : (
              filtered.map((meta: LocaleMeta) => {
                const selected = locale === meta.code;
                return (
                  <button
                    key={meta.code}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(meta.code)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:bg-accent focus-visible:text-accent-foreground",
                      selected && "bg-accent/70"
                    )}
                  >
                    <span className="min-w-0 truncate">{meta.label}</span>
                    {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
