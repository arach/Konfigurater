import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus, Zap, Target, Code, Keyboard } from "lucide-react";
import { type Rule, type Configuration } from "@shared/schema";

interface SmartRecommendationsProps {
  configuration: Configuration | null;
  rules: Rule[];
  onCreateRule: (suggestion: RuleSuggestion) => void;
  isCreating?: boolean;
}

interface RuleSuggestion {
  title: string;
  description: string;
  category: "productivity" | "development" | "navigation" | "automation";
  difficulty: "beginner" | "intermediate" | "advanced";
  devices: string[];
  pattern: {
    from: any;
    to: any;
    conditions?: any[];
  };
  reasoning: string;
}

interface DeviceAnalysis {
  deviceId: string;
  deviceName: string;
  vendorId: number;
  productId: number;
  usedKeys: string[];
  availableKeys: string[];
  macroButtons: number;
}

export default function SmartRecommendations({ 
  configuration, 
  rules, 
  onCreateRule,
  isCreating = false
}: SmartRecommendationsProps) {
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (configuration && rules) {
      generateRecommendations();
    }
  }, [configuration, rules]);

  const analyzeDevices = (): DeviceAnalysis[] => {
    const deviceMap = new Map<string, DeviceAnalysis>();
    
    rules.forEach(rule => {
      if (rule.conditions) {
        const conditions = Array.isArray(rule.conditions) ? rule.conditions : [rule.conditions];
        conditions.forEach((condition: any) => {
          if (condition.type === "device_if" && condition.identifiers) {
            condition.identifiers.forEach((identifier: any) => {
              const deviceKey = `${identifier.vendor_id}-${identifier.product_id}`;
              
              if (!deviceMap.has(deviceKey)) {
                deviceMap.set(deviceKey, {
                  deviceId: deviceKey,
                  deviceName: getDeviceName(identifier.vendor_id, identifier.product_id),
                  vendorId: identifier.vendor_id,
                  productId: identifier.product_id,
                  usedKeys: [],
                  availableKeys: [],
                  macroButtons: 0
                });
              }
              
              const device = deviceMap.get(deviceKey)!;
              
              // Analyze used keys
              if (rule.fromKey) {
                const fromKey = rule.fromKey as any;
                if (fromKey.key_code) {
                  device.usedKeys.push(fromKey.key_code);
                }
                if (fromKey.simultaneous) {
                  fromKey.simultaneous.forEach((key: any) => {
                    if (key.key_code) device.usedKeys.push(key.key_code);
                  });
                }
              }
            });
          }
        });
      }
    });

    // Add available keys based on device type
    deviceMap.forEach((device) => {
      if (device.vendorId === 10429 && device.productId === 514) {
        // ACK05 device
        device.macroButtons = 12;
        device.availableKeys = [
          "left_control", "right_control", "left_shift", "right_shift",
          "left_option", "right_option", "left_command", "right_command",
          "spacebar", "return_or_enter", "escape", "tab"
        ];
      } else if (device.vendorId === 53264 && device.productId === 5633) {
        // DOIO device
        device.availableKeys = [
          "z", "x", "c", "v", "b", "n", "m", 
          "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"
        ];
      } else if (device.vendorId === 1133 && device.productId === 45913) {
        // Logitech ERGO K860
        device.availableKeys = [
          "caps_lock", "tab", "grave_accent_and_tilde", "spacebar"
        ];
      }
      
      // Remove used keys from available
      device.availableKeys = device.availableKeys.filter(
        key => !device.usedKeys.includes(key)
      );
    });

    return Array.from(deviceMap.values());
  };

  const generateRecommendations = () => {
    const devices = analyzeDevices();
    const newSuggestions: RuleSuggestion[] = [];

    devices.forEach(device => {
      // Device-specific suggestions
      if (device.deviceName.includes("ACK05")) {
        newSuggestions.push(...generateACK05Suggestions(device));
      } else if (device.deviceName.includes("DOIO")) {
        newSuggestions.push(...generateDOIOSuggestions(device));
      } else if (device.deviceName.includes("Logitech")) {
        newSuggestions.push(...generateLogitechSuggestions(device));
      }
    });

    // Application-specific suggestions
    newSuggestions.push(...generateAppSpecificSuggestions(devices));
    
    // Chord combinations
    newSuggestions.push(...generateChordSuggestions(devices));

    setSuggestions(newSuggestions);
  };

  const generateACK05Suggestions = (device: DeviceAnalysis): RuleSuggestion[] => {
    const suggestions: RuleSuggestion[] = [];
    
    if (device.availableKeys.includes("left_control")) {
      suggestions.push({
        title: "Quick App Launcher",
        description: "Ctrl+Q → Open app launcher or spotlight search",
        category: "productivity",
        difficulty: "beginner",
        devices: [device.deviceName],
        pattern: {
          from: {
            simultaneous: [
              { key_code: "left_control" },
              { key_code: "q" }
            ],
            simultaneous_options: {
              detect_key_down_uninterruptedly: true,
              key_down_order: "strict",
              key_up_order: "strict_inverse"
            }
          },
          to: [
            { key_code: "spacebar", modifiers: ["command"] }
          ],
          conditions: [{
            identifiers: [{ vendor_id: device.vendorId, product_id: device.productId }],
            type: "device_if"
          }]
        },
        reasoning: "You have unused Ctrl combinations on ACK05, perfect for quick access"
      });
    }

    if (device.availableKeys.includes("right_control")) {
      suggestions.push({
        title: "Window Management Suite",
        description: "Right Ctrl+Arrow → Smart window positioning",
        category: "productivity",
        difficulty: "intermediate",
        devices: [device.deviceName],
        pattern: {
          from: {
            key_code: "right_arrow",
            modifiers: { mandatory: ["right_control"] }
          },
          to: [
            { key_code: "right_arrow", modifiers: ["control", "option", "command"] }
          ],
          conditions: [{
            identifiers: [{ vendor_id: device.vendorId, product_id: device.productId }],
            type: "device_if"
          }]
        },
        reasoning: "Leverage your macro buttons for sophisticated window management"
      });
    }

    return suggestions;
  };

  const generateDOIOSuggestions = (device: DeviceAnalysis): RuleSuggestion[] => {
    const suggestions: RuleSuggestion[] = [];
    
    suggestions.push({
      title: "Smart Code Formatter",
      description: "Format code and auto-save in one keystroke",
      category: "development",
      difficulty: "intermediate",
      devices: [device.deviceName],
      pattern: {
        from: {
          key_code: "f",
          modifiers: { mandatory: ["left_control", "left_shift"] }
        },
        to: [
          { key_code: "i", modifiers: ["left_option", "left_shift"] }, // Format
          { key_code: "s", modifiers: ["left_command"] } // Save
        ],
        conditions: [{
          identifiers: [{ vendor_id: device.vendorId, product_id: device.productId }],
          type: "device_if"
        }]
      },
      reasoning: "DOIO's programmability is perfect for chained development actions"
    });

    suggestions.push({
      title: "Context-Aware Terminal",
      description: "Smart terminal that opens in current project directory",
      category: "development",
      difficulty: "advanced",
      devices: [device.deviceName],
      pattern: {
        from: {
          key_code: "t",
          modifiers: { mandatory: ["left_control", "left_option"] }
        },
        to: [
          { key_code: "spacebar", modifiers: ["command"] },
          { shell_command: "open -a Terminal ." }
        ],
        conditions: [{
          identifiers: [{ vendor_id: device.vendorId, product_id: device.productId }],
          type: "device_if"
        }]
      },
      reasoning: "Your DOIO can trigger complex shell commands for development workflows"
    });

    return suggestions;
  };

  const generateLogitechSuggestions = (device: DeviceAnalysis): RuleSuggestion[] => {
    const suggestions: RuleSuggestion[] = [];
    
    if (device.availableKeys.includes("grave_accent_and_tilde")) {
      suggestions.push({
        title: "Quick Emoji Picker",
        description: "Backtick → Emoji selector for faster communication",
        category: "productivity",
        difficulty: "beginner",
        devices: [device.deviceName],
        pattern: {
          from: {
            key_code: "grave_accent_and_tilde",
            modifiers: { optional: ["any"] }
          },
          to: [
            { key_code: "spacebar", modifiers: ["control", "command"] }
          ],
          conditions: [{
            identifiers: [{ vendor_id: device.vendorId, product_id: device.productId }],
            type: "device_if"
          }]
        },
        reasoning: "Ergonomic keyboards are great for frequently-used shortcuts"
      });
    }

    return suggestions;
  };

  const generateAppSpecificSuggestions = (devices: DeviceAnalysis[]): RuleSuggestion[] => {
    return [
      {
        title: "IDE Power Commands",
        description: "Context-aware shortcuts that adapt to VS Code, Xcode, etc.",
        category: "development",
        difficulty: "advanced",
        devices: devices.map(d => d.deviceName),
        pattern: {
          from: { key_code: "b", modifiers: { mandatory: ["left_control"] } },
          to: [
            { key_code: "b", modifiers: ["left_command", "left_shift"] }
          ],
          conditions: [
            { bundle_identifiers: ["com.microsoft.VSCode"], type: "frontmost_application_if" }
          ]
        },
        reasoning: "Application-specific shortcuts provide contextual intelligence"
      },
      {
        title: "Browser Tab Orchestration",
        description: "Smart tab management across different browsers",
        category: "navigation",
        difficulty: "intermediate",
        devices: devices.map(d => d.deviceName),
        pattern: {
          from: { key_code: "w", modifiers: { mandatory: ["left_control", "left_shift"] } },
          to: [
            { key_code: "w", modifiers: ["left_command", "left_option"] }
          ],
          conditions: [
            { bundle_identifiers: ["com.google.Chrome", "com.apple.Safari"], type: "frontmost_application_if" }
          ]
        },
        reasoning: "Browser-specific shortcuts can dramatically improve web workflows"
      }
    ];
  };

  const generateChordSuggestions = (devices: DeviceAnalysis[]): RuleSuggestion[] => {
    return [
      {
        title: "Productivity Chord Sequence",
        description: "Ctrl+Space, then letter → Launch specific applications",
        category: "automation",
        difficulty: "advanced",
        devices: devices.map(d => d.deviceName),
        pattern: {
          from: {
            simultaneous: [
              { key_code: "left_control" },
              { key_code: "spacebar" }
            ],
            simultaneous_options: {
              detect_key_down_uninterruptedly: true,
              key_down_order: "strict"
            }
          },
          to: [
            { set_variable: { name: "chord_mode", value: 1 } }
          ]
        },
        reasoning: "Chord sequences multiply your available shortcuts exponentially"
      },
      {
        title: "Multi-Device Coordination",
        description: "Use ACK05 + DOIO together for complex workflows",
        category: "automation",
        difficulty: "advanced",
        devices: ["ACK05", "DOIO"],
        pattern: {
          from: { key_code: "spacebar" },
          to: [
            { key_code: "return_or_enter" },
            { key_code: "tab" }
          ],
          conditions: [
            { name: "ack05_active", type: "variable_if", value: 1 },
            { identifiers: [{ vendor_id: 53264, product_id: 5633 }], type: "device_if" }
          ]
        },
        reasoning: "Coordinate multiple devices for sophisticated automation"
      }
    ];
  };

  const getDeviceName = (vendorId: number, productId: number): string => {
    const deviceMap: Record<string, string> = {
      "10429-514": "ACK05 Macro Keyboard",
      "53264-5633": "DOIO Programmable Keyboard", 
      "1133-45913": "Logitech ERGO K860"
    };
    return deviceMap[`${vendorId}-${productId}`] || `Device ${vendorId}-${productId}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "productivity": return <Target className="w-4 h-4" />;
      case "development": return <Code className="w-4 h-4" />;
      case "navigation": return <Keyboard className="w-4 h-4" />;
      case "automation": return <Zap className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const filteredSuggestions = selectedCategory === "all" 
    ? suggestions 
    : suggestions.filter(s => s.category === selectedCategory);

  if (!configuration) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">Smart Recommendations</h3>
          <p className="text-sm text-slate-500">Select a configuration to get intelligent shortcut suggestions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Smart Recommendations
          <Badge variant="secondary">{filteredSuggestions.length}</Badge>
        </CardTitle>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            All
          </Button>
          {["productivity", "development", "navigation", "automation"].map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {getCategoryIcon(category)}
              <span className="ml-1">{category}</span>
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No suggestions available for this category</p>
          </div>
        ) : (
          filteredSuggestions.map((suggestion, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(suggestion.category)}
                    <h4 className="font-medium">{suggestion.title}</h4>
                    <Badge 
                      variant={suggestion.difficulty === "beginner" ? "secondary" : 
                              suggestion.difficulty === "intermediate" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {suggestion.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{suggestion.description}</p>
                  <p className="text-xs text-slate-500">{suggestion.reasoning}</p>
                  
                  <div className="flex gap-1 flex-wrap">
                    {suggestion.devices.map(device => (
                      <Badge key={device} variant="outline" className="text-xs">
                        {device}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  onClick={() => onCreateRule(suggestion)}
                  disabled={isCreating}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {isCreating ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}