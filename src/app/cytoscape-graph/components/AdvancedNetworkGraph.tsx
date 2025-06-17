'use client';

import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { ElementDefinition } from 'cytoscape';
// @ts-ignore
import dagre from 'cytoscape-dagre';
import { Department, DepartmentLabelMap } from '@/models/variable';
import { getShowVariables, calculateAllVariables } from '@/services/calculateService';

// 注册dagre布局
cytoscape.use(dagre);

const AdvancedNetworkGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [elementCount, setElementCount] = useState({ nodes: 0, edges: 0 });

  // 生成 Cytoscape 元素（节点 & 边）
  const buildElements = (variables: any[]): ElementDefinition[] => {
    // 1. 节点（15 个部门）
    const nodes: ElementDefinition[] = Object.values(Department).map((dept) => ({
      data: {
        id: dept,
        label: DepartmentLabelMap[dept],
        // Atmosphere 节点标记为大矩形
        isBig: dept === Department.Atmosphere,
      },
    }));

    // 2. 边（多重 + 方向 + 自环）
    // 记录同一方向 (source -> target) 已出现的序号，用于在 bezier 曲线中做偏移
    const pairCounter = new Map<string, number>();

    const edges: ElementDefinition[] = variables
      .filter((v) => v.from_dept && v.to_dept && v.caption)
      .map((v) => {
        const source = v.from_dept!;
        const target = v.to_dept!;
        const key = `${source}|${target}`;

        const idx = pairCounter.get(key) ?? 0;
        pairCounter.set(key, idx + 1);

        // 为了让 A→B 和 B→A 的边弯到不同侧，这里用字符串大小比较来固定符号
        const sign = source < target ? 1 : -1;
        // 每新增一条平行边，再远离一点；30 像素一档
        const bezierOffset = (idx + 1) * 30 * sign;

        return {
          data: {
            id: v.n_id?.toString() || `edge-${Math.random()}`,
            source,
            target,
            label: v.caption ?? "",
            // 给样式用的自定义字段
            cpDist: bezierOffset,
            isLoop: source === target,
            isBidirectional: false, // 这里可以根据需要计算
          },
        } as ElementDefinition;
      });

    return [...nodes, ...edges];
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 销毁旧实例，防止内存泄漏
    cyRef.current?.destroy();

    calculateAllVariables();
    const variables = getShowVariables();
    const elements = buildElements(variables);
    
    setElementCount({ 
      nodes: elements.filter(e => !e.data.source).length,
      edges: elements.filter(e => e.data.source).length
    });

    // 初始化 Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        rankSep: 80,
        nodeSep: 50,
        edgeSep: 10,
        avoidOverlap: true,
        fit: false,
        padding: 20,
      } as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      wheelSensitivity: 0.1,
      style: [
        // 节点样式
        {
          selector: "node",
          style: {
            width: 60,
            height: 60,
            "background-color": "#2563eb",
            "border-width": 2,
            "border-color": "#ffffff",
            label: "data(label)",
            color: "#ffffff",
            "font-size": 12,
            "font-weight": 600,
            "text-valign": "center",
            "text-halign": "center",
          },
        },
        // Atmosphere 节点特化：大矩形
        {
          selector: "node[?isBig]",
          style: {
            width: 400,
            height: 30,
            shape: "round-rectangle",
            "background-color": "#0ea5e9", // sky-500
            "border-width": 2,
            "border-color": "#ffffff",
            "text-wrap": "wrap",
            "text-max-width": "140px",
            "font-size": "14px",
          },
        },
        // 通用边样式
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#64748b",
            "target-arrow-color": "#64748b",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.8,
            "curve-style": "bezier",
            "control-point-distance": (ele: any) => ele.data('cpDist'),
            "control-point-weight": 0.5,
            label: "data(label)",
            "font-size": 10,
            "text-rotation": "autorotate",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.8,
            "text-background-padding": "2px",
          },
        },
        // 自环（source==target）：调整环形位置与角度
        {
          selector: "edge[source = target]",
          style: {
            "loop-direction": "-45deg",
            "loop-sweep": "60deg",
            "curve-style": "bezier",
          },
        },
      ],
    });
  }, []);

  const refreshData = () => {
    if (!containerRef.current) return;
    
    cyRef.current?.destroy();
    
    calculateAllVariables();
    const variables = getShowVariables();
    const elements = buildElements(variables);
    
    setElementCount({ 
      nodes: elements.filter(e => !e.data.source).length,
      edges: elements.filter(e => e.data.source).length
    });

    // 重用第一个实例的配置
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        rankSep: 80,
        nodeSep: 50,
        edgeSep: 10,
        avoidOverlap: true,
        fit: false,
        padding: 20,
      } as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      wheelSensitivity: 0.1,
      style: [
        // 节点样式
        {
          selector: "node",
          style: {
            width: 60,
            height: 60,
            "background-color": "#2563eb",
            "border-width": 2,
            "border-color": "#ffffff",
            label: "data(label)",
            color: "#ffffff",
            "font-size": "12px",
            "font-weight": "bold",
            "text-valign": "center",
            "text-halign": "center",
          },
        },
        // Atmosphere 节点特化：大矩形
        {
          selector: "node[?isBig]",
          style: {
            width: 400,
            height: 30,
            shape: "round-rectangle",
            "background-color": "#0ea5e9", // sky-500
            "border-width": 2,
            "border-color": "#ffffff",
            "text-wrap": "wrap",
            "text-max-width": "140px",
            "font-size": "14px",
          },
        },
        // 通用边样式
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#64748b",
            "target-arrow-color": "#64748b",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.8,
            "curve-style": "bezier",
            "control-point-distance": (ele: any) => ele.data('cpDist'),
            "control-point-weight": 0.5,
            label: "data(label)",
            "font-size": "10px",
            "text-rotation": "autorotate",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.8,
            "text-background-padding": "2px",
          },
        },
        // 自环（source==target）：调整环形位置与角度
        {
          selector: "edge[source = target]",
          style: {
            "loop-direction": "-45deg",
            "loop-sweep": "60deg",
            "curve-style": "bezier" as any,
            "line-color": "#ef4444",
            "target-arrow-color": "#ef4444",
          },
        },
      ],
    });
  };

  return (
    <div className="w-full h-full bg-gray-50">
      <div className="p-4 bg-white shadow-sm border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">高级氮代谢网络图</h1>
          <div className="flex gap-3">
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              刷新数据
            </button>
            <button
              onClick={() => cyRef.current?.fit()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              适应视图
            </button>
            <button
              onClick={() => cyRef.current?.center()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              居中显示
            </button>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-blue-500"></div>
            <span>单向边</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-orange-500"></div>
            <span>双向边</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-red-500"></div>
            <span>自环边</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-500 rounded"></div>
            <span>部门节点</span>
          </div>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="w-full bg-white"
        style={{ height: 'calc(100vh - 200px)' }}
      />
      
      <div className="p-3 bg-white border-t text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <span>图数据统计：{elementCount.nodes} 个节点，{elementCount.edges} 条边</span>
          <span>提示：点击节点查看相关边，拖拽节点调整位置</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedNetworkGraph; 