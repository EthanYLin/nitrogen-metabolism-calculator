# 氮代谢网络计算器

一个用于展示和计算氮代谢网络的交互式 Web 工具。

## Overview / 项目简介

将氮代谢模型中的部门显示为节点，将部门之间的氮流动关系显示为有向边，适合用于查看不同部门之间的氮流动总量、组成变量和参数变化后的计算结果。

应用基于 Next.js、React、TypeScript、Tailwind CSS、ELK 和 Math.js 构建。模型变量从 JSON 文件中读取，按照依赖顺序完成计算，并在浏览器中渲染为可交互的网络图。

## Features / 功能

- 支持将部门之间的氮流动关系展示为交互式网络图
- 支持根据公式表达式自动计算派生变量
- 支持点击流动边查看起点、终点、总值和组成变量
- 支持点击部门节点编辑输入参数，并重新计算网络
- 支持网络图平移、缩放和视图重置
- 支持参数编辑面板全宽显示
- 当前实现为浏览器端计算与静态站点导出

## Getting Started / 快速开始

### Requirements / 环境要求

- Node.js 20+
- npm

### Installation / 安装

```bash
npm install
```

### Configuration / 配置

项目不需要额外配置环境变量。

模型数据位于 `src/assets/`：

- `variables.json`：包含全部输入变量、输出变量、中间变量、公式和依赖信息
- `show_vars.json`：用于构建可视化流动网络的变量 ID 列表

应用只会在浏览器内存中更新模型数据，不会把修改写回 JSON 文件。

### Run / 启动

```bash
npm run dev
```

启动后在浏览器访问 [http://localhost:3000](http://localhost:3000)。建议使用 Chrome 浏览器，以获得更好的 SVG 交互体验。

## Usage / 使用方式

1. 打开页面后等待变量计算和网络布局生成。
2. 在网络图上滚动鼠标滚轮进行缩放，拖拽空白区域进行平移。
3. 点击流动边，查看该流动关系的详细信息和组成变量。
4. 点击部门节点，编辑该部门的输入变量。
5. 保存修改后，应用会重新计算派生变量并更新网络图。
6. 点击“重置视图”可以恢复网络图视口。

## Project Structure / 项目结构

```text
src/app/                 Next.js 页面入口和全局样式
src/assets/              模型变量数据
src/models/              变量和部门类型定义
src/services/            计算逻辑和展示变量处理
next.config.ts           静态导出配置
```

## License / 开源协议

本项目使用 [MIT License](./LICENSE)。
