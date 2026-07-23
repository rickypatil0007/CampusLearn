import { cn } from "@/lib/utils";

/**
 * Minimal geometric mark: three stacked strokes (open book / connected
 * campus nodes) in the primary lime, plus the wordmark. No external asset —
 * pure SVG so it renders crisply at any size.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("h-6 w-6", className)} aria-hidden="true">
      <path d="M4 8L16 4L28 8L16 12L4 8Z" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 8V22L16 26L28 22V8" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 12V26" stroke="var(--primary)" strokeWidth="2" />
      <circle cx="16" cy="8" r="1.5" fill="var(--primary)" />
    </svg>
  );
}

export function Logo({ className, showTagline = false }: { className?: string; showTagline?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <div className="flex flex-col leading-none">
        <span className="font-mono text-sm font-semibold tracking-wide text-foreground">
          CAMPUS<span className="text-primary">LEARN</span>
        </span>
        {showTagline && (
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            One campus. One learning platform.
          </span>
        )}
      </div>
    </div>
  );
}
