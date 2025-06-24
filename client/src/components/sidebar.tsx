import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, ArrowRightLeft, Layers, Rocket, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Configuration, type Rule } from "@shared/schema";

interface SidebarProps {
  configurations: Configuration[];
  selectedConfig: Configuration | null;
  rules: Rule[];
  isLoading: boolean;
  onConfigSelect: (config: Configuration) => void;
  onCreateRule: () => void;
}

export default function Sidebar({ 
  karabinerConfig,
  configName,
  onConfigLoad,
  onCreateRule 
}: SidebarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // No mutation needed - just load config directly into state

  const handleFileUpload = async (file: File) => {
    console.log('📁 File upload started:', file.name);
    
    try {
      const text = await file.text();
      const karabinerJson = JSON.parse(text);
      const name = file.name.replace(/\.json$/, "");
      
      console.log('✅ JSON loaded successfully');
      console.log('📋 Structure:', {
        hasProfiles: !!karabinerJson.profiles,
        hasRules: !!karabinerJson.rules,
        topLevelKeys: Object.keys(karabinerJson)
      });
      
      // Load directly into editor state
      onConfigLoad(karabinerJson, name);
      
      toast({
        title: "Configuration loaded",
        description: `Loaded ${name} for editing`,
      });
      
    } catch (error) {
      console.error('❌ File upload error:', error);
      
      toast({
        title: "Invalid file",
        description: `Parse error: ${error instanceof Error ? error.message : 'Please upload a valid JSON file'}`,
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === "application/json" || file.name.endsWith('.json'));
    
    if (jsonFile) {
      handleFileUpload(jsonFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a JSON file",
        variant: "destructive",
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const ruleTemplates = [
    { icon: ArrowRightLeft, name: "Key Swap", description: "Swap two keys" },
    { icon: Layers, name: "Modifier Combo", description: "Complex key combinations" },
    { icon: Rocket, name: "App Launcher", description: "Launch applications" },
    { icon: Type, name: "Text Snippet", description: "Insert text snippets" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-2 block">
            Load Config File
          </Label>
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragging 
                ? "border-blue-400 bg-blue-50" 
                : "border-slate-300 hover:border-blue-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="text-slate-400 w-8 h-8 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-1">Drop your karabiner.json here</p>
            <p className="text-xs text-slate-500">or click to browse</p>
            <Input
              id="file-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        </div>

        {/* Configuration List */}
        {configurations.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Configurations
            </Label>
            <div className="space-y-2">
              {configurations.map((config) => (
                <Button
                  key={config.id}
                  variant={selectedConfig?.id === config.id ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto p-2"
                  onClick={() => onConfigSelect(config)}
                >
                  <div className="truncate">
                    <div className="font-medium">{config.name}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {selectedConfig && (
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-3 block">
              Current Configuration
            </Label>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Active Rules</span>
                <span className="font-medium text-slate-800">{rules.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Enabled Rules</span>
                <span className="font-medium text-slate-800">
                  {rules.filter(rule => rule.enabled).length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Rule Templates */}
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-3 block">
            Rule Templates
          </Label>
          <div className="space-y-2">
            {ruleTemplates.map((template) => (
              <Button
                key={template.name}
                variant="ghost"
                className="w-full justify-start text-slate-600 hover:bg-slate-50 h-auto p-3"
                onClick={onCreateRule}
              >
                <template.icon className="w-4 h-4 mr-2" />
                <span className="text-sm">{template.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
