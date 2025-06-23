import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConfigurationSchema, insertRuleSchema, KarabinerConfigSchema, KarabinerFullConfigSchema } from "@shared/schema";
import { z } from "zod";

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
      const { name, karabinerJson } = req.body;
      
      let rulesToProcess: any[] = [];
      let configTitle = name;

      // Try to parse as full Karabiner config first
      try {
        const fullConfig = KarabinerFullConfigSchema.parse(karabinerJson);
        
        // Extract rules from the first profile with complex modifications
        const profileWithRules = fullConfig.profiles.find(p => p.complex_modifications?.rules);
        if (profileWithRules && profileWithRules.complex_modifications) {
          rulesToProcess = profileWithRules.complex_modifications.rules;
          configTitle = profileWithRules.name || name;
        }
      } catch (fullConfigError) {
        // If that fails, try parsing as a simple config
        try {
          const simpleConfig = KarabinerConfigSchema.parse(karabinerJson);
          rulesToProcess = simpleConfig.rules;
          configTitle = simpleConfig.title || name;
        } catch (simpleConfigError) {
          // If both fail, try to extract rules manually from the structure
          if (karabinerJson?.profiles?.[0]?.complex_modifications?.rules) {
            rulesToProcess = karabinerJson.profiles[0].complex_modifications.rules;
            configTitle = karabinerJson.profiles[0].name || name;
          } else if (karabinerJson?.rules) {
            rulesToProcess = karabinerJson.rules;
            configTitle = karabinerJson.title || name;
          } else {
            throw new Error("No valid rules found in configuration");
          }
        }
      }

      // Create configuration
      const config = await storage.createConfiguration({
        name: configTitle,
        data: { title: configTitle, rules: rulesToProcess },
      });

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
            fromKey: manipulator.from || null,
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

  const httpServer = createServer(app);
  return httpServer;
}
