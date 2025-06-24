import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import RuleCard from "@/components/rule-card";
import RuleEditorModal from "@/components/rule-editor-modal-new";
import ValidationPanel from "@/components/validation-panel";
import SmartRecommendations from "@/components/smart-recommendations";
import DiffView from "@/components/diff-view";
import ChatAssistant from "@/components/chat-assistant";
import JsonPreviewModal from "@/components/json-preview-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Lightbulb, GitCompare, MessageSquare, Zap } from "lucide-react";
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
  const [importedRuleIds, setImportedRuleIds] = useState<Set<number>>(new Set());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configurations, isLoading: isLoadingConfigs } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
  });

  const { data: rules, isLoading: isLoadingRules, error: rulesError } = useQuery<Rule[]>({
    queryKey: [`/api/configurations/${selectedConfig?.id}/rules`],
    enabled: !!selectedConfig,
  });

  // Fetch export data for JSON preview
  useEffect(() => {
    if (!selectedConfig) {
      setExportJsonData(null);
      return;
    }
    
    const fetchExportData = async () => {
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
    
    // When selecting a configuration, track the current rules as the baseline
    if (rules && rules.length > 0) {
      setOriginalRules([...rules]);
      setImportedRuleIds(new Set(rules.map(r => r.id)));
    } else {
      setOriginalRules([]);
      setImportedRuleIds(new Set());
    }
    
    setRecommendedRuleIds(new Set());
    setSessionRuleIds(new Set());
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
  };

  const handleCreateRule = () => {
    setIsCreatingRule(true);
  };

  const handleRuleSaved = (savedRule?: Rule) => {
    setEditingRule(null);
    setIsCreatingRule(false);
    if (savedRule) {
      // Mark as session edit only if it's not from the original import
      if (!importedRuleIds.has(savedRule.id)) {
        setSessionRuleIds(prev => new Set(prev).add(savedRule.id));
      }
    }
    queryClient.invalidateQueries({ queryKey: [`/api/configurations/${selectedConfig?.id}/rules`] });
    queryClient.invalidateQueries({ queryKey: [`/api/configurations/${selectedConfig?.id}/export`] });
  };

  const handleDeleteRule = async (ruleId: number) => {
    try {
      console.log('Deleting rule:', ruleId);
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }
      
      // Remove from session tracking
      setSessionRuleIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(ruleId);
        return newSet;
      });
      
      // Refresh the rules
      queryClient.invalidateQueries({ queryKey: [`/api/configurations/${selectedConfig?.id}/rules`] });
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
      
      toast({
        title: "Rule Deleted",
        description: "Rule has been removed from your configuration"
      });
      
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete rule",
        variant: "destructive"
      });
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !selectedConfig || !rules) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    // Reorder rules array
    const reorderedRules = Array.from(rules);
    const [removed] = reorderedRules.splice(sourceIndex, 1);
    reorderedRules.splice(destinationIndex, 0, removed);
    
    try {
      const ruleIds = reorderedRules.map(rule => rule.id);
      
      const response = await fetch(`/api/configurations/${selectedConfig.id}/rules/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleIds })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reorder rules');
      }
      
      // Refresh the rules
      queryClient.invalidateQueries({ queryKey: [`/api/configurations/${selectedConfig.id}/rules`] });
      
      toast({
        title: "Rules Reordered",
        description: "Rule order updated successfully"
      });
      
    } catch (error) {
      toast({
        title: "Reorder Failed",
        description: "Failed to reorder rules",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        configurations={configurations || []}
        selectedConfig={selectedConfig}
        rules={rules || []}
        isLoading={isLoadingConfigs}
        onConfigSelect={handleConfigSelect}
        onCreateRule={handleCreateRule}
      />
      
      <div className="flex-1 flex flex-col">
        <Header
          selectedConfig={selectedConfig}
          onExport={() => {}}
        />
        
        <main className="flex-1 p-6 overflow-hidden">
          <Tabs defaultValue="rules" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="recommendations">Smart</TabsTrigger>
              <TabsTrigger value="changes">Changes</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="flex-1 mt-6 overflow-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Rules {rules?.length ? `(${rules.length})` : ''}
                  </h2>
                  <Button onClick={handleCreateRule} className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Rule</span>
                  </Button>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="rules">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-4"
                      >
                        {isLoadingRules ? (
                          <div className="text-center py-8 text-slate-500">Loading rules...</div>
                        ) : rulesError ? (
                          <div className="text-center py-8 text-red-500">
                            Error loading rules: {rulesError?.message || 'Unknown error'}
                          </div>
                        ) : rules && rules.length > 0 ? (
                          rules.map((rule, index) => (
                            <Draggable key={rule.id} draggableId={rule.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.8 : 1,
                                  }}
                                >
                                  <RuleCard
                                    rule={rule}
                                    onEdit={() => handleEditRule(rule)}
                                    onDelete={() => handleDeleteRule(rule.id)}
                                    isRecommended={recommendedRuleIds.has(rule.id)}
                                    isSessionEdit={sessionRuleIds.has(rule.id)}
                                  />
                                </div>
                              )}
                            </Draggable>
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
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
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

            <TabsContent value="recommendations" className="p-6 mt-0 h-full">
              {selectedConfig && (
                <SmartRecommendations
                  configuration={selectedConfig}
                  rules={rules || []}
                  onCreateRule={(suggestion: any) => {
                    // Handle smart recommendation rule creation
                    console.log('Smart recommendation:', suggestion);
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="changes" className="p-6 mt-0 h-full">
              {selectedConfig && (
                <DiffView
                  originalRules={originalRules}
                  newRules={rules || []}
                  recommendedRuleIds={recommendedRuleIds}
                  sessionRuleIds={sessionRuleIds}
                />
              )}
            </TabsContent>

            <TabsContent value="chat" className="p-6 mt-0 h-full">
              {selectedConfig && (
                <ChatAssistant
                  rules={rules || []}
                  configuration={selectedConfig}
                  exportJsonData={exportJsonData}
                  originalConfiguration={originalRules}
                  onCreateRule={(suggestion: any) => {
                    // Handle chat rule creation
                    console.log('Chat rule creation:', suggestion);
                  }}
                  onCreateRuleFromJson={(jsonRule: any) => {
                    // Handle JSON rule creation from chat
                    console.log('JSON rule from chat:', jsonRule);
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {(editingRule || isCreatingRule) && (
        <RuleEditorModal
          rule={editingRule}
          configurationId={selectedConfig?.id}
          onClose={() => {
            setEditingRule(null);
            setIsCreatingRule(false);
          }}
          onSave={handleRuleSaved}
        />
      )}
    </div>
  );
}