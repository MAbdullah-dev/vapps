/** Scroll a labeled field into view and focus the first control inside it. */
export function scrollToField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    const target = el.matches("input, textarea, button, select")
      ? (el as HTMLElement)
      : el.querySelector<HTMLElement>(
          "input:not([type='hidden']), textarea, button, select, [role='combobox'], [contenteditable='true'], .fr-element"
        );
    target?.focus();
  }, 400);
}
