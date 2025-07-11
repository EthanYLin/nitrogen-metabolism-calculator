import { create, all } from 'mathjs';
import { Variable, Department, VariableType, VariableRole, Direction } from '@/models/variable';
import variablesJson from '@/assets/variables.json';
import showVarsJson from '@/assets/show_vars.json';

// 初始化 math.js
const math = create(all);

// 从 JSON 文件加载所有变量
export const all_variables: Variable[] = variablesJson.map(item =>
    new Variable(
        item.n_id,
        item.type as VariableType,
        item.role as VariableRole,
        item.dept as Department,
        item.year ?? null,
        item.unit ?? '',
        item.value ?? null,
        item.cell,
        item.id,
        item.origin_expr ?? null,
        item.expr ?? null,
        (item.depends ? JSON.parse(item.depends) : []) as string[],
        item.sequence,
        item.need_show === 'YES' ? true : item.need_show === 'NO' ? false : null,
        item.direction as Direction | null,
        item.caption ?? null,
        item.from_dept as Department | null,
        item.to_dept as Department | null,
        item.counterpart ?? null
    )
);

// 计算函数
export const calculateAllVariables = (): void => {
    const scope: Record<string, number> = {};

    // 1. 把所有 input 型变量放进作用域
    all_variables
        .filter(v => v.type === 'input')
        .forEach(v => {
            if (v.value !== null) {
                scope[v.id] = v.value;
            }
        });

    // 2. 取所有需要计算的 output 和 io 型变量，按 sequence 升序排序
    const variablesToCalculate = all_variables
        .filter(v => v.type === 'output' || v.type === 'io')
        .sort((a, b) => a.sequence - b.sequence);

    // 3. 依次计算并直接修改 all_variables 中的变量值
    variablesToCalculate.forEach((variable) => {
        if (!variable.expr) {
            return;
        }
        try {
            // 使用当前 scope 计算表达式
            const result = math.evaluate(variable.expr, scope);
            // 更新变量的 value
            variable.value = result;
            // 同时更新作用域
            scope[variable.id] = result;
        } catch (error) {
            console.error(`Error evaluating variable ${variable.id}:`, error);
            variable.value = null;
        }
    });

    // 4. 计算完成，所有结果直接写入 all_variables
};

// 根据 show_vars.json 筛选需要显示的变量
export const getShowVariables = (): Variable[] => {
    const showNIds = new Set(showVarsJson);
    return all_variables.filter(variable => showNIds.has(variable.n_id));
};