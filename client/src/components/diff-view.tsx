import React from 'react';
import { type Rule } from "@shared/schema";

interface DiffViewProps {
  originalRules: Rule[];
  newRules: Rule[];
  recommendedRuleIds: Set<number>;
  sessionRuleIds: Set<number>;
}

export default function DiffView({ originalRules, newRules, recommendedRuleIds, sessionRuleIds }: DiffViewProps) {
  // Create a diff representation
  const createDiff = () => {
    const addedRules = newRules.filter(rule => 
      recommendedRuleIds.has(rule.id) || sessionRuleIds.has(rule.id)
    );

    const originalConfig = {
      title: "Original Configuration",
      rules: originalRules.filter(rule => 
        !recommendedRuleIds.has(rule.id) && !sessionRuleIds.has(rule.id)
      ).map(rule => ({
        description: rule.description,
        manipulators: [{
          type: rule.type,
          from: rule.fromKey,
          to: rule.toActions,
          conditions: rule.conditions || undefined
        }]
      }))
    };

    const modifiedConfig = {
      title: "Modified Configuration", 
      rules: [
        ...originalConfig.rules,
        ...addedRules.map(rule => ({
          description: rule.description,
          manipulators: [{
            type: rule.type,
            from: rule.fromKey,
            to: rule.toActions,
            conditions: rule.conditions || undefined
          }],
          _isNew: true,
          _source: recommendedRuleIds.has(rule.id) ? 'ai' : 'manual'
        }))
      ]
    };

    return { originalConfig, modifiedConfig, addedRules };
  };

  const { originalConfig, modifiedConfig, addedRules } = createDiff();

  if (addedRules.length === 0) {
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
        <h4 className="text-md font-medium text-slate-700">Configuration Diff</h4>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-slate-600">Added ({addedRules.length})</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-h-96 overflow-hidden">
        {/* Original Configuration */}
        <div className="bg-slate-50 rounded-lg border">
          <div className="bg-slate-100 px-4 py-2 border-b text-sm font-medium text-slate-700">
            Before ({originalConfig.rules.length} rules)
          </div>
          <div className="p-4 overflow-auto max-h-80">
            <pre className="text-xs font-mono text-slate-700 leading-relaxed">
              {JSON.stringify(originalConfig, null, 2)}
            </pre>
          </div>
        </div>

        {/* Modified Configuration */}
        <div className="bg-slate-50 rounded-lg border">
          <div className="bg-slate-100 px-4 py-2 border-b text-sm font-medium text-slate-700">
            After ({modifiedConfig.rules.length} rules)
          </div>
          <div className="p-4 overflow-auto max-h-80">
            <pre className="text-xs font-mono leading-relaxed">
              {modifiedConfig.rules.map((rule, index) => {
                const isNew = (rule as any)._isNew;
                const source = (rule as any)._source;
                const ruleJson = JSON.stringify(
                  {
                    description: rule.description,
                    manipulators: rule.manipulators
                  }, 
                  null, 
                  2
                );

                return (
                  <div 
                    key={index}
                    className={isNew ? (
                      source === 'ai' 
                        ? 'bg-purple-100 border-l-4 border-purple-500 pl-2 mb-2 rounded' 
                        : 'bg-green-100 border-l-4 border-green-500 pl-2 mb-2 rounded'
                    ) : ''}
                  >
                    <span className={isNew ? 'text-slate-800' : 'text-slate-600'}>
                      {ruleJson}
                      {index < modifiedConfig.rules.length - 1 && ','}
                    </span>
                    {isNew && (
                      <div className="text-xs mt-1 font-normal">
                        <span className={source === 'ai' ? 'text-purple-600' : 'text-green-600'}>
                          + {source === 'ai' ? 'AI Recommendation' : 'Manual Edit'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </pre>
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
          <span>Manual Addition</span>
        </div>
      </div>
    </div>
  );
}