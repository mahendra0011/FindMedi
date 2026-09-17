import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function TimelineView({ appointments, getActionButtons, onViewIntake }) {
  if (!appointments?.length) return null;

  return (
    <div className="flex flex-col relative w-full pt-2">
      {appointments.map((apt, index) => {
        const isFirst = index === 0;
        const isLast = index === appointments.length - 1;
        
        // Treat "Completed" and "Confirmed" as green checkmarks if we want it exactly like the image?
        // The image has a green checkmark for the first item, probably meaning it's "Completed" or "Serving".
        const isCompleted = apt.status === 'Completed'; 
        
        const initials = apt.patient?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P';
        
        return (
          <motion.div 
            key={apt._id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: typeof apt._delay === 'number' ? apt._delay : index * 0.05 }}
            className="relative flex items-start justify-between py-4 group"
          >
            {/* The vertical line for this specific row */}
            <div 
              className="absolute w-px bg-border/60 z-0" 
              style={{
                right: '31.5px', // exactly center of w-16
                top: isFirst ? '28px' : '0',
                bottom: isLast ? 'auto' : '0',
                height: (isLast && !isFirst) ? '28px' : 'auto',
                display: (isFirst && isLast) ? 'none' : 'block'
              }}
            />
            
            {/* Left side: Avatar + Info */}
            <div className="flex items-start gap-4 flex-1 pr-4">
              <div className="w-12 h-12 rounded-2xl bg-card border border-border/50 flex items-center justify-center text-foreground font-semibold shrink-0 shadow-sm mt-0.5">
                {initials}
              </div>
              <div className="flex-1 pt-1.5">
                <h4 className="font-semibold text-foreground text-base leading-tight">{apt.patient || 'Unknown'}</h4>
                <p className="text-muted-foreground text-sm mt-1">{apt.type || 'Consultation'}</p>
                {apt.preConsultationDetails?.filledAt && (
                  <div className="mt-2">
                    <button 
                      onClick={() => onViewIntake && onViewIntake(apt)}
                      className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md transition-colors border border-primary/20"
                    >
                      <Check className="w-3 h-3" />
                      Intake Completed
                    </button>
                  </div>
                )}
                {getActionButtons && (
                   <div className="mt-3 flex gap-2">
                     {getActionButtons(apt)}
                   </div>
                )}
              </div>
            </div>
            
            {/* Right side: Time/Status */}
            <div className="w-16 shrink-0 flex items-start justify-center pt-[22px] relative z-10">
              <div className="bg-background py-1.5 px-1 flex justify-center">
                {isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_0_4px_var(--background)]">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-muted-foreground">{apt.time || '10:00'}</span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
