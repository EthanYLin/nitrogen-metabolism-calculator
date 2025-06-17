import variablesJson from '@/assets/variables.json';
import {Variable, Department, VariableType, VariableRole, Direction} from '@/models/variable';

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