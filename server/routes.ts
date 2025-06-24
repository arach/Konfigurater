import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConfigurationSchema, insertRuleSchema, KarabinerConfigSchema, KarabinerFullConfigSchema, Configuration } from "@shared/schema";
import { z } from "zod";

// Helper function to detect duplicate configurations
function findDuplicateConfiguration(existingConfigs: Configuration[], newRules: any[], newTitle: string): Configuration | null {
  for (const config of existingConfigs) {
    // Check if names match exactly
    if (config.name === newTitle) {
      return config;
    }
    
    // Check if rule sets are similar (same number of rules with similar descriptions)
    const existingRules = config.data?.rules || [];
    if (existingRules.length === newRules.length && existingRules.length > 0) {
      const existingDescriptions = existingRules.map((r: any) => r.description).sort();
      const newDescriptions = newRules.map((r: any) => r.description).sort();
      
      // If 80% or more descriptions match, consider it a duplicate
      const matches = existingDescriptions.filter((desc: string, i: number) => desc === newDescriptions[i]).length;
      if (matches / existingDescriptions.length >= 0.8) {
        return config;
      }
    }
  }
  return null;
}

// Auto-import dev data in development mode
async function autoImportDevData() {
  if (process.env.NODE_ENV !== 'development') return;
  
  try {
    const devDataPath = path.join(process.cwd(), 'server', 'dev-data.json');
    if (fs.existsSync(devDataPath)) {
      const configs = await storage.getAllConfigurations();
      
      // Only auto-import if no configurations exist
      if (configs.length === 0) {
        console.log('🔧 Auto-importing dev configuration...');
        const devData = JSON.parse(fs.readFileSync(devDataPath, 'utf8'));
        // Parse the Karabiner configuration
        const profileRules = devData.profiles?.[0]?.complex_modifications?.rules || [];
        const title = devData.profiles?.[0]?.name || "Default profile";
        
        const rules = profileRules.map((rule: any) => ({
          description: rule.description,
          type: 'basic',
          from: rule.manipulators?.[0]?.from || {},
          to: rule.manipulators?.[0]?.to || [],
          conditions: rule.manipulators?.[0]?.conditions || null
        }));
        
        const config = await storage.createConfiguration({
          name: title,
          data: devData
        });
        
        // Import rules
        let order = 0;
        for (const rule of rules) {
          await storage.createRule({
            configurationId: config.id,
            description: rule.description,
            type: rule.type || 'basic',
            fromKey: rule.from || {},
            toActions: rule.to || [],
            conditions: rule.conditions || null,
            enabled: true,
            order: order++
          });
        }
        
        console.log(`✅ Auto-imported configuration "${title}" with ${rules.length} rules`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Failed to auto-import dev data:', (error as Error).message);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuration routes
  app.get("/api/configurations", async (req, res) => {
    try {
      const configs = await storage.getAllConfigurations();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch configurations" });
    }
  });

  app.get("/api/configurations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.getConfiguration(id);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  app.post("/api/configurations", async (req, res) => {
    try {
      const validatedData = insertConfigurationSchema.parse(req.body);
      const config = await storage.createConfiguration(validatedData);
      res.status(201).json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create configuration" });
    }
  });

  app.put("/api/configurations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertConfigurationSchema.partial().parse(req.body);
      const config = await storage.updateConfiguration(id, validatedData);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update configuration" });
    }
  });

  app.delete("/api/configurations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteConfiguration(id);
      if (!deleted) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete configuration" });
    }
  });

  // Rule routes
  app.get("/api/configurations/:id/rules", async (req, res) => {
    try {
      const configurationId = parseInt(req.params.id);
      const rules = await storage.getRulesForConfiguration(configurationId);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rules" });
    }
  });

  app.post("/api/rules", async (req, res) => {
    try {
      const validatedData = insertRuleSchema.parse(req.body);
      const rule = await storage.createRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create rule" });
    }
  });

  app.post("/api/configurations/:id/rules", async (req, res) => {
    try {
      const configurationId = parseInt(req.params.id);
      console.log('Creating rule for configuration:', configurationId);
      console.log('Rule data:', JSON.stringify(req.body, null, 2));
      
      const ruleData = { ...req.body, configurationId };
      
      // Handle device_if conditions properly
      if (ruleData.conditions) {
        ruleData.conditions = ruleData.conditions.map((condition: any) => {
          if (condition.type === 'device_if' && condition.identifiers) {
            condition.identifiers = condition.identifiers.map((id: any) => ({
              ...id,
              vendor_id: typeof id.vendor_id === 'string' ? parseInt(id.vendor_id) : id.vendor_id,
              product_id: typeof id.product_id === 'string' ? parseInt(id.product_id) : id.product_id
            }));
          }
          return condition;
        });
      }
      
      const validatedData = insertRuleSchema.parse(ruleData);
      const rule = await storage.createRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Failed to create rule:", error);
      console.error("Request body:", req.body);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create rule", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertRuleSchema.partial().parse(req.body);
      const rule = await storage.updateRule(id, validatedData);
      if (!rule) {
        return res.status(404).json({ message: "Rule not found" });
      }
      res.json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update rule" });
    }
  });

  app.delete("/api/rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteRule(id);
      if (!deleted) {
        return res.status(404).json({ message: "Rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete rule" });
    }
  });

  app.post("/api/configurations/:id/reorder-rules", async (req, res) => {
    try {
      const configurationId = parseInt(req.params.id);
      const { ruleIds } = req.body;
      await storage.reorderRules(configurationId, ruleIds);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder rules" });
    }
  });

  // Parse Karabiner JSON and create configuration
  app.post("/api/configurations/import", async (req, res) => {
    try {
      const { name, karabinerJson, replaceExisting } = req.body;
      
      let rulesToProcess: any[] = [];
      let configTitle = name;

      // Extract rules directly without strict schema validation to preserve complex from fields
      if (karabinerJson?.profiles?.[0]?.complex_modifications?.rules) {
        rulesToProcess = karabinerJson.profiles[0].complex_modifications.rules;
        configTitle = karabinerJson.profiles[0].name || name;
        

      } else if (karabinerJson?.rules) {
        rulesToProcess = karabinerJson.rules;
        configTitle = karabinerJson.title || name;
      } else {
        throw new Error("No valid rules found in configuration");
      }

      // Check for existing configurations with similar rule sets
      const existingConfigs = await storage.getAllConfigurations();
      const duplicateConfig = findDuplicateConfiguration(existingConfigs, rulesToProcess, configTitle);
      
      if (duplicateConfig && !replaceExisting) {
        return res.status(409).json({
          message: "Configuration with similar rules already exists",
          existingConfig: duplicateConfig,
          suggestion: "replace" // Could be "replace", "merge", or "createNew"
        });
      }

      let config;
      if (duplicateConfig && replaceExisting) {
        // Delete existing rules and update configuration
        const existingRules = await storage.getRulesForConfiguration(duplicateConfig.id);
        for (const rule of existingRules) {
          await storage.deleteRule(rule.id);
        }
        
        config = await storage.updateConfiguration(duplicateConfig.id, {
          name: configTitle,
          data: { title: configTitle, rules: rulesToProcess },
        });
      } else {
        // Create new configuration
        config = await storage.createConfiguration({
          name: configTitle,
          data: { title: configTitle, rules: rulesToProcess },
        });
      }

      if (!config) {
        throw new Error("Failed to create or update configuration");
      }

      // Create individual rules for easier management
      const rules = [];
      for (let i = 0; i < rulesToProcess.length; i++) {
        const karabinerRule = rulesToProcess[i];
        for (let j = 0; j < karabinerRule.manipulators.length; j++) {
          const manipulator = karabinerRule.manipulators[j];
          

          
          const rule = await storage.createRule({
            configurationId: config.id,
            description: manipulator.description || karabinerRule.description,
            type: manipulator.type,
            enabled: true,
            fromKey: manipulator.from !== undefined ? manipulator.from : null,
            toActions: manipulator.to || [],
            conditions: manipulator.conditions || null,
            order: i * 100 + j,
          });
          rules.push(rule);
        }
      }

      res.status(201).json({ config, rules });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid Karabiner JSON format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to import configuration" });
    }
  });

  // Export configuration as Karabiner JSON
  app.get("/api/configurations/:id/export", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.getConfiguration(id);
      const rules = await storage.getRulesForConfiguration(id);

      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }

      // Convert rules back to Karabiner format
      const karabinerRules: any[] = [];
      const ruleGroups = new Map<string, any[]>();

      // Group rules by description for complex modifications
      rules.forEach((rule: any) => {
        if (!ruleGroups.has(rule.description)) {
          ruleGroups.set(rule.description, []);
        }
        ruleGroups.get(rule.description)!.push(rule);
      });

      ruleGroups.forEach((groupRules, description) => {
        const manipulators = groupRules.map((rule: any) => ({
          description: rule.description,
          type: rule.type,
          from: rule.fromKey,
          to: rule.toActions,
          ...(rule.conditions && { conditions: rule.conditions }),
        }));

        karabinerRules.push({
          description,
          manipulators,
        });
      });

      const karabinerConfig = {
        title: config.name,
        rules: karabinerRules,
      };

      res.json(karabinerConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to export configuration" });
    }
  });

  // Chat assistant endpoint
  app.post("/api/chat/suggest-keys", async (req, res) => {
    try {
      const { 
        message, 
        rules, 
        conversationHistory = [], 
        configurationId,
        currentConfiguration,
        originalConfiguration 
      } = req.body;
      
      console.log('Checking OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
      
      // Analyze existing key combinations
      const usedCombinations = rules.map((rule: any) => {
        const from = rule.fromKey;
        if (from?.key_code) {
          const modifiers = from.modifiers?.mandatory || [];
          return modifiers.length > 0 
            ? `${modifiers.join('+')}+${from.key_code}`
            : from.key_code;
        }
        return null;
      }).filter(Boolean);

      console.log('Used combinations:', usedCombinations);
      
      // Extract device information from existing rules
      const deviceInfo = rules.map((rule: any) => {
        const conditions = rule.conditions || [];
        const deviceConditions = conditions.filter((c: any) => c.type === 'device_if');
        return deviceConditions.map((dc: any) => dc.identifiers || []).flat();
      }).flat();
      
      console.log('Device info from rules:', deviceInfo);
      console.log('Original config received:', originalConfiguration ? 'Present (length: ' + JSON.stringify(originalConfiguration).length + ')' : 'Missing');
      console.log('Current config received:', currentConfiguration ? 'Present (length: ' + JSON.stringify(currentConfiguration).length + ')' : 'Missing');
      
      // Get full configuration context if available
      let fullConfig = null;
      if (configurationId) {
        try {
          const config = await storage.getConfiguration(configurationId);
          fullConfig = config?.data || null;
        } catch (error) {
          console.error('Error fetching configuration:', error);
        }
      }
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(200).json({ 
          response: "No OpenAI API key found. Using basic suggestions mode.",
          suggestions: generateBasicDOIOSuggestions(message, usedCombinations, conversationHistory)
        });
      }

      // Use OpenAI for intelligent responses
      try {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Use the configuration data that was passed in
        const configToShow = currentConfiguration || originalConfiguration || fullConfig;
        
        const systemPrompt = `You are a Karabiner-Elements JSON expert. NEVER use shell_command - always provide real key mappings.

USER'S KARABINER CONFIGURATION:
${configToShow ? JSON.stringify(configToShow, null, 2).substring(0, 3000) + (JSON.stringify(configToShow).length > 3000 ? '...' : '') : 'No configuration data available'}

ANALYSIS CONTEXT:
- Configuration contains ${rules.length} processed rules
- Device data available: ${deviceInfo.length > 0 ? 'Yes' : 'No'}

CONTEXT:
- ${rules.length} active rules using: ${usedCombinations.join(', ') || 'none'}
- Device identifiers: ${JSON.stringify(deviceInfo)}

CRITICAL RULES:
1. NEVER use "shell_command" - always provide real key mappings
2. Use actual device identifiers from the user's configuration
3. Reference both original and current configurations to understand changes
4. Provide specific, working examples for real applications
5. Help troubleshoot issues by comparing before/after configurations

Device identifiers from configuration:
${deviceInfo.length > 0 ? JSON.stringify(deviceInfo[0], null, 2) : 'Use standard DOIO device IDs: vendor_id: 12625, product_id: 16400'}

Example of GOOD "to" structure:
\`\`\`json
"to": [
  {
    "key_code": "space",
    "modifiers": ["left_command"]
  }
]
\`\`\`

Always respond with JSON:
{
  "response": "Your helpful response with working key mappings and configuration analysis"
}`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory.slice(-8).map(msg => ({
              role: msg.role as "user" | "assistant",
              content: msg.content
            })),
            { role: "user", content: message }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1200,
          temperature: 0.8
        });

        let result;
        try {
          result = JSON.parse(response.choices[0].message.content || '{}');
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          result = {
            response: "I had trouble parsing my response. Let me give you the basic structure you need.",
            suggestions: []
          };
        }
        
        console.log('OpenAI response:', result);
        
        // Enhance response with actual device information if available
        if (message.toLowerCase().includes('json') && deviceInfo.length > 0) {
          const deviceIds = deviceInfo[0];
          if (deviceIds.vendor_id && deviceIds.product_id) {
            result.response += `\n\nBased on your existing configuration, use these device identifiers:\n- vendor_id: ${deviceIds.vendor_id}\n- product_id: ${deviceIds.product_id}`;
          }
        }
        
        // Ensure suggestions array exists and response is a string
        if (!result.suggestions) {
          result.suggestions = [];
        }
        
        // Fix response format if it's not a string
        if (typeof result.response !== 'string') {
          console.warn('Response is not a string:', typeof result.response);
          result.response = "I received your message and analyzed your configuration. How can I help you with your Karabiner setup?";
        }
        
        res.json(result);
      } catch (openaiError) {
        console.error('OpenAI error:', openaiError);
        // Fallback to basic suggestions
        const suggestions = generateBasicDOIOSuggestions(message, usedCombinations, conversationHistory);
        res.json({ 
          response: "OpenAI error, using basic suggestions.",
          suggestions 
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ 
        response: "Sorry, I encountered an error while analyzing your configuration. Please try again.",
        suggestions: []
      });
    }
  });

  function generateBasicDOIOSuggestions(message: string, usedCombinations: string[] = [], conversationHistory: any[] = []) {
    const messageLower = message.toLowerCase();
    const suggestions = [];
    const availableFKeys = ['f13', 'f14', 'f15', 'f16', 'f17', 'f18'].filter(key => 
      !usedCombinations.some(combo => combo.includes(key))
    );

    if (messageLower.includes('screenshot') || messageLower.includes('capture')) {
      suggestions.push({
        combination: `cmd+shift+${availableFKeys[0] || 'f13'}`,
        description: 'Screenshot tool',
        reasoning: 'F-key avoids conflicts'
      });
    }

    if (messageLower.includes('raycast') || messageLower.includes('launcher')) {
      suggestions.push({
        combination: `cmd+${availableFKeys[1] || 'f14'}`,
        description: 'App launcher',
        reasoning: 'Fast single modifier'
      });
    }

    if (messageLower.includes('password') || messageLower.includes('1password')) {
      suggestions.push({
        combination: `cmd+opt+${availableFKeys[2] || 'f15'}`,
        description: 'Password manager',
        reasoning: 'Secure double modifier'
      });
    }

    // Check conversation history for context
    const previousSuggestions = conversationHistory
      .filter(msg => msg.role === 'assistant')
      .flatMap(msg => msg.suggestions || [])
      .map(s => s.combination);

    // Generic suggestions (avoid previously suggested combinations)
    if (suggestions.length === 0) {
      const freshFKeys = availableFKeys.filter(key => 
        !previousSuggestions.some(combo => combo.includes(key))
      );
      
      freshFKeys.slice(0, 3).forEach((key, index) => {
        const modifiers = index === 0 ? 'cmd' : index === 1 ? 'cmd+shift' : 'cmd+opt';
        suggestions.push({
          combination: `${modifiers}+${key}`,
          description: `DOIO macro button`,
          reasoning: `${key.toUpperCase()} available`
        });
      });
    }

    // Provide alternative modifiers if user asks for more options
    if (messageLower.includes('more') || messageLower.includes('other') || messageLower.includes('different')) {
      const alternativeModifiers = ['ctrl+cmd', 'opt+shift', 'ctrl+opt'];
      alternativeModifiers.forEach((mod, index) => {
        if (availableFKeys[index]) {
          suggestions.push({
            combination: `${mod}+${availableFKeys[index]}`,
            description: `Alternative mapping`,
            reasoning: `Different modifier combo`
          });
        }
      });
    }

    return suggestions.slice(0, 3);
  }

  const httpServer = createServer(app);
  return httpServer;
}
