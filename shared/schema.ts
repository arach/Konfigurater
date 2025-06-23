import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Karabiner configuration schema
export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  data: jsonb("data").notNull(), // Store the complete Karabiner JSON
});

// Individual rules for easier management
export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  configurationId: integer("configuration_id").references(() => configurations.id),
  description: text("description").notNull(),
  type: text("type").notNull(), // "basic", "complex_modifications", "shell_command"
  enabled: boolean("enabled").default(true),
  fromKey: jsonb("from_key").notNull(), // Store the "from" key configuration
  toActions: jsonb("to_actions").notNull(), // Store the "to" actions
  conditions: jsonb("conditions"), // Optional conditions
  order: integer("order").default(0), // For ordering rules
});

// Karabiner JSON structure types
export const KarabinerKeySchema = z.object({
  key_code: z.string().optional(),
  consumer_key_code: z.string().optional(),
  pointing_button: z.string().optional(),
  modifiers: z.object({
    mandatory: z.array(z.string()).optional(),
    optional: z.array(z.string()).optional(),
  }).optional(),
});

export const KarabinerActionSchema = z.object({
  key_code: z.string().optional(),
  consumer_key_code: z.string().optional(),
  pointing_button: z.string().optional(),
  modifiers: z.array(z.string()).optional(),
  shell_command: z.string().optional(),
  lazy: z.boolean().optional(),
  set_variable: z.object({
    name: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }).optional(),
});

export const KarabinerConditionSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  bundle_identifiers: z.array(z.string()).optional(),
  file_paths: z.array(z.string()).optional(),
  identifiers: z.array(z.object({
    vendor_id: z.number(),
    product_id: z.number(),
  })).optional(),
});

export const KarabinerManipulatorSchema = z.object({
  description: z.string().optional(),
  type: z.enum(["basic", "mouse_motion_to_scroll"]),
  from: z.union([
    KarabinerKeySchema,
    z.object({
      simultaneous: z.array(KarabinerKeySchema),
      simultaneous_options: z.object({
        detect_key_down_uninterruptedly: z.boolean().optional(),
        key_down_order: z.string().optional(),
        key_up_order: z.string().optional(),
        to_after_key_up: z.array(KarabinerActionSchema).optional(),
      }).optional(),
    }),
  ]),
  to: z.array(KarabinerActionSchema).optional(),
  to_if_alone: z.array(KarabinerActionSchema).optional(),
  to_after_key_up: z.array(KarabinerActionSchema).optional(),
  to_if_held_down: z.array(KarabinerActionSchema).optional(),
  conditions: z.array(KarabinerConditionSchema).optional(),
  parameters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const KarabinerRuleSchema = z.object({
  description: z.string(),
  manipulators: z.array(KarabinerManipulatorSchema),
});

export const KarabinerConfigSchema = z.object({
  title: z.string(),
  rules: z.array(KarabinerRuleSchema),
});

// Full Karabiner profile structure
export const KarabinerProfileSchema = z.object({
  complex_modifications: z.object({
    rules: z.array(KarabinerRuleSchema),
    parameters: z.record(z.any()).optional(),
  }).optional(),
  name: z.string().optional(),
  selected: z.boolean().optional(),
  simple_modifications: z.array(z.any()).optional(),
  fn_function_keys: z.array(z.any()).optional(),
  devices: z.array(z.any()).optional(),
  virtual_hid_keyboard: z.object({}).optional(),
});

export const KarabinerFullConfigSchema = z.object({
  profiles: z.array(KarabinerProfileSchema),
  global: z.record(z.any()).optional(),
});

export const insertConfigurationSchema = createInsertSchema(configurations).pick({
  name: true,
  data: true,
});

export const insertRuleSchema = createInsertSchema(rules).pick({
  configurationId: true,
  description: true,
  type: true,
  enabled: true,
  fromKey: true,
  toActions: true,
  conditions: true,
  order: true,
});

export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;
export type Configuration = typeof configurations.$inferSelect;
export type InsertRule = z.infer<typeof insertRuleSchema>;
export type Rule = typeof rules.$inferSelect;
export type KarabinerConfig = z.infer<typeof KarabinerConfigSchema>;
export type KarabinerRule = z.infer<typeof KarabinerRuleSchema>;
export type KarabinerManipulator = z.infer<typeof KarabinerManipulatorSchema>;
export type KarabinerProfile = z.infer<typeof KarabinerProfileSchema>;
export type KarabinerFullConfig = z.infer<typeof KarabinerFullConfigSchema>;
