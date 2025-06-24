import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import RuleCard from "@/components/rule-card";
import RuleEditorModal from "@/components/rule-editor-modal";
import ValidationPanel from "@/components/validation-panel";
import SmartRecommendations from "@/components/smart-recommendations";
import DiffView from "@/components/diff-view";
import ChatAssistant from "@/components/chat-assistant";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Configuration, type Rule } from "@shared/schema";

export default function Home() {
  const [selectedConfig, setSelectedConfig] = useState<Configuration | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [exportJsonData, setExportJsonData] = useState<any>(null);
  const [isLoadingExport, setIsLoadingExport] = useState(false);
  const [sessionRuleIds, setSessionRuleIds] = useState<Set<number>>(new Set());
  const [recommendedRuleIds, setRecommendedRuleIds] = useState<Set<number>>(new Set());
  const [originalRules, setOriginalRules] = useState<Rule[]>([]);
  const [draggedRule, setDraggedRule] = useState<Rule | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configurations, isLoading: isLoadingConfigs } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
  });

  const { data: rules, isLoading: isLoadingRules, error: rulesError } = useQuery<Rule[]>({
    queryKey: [`/api/configurations/${selectedConfig?.id}/rules`],
    enabled: !!selectedConfig,
  });

  // Fetch export JSON data when selectedConfig changes
  useEffect(() => {
    const fetchExportData = async () => {
      if (!selectedConfig) {
        setExportJsonData(null);
        return;
      }
      
      setIsLoadingExport(true);
      try {
        const response = await fetch(`/api/configurations/${selectedConfig.id}/export`);
        if (response.ok) {
          const data = await response.json();
          setExportJsonData(data);
        }
      } catch (error) {
        console.error("Failed to fetch export data:", error);
        setExportJsonData(null);
      } finally {
        setIsLoadingExport(false);
      }
    };

    fetchExportData();
  }, [selectedConfig]);

  // Refresh export data when rules change
  useEffect(() => {
    if (selectedConfig && rules) {
      const refreshExportData = async () => {
        try {
          const response = await fetch(`/api/configurations/${selectedConfig.id}/export`);
          if (response.ok) {
            const data = await response.json();
            setExportJsonData(data);
          }
        } catch (error) {
          console.error("Failed to refresh export data:", error);
        }
      };
      refreshExportData();
    }
  }, [rules, selectedConfig]);

  const handleConfigSelect = (config: Configuration) => {
    setSelectedConfig(config);
    // Reset tracking when switching configurations but keep original empty
    setSessionRuleIds(new Set());
    setRecommendedRuleIds(new Set());
    setOriginalRules([]); // Always start with empty baseline
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
  };

  // Mutation for creating rules from suggestions
  const createRuleMutation = useMutation({
    mutationFn: async (suggestion: any) => {
      const newRule = {
        configurationId: selectedConfig!.id,
        description: suggestion.title,
        type: "basic",
        fromKey: suggestion.pattern.from,
        toActions: suggestion.pattern.to,
        conditions: suggestion.pattern.conditions || null,
        enabled: true
      };
      
      const response = await fetch(`/api/configurations/${selectedConfig!.id}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create rule: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Rule Added",
        description: "Smart recommendation successfully added to your configuration",
      });
      
      // Track this rule as recommended
      if (data?.id) {
        setRecommendedRuleIds(prev => new Set(Array.from(prev).concat(data.id)));
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/configurations/${selectedConfig?.id}/rules`] });
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add rule: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleCreateRuleFromSuggestion = (suggestion: any) => {
    createRuleMutation.mutate(suggestion);
  };

  const handleCreateRule = () => {
    setIsCreatingRule(true);
  };

  const handleCloseRuleEditor = () => {
    setEditingRule(null);
    setIsCreatingRule(false);
  };

  const handleRuleSaved = (savedRule?: Rule) => {
    // Track manually created/edited rules as session edits
    if (savedRule?.id) {
      setSessionRuleIds(prev => new Set(Array.from(prev).concat(savedRule.id)));
    }
    handleCloseRuleEditor();
  };

  const handleChatCreateRule = (suggestion: any) => {
    const keyParts = suggestion.combination.split('+');
    const keyCode = keyParts.pop();
    const modifiers = keyParts;

    const rule = {
      description: suggestion.description,
      type: 'basic',
      fromKey: {
        key_code: keyCode,
        modifiers: modifiers.length > 0 ? { mandatory: modifiers } : undefined
      },
      toActions: [{
        shell_command: `# Configure action for ${suggestion.description}`
      }],
      conditions: [{
        type: "device_if",
        identifiers: [{
          vendor_id: 12625,
          product_id: 16400
        }]
      }]
    };

    setEditingRule(rule as any);
    setIsCreatingRule(true);
  };

  const handleCreateRuleFromJson = (jsonRule: any) => {
    if (!selectedConfig) {
      toast({
        title: "No Configuration",
        description: "Please select a configuration first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Convert each manipulator to our rule format
      const manipulators = jsonRule.manipulators || [jsonRule];
      
      manipulators.forEach((manipulator: any, index: number) => {
        // Ensure we have the required fields
        if (!manipulator.from || !manipulator.to) {
          console.error('Invalid manipulator:', manipulator);
          toast({
            title: "Invalid Rule",
            description: "Rule missing required 'from' or 'to' properties",
            variant: "destructive"
          });
          return;
        }

        const newRule = {
          description: jsonRule.description || manipulator.description || "Chat-generated rule",
          type: manipulator.type || "basic",
          fromKey: manipulator.from,
          toActions: manipulator.to,
          conditions: manipulator.conditions || [],
          order: (rules?.length || 0) + index + 1,
          configurationId: selectedConfig.id
        };
        
        console.log('Creating rule:', newRule);
        createRuleMutation.mutate(newRule);
      });
    } catch (error) {
      console.error('Error creating rule from JSON:', error);
      toast({
        title: "Rule Creation Failed",
        description: "Failed to create rule from JSON",
        variant: "destructive"
      });
    }
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
              <div className="bg-white rounded-xl border border-slate-200 h-[calc(100vh-8rem)]">
                <Tabs defaultValue="rules" className="w-full h-full flex flex-col">
                  <div className="border-b border-slate-200 flex-shrink-0">
                    <TabsList className="grid w-full grid-cols-5 bg-transparent h-auto p-0">
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
                        value="diff" 
                        className="py-4 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                      >
                        Changes
                      </TabsTrigger>
                      <TabsTrigger 
                        value="validation" 
                        className="py-4 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                        onClick={() => setShowValidation(true)}
                      >
                        Validation
                      </TabsTrigger>
                      <TabsTrigger 
                        value="recommendations" 
                        className="py-4 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                      >
                        Recommendations
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="rules" className="p-6 mt-0 flex-1 overflow-auto">
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
                            isRecommended={recommendedRuleIds.has(rule.id)}
                            isSessionEdit={sessionRuleIds.has(rule.id)}
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

                  <TabsContent value="json" className="p-6 mt-0 h-full">
                    <div className="bg-slate-900 rounded-lg p-4 h-full flex flex-col">
                      {isLoadingExport ? (
                        <div className="text-green-400 text-center py-8">
                          Loading JSON preview...
                        </div>
                      ) : exportJsonData ? (
                        <div className="flex-1 min-h-0">
                          <div className="text-green-400 mb-2 text-xs">
                            {exportJsonData.rules?.length || 0} rules found
                          </div>
                          <pre className="text-sm text-green-400 font-mono overflow-auto h-full border border-slate-700 rounded p-2">
                            <code>{JSON.stringify(exportJsonData, null, 2)}</code>
                          </pre>
                        </div>
                      ) : (
                        <div className="text-green-400 text-center py-8">
                          Select a configuration to view JSON preview
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="validation" className="p-6 mt-0 flex-1 overflow-auto max-h-full">
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

                  <TabsContent value="diff" className="p-6 mt-0 flex-1 overflow-auto max-h-full">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-slate-800">Configuration Changes</h3>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="text-slate-600">AI Recommended ({recommendedRuleIds.size})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-slate-600">Session Edits ({sessionRuleIds.size})</span>
                          </div>
                        </div>
                      </div>

                      {/* Git-style Diff View */}
                      <DiffView
                        originalRules={originalRules}
                        newRules={rules || []}
                        recommendedRuleIds={recommendedRuleIds}
                        sessionRuleIds={sessionRuleIds}
                      />

                      {recommendedRuleIds.size === 0 && sessionRuleIds.size === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <div className="text-2xl">📄</div>
                          </div>
                          <h3 className="text-lg font-medium text-slate-600 mb-2">No Changes Yet</h3>
                          <p className="text-sm text-slate-500">
                            Add rules manually or from AI recommendations to see changes here
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {recommendedRuleIds.size > 0 && (
                            <div>
                              <h4 className="text-md font-medium text-purple-700 mb-3 flex items-center">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                                AI Recommended Rules ({recommendedRuleIds.size})
                              </h4>
                              <div className="space-y-2 pl-4 border-l-2 border-purple-200">
                                {rules?.filter(rule => recommendedRuleIds.has(rule.id)).map(rule => (
                                  <div key={rule.id} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                    <div className="font-medium text-purple-800">{rule.description}</div>
                                    <div className="text-sm text-purple-600 mt-1">
                                      Added via intelligent device analysis
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {sessionRuleIds.size > 0 && (
                            <div>
                              <h4 className="text-md font-medium text-green-700 mb-3 flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                Manual Edits ({sessionRuleIds.size})
                              </h4>
                              <div className="space-y-2 pl-4 border-l-2 border-green-200">
                                {rules?.filter(rule => sessionRuleIds.has(rule.id)).map(rule => (
                                  <div key={rule.id} className="bg-green-50 rounded-lg p-3 border border-green-200">
                                    <div className="font-medium text-green-800">{rule.description}</div>
                                    <div className="text-sm text-green-600 mt-1">
                                      Created or edited in this session
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="recommendations" className="p-6 mt-0 flex-1 overflow-auto max-h-full">
                    <SmartRecommendations
                      configuration={selectedConfig}
                      rules={rules || []}
                      onCreateRule={handleCreateRuleFromSuggestion}
                      isCreating={createRuleMutation.isPending}
                    />
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
          onSave={handleRuleSaved}
        />
      )}

      {showValidation && (
        <ValidationPanel
          rules={rules || []}
          onClose={() => setShowValidation(false)}
        />
      )}

      <ChatAssistant 
        rules={rules || []}
        configuration={selectedConfig}
        exportJsonData={exportJsonData}
        originalConfiguration={selectedConfig?.data}
        onCreateRule={handleChatCreateRule}
        onCreateRuleFromJson={handleCreateRuleFromJson}
      />
    </div>
  );
}
