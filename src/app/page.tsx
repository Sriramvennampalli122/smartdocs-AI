"use client";

import { useState } from "react";
import { FileUpload } from "@/components/smartdoc/FileUpload";
import { ChatWindow } from "@/components/smartdoc/ChatWindow";
import { FileText, Github, Info, Layers, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function SmartDocPage() {
  const [activeDoc, setActiveDoc] = useState<{ id: string; name: string; chunks: number } | null>(null);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F0F]">
      {/* Sidebar - 30% */}
      <aside className="w-[30%] border-r border-border bg-[#151515] flex flex-col shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-headline font-bold text-white tracking-tight">SmartDoc <span className="text-emerald-500">AI</span></h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-headline">RAG Knowledge Assistant</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 font-headline">Knowledge Source</h2>
              <FileUpload onSuccess={(id, stats) => setActiveDoc({ id, ...stats })} />
            </section>

            {activeDoc && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 font-headline">Document Insight</h2>
                <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <FileText className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold truncate text-foreground">{activeDoc.name}</p>
                      <p className="text-xs text-muted-foreground">Status: Indexed & Ready</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Chunks</p>
                      <p className="text-lg font-headline font-bold text-emerald-500">{activeDoc.chunks}</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Engine</p>
                      <p className="text-lg font-headline font-bold text-foreground">LLaMA 3.3</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 font-headline">System Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-default">
                  <Layers className="w-4 h-4 text-emerald-500/70" />
                  <span>TF-IDF Semantic Retrieval</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-default">
                  <Info className="w-4 h-4 text-emerald-500/70" />
                  <span>Groq LLaMA-3.3 70B Engine</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-default">
                  <Sparkles className="w-4 h-4 text-emerald-500/70" />
                  <span>RAG Pipeline — FastAPI + Next.js</span>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-border mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-1.5 py-0">v2.0.0</Badge>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Stable</span>
          </div>
          <a href="#" className="text-muted-foreground hover:text-emerald-500 transition-colors">
            <Github className="w-4 h-4" />
          </a>
        </div>
      </aside>

      {/* Main Area - 70% */}
      <main className="flex-1 relative">
        <ChatWindow docId={activeDoc?.id || null} />
      </main>
    </div>
  );
}