import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-border bg-transparent hover:bg-secondary",
    danger: "bg-danger text-danger-foreground hover:bg-danger/90",
    ghost: "bg-transparent hover:bg-secondary"
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-6 text-base"
  };

  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
