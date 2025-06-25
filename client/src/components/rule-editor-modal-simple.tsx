import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { type Rule } from "@shared/schema";

interface RuleEditorModalProps {
  rule: Rule | null;
  configurationId?: number;
  onClose: () => void;
  onSave: (savedRule?: Rule) => void;
}

export default function RuleEditorModal({ rule, configurationId, onClose, onSave }: RuleEditorModalProps) {
  const [jsonContent, setJsonContent] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    
    const parsedRule = validateJson(jsonContent);
    if (!parsedRule) {
      toast({
        title: "Invalid JSON",
        description: jsonError,
        variant: "destructive",
      });
      setIsLoading(false);
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

      // Ensure we have a valid configuration ID
      if (!ruleData.configurationId) {
        throw new Error("Configuration ID is required");
      }

      const url = rule ? `/api/rules/${rule.id}` : `/api/configurations/${ruleData.configurationId}/rules`;
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
      onClose();
    } catch (error) {
      console.error("Failed to save rule:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save rule",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
    } catch (error) {
      toast({
        title: "Format Failed",
        description: "Cannot format invalid JSON",
        variant: "destructive",
      });
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
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">
              Rule Configuration (JSON)
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={formatJson}
              disabled={!!jsonError}
            >
              Format JSON
            </Button>
          </div>
          
          <div className="flex-1">
            <Textarea
              value={jsonContent}
              onChange={(e) => {
                setJsonContent(e.target.value);
                if (e.target.value.trim()) {
                  validateJson(e.target.value);
                }
              }}
              className="h-full font-mono text-sm resize-none"
              placeholder="Enter JSON configuration..."
            />
            {jsonError && (
              <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded">
                Error: {jsonError}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded">
            <strong>Tip:</strong> The editor supports full Karabiner-Elements rule syntax including complex modifiers, 
            device conditions, and simultaneous key combinations. Use the Format JSON button to clean up formatting.
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!!jsonError || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Saving..." : (rule ? "Update Rule" : "Create Rule")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}