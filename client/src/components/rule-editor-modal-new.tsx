import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { type Rule } from "@shared/schema";
import Editor from "@monaco-editor/react";

// Prevent ResizeObserver errors
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('ResizeObserver')) return;
    originalError(...args);
  };
}

interface RuleEditorModalProps {
  rule: Rule | null;
  configurationId?: number;
  onClose: () => void;
  onSave: (savedRule?: Rule) => void;
}

export default function RuleEditorModal({ rule, configurationId, onClose, onSave }: RuleEditorModalProps) {
  const [jsonContent, setJsonContent] = useState("");
  const [jsonError, setJsonError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (rule) {
      // Generate JSON representation of existing rule
      const ruleJson = {
        description: rule.description || "",
        type: rule.type || "basic",
        from: rule.fromKey || {},
        to: rule.toActions || [],
        conditions: rule.conditions || [],
        enabled: rule.enabled !== false
      };
      setJsonContent(JSON.stringify(ruleJson, null, 2));
    } else {
      // Template for new rule
      const newRuleTemplate = {
        description: "New keyboard rule",
        type: "basic",
        from: {
          key_code: "caps_lock"
        },
        to: [
          {
            key_code: "escape"
          }
        ],
        conditions: [],
        enabled: true
      };
      setJsonContent(JSON.stringify(newRuleTemplate, null, 2));
    }
    setJsonError("");
  }, [rule]);

  const validateJson = (json: string) => {
    try {
      const parsed = JSON.parse(json);
      
      // Basic validation
      if (!parsed.description) {
        throw new Error("Description is required");
      }
      if (!parsed.from) {
        throw new Error("'from' field is required");
      }
      if (!parsed.to || !Array.isArray(parsed.to)) {
        throw new Error("'to' field must be an array");
      }
      
      setJsonError("");
      return parsed;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Invalid JSON";
      setJsonError(errorMsg);
      return null;
    }
  };

  const handleSave = async () => {
    const parsedRule = validateJson(jsonContent);
    if (!parsedRule) {
      toast({
        title: "Invalid JSON",
        description: jsonError,
        variant: "destructive",
      });
      return;
    }

    try {
      const ruleData = {
        description: parsedRule.description,
        type: parsedRule.type || "basic",
        fromKey: parsedRule.from,
        toActions: parsedRule.to,
        conditions: parsedRule.conditions || [],
        enabled: parsedRule.enabled !== false,
        order: rule?.order || 1,
        configurationId: configurationId || rule?.configurationId
      };

      const url = rule ? `/api/rules/${rule.id}` : `/api/configurations/${configurationId}/rules`;
      const method = rule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to ${rule ? 'update' : 'create'} rule: ${errorText}`);
      }

      const savedRule = await response.json();
      
      toast({
        title: rule ? "Rule Updated" : "Rule Created",
        description: `Rule "${parsedRule.description}" has been ${rule ? 'updated' : 'created'} successfully`,
      });

      onSave(savedRule);
    } catch (error) {
      console.error("Failed to save rule:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save rule",
        variant: "destructive",
      });
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    setJsonContent(value || "");
    if (value) {
      validateJson(value);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Edit Rule" : "Create New Rule"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 block">
              Rule Configuration (JSON)
            </Label>
            <div className="border rounded-md overflow-hidden h-full">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={jsonContent}
                onChange={handleEditorChange}
                options={{
                  minimap: { enabled: false },
                  formatOnPaste: true,
                  formatOnType: true,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  lineNumbers: "on",
                  folding: true,
                  bracketPairColorization: { enabled: true }
                }}
                theme="vs-light"
              />
            </div>
            {jsonError && (
              <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded">
                Error: {jsonError}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded">
            <strong>Tip:</strong> Use Ctrl+Space for autocomplete, Ctrl+Shift+F to format JSON. 
            The editor supports full Karabiner-Elements rule syntax including complex modifiers, 
            device conditions, and simultaneous key combinations.
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!!jsonError}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {rule ? "Update Rule" : "Create Rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}