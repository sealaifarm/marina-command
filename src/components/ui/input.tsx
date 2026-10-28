import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-12 w-full rounded-full border border-input bg-card px-5 text-base text-foreground shadow-xs transition placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 read-only:opacity-70 aria-invalid:border-destructive aria-invalid:ring-destructive/10 md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Input };
