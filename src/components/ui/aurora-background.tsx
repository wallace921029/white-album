import { cn } from "@/lib/utils";
import React, { type ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: ReactNode;
}

export const AuroraBackground = ({
  className,
  children,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col min-h-screen w-full bg-background text-foreground",
        className
      )}
      {...props}
    >
      {/* Background container */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Dynamic Aurora layers */}
        <div 
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full opacity-30 mix-blend-screen filter blur-[80px] animate-aurora-1"
          style={{ backgroundImage: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)" }}
        />
        <div 
          className="absolute top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full opacity-30 mix-blend-screen filter blur-[100px] animate-aurora-2"
          style={{ backgroundImage: "radial-gradient(circle, var(--color-ring) 0%, transparent 70%)" }}
        />
        <div 
          className="absolute -bottom-[20%] left-[20%] w-[70%] h-[70%] rounded-full opacity-20 mix-blend-screen filter blur-[120px] animate-aurora-3"
          style={{ backgroundImage: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)" }}
        />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center min-h-screen">
        {children}
      </div>
    </div>
  );
};
