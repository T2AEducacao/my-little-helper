import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

export function PageHeader({ title, description, actions, className, bordered }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between",
        bordered && "border-b border-border pb-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">{actions}</div>
      )}
    </div>
  );
}
