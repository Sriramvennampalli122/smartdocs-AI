"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Loader2, MessageSquare } from "lucide-react";
import { MessageBubble, type Message } from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAiAnswerWithConfidence } from "@/ai/flows/get-ai-answer-with-confidence-flow";

interface ChatWindowProps {
  docId: string | null;
}

export function ChatWindow({ docId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Anchor div at the bottom of the message list for reliable auto-scroll
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || !docId || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await getAiAnswerWithConfidence({
        question: input,
        docId: docId
      });

      const aiMessage: Message = {
        role: 'assistant',
        content: response.answer,
        confidence: response.confidence,
        risk: response.hallucinationRisk,
        sources: response.sources
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: "Sorry, I encountered an error while processing your request. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  if (!docId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
        <div className="p-6 bg-muted rounded-full mb-6">
          <MessageSquare className="w-12 h-12 opacity-20" />
        </div>
        <h2 className="text-xl font-headline font-bold text-foreground mb-2">No Document Uploaded</h2>
        <p className="max-w-xs text-sm">Please upload and analyze a PDF document from the sidebar to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background/50">
      <div className="p-4 border-b border-border flex items-center justify-between bg-card/30">
        <div>
          <h2 className="text-sm font-headline font-bold uppercase tracking-widest text-emerald-500">Document Chat</h2>
          <p className="text-[10px] text-muted-foreground">Ask anything about the provided context</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearChat}
          className="text-muted-foreground hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">Type a question below to start the analysis.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {isLoading && (
            <div className="flex gap-4 mb-6">
               <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center">
                 <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
               </div>
               <div className="bg-card border border-border rounded-2xl p-4 rounded-tl-none flex items-center gap-1">
                 <div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                 <div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                 <div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce" />
               </div>
            </div>
          )}
          {/* Invisible anchor element — scroll target for auto-scroll to bottom */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="p-6 bg-background">
        <div className="max-w-3xl mx-auto relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question about the document..."
            className="pr-14 py-6 bg-card border-border focus-visible:ring-emerald-500 rounded-xl"
          />
          <Button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 h-9 w-9 p-0 rounded-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-tighter">
          SmartDoc AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}