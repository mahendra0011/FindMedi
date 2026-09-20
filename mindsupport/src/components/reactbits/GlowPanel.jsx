import { cn } from "@/lib/utils";
const GlowPanel = ({ children, className }) => {
    return (<div className={cn("reactbits-glow-panel relative overflow-hidden border border-glass-border/40 bg-background/70", className)}>
      <div className="reactbits-glow-panel__shine"/>
      <div className="relative z-10">{children}</div>
    </div>);
};
export default GlowPanel;
