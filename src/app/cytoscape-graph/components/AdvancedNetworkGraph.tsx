'use client';

import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { ElementDefinition } from 'cytoscape';
// @ts-ignore
import elk from 'cytoscape-elk';
import { Department, DepartmentLabelMap, Variable } from '@/models/variable';
import { getShowVariables, calculateAllVariables } from '@/services/calculateService';

// 注册布局扩展
cytoscape.use(elk);

// 边数据类型
interface EdgeData {
  source: Department;
  target: Department;
  variables: Variable[];
  totalValue: number;
}

// 面板数据类型
interface PanelData {
  edgeId: string;
  source: Department;
  target: Department;
  variables: Variable[];
  totalValue: number;
}

const AdvancedNetworkGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [elementCount, setElementCount] = useState({ nodes: 0, edges: 0 });
  const [selectedEdge, setSelectedEdge] = useState<PanelData | null>(null);

  // 合并边的函数（简化版本）
  const mergeEdges = (variables: Variable[]): EdgeData[] => {
    const edgeMap = new Map<string, EdgeData>();

    variables
      .filter((v) => v.from_dept && v.to_dept && v.value !== null && v.value !== undefined)
      .forEach((v) => {
        const source = v.from_dept!;
        const target = v.to_dept!;
        const key = `${source}->${target}`;

        if (!edgeMap.has(key)) {
          edgeMap.set(key, {
            source,
            target,
            variables: [],
            totalValue: 0,
          });
        }

        const edgeData = edgeMap.get(key)!;
        edgeData.variables.push(v);
        edgeData.totalValue += v.value || 0;
      });

    return Array.from(edgeMap.values());
  };

  // 生成 Cytoscape 元素（节点 & 边）
  const buildElements = (variables: Variable[]): ElementDefinition[] => {
    // 1. 节点（15 个部门，统一样式）
    const nodes: ElementDefinition[] = Object.values(Department).map((dept) => ({
      data: {
        id: dept,
        label: DepartmentLabelMap[dept],
        // 为ELK布局提供节点尺寸信息
        width: 70,
        height: 70,
      },
    }));

    // 2. 合并边（简化版本）
    const mergedEdges = mergeEdges(variables);

    const edges: ElementDefinition[] = mergedEdges.map((edgeData, index) => {
      const { source, target, totalValue } = edgeData;
      const edgeId = `edge-${index}-${source}-${target}`;

      return {
        data: {
          id: edgeId,
          source,
          target,
          label: `${totalValue.toFixed(2)}`,
          totalValue,
          variables: edgeData.variables,
        },
      } as ElementDefinition;
    });

    return [...nodes, ...edges];
  };

  // ELK布局配置
  const getElkLayoutOptions = () => ({
    name: 'elk',
    nodeDimensionsIncludeLabels: false,
    fit: true,
    padding: 50,
    animate: false,
    elk: {
      'algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
    }
  });

  // 运行ELK布局
  const runElkLayout = () => {
    if (cyRef.current) {
      console.log('Running ELK layout');
      const layout = cyRef.current.layout(getElkLayoutOptions());
      
      layout.on('layoutstop', () => {
        console.log('ELK layout completed');
        cyRef.current?.fit();
      });
      
      layout.run();
    }
  };

  // 初始化Cytoscape样式（简化版本）
  const getCytoscapeStyles = (): any => [
    // 统一节点样式
    {
      selector: "node",
      style: {
        width: 70,
        height: 70,
        "background-color": "#2563eb",
        "border-width": 2,
        "border-color": "#ffffff",
        label: "data(label)",
        color: "#ffffff",
        "font-size": 14,
        "font-weight": 600,
        "text-valign": "center",
        "text-halign": "center",
        "text-wrap": "wrap",
        "text-max-width": "60px",
      },
    },
    // 节点高亮样式
    {
      selector: "node.highlighted",
      style: {
        "background-color": "#dc2626",
        "border-color": "#fca5a5",
        "border-width": 4,
        width: 75,
        height: 75,
      },
    },
    // 正交线边样式
    {
      selector: "edge",
      style: {
        width: 3,
        "line-color": "#64748b",
        "target-arrow-color": "#64748b",
        "target-arrow-shape": "triangle",
        "arrow-scale": 1.2,
        "curve-style": "segments",
        "segment-distances": [20, -20],
        "segment-weights": [0.5],
        label: "data(label)",
        "font-size": 13,
        "font-weight": "bold",
        "text-background-color": "#ffffff",
        "text-background-opacity": 0.95,
        "text-background-padding": "4px",
        "text-border-color": "#64748b",
        "text-border-width": 1,
        "text-border-opacity": 0.5,
        cursor: "pointer",
      },
    },
    // 边高亮样式
    {
      selector: "edge.highlighted",
      style: {
        width: 6,
        "line-color": "#dc2626",
        "target-arrow-color": "#dc2626",
        "target-arrow-shape": "triangle",
        "arrow-scale": 1.5,
        "text-background-color": "#fee2e2",
        "text-border-color": "#dc2626",
        "text-border-width": 2,
        "font-size": 14,
      },
    },
  ];

  // 处理边点击事件
  const handleEdgeClick = (edge: any) => {
    const edgeData = edge.data();
    
    // 清除之前的高亮
    cyRef.current?.$('.highlighted').removeClass('highlighted');
    
    // 高亮当前边和连接的节点
    edge.addClass('highlighted');
    edge.source().addClass('highlighted');
    edge.target().addClass('highlighted');
    
    // 设置面板数据
    setSelectedEdge({
      edgeId: edgeData.id,
      source: edgeData.source,
      target: edgeData.target,
      variables: edgeData.variables,
      totalValue: edgeData.totalValue,
    });
  };

  // 处理背景点击事件
  const handleBackgroundClick = () => {
    // 清除高亮
    cyRef.current?.$('.highlighted').removeClass('highlighted');
    // 关闭面板
    setSelectedEdge(null);
  };

  // 关闭面板
  const closePanel = () => {
    cyRef.current?.$('.highlighted').removeClass('highlighted');
    setSelectedEdge(null);
  };

  useEffect(() => {
    if (!containerRef.current) {
      console.log('Container ref not available');
      return;
    }

    // 使用 setTimeout 确保DOM完全渲染
    const timeoutId = setTimeout(() => {
      try {
        if (!containerRef.current) {
          console.error('Container ref not available');
          return;
        }
        
        // 销毁旧实例，防止内存泄漏
        if (cyRef.current) {
          cyRef.current.destroy();
        }

        // 计算真实数据
        calculateAllVariables();
        const variables = getShowVariables();
        const elements = buildElements(variables);
        
        setElementCount({ 
          nodes: elements.filter(e => !e.data.source).length,
          edges: elements.filter(e => e.data.source).length
        });
        
        // 初始化 Cytoscape 直接使用ELK布局
        cyRef.current = cytoscape({
          container: containerRef.current,
          elements,
          layout: getElkLayoutOptions(),
          userZoomingEnabled: true,
          userPanningEnabled: true,
          boxSelectionEnabled: false,
          wheelSensitivity: 0.1,
          style: getCytoscapeStyles(),
        });

        // 绑定事件
        cyRef.current.on('tap', 'edge', (evt) => {
          evt.stopPropagation();
          handleEdgeClick(evt.target);
        });

        cyRef.current.on('tap', (evt) => {
          if (evt.target === cyRef.current) {
            handleBackgroundClick();
          }
        });

        // 监听布局完成事件
        cyRef.current.on('layoutstop', () => {
          console.log('ELK layout completed successfully!');
        });
        
      } catch (error) {
        console.error('Error during Cytoscape initialization:', error);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      cyRef.current?.destroy();
    };
  }, []);



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="p-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">氮代谢网络图</h1>
          <div className="flex gap-3">

            <button
              onClick={() => cyRef.current?.fit()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              适应视图
            </button>
            <button
              onClick={() => cyRef.current?.center()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              居中显示
            </button>
          </div>
        </div>
        
        {/* 更新的图例 */}
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-2 bg-gray-500 rounded-sm border border-gray-300"></div>
            <span className="text-gray-700 dark:text-gray-300">边（正交线）</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2 bg-red-500 rounded-sm border border-red-300"></div>
            <span className="text-gray-700 dark:text-gray-300">高亮边（点击）</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
            <span className="text-gray-700 dark:text-gray-300">部门节点</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-600 rounded-full border-2 border-red-200 shadow-sm"></div>
            <span className="text-gray-700 dark:text-gray-300">高亮节点</span>
          </div>
        </div>
      </div>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex">
        {/* 网络图区域 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex">
            {/* 图形画布 */}
            <div className="flex-1">
              <div 
                ref={containerRef}
                className="w-full h-full bg-white dark:bg-gray-800"
                style={{ minHeight: 'calc(100vh - 200px)' }}
              />
            </div>
            
            {/* 固定的右侧面板区域 */}
            <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg flex flex-col">
              {selectedEdge ? (
                // 显示边的详细信息
                <>
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">边详细信息</h2>
                      <button
                        onClick={closePanel}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">起点：</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {DepartmentLabelMap[selectedEdge.source]}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">终点：</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {DepartmentLabelMap[selectedEdge.target]}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-gray-500 dark:text-gray-400">总值：</span>
                        <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                          {selectedEdge.totalValue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                      组成变量 
                      <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                        {selectedEdge.variables.length} 个
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {selectedEdge.variables.map((variable, index) => (
                        <div 
                          key={variable.n_id} 
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                {variable.caption || `变量 ${variable.n_id}`}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                ID: {variable.id}
                              </p>
                              {variable.unit && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  单位: {variable.unit}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-semibold text-blue-600 dark:text-blue-400 text-sm">
                                {variable.value?.toFixed(4) || '0'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                // 显示空状态提示
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    选择边查看详情
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    点击网络图中的任意边线，查看该边的详细信息和组成变量
                  </p>
                  <div className="space-y-2 text-xs text-gray-400 dark:text-gray-500">
                    <p>💡 提示：</p>
                    <p>• 点击边：查看详细信息</p>
                    <p>• 拖拽节点：调整位置</p>
                    <p>• 滚轮：缩放画布</p>
                    <p>• 拖拽空白：平移视图</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 底部统计信息 */}
          <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">
                图数据统计：
                <span className="text-blue-600 dark:text-blue-400 font-semibold mx-1">
                  {elementCount.nodes}
                </span>
                个节点，
                <span className="text-green-600 dark:text-green-400 font-semibold mx-1">
                  {elementCount.edges}
                </span>
                条边
              </span>
              <span className="hidden md:block">
                💡 使用ELK分层布局（向右，正交线），点击边查看详细信息
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedNetworkGraph; 