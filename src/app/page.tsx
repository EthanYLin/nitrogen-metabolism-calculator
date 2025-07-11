'use client'

import { useEffect, useRef, useState } from 'react'
import ELK from 'elkjs/lib/elk.bundled.js'
import { Department, DepartmentLabelMap, Variable } from '@/models/variable'
import { calculateAllVariables, getShowVariables, all_variables } from '@/services/calculateService'

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
  weight?: number
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

interface EdgeData {
  from: Department
  to: Department
  totalValue: number
  variableCount: number
  variables: Variable[]
}

interface PanelData {
  edgeId: string
  from: Department
  to: Department
  totalValue: number
  variables: Variable[]
}

interface NodePanelData {
  nodeId: Department
  inputVariables: Variable[]
}

export default function NetworkGraphPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [layoutedGraph, setLayoutedGraph] = useState<ElkGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEdge, setSelectedEdge] = useState<PanelData | null>(null)
  const [selectedNode, setSelectedNode] = useState<Department | null>(null)
  const [nodePanelData, setNodePanelData] = useState<NodePanelData | null>(null)
  const [editedValues, setEditedValues] = useState<Map<string, string>>(new Map())
  const [saving, setSaving] = useState(false)
  const [edgeData, setEdgeData] = useState<Map<string, EdgeData>>(new Map())
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 平移/缩放状态
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)
  const [hasPanned, setHasPanned] = useState(false) // 跟踪是否发生了拖动

  // 定义每个部门的现代化颜色方案
  const departmentColors: Record<Department, { fill: string; stroke: string }> = {
    [Department.Agriculture]: { fill: '#DAA520', stroke: '#B8860B' },        // 庄稼的黄色 - Goldenrod
    [Department.Forestry]: { fill: '#228B22', stroke: '#006400' },           // 树木的深绿色 - Forest Green
    [Department.AnimalHusbandry]: { fill: '#FF8C00', stroke: '#FF7F00' },    // 畜牧业 - Dark Orange
    [Department.Fishery]: { fill: '#40E0D0', stroke: '#00CED1' },            // 渔业 - Turquoise
    [Department.Industry]: { fill: '#696969', stroke: '#2F4F4F' },           // 工业 - Dim Gray
    [Department.Atmosphere]: { fill: '#B0C4DE', stroke: '#778899' },         // 大气 - Light Steel Blue
    [Department.OutsideImport]: { fill: '#B0C4DE', stroke: '#778899' },      // 外部进口 - Light Steel Blue
    [Department.OutsideExport]: { fill: '#B0C4DE', stroke: '#778899' },      // 外部出口 - Light Steel Blue
    [Department.WastewaterTreatment]: { fill: '#654321', stroke: '#3E2723' }, // 深咖啡色1 - Dark Brown
    [Department.WasteManagement]: { fill: '#A0522D', stroke: '#8B4513' },    // 深咖啡色2 - Sienna
    [Department.SurfaceWater]: { fill: '#87CEFA', stroke: '#4682B4' },       // 浅蓝色 - Light Sky Blue
    [Department.Groundwater]: { fill: '#1E90FF', stroke: '#0000CD' },        // 蓝色 - Dodger Blue
    [Department.Ocean]: { fill: '#000080', stroke: '#191970' },              // 深蓝色 - Navy
    [Department.UrbanGreenSpace]: { fill: '#FF69B4', stroke: '#FF1493' },    // 粉色 - Hot Pink
    [Department.HumanLife]: { fill: '#BA55D3', stroke: '#8B008B' },          // 粉紫色2 - Medium Orchid
  }

  useEffect(() => {
    async function processDataAndLayout() {
      try {
        console.log('开始计算变量...')
        
        // 1. 计算所有变量的当前值
        calculateAllVariables()
        
        // 2. 重新生成图形
        await regenerateGraph()
        
        setLoading(false)
        
      } catch (err) {
        console.error('❌ 处理失败:', err)
        setLoading(false)
      }
    }

    processDataAndLayout()
  }, [])

  // 处理边的点击事件
  const handleEdgeClick = (edgeId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    // 如果正在拖动，不处理点击事件
    if (hasPanned) return
    
    const edgeValue = getEdgeValue(edgeId)
    if (edgeValue) {
      setSelectedEdge({
        edgeId,
        from: edgeValue.from,
        to: edgeValue.to,
        totalValue: edgeValue.totalValue,
        variables: edgeValue.variables
      })
      setSelectedNode(null) // 清除节点选中
      setNodePanelData(null) // 清除节点面板数据
      setEditedValues(new Map()) // 清除编辑值
    }
  }

  // 处理节点的点击事件
  const handleNodeClick = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    // 如果正在拖动，不处理点击事件
    if (hasPanned) return
    
    const department = nodeId as Department
    
    // 获取该部门的所有input类型变量
    const inputVariables = all_variables.filter(
      variable => variable.dept === department && variable.type === 'input'
    )
    
    setSelectedNode(department)
    setSelectedEdge(null) // 清除边选中
    setNodePanelData({
      nodeId: department,
      inputVariables
    })
    
    // 初始化编辑值
    const initialValues = new Map<string, string>()
    inputVariables.forEach(variable => {
      initialValues.set(variable.id, variable.value?.toString() || '0')
    })
    setEditedValues(initialValues)
  }

  // 处理空白区域点击，清除选择
  const handleSvgClick = () => {
    // 只有在没有拖动的情况下才清除选择
    if (!hasPanned) {
      setSelectedEdge(null)
      setSelectedNode(null)
      setNodePanelData(null)
      setEditedValues(new Map())
    }
  }

  // 关闭面板
  const closePanel = () => {
    setSelectedEdge(null)
    setSelectedNode(null)
    setNodePanelData(null)
    setEditedValues(new Map())
    setIsFullscreen(false) // 关闭面板时也退出全屏
  }

  // 切换全屏模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 处理保存更改
  const handleSaveChanges = async () => {
    if (!nodePanelData) return
    
    setSaving(true)
    
    try {
      // 验证所有输入值
      const updatedVariables: { variable: Variable; newValue: number }[] = []
      
      for (const variable of nodePanelData.inputVariables) {
        const editedValue = editedValues.get(variable.id) || '0'
        const numValue = parseFloat(editedValue)
        
        // 验证输入
        if (isNaN(numValue) || !isFinite(numValue)) {
          throw new Error(`变量 ${variable.caption || variable.id} 的值无效: ${editedValue}`)
        }
        
        if (numValue < 0) {
          throw new Error(`变量 ${variable.caption || variable.id} 的值不能为负数`)
        }
        
        updatedVariables.push({ variable, newValue: numValue })
      }
      
      // 更新变量值
      updatedVariables.forEach(({ variable, newValue }) => {
        variable.value = newValue
      })
      
      // 重新计算
      calculateAllVariables()
      
      // 重新生成图形
      await regenerateGraph()
      
      // 更新节点面板数据
      const updatedInputVariables = all_variables.filter(
        variable => variable.dept === nodePanelData.nodeId && variable.type === 'input'
      )
      
      setNodePanelData({
        nodeId: nodePanelData.nodeId,
        inputVariables: updatedInputVariables
      })
      
      // 更新编辑值
      const newEditedValues = new Map<string, string>()
      updatedInputVariables.forEach(variable => {
        newEditedValues.set(variable.id, variable.value?.toString() || '0')
      })
      setEditedValues(newEditedValues)
      
    } catch (error) {
      console.error('保存失败:', error)
      alert(`保存失败: ${(error as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  // 处理输入值变化
  const handleValueChange = (variableId: string, newValue: string) => {
    const newEditedValues = new Map(editedValues)
    newEditedValues.set(variableId, newValue)
    setEditedValues(newEditedValues)
  }

  // 拖拽平移
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    e.preventDefault() // 防止默认行为
    setIsPanning(true)
    setHasPanned(false) // 重置拖动标志
    setPanStart({ x: e.clientX, y: e.clientY })
  }
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning || !panStart) return
    e.preventDefault() // 防止默认行为
    
    // 计算移动距离
    const dx = (e.clientX - panStart.x) * 1.5 // 加快拖动速度
    const dy = (e.clientY - panStart.y) * 1.5
    
    // 如果移动距离超过阈值，标记为已拖动
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setHasPanned(true)
    }
    
    setPanStart({ x: e.clientX, y: e.clientY })
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }
  
  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault() // 防止默认行为
    setIsPanning(false)
    // 延迟重置拖动标志，确保点击事件能正确处理
    setTimeout(() => setHasPanned(false), 100)
  }

  // 重置视图
  const resetView = () => {
    setTransform({ x: 0, y: 0, k: 1 })
  }

  // 获取节点的颜色和样式
  const getNodeStyle = (nodeId: string) => {
    const baseColor = departmentColors[nodeId as Department] || { fill: '#e6f3ff', stroke: '#4a90e2' }
    
    if (!selectedEdge || !layoutedGraph) {
      return baseColor
    }

    const edge = layoutedGraph.edges.find(e => e.id === selectedEdge.edgeId)
    if (!edge) {
      return baseColor
    }

    // 检查是否是起点或终点节点，如果是则保持原色
    if (edge.sources.includes(nodeId) || edge.targets.includes(nodeId)) {
      return baseColor // 保持原始颜色
    }

    // 其他节点变为灰色
    return {
      fill: '#D1D5DB', // 浅灰色
      stroke: '#9CA3AF' // 深一点的灰色边框
    }
  }

  // 获取边的样式
  const getEdgeStyle = (edgeId: string) => {
    const isSelected = selectedEdge?.edgeId === edgeId
    
    // 获取边的起点和终点
    const edge = layoutedGraph?.edges.find(e => e.id === edgeId)
    const sourceNodeId = edge?.sources[0]
    const targetNodeId = edge?.targets[0]
    const sourceColor = sourceNodeId ? departmentColors[sourceNodeId as Department] : null
    
    // 如果有节点被选中
    if (selectedNode) {
      // 检查这条边是否与选中的节点相连
      const isConnectedToSelectedNode = sourceNodeId === selectedNode || targetNodeId === selectedNode
      
      if (isConnectedToSelectedNode) {
        // 与选中节点相连的边保持原色
        const strokeColor = sourceColor?.fill || '#6B7280'
        return {
          stroke: strokeColor,
          color: strokeColor,
          strokeWidth: 2
        }
      } else {
        // 其他边变为更浅的灰色
        return {
          stroke: '#E5E7EB',
          color: '#E5E7EB',
          strokeWidth: 2
        }
      }
    }
    
    // 如果有边被选中
    if (selectedEdge) {
      if (isSelected) {
        // 选中的边为红色
        return {
          stroke: '#EF4444',
          color: '#EF4444',
          strokeWidth: 3
        }
      } else {
        // 其他边为更浅的灰色
        return {
          stroke: '#E5E7EB',
          color: '#E5E7EB',
          strokeWidth: 2
        }
      }
    }
    
    // 没有选中时，使用起点部门颜色
    const strokeColor = sourceColor?.fill || '#6B7280' // 灰色 fallback
    return {
      stroke: strokeColor,
      color: strokeColor,
      strokeWidth: 2
    }
  }

  // 获取边的值信息
  const getEdgeValue = (edgeId: string): EdgeData | null => {
    if (!layoutedGraph) return null
    
    const edge = layoutedGraph.edges.find(e => e.id === edgeId)
    if (!edge || !edge.sources[0] || !edge.targets[0]) return null
    
    const key = `${edge.sources[0]}->${edge.targets[0]}`
    return edgeData.get(key) || null
  }

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const { x, y, k } = transform
    const direction = e.deltaY < 0 ? 1.08 : 0.92 // 加快缩放速度
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

  // 重新生成图形数据和布局
  const regenerateGraph = async () => {
    // 重新生成边数据
    const showVariables = getShowVariables()
    const edgeMap = new Map<string, EdgeData>()
    
    showVariables.forEach(variable => {
      if (variable.from_dept && variable.to_dept && variable.value !== null) {
        const key = `${variable.from_dept}->${variable.to_dept}`
        
        if (edgeMap.has(key)) {
          const existing = edgeMap.get(key)!
          existing.totalValue += variable.value
          existing.variableCount += 1
          existing.variables.push(variable)
        } else {
          edgeMap.set(key, {
            from: variable.from_dept,
            to: variable.to_dept,
            totalValue: variable.value,
            variableCount: 1,
            variables: [variable]
          })
        }
      }
    })
    
    setEdgeData(edgeMap)
    
    // 创建 ELK 图表数据
    const departments = Object.values(Department)
    
    const elkNodes: ElkNode[] = departments.map(dept => ({
      id: dept,
      width: 120,
      height: 120,
      labels: [{
        text: DepartmentLabelMap[dept],
        x: 10,
        y: 30,
        width: 100,
        height: 20
      }]
    }))
    
    const elkEdges: ElkEdge[] = Array.from(edgeMap.entries()).map(([, data], index) => ({
      id: `edge_${index}`,
      sources: [data.from],
      targets: [data.to],
      weight: Math.abs(data.totalValue)
    }))
    
    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.portConstraints': 'FREE',
        'elk.layered.allowNonFlowPortsToSwitchSides': 'true',
        'elk.spacing.nodeNode': '80',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.layered.spacing.edgeNodeBetweenLayers': '20',
      },
      children: elkNodes,
      edges: elkEdges
    }

    console.log('发送给 ELK 的图表:', graph)
    
    // 使用 ELK 计算布局
    const elk = new ELK()
    const layouted = await elk.layout(graph) as ElkGraph
    
    console.log('🎉 ELK 计算结果:', layouted)
    
    setLayoutedGraph(layouted)
    
    return edgeMap
  }

  const renderGraph = () => {
    if (!layoutedGraph) return null

    const padding = 50
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
        onMouseLeave={handleMouseUp}
      >
        {/* 定义箭头标记 */}
        <defs>
          {/* 单一箭头模板，颜色跟随边的 stroke */}
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
              fill="context-stroke"
            />
          </marker>
        </defs>

        {/* 变换组 */}
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {/* 渲染边 */}
          {layoutedGraph.edges.map(edge => {
            const section = edge.sections?.[0]
            if (!section) return null

            let pathData = `M ${section.startPoint.x + padding} ${section.startPoint.y + padding}`
            
            // 添加弯点
            if (section.bendPoints && section.bendPoints.length > 0) {
              section.bendPoints.forEach(point => {
                pathData += ` L ${point.x + padding} ${point.y + padding}`
              })
            }
            
            pathData += ` L ${section.endPoint.x + padding} ${section.endPoint.y + padding}`

            const edgeStyle = getEdgeStyle(edge.id)

            return (
              <g key={edge.id}>
                {/* 不可见的粗线条用于点击检测 */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleEdgeClick(edge.id, e)}
                />
                {/* 可见的细线条用于显示 */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={edgeStyle.stroke}
                  strokeWidth={edgeStyle.strokeWidth}
                  color={edgeStyle.color}
                  markerEnd="url(#arrowhead)"
                  style={{ cursor: 'pointer', color: edgeStyle.color, pointerEvents: 'none' }}
                />
              </g>
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
                  width={node.width || 120}
                  height={node.height || 80}
                  fill={nodeStyle.fill}
                  stroke={nodeStyle.stroke}
                  strokeWidth="2"
                  rx="8"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleNodeClick(node.id, e)}
                />
              
                {/* 节点标签 */}
                <text
                  x={(node.x || 0) + (node.width || 120) / 2 + padding}
                  y={(node.y || 0) + (node.height || 80) / 2 + padding}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12"
                  fill="#FFFFFF"
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

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="p-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">氮代谢网络图</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">使用 Chrome 浏览器查看效果最佳</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={resetView}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              重置视图
            </button>
          </div>
        </div>
        
        {loading && (
          <div className="mt-4 text-blue-600 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            正在计算变量并生成布局...
          </div>
        )}
      </div>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 网络图区域 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex overflow-hidden">
            {/* 图形画布 - 全屏时隐藏 */}
            {!isFullscreen && (
              <div className="flex-1 overflow-hidden">
                <div className="w-full h-full bg-white dark:bg-gray-800">
                  {renderGraph()}
                </div>
              </div>
            )}
            
            {/* 右侧面板区域 - 全屏时占用整个宽度 */}
            <div className={`bg-white dark:bg-gray-800 shadow-lg flex flex-col ${
              isFullscreen 
                ? 'w-full' 
                : 'w-80 border-l border-gray-200 dark:border-gray-700'
            }`}>
              {selectedEdge ? (
                // 显示边的详细信息
                <>
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">流动关系详情</h2>
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
                          {DepartmentLabelMap[selectedEdge.from]}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">终点：</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {DepartmentLabelMap[selectedEdge.to]}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-gray-500 dark:text-gray-400">总值：</span>
                        <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                          {new Intl.NumberFormat('zh-CN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(selectedEdge.totalValue)} t N
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                      组成部分 
                      <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                        {selectedEdge.variables.length} 个
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {selectedEdge.variables.map((variable) => {
                        // 格式化数值：固定2位小数，大数字加千位分隔符
                        const formatNumber = (num: number) => {
                          return new Intl.NumberFormat('zh-CN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(num)
                        }
                        
                        return (
                          <div 
                            key={variable.n_id} 
                            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex justify-between items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                  {variable.caption || `变量 ${variable.n_id}`}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0 flex items-baseline gap-1">
                                <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm">
                                  {variable.value !== null ? formatNumber(variable.value) : '0.00'}
                                </span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm">
                                  {variable.unit}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : nodePanelData ? (
                // 显示节点的输入变量编辑界面
                <>
                  <div className={`border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 ${isFullscreen ? 'p-8' : 'p-4'}`}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">编辑输入参数</h2>
                      <div className="flex items-center gap-2">
                        {/* 全屏切换按钮 - 只有在有可编辑变量时才显示 */}
                        {nodePanelData.inputVariables.length > 0 && (
                          <button
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            title={isFullscreen ? "缩小面板" : "全屏编辑"}
                          >
                            {isFullscreen ? (
                              // 缩小图标 - 退出全屏
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5m11 5.5V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5m11-5.5v4.5m0-4.5h4.5m-4.5 0l5.5 5.5" />
                              </svg>
                            ) : (
                              // 扩大图标
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                              </svg>
                            )}
                          </button>
                        )}
                        {/* 关闭按钮 */}
                        <button
                          onClick={closePanel}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">部门：</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {DepartmentLabelMap[nodePanelData.nodeId]}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">可编辑变量：</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {nodePanelData.inputVariables.length} 个
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`flex-1 overflow-y-auto ${isFullscreen ? 'p-8' : 'p-4'}`}>
                    {nodePanelData.inputVariables.length > 0 ? (
                      <div className={`${
                        isFullscreen 
                          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                          : 'space-y-4'
                      }`}>
                        {nodePanelData.inputVariables.map((variable) => (
                          <div 
                            key={variable.n_id} 
                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                          >
                            <div className="space-y-3">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white text-base leading-relaxed break-words">
                                  {variable.id}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="any"
                                  value={editedValues.get(variable.id) || '0'}
                                  onChange={(e) => handleValueChange(variable.id, e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="输入数值"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                                  {variable.unit}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // 没有可编辑变量时的提示
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600">
                          <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          此部门无可编辑参数
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          当前部门没有可以编辑的输入变量
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* 保存按钮 - 只有在有可编辑变量时才显示 */}
                  {nodePanelData.inputVariables.length > 0 && (
                    <div className={`border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 ${isFullscreen ? 'p-8' : 'p-4'}`}>
                      <button
                        onClick={handleSaveChanges}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            计算中...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            保存更改
                          </>
                        )}
                      </button>
                    </div>
                  )}
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
                    选择元素查看详情
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    点击网络图中的边线查看流动关系，或点击节点编辑输入参数
                  </p>
                  <div className="space-y-2 text-xs text-gray-400 dark:text-gray-500">
                    <p>💡 操作提示：</p>
                    <p>• 点击边：查看流动关系详情</p>
                    <p>• 点击节点：编辑输入参数</p>
                    <p>• 滚轮：缩放画布</p>
                    <p>• 拖拽空白：平移视图</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 