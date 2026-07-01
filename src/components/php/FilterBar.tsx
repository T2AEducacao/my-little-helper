import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: FilterOption<T>[];
  className?: string;
}

export function FilterBar<T extends string>({ value, onChange, options, className }: Props<T>) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1",
        className,
      )}
    >
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={value === opt.value ? "default" : "ghost"}
          onClick={() => onChange(opt.value)}
          className="h-7 shrink-0 px-3 text-xs"
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
