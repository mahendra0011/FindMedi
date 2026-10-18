import { cn } from "@/mind/lib/utils";
import type { Unmodelled } from '@/lib/apiTypes';
const GlowPanel = ({ children, className }: Unmodelled) => {
    return (<div className={cn("reactbits-glow-panel relative overflow-hidden border border-glass-border/40 bg-background/70", className)}>
      <div className="reactbits-glow-panel__shine"/>
      <div className="relative z-10">{children}</div>
    </div>);
};
export default GlowPanel;
