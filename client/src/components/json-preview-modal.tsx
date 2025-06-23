import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Configuration } from "@shared/schema";

interface JsonPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  configuration: Configuration | null;
}

export default function JsonPreviewModal({ isOpen, onClose, configuration }: JsonPreviewModalProps) {
  const [jsonData, setJsonData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && configuration) {
      fetchJsonData();
    }
  }, [isOpen, configuration]);

  const fetchJsonData = async () => {
    if (!configuration) {
      console.log("No configuration provided to fetchJsonData");
      return;
    }
    
    console.log("Fetching JSON data for configuration:", configuration.id);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/configurations/${configuration.id}/export`);
      console.log("Export response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched JSON data:", data);
        setJsonData(data);
      } else {
        const errorText = await response.text();
        console.error("Export failed:", response.status, errorText);
        throw new Error(`Failed to fetch JSON data: ${response.status}`);
      }
    } catch (error) {
      console.error("Error in fetchJsonData:", error);
      toast({
        title: "Error",
        description: "Failed to generate JSON preview",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (jsonData) {
      navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      toast({
        title: "Copied",
        description: "JSON configuration copied to clipboard",
      });
    }
  };

  const downloadJson = () => {
    if (jsonData && configuration) {
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${configuration.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: "JSON configuration downloaded successfully",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            JSON Preview: {configuration?.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2 mb-4">
          <Button
            onClick={copyToClipboard}
            disabled={!jsonData}
            variant="outline"
            size="sm"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button
            onClick={downloadJson}
            disabled={!jsonData}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        <ScrollArea className="h-[60vh] w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Generating JSON preview...</div>
            </div>
          ) : jsonData ? (
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{JSON.stringify(jsonData, null, 2)}</code>
            </pre>
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">No data available</div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}