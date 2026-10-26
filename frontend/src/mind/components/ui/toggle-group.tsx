import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/mind/lib/utils";
import { toggleVariants } from "@/mind/components/ui/toggle";
import type { Unmodelled } from '@/lib/apiTypes';
const ToggleGroupContext = React.createContext({
    size: "default",
    variant: "default",
});
const ToggleGroup = React.forwardRef<Unmodelled, Unmodelled>(({ className, variant, size, children, ...props }, ref) => (<ToggleGroupPrimitive.Root ref={ref} className={cn("flex items-center justify-center gap-1", className)} {...(props as Unmodelled)}>
    <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;
const ToggleGroupItem = React.forwardRef<Unmodelled, Unmodelled>(({ className, children, variant, size, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext);
    return (<ToggleGroupPrimitive.Item ref={ref} className={cn(toggleVariants({
            variant: context.variant || variant,
            size: context.size || size,
        }), className)} {...(props as Unmodelled)}>
      {children}
    </ToggleGroupPrimitive.Item>);
});
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;
export { ToggleGroup, ToggleGroupItem };
