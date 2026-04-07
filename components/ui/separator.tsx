import * as React from "react";

export function Separator({ className = "", ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={`border-border ${className}`} {...props} />;
}
