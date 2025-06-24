import React from 'react';
import { type Rule } from "@shared/schema";

interface DiffViewProps {
  originalRules: Rule[];
  newRules: Rule[];
  recommendedRuleIds: Set<number>;
  sessionRuleIds: Set<number>;
}

export default function DiffView({ originalRules, newRules, recommendedRuleIds, sessionRuleIds }: DiffViewProps) {
  // Create unified diff view
  const createUnifiedDiff = () => {
    // Imported rules are the baseline (original)
    const importedRules = newRules.filter(rule => 
      !recommendedRuleIds.has(rule.id) && !sessionRuleIds.has(rule.id)
    );
    
    // AI and manual rules are additions
    const addedRules = newRules.filter(rule => 
      recommendedRuleIds.has(rule.id) || sessionRuleIds.has(rule.id)
    );

    // Create the full configuration with all rules
    const fullConfig = {
      title: "Karabiner Configuration",
      rules: newRules.map(rule => ({
        description: rule.description,
        manipulators: [{
          type: rule.type,
          from: rule.fromKey,
          to: rule.toActions,
          ...(rule.conditions && { conditions: rule.conditions })
        }],
        _changeType: recommendedRuleIds.has(rule.id) ? 'ai-added' : 
                    sessionRuleIds.has(rule.id) ? 'manual-added' : 'imported'
      }))
    };

    return { fullConfig, importedCount: importedRules.length, addedCount: addedRules.length };
  };

  const { fullConfig, importedCount, addedCount } = createUnifiedDiff();

  if (newRules.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <div className="text-2xl">📄</div>
        </div>
        <h3 className="text-lg font-medium text-slate-600 mb-2">No Configuration to Show</h3>
        <p className="text-sm text-slate-500">
          Import a Karabiner JSON file to see the unified diff view
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-medium text-slate-700">Unified Karabiner JSON</h4>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
            <span className="text-slate-600">{importedCount} imported</span>
          </div>
          {addedCount > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-slate-600">+{addedCount} added</span>
            </div>
          )}
        </div>
      </div>

      {/* Unified JSON view with full width */}
      <div className="bg-slate-50 rounded-lg border">
        <div className="bg-slate-100 px-4 py-2 border-b text-sm font-medium text-slate-700">
          Configuration ({fullConfig.rules.length} rules total)
        </div>
        <div className="p-4 overflow-auto max-h-96">
          <div className="text-xs font-mono leading-relaxed">
            <div className="text-slate-600">{"{"}</div>
            <div className="text-slate-600 ml-2">"title": "Karabiner Configuration",</div>
            <div className="text-slate-600 ml-2">"rules": [</div>
            
            {fullConfig.rules.map((rule, index) => {
              const changeType = (rule as any)._changeType;
              
              // Clean rule object for JSON display
              const cleanRule = {
                description: rule.description,
                manipulators: rule.manipulators
              };
              
              const ruleLines = JSON.stringify(cleanRule, null, 2).split('\n');
              
              return (
                <div key={index} className="ml-4">
                  {ruleLines.map((line, lineIndex) => {
                    const getLineStyle = () => {
                      switch (changeType) {
                        case 'ai-added':
                          return 'bg-purple-100 border-l-4 border-purple-500 pl-2';
                        case 'manual-added':
                          return 'bg-green-100 border-l-4 border-green-500 pl-2';
                        case 'imported':
                          return 'bg-slate-50 border-l-4 border-slate-300 pl-2';
                        default:
                          return '';
                      }
                    };
                    
                    const getPrefix = () => {
                      if (lineIndex === 0) {
                        switch (changeType) {
                          case 'ai-added':
                            return <span className="text-purple-600 mr-1 font-semibold">+</span>;
                          case 'manual-added':
                            return <span className="text-green-600 mr-1 font-semibold">+</span>;
                          case 'imported':
                            return <span className="text-slate-500 mr-1">•</span>;
                          default:
                            return null;
                        }
                      }
                      return null;
                    };
                    
                    return (
                      <div key={lineIndex} className={getLineStyle()}>
                        <span className="text-slate-800">
                          {getPrefix()}
                          {line}
                        </span>
                      </div>
                    );
                  })}
                  {index < fullConfig.rules.length - 1 && (
                    <div className={
                      changeType === 'ai-added' ? 'bg-purple-100 border-l-4 border-purple-500 pl-2' :
                      changeType === 'manual-added' ? 'bg-green-100 border-l-4 border-green-500 pl-2' :
                      'bg-slate-50 border-l-4 border-slate-300 pl-2'
                    }>
                      <span className="text-slate-600">,</span>
                    </div>
                  )}
                </div>
              );
            })}
            
            <div className="text-slate-600 ml-2">]</div>
            <div className="text-slate-600">{"}"}</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-6 text-xs text-slate-600 pt-2 border-t">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-1 bg-slate-300"></div>
          <span>• Imported (baseline)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-1 bg-green-500"></div>
          <span>+ Manual addition</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-1 bg-purple-500"></div>
          <span>+ AI recommendation</span>
        </div>
      </div>
    </div>
  );
}