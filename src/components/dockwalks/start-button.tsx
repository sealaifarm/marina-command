"use client";

import { useFormStatus } from "react-dom";
import { SpinnerIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

// Submit button for the "Start dockwalk" form; shows progress while it works.
export function StartButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending && <SpinnerIcon className="size-4" />}
      {children}
    </Button>
  );
}
