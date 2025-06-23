import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, GripVertical, ArrowRightLeft, Layers, Command } from "lucide-react";
import { type Rule } from "@shared/schema";

interface RuleCardProps {
  rule: Rule;
  onEdit: () => void;
  onDelete: () => void;
}

export default function RuleCard({ rule, onEdit, onDelete }: RuleCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "basic":
        return ArrowRightLeft;
      case "complex_modifications":
        return Layers;
      case "shell_command":
        return Command;
      default:
        return ArrowRightLeft;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "basic":
        return "bg-blue-100 text-blue-600";
      case "complex_modifications":
        return "bg-purple-100 text-purple-600";
      case "shell_command":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatKeyCode = (keyData: any) => {
    if (typeof keyData === 'string') return keyData;
    
    // Handle simultaneous keys
    if (keyData?.simultaneous) {
      const keys = keyData.simultaneous.map((k: any) => k.key_code || JSON.stringify(k)).join(" + ");
      return `Simultaneous: ${keys}`;
    }
    
    // Handle single key with modifiers
    if (keyData?.key_code) {
      const modifiers = keyData.modifiers?.mandatory || keyData.modifiers?.optional || [];
      if (modifiers.length > 0) {
        return `${modifiers.join(" + ")} + ${keyData.key_code}`;
      }
      return keyData.key_code;
    }
    
    return JSON.stringify(keyData);
  };

  const formatActions = (actions: any) => {
    if (!Array.isArray(actions)) return "N/A";
    return actions.map(action => {
      if (action.key_code) {
        const modifiers = action.modifiers || [];
        if (modifiers.length > 0) {
          return `${modifiers.join(" + ")} + ${action.key_code}`;
        }
        return action.key_code;
      }
      if (action.shell_command) return `Shell: ${action.shell_command}`;
      if (action.set_variable) return `Set: ${action.set_variable.name}=${action.set_variable.value}`;
      return JSON.stringify(action);
    }).join(", ");
  };

  const TypeIcon = getTypeIcon(rule.type);

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(rule.type)}`}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-slate-800">{rule.description}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {rule.type ? rule.type.replace('_', ' ') : 'basic'}
                </Badge>
                {rule.conditions && (
                  <Badge variant="outline" className="text-xs">
                    conditional
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="p-2 text-slate-400 hover:text-slate-600"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="p-2 text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="p-2 text-slate-400 hover:text-slate-600 cursor-grab"
            >
              <GripVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">FROM</label>
            <div className="bg-white rounded-md border border-slate-200 p-3">
              <code className="text-xs font-mono text-slate-700">
                {formatKeyCode(rule.fromKey)}
              </code>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">TO</label>
            <div className="bg-white rounded-md border border-slate-200 p-3">
              <code className="text-xs font-mono text-slate-700">
                {formatActions(rule.toActions)}
              </code>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch checked={rule.enabled || false} disabled />
              <span className="text-sm text-slate-600">Enabled</span>
            </div>
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={onEdit}
            className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto"
          >
            Edit Rule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
