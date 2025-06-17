/** @jsxImportSource react */
'use client';

import React, { useState } from 'react';
import {all_variables} from '@/services/variableService';
import { DepartmentLabelMap } from '@/models/variable';

const ITEMS_PER_PAGE = 5;

const VariableListPage: React.FC = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [inputPage, setInputPage] = useState('');
    const totalPages = Math.ceil(all_variables.length / ITEMS_PER_PAGE);
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentVariables = all_variables.slice(startIndex, endIndex);

    const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
            setInputPage(value);
        }
    };

    const handlePageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const page = parseInt(inputPage);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setInputPage('');
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">变量列表</h1>
            <div className="mt-6 flex justify-center items-center space-x-4">
                <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                >
                    上一页
                </button>
                <form onSubmit={handlePageSubmit} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={inputPage}
                        onChange={handlePageInput}
                        placeholder="页码"
                        className="w-16 px-2 py-1 border rounded text-center"
                    />
                    <span className="text-gray-600">/ {totalPages}</span>
                    <button 
                        type="submit"
                        className="px-2 py-1 border rounded hover:bg-gray-100"
                    >
                        跳转
                    </button>
                </form>
                <div>当前页码: {currentPage}</div>
                <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                >
                    下一页
                </button>
            </div>
            <div className="space-y-4 mt-4">
                {currentVariables.map(variable => (
                    <div key={variable.id} className="p-4 border rounded shadow">
                        <p><strong>序号:</strong> {variable.n_id}</p>
                        <p><strong>ID:</strong> {variable.id}</p>
                        <p><strong>类型:</strong> {variable.type}</p>
                        <p><strong>角色:</strong> {variable.role}</p>
                        <p><strong>部门:</strong> {DepartmentLabelMap[variable.dept]}</p>
                        <p><strong>年份:</strong> {variable.year || 'N/A'}</p>
                        <p><strong>单位:</strong> {variable.unit}</p>
                        <p><strong>数值:</strong> {variable.value !== null ? variable.value : 'N/A'}</p>
                        <p><strong>单元格:</strong> {variable.cell}</p>
                        <p><strong>原始表达式:</strong> {variable.origin_expr || 'N/A'}</p>
                        <p><strong>表达式:</strong> {variable.expr || 'N/A'}</p>
                        <p><strong>依赖:</strong> {variable.depends.length > 0 ? variable.depends.join(', ') : 'N/A'}</p>
                        <p><strong>序号:</strong> {variable.sequence}</p>
                        <p><strong>需要显示:</strong> {variable.need_show === null ? 'N/A' : variable.need_show ? '是' : '否'}</p>
                        <p><strong>方向:</strong> {variable.direction || 'N/A'}</p>
                        <p><strong>标题:</strong> {variable.caption || 'N/A'}</p>
                        <p><strong>来源部门:</strong> {variable.from_dept ? DepartmentLabelMap[variable.from_dept] : 'N/A'}</p>
                        <p><strong>目标部门:</strong> {variable.to_dept ? DepartmentLabelMap[variable.to_dept] : 'N/A'}</p>
                        <p><strong>对应变量:</strong> {variable.counterpart !== null ? variable.counterpart : 'N/A'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default VariableListPage;
