'use client';

import React from 'react';
import { all_variables } from '@/services/variableService';
import { calculateAllVariables } from '@/services/calculateService';
import showVarsData from '@/assets/show_vars.json';
import { Department, DepartmentLabelMap } from '@/models/variable';

export default function DebugPage() {
  // 先计算所有变量的值
  console.log('开始计算变量值...');
  const calculatedResults = calculateAllVariables();
  console.log('计算完成，共计算了', calculatedResults.length, '个变量');
  
  // 检查数据加载情况
  console.log('all_variables length:', all_variables.length);
  console.log('show_vars length:', showVarsData.length);
  console.log('Department values:', Object.values(Department));
  console.log('First 5 variables:', all_variables.slice(0, 5));
  
  // 检查有from_dept和to_dept的变量
  const variablesWithFlow = all_variables.filter(v => 
    v.from_dept && v.to_dept
  );
  console.log('Variables with flow:', variablesWithFlow.length);
  
  // 检查show_vars中的变量
  const showVarsSet = new Set(showVarsData);
  const showVariables = all_variables.filter(v => showVarsSet.has(v.n_id));
  console.log('Variables in show_vars:', showVariables.length);
  
  // 检查同时满足条件的变量
  const validVariables = all_variables.filter(v => 
    showVarsSet.has(v.n_id) && 
    v.from_dept && 
    v.to_dept && 
    v.value !== null && 
    v.value !== undefined
  );
  console.log('Valid variables for graph:', validVariables.length);

  // 检查多条边的情况
  const edgeMap = new Map<string, number>();
  const multipleEdges: Array<{key: string, count: number, edges: any[]}> = [];
  
  validVariables.forEach(variable => {
    const key = `${variable.from_dept}-${variable.to_dept}`;
    const count = edgeMap.get(key) || 0;
    edgeMap.set(key, count + 1);
  });

  edgeMap.forEach((count, key) => {
    if (count > 1) {
      const [from_dept, to_dept] = key.split('-');
      const edges = validVariables.filter(v => 
        v.from_dept === from_dept && v.to_dept === to_dept
      );
      multipleEdges.push({ key, count, edges });
    }
  });

  console.log('Multiple edges found:', multipleEdges.length);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          数据调试页面
        </h1>
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">基本统计</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{all_variables.length}</div>
                <div className="text-sm text-gray-600">总变量数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{showVarsData.length}</div>
                <div className="text-sm text-gray-600">显示变量数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{variablesWithFlow.length}</div>
                <div className="text-sm text-gray-600">有流向的变量</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{validVariables.length}</div>
                <div className="text-sm text-gray-600">可用于图表的变量</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{multipleEdges.length}</div>
                <div className="text-sm text-gray-600">多条边的路径</div>
              </div>
            </div>
          </div>

          {multipleEdges.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">多条边的路径</h2>
              <div className="space-y-2">
                {multipleEdges.map((item, index) => (
                  <div key={index} className="text-sm p-2 bg-yellow-50 rounded">
                    <strong>{item.key}</strong> - {item.count} 条边:
                    {item.edges.map((edge, i) => (
                      <span key={i} className="ml-2 text-xs text-gray-600">
                        [{edge.n_id}: {edge.caption || '无描述'}, 值: {edge.value?.toFixed(2)}]
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">部门列表</h2>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {Object.entries(DepartmentLabelMap).map(([key, label]) => (
                <div key={key} className="text-sm p-2 bg-gray-100 rounded">
                  {label}
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">示例变量</h2>
            <div className="space-y-2">
              {all_variables.slice(0, 10).map((variable, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                  <strong>ID:</strong> {variable.n_id}, 
                  <strong> 类型:</strong> {variable.type}, 
                  <strong> 部门:</strong> {DepartmentLabelMap[variable.dept]}, 
                  <strong> 值:</strong> {variable.value}
                  {variable.from_dept && variable.to_dept && (
                    <span className="text-green-600">
                      {' '}(流向: {DepartmentLabelMap[variable.from_dept]} → {DepartmentLabelMap[variable.to_dept]})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">可用于图表的变量示例</h2>
            <div className="space-y-2">
              {validVariables.slice(0, 10).map((variable, index) => (
                <div key={index} className="text-sm p-2 bg-green-50 rounded">
                  <strong>ID:</strong> {variable.n_id}, 
                  <strong> 描述:</strong> {variable.caption || '无'}, 
                  <strong> 值:</strong> {variable.value}, 
                  <strong> 流向:</strong> {DepartmentLabelMap[variable.from_dept!]} → {DepartmentLabelMap[variable.to_dept!]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 