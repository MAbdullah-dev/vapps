"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslate } from "@/components/providers/translation-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DEFAULT_TABLE_PAGE_SIZE = 10;

type TablePaginationProps = {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function TablePagination({
  page,
  pageSize = DEFAULT_TABLE_PAGE_SIZE,
  total,
  onPageChange,
  className,
}: TablePaginationProps) {
  const { t } = useTranslate();
  if (total <= pageSize) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-3",
        className
      )}
    >
      <p className="text-xs text-muted-foreground">
        {t("Showing")} {from}–{to} {t("of")} {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label={t("Previous page")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-18 px-1 text-center text-xs tabular-nums text-muted-foreground">
          {safePage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label={t("Next page")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function paginateRows<T>(items: T[], page: number, pageSize: number): T[] {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
