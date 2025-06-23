import { configurations, rules, type Configuration, type Rule, type InsertConfiguration, type InsertRule } from "@shared/schema";

export interface IStorage {
  // Configuration methods
  getConfiguration(id: number): Promise<Configuration | undefined>;
  getAllConfigurations(): Promise<Configuration[]>;
  createConfiguration(config: InsertConfiguration): Promise<Configuration>;
  updateConfiguration(id: number, config: Partial<InsertConfiguration>): Promise<Configuration | undefined>;
  deleteConfiguration(id: number): Promise<boolean>;

  // Rule methods
  getRulesForConfiguration(configurationId: number): Promise<Rule[]>;
  getRule(id: number): Promise<Rule | undefined>;
  createRule(rule: InsertRule): Promise<Rule>;
  updateRule(id: number, rule: Partial<InsertRule>): Promise<Rule | undefined>;
  deleteRule(id: number): Promise<boolean>;
  reorderRules(configurationId: number, ruleIds: number[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private configurations: Map<number, Configuration>;
  private rules: Map<number, Rule>;
  private currentConfigId: number;
  private currentRuleId: number;

  constructor() {
    this.configurations = new Map();
    this.rules = new Map();
    this.currentConfigId = 1;
    this.currentRuleId = 1;
  }

  async getConfiguration(id: number): Promise<Configuration | undefined> {
    return this.configurations.get(id);
  }

  async getAllConfigurations(): Promise<Configuration[]> {
    return Array.from(this.configurations.values());
  }

  async createConfiguration(insertConfig: InsertConfiguration): Promise<Configuration> {
    const id = this.currentConfigId++;
    const config: Configuration = { ...insertConfig, id };
    this.configurations.set(id, config);
    return config;
  }

  async updateConfiguration(id: number, updateData: Partial<InsertConfiguration>): Promise<Configuration | undefined> {
    const existing = this.configurations.get(id);
    if (!existing) return undefined;
    
    const updated: Configuration = { ...existing, ...updateData };
    this.configurations.set(id, updated);
    return updated;
  }

  async deleteConfiguration(id: number): Promise<boolean> {
    const deleted = this.configurations.delete(id);
    if (deleted) {
      // Also delete associated rules
      const configRules = Array.from(this.rules.values()).filter(rule => rule.configurationId === id);
      configRules.forEach(rule => this.rules.delete(rule.id));
    }
    return deleted;
  }

  async getRulesForConfiguration(configurationId: number): Promise<Rule[]> {
    return Array.from(this.rules.values())
      .filter(rule => rule.configurationId === configurationId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async getRule(id: number): Promise<Rule | undefined> {
    return this.rules.get(id);
  }

  async createRule(insertRule: InsertRule): Promise<Rule> {
    const id = this.currentRuleId++;
    const rule: Rule = { ...insertRule, id };
    this.rules.set(id, rule);
    return rule;
  }

  async updateRule(id: number, updateData: Partial<InsertRule>): Promise<Rule | undefined> {
    const existing = this.rules.get(id);
    if (!existing) return undefined;
    
    const updated: Rule = { ...existing, ...updateData };
    this.rules.set(id, updated);
    return updated;
  }

  async deleteRule(id: number): Promise<boolean> {
    return this.rules.delete(id);
  }

  async reorderRules(configurationId: number, ruleIds: number[]): Promise<void> {
    ruleIds.forEach((ruleId, index) => {
      const rule = this.rules.get(ruleId);
      if (rule && rule.configurationId === configurationId) {
        this.rules.set(ruleId, { ...rule, order: index });
      }
    });
  }
}

export const storage = new MemStorage();
