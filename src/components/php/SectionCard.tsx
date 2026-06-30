import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** When true, omits the divider under the header. Defaults to bordered when an action is present. */
  flushHeader?: boolean;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  flushHeader,
}: Props) {
  const showHeaderBorder = !flushHeader && !!action;
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <header
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-5 pt-5",
          showHeaderBorder ? "pb-4 border-b border-border" : "pb-2",
        )}
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </header>
      <div className={cn("px-5 pb-5 pt-3", contentClassName)}>{children}</div>
    </section>
  );
}
