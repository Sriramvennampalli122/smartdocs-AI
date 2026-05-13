import { Shield, AlertTriangle, XCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type RiskLevel = 'Safe' | 'Uncertain' | 'Risky';

interface HallucinationBadgeProps {
  risk: RiskLevel;
  confidence: number;
}

export function HallucinationBadge({ risk, confidence }: HallucinationBadgeProps) {
  const config = {
    Safe: {
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      icon: <Shield className="w-3 h-3 mr-1" />,
      label: "High Confidence",
      description: "Answer is well-supported by document content."
    },
    Uncertain: {
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      icon: <AlertTriangle className="w-3 h-3 mr-1" />,
      label: "Uncertain",
      description: "Moderate confidence; some parts might be inferred."
    },
    Risky: {
      color: "bg-red-500/10 text-red-500 border-red-500/20",
      icon: <XCircle className="w-3 h-3 mr-1" />,
      label: "Low Confidence",
      description: "Low support in document; potential hallucination."
    }
  }[risk];

  return (
    <div className="flex flex-col gap-2 mt-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-2 cursor-help group">
              <Badge variant="outline" className={cn("px-2 py-0.5 font-medium transition-all", config.color)}>
                {config.icon}
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{(confidence * 100).toFixed(0)}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-card border-border text-xs p-3 max-w-[200px]">
            <p className="font-semibold mb-1">{config.label}</p>
            <p className="text-muted-foreground">{config.description}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-bold">Confidence Score: {(confidence * 100).toFixed(1)}%</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-500 ease-out", {
            "bg-emerald-500": risk === 'Safe',
            "bg-amber-500": risk === 'Uncertain',
            "bg-red-500": risk === 'Risky',
          })}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
    </div>
  );
}