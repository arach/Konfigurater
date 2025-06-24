import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Rule } from "@shared/schema";

interface RuleEditorModalProps {
  rule: Rule | null;
  configurationId?: number;
  onClose: () => void;
  onSave: (savedRule?: Rule) => void;
}

const COMMON_KEYS = [
  "caps_lock", "escape", "return_or_enter", "space", "tab", "delete_or_backspace",
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
  "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
  "left_arrow", "right_arrow", "up_arrow", "down_arrow",
  "volume_up", "volume_down", "mute", "spacebar",
  "keypad_plus", "keypad_hyphen", "keypad_0", "keypad_1", "keypad_2", "keypad_3", "keypad_4", "keypad_5",
  "left_control", "right_control", "left_command", "right_command", "left_option", "right_option", "left_shift", "right_shift"
];

const MODIFIERS = ["command", "option", "control", "shift", "left_command", "right_command", "left_option", "right_option", "left_control", "right_control", "left_shift", "right_shift"];

export default function RuleEditorModal({ rule, configurationId, onClose, onSave }: RuleEditorModalProps) {
  const [formData, setFormData] = useState({
    description: "",
    type: "basic" as const,
    enabled: true,
    fromKey: { key_code: "" },
    toActions: [{ key_code: "" }],
    conditions: null as any,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (rule) {
      setFormData({
        description: rule.description,
        type: rule.type as any,
        enabled: rule.enabled || true,
        fromKey: rule.fromKey as any,
        toActions: rule.toActions as any,
        conditions: rule.conditions,
      });
    }
  }, [rule]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (rule) {
        const response = await apiRequest("PUT", `/api/rules/${rule.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/rules", {
          ...data,
          configurationId,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configurations", configurationId, "rules"] });
      toast({
        title: rule ? "Rule updated" : "Rule created",
        description: rule ? "Rule has been updated successfully" : "New rule has been created",
      });
      onSave();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save rule",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Rule description is required",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  const generateJsonPreview = () => {
    const manipulator = {
      description: formData.description,
      type: formData.type,
      from: formData.fromKey,
      to: formData.toActions,
      ...(formData.conditions && { conditions: formData.conditions }),
    };

    return JSON.stringify({ manipulators: [manipulator] }, null, 2);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Rule" : "Create New Rule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label htmlFor="description">Rule Name</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Caps Lock → Escape"
              />
            </div>
            <div>
              <Label htmlFor="type">Rule Type</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="complex_modifications">Complex Modifications</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* From Key Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">From Key</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Key Code</Label>
                  <Select 
                    value={formData.fromKey.key_code || ""} 
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      fromKey: { ...formData.fromKey, key_code: value } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select key" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_KEYS.map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Modifiers</Label>
                  <div className="space-y-2 mt-2">
                    {MODIFIERS.map(modifier => (
                      <div key={modifier} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`from-${modifier}`}
                          checked={formData.fromKey.modifiers?.mandatory?.includes(modifier) || false}
                          onCheckedChange={(checked) => {
                            const modifiers = formData.fromKey.modifiers || { mandatory: [] };
                            const mandatory = modifiers.mandatory || [];
                            
                            if (checked) {
                              if (!mandatory.includes(modifier)) {
                                modifiers.mandatory = [...mandatory, modifier];
                              }
                            } else {
                              modifiers.mandatory = mandatory.filter(m => m !== modifier);
                            }
                            
                            setFormData({ 
                              ...formData, 
                              fromKey: { ...formData.fromKey, modifiers } 
                            });
                          }}
                        />
                        <Label htmlFor={`from-${modifier}`} className="text-sm capitalize">
                          {modifier}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* To Action Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">To Action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Key Code</Label>
                  <Select 
                    value={formData.toActions[0]?.key_code || ""} 
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      toActions: [{ key_code: value }] 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select key" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_KEYS.map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Shell Command (optional)</Label>
                  <Input
                    placeholder="e.g., open -a Terminal"
                    value={formData.toActions[0]?.shell_command || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      toActions: [{ 
                        ...formData.toActions[0], 
                        shell_command: e.target.value,
                        key_code: e.target.value ? undefined : formData.toActions[0]?.key_code 
                      }] 
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* JSON Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Generated JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 rounded-lg p-4">
                <pre className="text-sm text-green-400 font-mono overflow-x-auto">
                  <code>{generateJsonPreview()}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
