import { cn } from "@/mind/lib/utils";
import type { Unmodelled } from '@/lib/apiTypes';
function Skeleton({ className, ...props }: Unmodelled) {
    return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props}/>;
}
export { Skeleton };
