import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, HelpCircle, Keyboard, Eye } from "lucide-react";
import { type Configuration } from "@shared/schema";
import JsonPreviewModal from "./json-preview-modal";

interface HeaderProps {
  selectedConfig: Configuration | null;
  onExport: () => void;
}

export default function Header({ selectedConfig, onExport }: HeaderProps) {
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Keyboard className="text-white w-4 h-4" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Karabiner Settings Builder</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            className="text-slate-600 hover:text-slate-800"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Help
          </Button>
          <Button 
            onClick={onExport}
            disabled={!selectedConfig}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Config
          </Button>
        </div>
      </div>
    </header>
  );
}
