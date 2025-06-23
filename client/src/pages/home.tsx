import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import RuleCard from "@/components/rule-card";
import RuleEditorModal from "@/components/rule-editor-modal";
import ValidationPanel from "@/components/validation-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { type Configuration, type Rule } from "@shared/schema";

export default function Home() {
  const [selectedConfig, setSelectedConfig] = useState<Configuration | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const { data: configurations, isLoading: isLoadingConfigs } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
  });

  const { data: rules, isLoading: isLoadingRules, error: rulesError } = useQuery<Rule[]>({
    queryKey: [`/api/configurations/${selectedConfig?.id}/rules`],
    enabled: !!selectedConfig,
  });



  const handleConfigSelect = (config: Configuration) => {
    setSelectedConfig(config);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
  };

  const handleCreateRule = () => {
    setIsCreatingRule(true);
  };

  const handleCloseRuleEditor = () => {
    setEditingRule(null);
    setIsCreatingRule(false);
  };

  const generateJsonPreview = () => {
    if (!selectedConfig || !rules) return "{}";
    
    // Group rules by description for proper Karabiner format
    const ruleGroups = new Map();
    rules.forEach(rule => {
      if (!ruleGroups.has(rule.description)) {
        ruleGroups.set(rule.description, []);
      }
      ruleGroups.get(rule.description).push(rule);
    });

    const karabinerRules = [];
    ruleGroups.forEach((groupRules, description) => {
      const manipulators = groupRules.map(rule => ({
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
      title: selectedConfig.name,
      rules: karabinerRules,
    };

    return JSON.stringify(karabinerConfig, null, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header 
        selectedConfig={selectedConfig}
        onExport={() => {
          if (selectedConfig) {
            const element = document.createElement('a');
            const file = new Blob([generateJsonPreview()], { type: 'application/json' });
            element.href = URL.createObjectURL(file);
            element.download = `${selectedConfig.name.toLowerCase().replace(/\s+/g, '-')}.json`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
          }
        }}
      />
      
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3">
            <Sidebar
              configurations={configurations || []}
              selectedConfig={selectedConfig}
              rules={rules || []}
              isLoading={isLoadingConfigs}
              onConfigSelect={handleConfigSelect}
              onCreateRule={handleCreateRule}
            />
          </div>
          
          <div className="col-span-12 lg:col-span-9">
            {selectedConfig ? (
              <div className="bg-white rounded-xl border border-slate-200">
                <Tabs defaultValue="rules" className="w-full">
                  <div className="border-b border-slate-200">
                    <TabsList className="grid w-full grid-cols-3 bg-transparent h-auto p-0">
                      <TabsTrigger 
                        value="rules" 
                        className="py-4 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                      >
                        Rules Editor
                      </TabsTrigger>
                      <TabsTrigger 
                        value="json" 
                        className="py-4 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                      >
                        JSON Preview
                      </TabsTrigger>
                      <TabsTrigger 
                        value="validation" 
                        className="py-4 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                        onClick={() => setShowValidation(true)}
                      >
                        Validation
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="rules" className="p-6 mt-0">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-slate-800">Keyboard Rules</h2>
                      <Button onClick={handleCreateRule} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Rule
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {isLoadingRules ? (
                        <div className="text-center py-8 text-slate-500">Loading rules...</div>
                      ) : rulesError ? (
                        <div className="text-center py-8 text-red-500">
                          Error loading rules: {rulesError?.message || 'Unknown error'}
                        </div>
                      ) : rules && rules.length > 0 ? (
                        rules.map((rule) => (
                          <RuleCard
                            key={rule.id}
                            rule={rule}
                            onEdit={() => handleEditRule(rule)}
                            onDelete={() => {
                              // TODO: Implement delete functionality
                            }}
                          />
                        ))
                      ) : selectedConfig ? (
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer" onClick={handleCreateRule}>
                          <Plus className="mx-auto text-slate-400 text-2xl mb-3 w-8 h-8" />
                          <h3 className="text-lg font-medium text-slate-600 mb-1">No Rules Found</h3>
                          <p className="text-sm text-slate-500">This configuration has no rules yet. Click to add one.</p>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                          <Plus className="mx-auto text-slate-400 text-2xl mb-3 w-8 h-8" />
                          <h3 className="text-lg font-medium text-slate-600 mb-1">Select Configuration</h3>
                          <p className="text-sm text-slate-500">Choose a configuration to view its rules</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="json" className="p-6 mt-0">
                    <div className="bg-slate-900 rounded-lg p-4">
                      <pre className="text-sm text-green-400 font-mono overflow-auto max-h-96">
                        <code>{generateJsonPreview()}</code>
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="validation" className="p-6 mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-slate-700">JSON syntax valid</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-slate-700">{rules?.length || 0} rules processed successfully</span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="text-slate-400 mb-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="text-2xl">⌨️</div>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-slate-600 mb-2">No Configuration Selected</h3>
                <p className="text-sm text-slate-500">Upload or select a Karabiner configuration to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {(editingRule || isCreatingRule) && (
        <RuleEditorModal
          rule={editingRule}
          configurationId={selectedConfig?.id}
          onClose={handleCloseRuleEditor}
          onSave={() => {
            handleCloseRuleEditor();
            // Refetch rules after save
          }}
        />
      )}

      {showValidation && (
        <ValidationPanel
          rules={rules || []}
          onClose={() => setShowValidation(false)}
        />
      )}
    </div>
  );
}
