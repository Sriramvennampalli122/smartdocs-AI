import { HallucinationBadge } from "./HallucinationBadge";
import { SourcePanel } from "./SourcePanel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  risk?: 'Safe' | 'Uncertain' | 'Risky';
  sources?: { text: string; page: number }[];
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex w-full mb-6 gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <Avatar className={cn("h-8 w-8 shrink-0", isUser ? "ml-2" : "mr-2")}>
        <AvatarFallback className={cn("text-[10px] font-bold", isUser ? "bg-emerald-500 text-white" : "bg-card border border-border")}>
          {isUser ? "YOU" : "AI"}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn(
        "max-w-[85%] rounded-2xl p-4 shadow-sm transition-all",
        isUser 
          ? "bg-emerald-600 text-white rounded-tr-none" 
          : "bg-card border border-border text-foreground rounded-tl-none"
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        
        {!isUser && message.risk && message.confidence !== undefined && (
          <HallucinationBadge risk={message.risk} confidence={message.confidence} />
        )}
        
        {!isUser && message.sources && (
          <SourcePanel sources={message.sources} />
        )}
      </div>
    </div>
  );
}