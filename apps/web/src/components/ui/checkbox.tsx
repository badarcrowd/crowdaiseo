"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Checkbox = React.forwardRef<
  HTMLButtonElement,
  {
    checked?: boolean;
    onCheckedChange?: (next: boolean) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
    "aria-label"?: string;
  }
>(({ checked = false, onCheckedChange, disabled, className, ...rest }, ref) => (
  <button
    type="button"
    ref={ref}
    role="checkbox"
    aria-checked={checked}
    disabled={disabled}
    data-state={checked ? "checked" : "unchecked"}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      "border-input data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:border-foreground inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...rest}
  >
    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
  </button>
));
Checkbox.displayName = "Checkbox";
