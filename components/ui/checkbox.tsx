import * as React from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      {...props}
    />
  );
}
