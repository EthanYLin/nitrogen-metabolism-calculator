// 部门枚举类，含中英文
export enum Department {
    SurfaceWater = 'surface_water',
    Agriculture = 'agriculture',
    Forestry = 'forestry',
    AnimalHusbandry = 'animal_husbandry',
    Fishery = 'fishery',
    HumanLife = 'human_life',
    Industry = 'industry',
    WastewaterTreatment = 'wastewater_treatment',
    WasteManagement = 'waste_management',
    UrbanGreenSpace = 'urban_green_space',
    Groundwater = 'groundwater',
    Atmosphere = 'atmosphere',
    Ocean = 'ocean',
    OutsideImport = 'outside_import',
    OutsideExport = 'outside_export',
}

export const DepartmentLabelMap: Record<Department, string> = {
    [Department.SurfaceWater]: '地表水',
    [Department.Agriculture]: '农业',
    [Department.Forestry]: '林业',
    [Department.AnimalHusbandry]: '畜牧业',
    [Department.Fishery]: '渔业',
    [Department.HumanLife]: '人类生活',
    [Department.Industry]: '工业',
    [Department.WastewaterTreatment]: '废水处理',
    [Department.WasteManagement]: '废物处理',
    [Department.UrbanGreenSpace]: '城市绿地',
    [Department.Groundwater]: '地下水',
    [Department.Atmosphere]: '大气',
    [Department.Ocean]: '海洋',
    [Department.OutsideImport]: '外部(进口)',
    [Department.OutsideExport]: '外部(出口)',
};

// Variable类定义
export type VariableType = 'input' | 'output' | 'io';
export type VariableRole = 'variable' | 'parameter' | 'io';
export type Direction = 'Output' | 'Input';

export class Variable {
    n_id: number;
    type: VariableType;
    role: VariableRole;
    dept: Department;
    year: string | null;
    unit: string;
    value: number | null;
    cell: string;
    id: string;
    origin_expr: string | null;
    expr: string | null;
    depends: string[];
    sequence: number;
    need_show: boolean | null;
    direction: Direction | null;
    caption: string | null;
    from_dept: Department | null;
    to_dept: Department | null;
    counterpart: number | null;

    constructor(
        n_id: number,
        type: VariableType,
        role: VariableRole,
        dept: Department,
        year: string | null,
        unit: string,
        value: number | null,
        cell: string,
        id: string,
        origin_expr: string | null,
        expr: string | null,
        depends: string[],
        sequence: number,
        need_show: boolean | null,
        direction: Direction | null,
        caption: string | null,
        from_dept: Department | null,
        to_dept: Department | null,
        counterpart: number | null
    ) {
        this.n_id = n_id;
        this.type = type;
        this.role = role;
        this.dept = dept;
        this.year = year;
        this.unit = unit;
        this.value = value;
        this.cell = cell;
        this.id = id;
        this.origin_expr = origin_expr;
        this.expr = expr;
        this.depends = depends;
        this.sequence = sequence;
        this.need_show = need_show;
        this.direction = direction;
        this.caption = caption;
        this.from_dept = from_dept;
        this.to_dept = to_dept;
        this.counterpart = counterpart;
    }
}
