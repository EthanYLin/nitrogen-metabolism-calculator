'use client'

import Link from 'next/link';

export default function Home() {
    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
                    氮代谢计算器
                </h1>
                
                <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">功能导航</h2>
                    
                    <div className="space-y-4">
                        <Link 
                            href="/network-graph" 
                            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 text-center"
                        >
                            查看氮代谢流向网络图
                        </Link>
                        
                        <Link 
                            href="/debug" 
                            className="block w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 text-center"
                        >
                            数据调试页面
                        </Link>
                    </div>
                    
                    <div className="mt-6 text-sm text-gray-600">
                        <p>本应用提供氮代谢流向的可视化分析工具。</p>
                    </div>
                </div>
            </div>
        </main>
    )
}