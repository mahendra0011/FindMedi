import type { ComponentType, ReactNode } from "react";

type ChangeType = "positive" | "negative" | "neutral";

const changeColors: Record<ChangeType, string> = {
  positive: "text-success",
  negative: "text-destructive",
  neutral: "text-muted-foreground"
};

const StatCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-accent"
}: {
  title: ReactNode;
  value: ReactNode;
  change?: ReactNode;
  changeType?: ChangeType;
  icon: ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
}) => {
  return <div data-motion-reveal className="stat-card group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 font-heading text-card-foreground">{value}</p>
          {change && <p className={`text-sm mt-2 font-medium ${changeColors[changeType]}`}>
              {change}
            </p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>;
};
export default StatCard;
