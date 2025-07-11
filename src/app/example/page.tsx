'use client'

import { useEffect, useRef, useState } from 'react'
import ELK from 'elkjs/lib/elk.bundled.js'
import elkData from '@/assets/elk_flat.json'

interface ElkNode {
  id: string
  x?: number
  y?: number
  width?: number
  height?: number
  children?: ElkNode[]
  labels?: Array<{
    x?: number
    y?: number
    width?: number
    height?: number
    text: string
  }>
}

interface ElkEdge {
  id: string
  sources: string[]
  targets: string[]
  sections?: Array<{
    id: string
    startPoint: { x: number; y: number }
    endPoint: { x: number; y: number }
    bendPoints?: Array<{ x: number; y: number }>
  }>
}

interface ElkGraph {
  id: string
  x?: number
  y?: number
  width?: number
  height?: number
  children: ElkNode[]
  edges: ElkEdge[]
  layoutOptions?: Record<string, string>
}

export default function Home() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [layoutedGraph, setLayoutedGraph] = useState<ElkGraph | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)

  // ➤ 新增：平移/缩放
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    async function computeELKLayout() {
      try {
        console.log('原始 ELK 数据:', elkData)
        
        // 创建 ELK 实例
        const elk = new ELK()
        
        // 准备 ELK 图表数据
        const graph = {
          id: 'root',
          layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.portConstraints': 'FREE',
            'elk.layered.allowNonFlowPortsToSwitchSides': 'true',
          },
          children: elkData.children.map(node => ({
            id: node.id,
            width: 140,
            height: 200,
            labels: node.labels?.map(label => ({
              ...label,
              x: 10,
              y: 90,
              width: 140,
              height: 20
            }))
          })),
          edges: elkData.edges.map(edge => ({
            id: edge.id,
            sources: edge.sources,
            targets: edge.targets
          }))
        }

        console.log('发送给 ELK 的图表:', graph)
        
        // 使用 ELK 计算布局
        const layouted = await elk.layout(graph) as ElkGraph
        
        console.log('🎉 ELK 计算结果:', layouted)
        console.log('📐 边的布局信息:', layouted.edges)
        console.log('📦 节点布局信息:', layouted.children)
        
        // 检查是否有弯点数据
        const edgesWithBendPoints = layouted.edges?.filter(edge => 
          edge.sections?.[0]?.bendPoints && edge.sections[0].bendPoints.length > 0
        ) || []
        console.log(`✨ 包含弯点的边数量: ${edgesWithBendPoints.length}`)
        
        setLayoutedGraph(layouted)
        setLoading(false)
        
      } catch (err) {
        console.error('❌ ELK 布局计算失败:', err)
        setError('ELK 布局计算失败: ' + (err as Error).message)
        setLoading(false)
      }
    }

    computeELKLayout()
  }, [])

  // 处理边的点击事件
  const handleEdgeClick = (edgeId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedEdge(selectedEdge === edgeId ? null : edgeId)
  }

  // 处理空白区域点击，清除选择
  const handleSvgClick = () => {
    setSelectedEdge(null)
  }

  // ➤ 新增：滚轮缩放
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const { x, y, k } = transform
    const direction = e.deltaY < 0 ? 1.1 : 0.9
    const newK = Math.min(6, Math.max(0.2, k * direction))

    // 以光标为中心进行缩放
    const pt = svgRef.current!.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const cursorSvg = pt.matrixTransform(svgRef.current!.getScreenCTM()!.inverse())
    const nx = cursorSvg.x - (cursorSvg.x - x) * (newK / k)
    const ny = cursorSvg.y - (cursorSvg.y - y) * (newK / k)

    setTransform({ x: nx, y: ny, k: newK })
  }

  // ➤ 新增：拖拽平移
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    setIsPanning(true)
    setPanStart({ x: e.clientX, y: e.clientY })
  }
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning || !panStart) return
    const dx = (e.clientX - panStart.x) / transform.k
    const dy = (e.clientY - panStart.y) / transform.k
    setPanStart({ x: e.clientX, y: e.clientY })
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }
  const handleMouseUp = () => setIsPanning(false)

  // 获取节点的颜色和样式
  const getNodeStyle = (nodeId: string) => {
    if (!selectedEdge || !layoutedGraph) {
      return { fill: '#e6f3ff', stroke: '#4a90e2' }
    }

    const edge = layoutedGraph.edges.find(e => e.id === selectedEdge)
    if (!edge) {
      return { fill: '#e6f3ff', stroke: '#4a90e2' }
    }

    // 检查是否是起点节点（蓝色）
    if (edge.sources.includes(nodeId)) {
      return { fill: '#3b82f6', stroke: '#1d4ed8' }
    }
    
    // 检查是否是终点节点（绿色）
    if (edge.targets.includes(nodeId)) {
      return { fill: '#10b981', stroke: '#059669' }
    }

    // 其他节点保持灰色
    return { fill: '#f3f4f6', stroke: '#9ca3af' }
  }

  const renderGraph = () => {
    if (!layoutedGraph) return null

    const padding = 30
    const viewBoxWidth = (layoutedGraph.width || 800) + padding * 2
    const viewBoxHeight = (layoutedGraph.height || 600) + padding * 2

    return (
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        style={{ border: '1px solid #ccc', cursor: 'default' }}
        onClick={handleSvgClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}  // 防止拖拽时鼠标移出
      >
        {/* 定义箭头标记 */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="4"
            refX="6"
            refY="2"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 0, 6 2, 0 4"
              fill="#4a5568"
            />
          </marker>
        </defs>

        {/* ➤ 把边 + 节点放进一个可变换的 <g> */}
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {/* 渲染边 - 这是关键！完整的 ELK 弯点数据 */}
          {layoutedGraph.edges.map(edge => {
            const section = edge.sections?.[0]
            if (!section) return null

            let pathData = `M ${section.startPoint.x + padding} ${section.startPoint.y + padding}`
            
            // 添加弯点 - ELK 的精确正交路由数据！
            if (section.bendPoints && section.bendPoints.length > 0) {
              section.bendPoints.forEach(point => {
                pathData += ` L ${point.x + padding} ${point.y + padding}`
              })
            }
            
            pathData += ` L ${section.endPoint.x + padding} ${section.endPoint.y + padding}`

            const isSelected = selectedEdge === edge.id

            return (
              <path
                key={edge.id}
                d={pathData}
                fill="none"
                stroke={isSelected ? '#ef4444' : '#4a5568'}
                strokeWidth={isSelected ? '4' : '2'}
                markerEnd="url(#arrowhead)"
                style={{ cursor: 'pointer' }}
                onClick={(e) => handleEdgeClick(edge.id, e)}
              />
            )
          })}

          {/* 渲染节点 */}
          {layoutedGraph.children.map(node => {
            const nodeStyle = getNodeStyle(node.id)
            
            return (
              <g key={node.id}>
                {/* 节点矩形 */}
                <rect
                  x={(node.x || 0) + padding}
                  y={(node.y || 0) + padding}
                  width={node.width || 140}
                  height={node.height || 200}
                  fill={nodeStyle.fill}
                  stroke={nodeStyle.stroke}
                  strokeWidth="2"
                  rx="8"
                />
              
                {/* 节点标签 */}
                <text
                  x={(node.x || 0) + (node.width || 140) / 2 + padding}
                  y={(node.y || 0) + (node.height || 200) / 2 + padding}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11"
                  fill="#2d3748"
                  fontWeight="600"
                >
                  {node.labels?.[0]?.text || node.id}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    )
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">错误</h1>
          <p className="text-gray-700">{error}</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>请检查浏览器控制台查看详细错误信息</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-gray-50">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          🎯 生态系统流程图可视化 (ELK.js 精确布局)
        </h1>
        <p className="text-gray-600 mb-4">
          使用 ELK.js bundled 版本，获得与 ELK 在线编辑器完全一致的布局效果，包含精确的弯点数据
        </p>
        {loading && (
          <div className="text-blue-600 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            正在计算 ELK 分层布局...
          </div>
        )}
        {layoutedGraph && !loading && (
          <div className="text-green-600 mb-2">
            🎉 ELK 布局完成！节点数：{layoutedGraph.children.length}，边数：{layoutedGraph.edges.length}
            <br />
            <span className="text-sm">
              📐 图表尺寸：{layoutedGraph.width} × {layoutedGraph.height}
                             {layoutedGraph.edges?.some(e => e.sections?.[0]?.bendPoints && e.sections[0].bendPoints.length > 0) && 
                 <span className="text-cyan-600 ml-2">✨ 包含弯点数据</span>
               }
            </span>
          </div>
        )}
      </div>
      <div 
        className="w-full border border-gray-300 bg-white overflow-auto" 
        style={{ height: 'calc(100vh - 180px)' }}
      >
        {renderGraph()}
      </div>
    </div>
  )
}
