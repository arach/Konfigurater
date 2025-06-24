import React from 'react';
import { type Rule } from "@shared/schema";

interface DiffViewProps {
  originalRules: Rule[];
  newRules: Rule[];
  recommendedRuleIds: Set<number>;
  sessionRuleIds: Set<number>;
}

export default function DiffView({ originalRules, newRules, recommendedRuleIds, sessionRuleIds }: DiffViewProps) {
  // Create proper Karabiner JSON structures
  const createKarabinerJson = () => {
    // Original should always be empty baseline (no rules initially)
    const originalConfig = {
      title: "Karabiner Configuration",
      rules: []
    };

    // All current rules are additions from the baseline
    const newKarabinerRules = newRules.map(rule => ({
      description: rule.description,
      manipulators: [{
        type: rule.type,
        from: rule.fromKey,
        to: rule.toActions,
        ...(rule.conditions && { conditions: rule.conditions })
      }],
      _isNew: true, // All rules are new additions
      _source: recommendedRuleIds.has(rule.id) ? 'ai' : 'imported'
    }));

    const modifiedConfig = {
      title: "Karabiner Configuration", 
      rules: newKarabinerRules
    };

    return { originalConfig, modifiedConfig };
  };

  const { originalConfig, modifiedConfig } = createKarabinerJson();
  const addedRulesCount = recommendedRuleIds.size + sessionRuleIds.size;

  if (addedRulesCount === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <div className="text-2xl">📄</div>
        </div>
        <h3 className="text-lg font-medium text-slate-600 mb-2">No Changes to Show</h3>
        <p className="text-sm text-slate-500">
          Add rules manually or from AI recommendations to see a diff view
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-medium text-slate-700">Karabiner JSON Diff</h4>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-slate-600">+{addedRulesCount} rules</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-h-96 overflow-hidden">
        {/* Original Karabiner JSON */}
        <div className="bg-slate-50 rounded-lg border">
          <div className="bg-slate-100 px-4 py-2 border-b text-sm font-medium text-slate-700 flex items-center">
            <span className="text-red-600 mr-2">−</span>
            Original ({originalConfig.rules.length} rules)
          </div>
          <div className="p-4 overflow-auto max-h-80">
            <pre className="text-xs font-mono text-slate-700 leading-relaxed">
              {JSON.stringify(originalConfig, null, 2)}
            </pre>
          </div>
        </div>

        {/* Modified Karabiner JSON with highlights */}
        <div className="bg-slate-50 rounded-lg border">
          <div className="bg-slate-100 px-4 py-2 border-b text-sm font-medium text-slate-700 flex items-center">
            <span className="text-green-600 mr-2">+</span>
            Modified ({modifiedConfig.rules.length} rules)
          </div>
          <div className="p-4 overflow-auto max-h-80">
            <div className="text-xs font-mono leading-relaxed">
              <div className="text-slate-600">{"{"}</div>
              <div className="text-slate-600 ml-2">"title": "Karabiner Configuration",</div>
              <div className="text-slate-600 ml-2">"rules": [</div>
              
              {modifiedConfig.rules.map((rule, index) => {
                const isNew = (rule as any)._isNew;
                const source = (rule as any)._source;
                
                // Clean rule object for JSON display
                const cleanRule = {
                  description: rule.description,
                  manipulators: rule.manipulators
                };
                
                const ruleLines = JSON.stringify(cleanRule, null, 2).split('\n');
                
                return (
                  <div key={index} className="ml-4">
                    {ruleLines.map((line, lineIndex) => (
                      <div 
                        key={lineIndex}
                        className={isNew ? (
                          source === 'ai' 
                            ? 'bg-purple-100 border-l-2 border-purple-500 pl-2' 
                            : 'bg-green-100 border-l-2 border-green-500 pl-2'
                        ) : ''}
                      >
                        <span className={isNew ? 'text-slate-800' : 'text-slate-600'}>
                          {isNew && lineIndex === 0 && <span className="text-green-600 mr-1">+</span>}
                          {line}
                        </span>
                      </div>
                    ))}
                    {index < modifiedConfig.rules.length - 1 && (
                      <div className={isNew ? (
                        source === 'ai' 
                          ? 'bg-purple-100 border-l-2 border-purple-500 pl-2' 
                          : 'bg-green-100 border-l-2 border-green-500 pl-2'
                      ) : ''}>
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
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-6 text-xs text-slate-600 pt-2 border-t">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-1 bg-purple-500"></div>
          <span>AI Recommended Addition</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-1 bg-green-500"></div>
          <span>Imported/Manual Addition</span>
        </div>
      </div>
    </div>
  );
}