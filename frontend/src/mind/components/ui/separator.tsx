import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/mind/lib/utils";
import type { Unmodelled } from '@/lib/apiTypes';
const Separator = React.forwardRef<Unmodelled, Unmodelled>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (<SeparatorPrimitive.Root ref={ref} decorative={decorative} orientation={orientation} className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)} {...props}/>));
Separator.displayName = SeparatorPrimitive.Root.displayName;
export { Separator };
