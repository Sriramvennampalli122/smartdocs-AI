"use client";

import { useState } from "react";
import { Upload, File, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadAndProcessDocument } from "@/ai/flows/upload-and-process-document";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onSuccess: (docId: string, stats: { chunks: number; name: string }) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export function FileUpload({ onSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ chunks: number } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF document.",
          variant: "destructive",
        });
        return;
      }

      if (selected.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: "The maximum allowed file size is 10MB.",
          variant: "destructive",
        });
        return;
      }

      setFile(selected);
      setUploadStats(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await uploadAndProcessDocument({ pdfDataUri: fileData });
      setUploadStats({ chunks: result.chunks });
      onSuccess(result.docId, { chunks: result.chunks, name: file.name });
      
      toast({
        title: "Document processed",
        description: `Successfully indexed ${result.chunks} chunks.`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process the document.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setUploadStats(null);
  };

  return (
    <div className="space-y-4">
      <div 
        className={cn(
          "relative group border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center text-center",
          file ? "border-emerald-500/50 bg-emerald-500/5" : "border-border hover:border-emerald-500/30 hover:bg-emerald-500/5"
        )}
      >
        {!file && !isUploading && (
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            accept=".pdf"
            onChange={handleFileChange}
          />
        )}
        
        {file ? (
          <div className="flex flex-col items-center relative w-full">
            {!isUploading && !uploadStats && (
              <button 
                onClick={clearSelection}
                className="absolute -top-4 -right-4 p-1 bg-muted rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="p-3 bg-emerald-500/10 rounded-full mb-3">
              <File className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="font-medium text-sm text-foreground truncate max-w-full px-4">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        ) : (
          <>
            <div className="p-3 bg-muted rounded-full mb-3 group-hover:bg-emerald-500/10 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Click or drag PDF</h3>
            <p className="text-xs text-muted-foreground mt-1">Maximum size 10MB</p>
          </>
        )}
      </div>

      {file && !uploadStats && (
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleUpload} 
            disabled={isUploading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : "Analyze Document"}
          </Button>
          {!isUploading && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearSelection} 
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            <span>Extracting chunks</span>
            <span className="animate-pulse">Active</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full pulsing-bar" />
          </div>
        </div>
      )}

      {uploadStats && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-500">Ready: {uploadStats.chunks} chunks indexed</span>
        </div>
      )}
    </div>
  );
}
