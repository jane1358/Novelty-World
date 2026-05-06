import { Search, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function SearchBar({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative mb-6 lg:mb-8">
      <Search
        size={18}
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "w-full rounded-full border border-border-default bg-surface-secondary",
          "py-3 pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted",
          "transition-colors hover:border-border-hover",
          "focus:border-brand-pink focus:outline-none focus:ring-2 focus:ring-brand-pink/40",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
