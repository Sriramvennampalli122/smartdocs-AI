import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Source {
  text: string;
  page: number;
}

interface SourcePanelProps {
  sources: Source[];
}

export function SourcePanel({ sources }: SourcePanelProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border/50 pt-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="sources" className="border-none">
          <AccordionTrigger className="flex gap-2 py-0 hover:no-underline hover:text-emerald-400 text-xs text-muted-foreground transition-colors">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>View {sources.length} sources from document</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid gap-3">
              {sources.map((source, idx) => (
                <div key={idx} className="bg-muted/30 rounded-lg p-3 border-l-2 border-emerald-500/40 hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold tracking-wider">
                      PAGE {source.page}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
                    "{source.text.length > 250 ? source.text.substring(0, 250) + '...' : source.text}"
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}