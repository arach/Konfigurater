import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import { type Rule } from "@shared/schema";

interface ValidationPanelProps {
  rules: Rule[];
  onClose: () => void;
}

export default function ValidationPanel({ rules, onClose }: ValidationPanelProps) {
  const enabledRules = rules.filter(rule => rule.enabled);
  const duplicateKeys = findDuplicateKeys(rules);
  const hasErrors = duplicateKeys.length > 0;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Validation Results</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-slate-700">JSON syntax valid</span>
            </div>
            
            {duplicateKeys.length > 0 && (
              <div className="flex items-center space-x-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-slate-700">
                  {duplicateKeys.length} duplicate key binding{duplicateKeys.length > 1 ? 's' : ''} detected
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-sm">
              <Info className="w-4 h-4 text-blue-500" />
              <span className="text-slate-700">
                {enabledRules.length} of {rules.length} rules active
              </span>
            </div>
            
            {duplicateKeys.length > 0 && (
              <div className="mt-3 p-2 bg-amber-50 rounded-md border border-amber-200">
                <div className="text-xs font-medium text-amber-800 mb-1">
                  Conflicting Keys:
                </div>
                {duplicateKeys.map((keyInfo, index) => (
                  <div key={index} className="text-xs text-amber-700">
                    {keyInfo.key} ({keyInfo.count} rules)
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function findDuplicateKeys(rules: Rule[]): Array<{ key: string; count: number }> {
  const keyMap = new Map<string, number>();
  
  rules.forEach(rule => {
    if (!rule.enabled) return;
    
    const fromKey = rule.fromKey as any;
    const keyString = formatKeyForComparison(fromKey);
    keyMap.set(keyString, (keyMap.get(keyString) || 0) + 1);
  });
  
  return Array.from(keyMap.entries())
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));
}

function formatKeyForComparison(keyData: any): string {
  if (!keyData) return "";
  
  const parts = [];
  if (keyData.modifiers?.mandatory) {
    parts.push(...keyData.modifiers.mandatory.sort());
  }
  if (keyData.key_code) {
    parts.push(keyData.key_code);
  }
  if (keyData.consumer_key_code) {
    parts.push(keyData.consumer_key_code);
  }
  
  return parts.join("+");
}
