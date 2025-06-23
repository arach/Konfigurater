import { type KarabinerConfig, type KarabinerRule, type Rule } from "@shared/schema";

export function parseKarabinerConfig(jsonData: any): KarabinerConfig {
  return {
    title: jsonData.title || "Untitled Configuration",
    rules: jsonData.rules || [],
  };
}

export function convertRulesToKarabiner(rules: Rule[]): KarabinerRule[] {
  // Group rules by description to create proper Karabiner rule structure
  const ruleGroups = new Map<string, Rule[]>();
  
  rules.forEach(rule => {
    if (!ruleGroups.has(rule.description)) {
      ruleGroups.set(rule.description, []);
    }
    ruleGroups.get(rule.description)!.push(rule);
  });

  return Array.from(ruleGroups.entries()).map(([description, groupRules]) => ({
    description,
    manipulators: groupRules.map(rule => ({
      description: rule.description,
      type: rule.type as "basic",
      from: rule.fromKey as any,
      to: rule.toActions as any,
      ...(rule.conditions && { conditions: rule.conditions }),
    })),
  }));
}

export function validateKarabinerJson(jsonString: string): { valid: boolean; error?: string; data?: any } {
  try {
    const data = JSON.parse(jsonString);
    
    // Basic structure validation
    if (!data.title && !data.rules) {
      return { valid: false, error: "Missing required fields: title or rules" };
    }
    
    if (data.rules && !Array.isArray(data.rules)) {
      return { valid: false, error: "Rules must be an array" };
    }
    
    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: "Invalid JSON format" };
  }
}

export function getKeyDisplayName(keyCode: string): string {
  const keyMap: Record<string, string> = {
    caps_lock: "Caps Lock",
    escape: "Escape",
    return_or_enter: "Enter",
    delete_or_backspace: "Backspace",
    left_arrow: "←",
    right_arrow: "→",
    up_arrow: "↑",
    down_arrow: "↓",
    volume_up: "Vol+",
    volume_down: "Vol-",
    mute: "Mute",
  };
  
  return keyMap[keyCode] || keyCode.replace(/_/g, ' ').toUpperCase();
}

export function getModifierDisplayName(modifier: string): string {
  const modifierMap: Record<string, string> = {
    command: "⌘",
    option: "⌥",
    control: "⌃",
    shift: "⇧",
  };
  
  return modifierMap[modifier] || modifier;
}
