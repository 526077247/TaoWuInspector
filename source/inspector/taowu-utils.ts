/** TaoWu Inspector 类型定义 (扩展端) */

export interface ITaoWuPropertyMeta {
    foldoutGroup?: string;
    tabGroup?: string;
    tabName?: string;
    boxGroup?: string;
    horizontalGroup?: string;
    showIf?: string;
    hideIf?: string;
    enableIf?: string;
    disableIf?: string;
    labelText?: string;
    readOnly?: boolean;
    title?: string;
    titleHorizontalLine?: boolean;
    infoBox?: { message: string; type: 'info' | 'warning' | 'error' };
    propertyOrder?: number;
    onValueChanged?: string;
    onCollectionChanged?: string;
    button?: { name?: string };
    range?: { min: number; max: number };
    textarea?: boolean;
    color?: boolean;
    tableList?: boolean;
}

export interface ITaoWuClassMeta {
    [propertyKey: string]: ITaoWuPropertyMeta;
}

/** Cocos 内置字段前缀 */
const BUILTIN_PREFIXES = ['_', '__'];

/** Cocos 内置字段名 */
const BUILTIN_KEYS = new Set([
    'enabled', 'enable', 'uuid', 'name', 'type', '__type__',
    'node', 'scene', 'target'
]);

function isBuiltinKey(key: string): boolean {
    if (BUILTIN_KEYS.has(key)) return true;
    for (const prefix of BUILTIN_PREFIXES) {
        if (key.startsWith(prefix)) return true;
    }
    return false;
}

/** 从 dump 数据中提取组件 UUID */
export function getComponentUuid(dump: any): string {
    if (dump.uuid) {
        if (typeof dump.uuid === 'object') return dump.uuid.value || '';
        return dump.uuid;
    }
    if (dump.value?.uuid?.value) return dump.value.uuid.value;
    return '';
}

/**
 * 从 dump 数据中提取组件类型名
 * Inspector dump 顶层没有 __type__，需要从属性 path 推断
 * path 格式: "__comps__0.componentName"
 * 也尝试 dump.__type__ 和 dump.value?.type?.value
 */
export function getComponentType(dump: any): string {
    // 方式1: dump 顶层 __type__
    if (dump.__type__) return dump.__type__;
    // 方式2: dump.value.type.value
    if (dump.value?.type?.value) return dump.value.type.value;

    // 方式3: 从 Inspector 传入的 dump 结构中查找
    // Cocos Inspector 给 renderer 传入的 dump 是组件 dump
    // 有时 type 信息在 dump.type 或 dump.cid 中
    if (dump.type && typeof dump.type === 'string') return dump.type;
    if (dump.type?.value) return dump.type.value;

    // 方式4: Inspector renderer 无法直接获取组件类名
    // 需要通过外部传入 — 在 update 中从 Inspector host 获取
    // 但实际上 Cocos Creator 3.8 的 Inspector section node renderer
    // 收到的 dump 是 { uuid: {value, cid}, value: { propName: {value, type, path, ...}, ... } }
    // 组件类型名就是 package.json 中 inspector.section.node 注册的 key

    return '';
}

/** 从 dump 数据中提取组件在 __comps__ 中的索引 */
export function getCompIndex(dump: any): number {
    if (dump.uuid?.cid != null) {
        const cid = parseInt(dump.uuid.cid);
        if (!isNaN(cid)) return cid;
    }
    // 从属性的 path 字段解析 "__comps__N.xxx" / "__comps___N.xxx" / "__comps__.N.xxx"
    const value = dump.value || dump;
    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            const prop = value[key];
            if (prop?.path) {
                const match = prop.path.match(/__comps__[_.]*(\d+)/);
                if (match) return parseInt(match[1]);
            }
        }
    }
    return 0;
}

/** 获取 dump 中所有用户属性的键值对 (排除 Cocos 内置字段) */
export function getProperties(dump: any): Map<string, any> {
    const result = new Map<string, any>();
    const value = dump.value || dump;

    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            if (!isBuiltinKey(key)) {
                result.set(key, value[key]);
            }
        }
    }
    return result;
}

/** 评估 ShowIf/HideIf 条件 */
export function evaluateCondition(
    meta: ITaoWuPropertyMeta | undefined,
    properties: Map<string, any>
): boolean {
    if (!meta) return true;

    if (meta.showIf) {
        const prop = properties.get(meta.showIf);
        if (prop?.value === false || prop?.value === 0 || !prop?.value) {
            return false;
        }
    }

    if (meta.hideIf) {
        const prop = properties.get(meta.hideIf);
        if (prop?.value === true || prop?.value === 1 || (prop?.value && prop.value !== false)) {
            return false;
        }
    }

    return true;
}

/** 评估 EnableIf/DisableIf 条件，返回属性是否可编辑 */
export function evaluateEnabled(
    meta: ITaoWuPropertyMeta | undefined,
    properties: Map<string, any>
): boolean {
    if (!meta) return true;

    if (meta.enableIf) {
        const prop = properties.get(meta.enableIf);
        if (prop?.value === false || prop?.value === 0 || !prop?.value) {
            return false;
        }
    }

    if (meta.disableIf) {
        const prop = properties.get(meta.disableIf);
        if (prop?.value === true || prop?.value === 1 || (prop?.value && prop.value !== false)) {
            return false;
        }
    }

    return true;
}

/** 按分组组织属性 */
export function organizeProperties(
    propertyKeys: string[],
    taowuMeta: ITaoWuClassMeta | null
): {
    ungrouped: string[];
    foldoutGroups: Map<string, string[]>;
    tabGroups: Map<string, Map<string, string[]>>;
    boxGroups: Map<string, string[]>;
    horizontalGroups: Map<string, string[]>;
} {
    const result = {
        ungrouped: [] as string[],
        foldoutGroups: new Map<string, string[]>(),
        tabGroups: new Map<string, Map<string, string[]>>(),
        boxGroups: new Map<string, string[]>(),
        horizontalGroups: new Map<string, string[]>(),
    };

    for (const key of propertyKeys) {
        const meta = taowuMeta?.[key];
        if (!meta) {
            result.ungrouped.push(key);
            continue;
        }

        if (meta.foldoutGroup) {
            if (!result.foldoutGroups.has(meta.foldoutGroup)) {
                result.foldoutGroups.set(meta.foldoutGroup, []);
            }
            result.foldoutGroups.get(meta.foldoutGroup)!.push(key);
        } else if (meta.tabGroup) {
            if (!result.tabGroups.has(meta.tabGroup)) {
                result.tabGroups.set(meta.tabGroup, new Map());
            }
            const tabName = meta.tabName || 'Default';
            if (!result.tabGroups.get(meta.tabGroup)!.has(tabName)) {
                result.tabGroups.get(meta.tabGroup)!.set(tabName, []);
            }
            result.tabGroups.get(meta.tabGroup)!.get(tabName)!.push(key);
        } else if (meta.boxGroup) {
            if (!result.boxGroups.has(meta.boxGroup)) {
                result.boxGroups.set(meta.boxGroup, []);
            }
            result.boxGroups.get(meta.boxGroup)!.push(key);
        } else if (meta.horizontalGroup) {
            if (!result.horizontalGroups.has(meta.horizontalGroup)) {
                result.horizontalGroups.set(meta.horizontalGroup, []);
            }
            result.horizontalGroups.get(meta.horizontalGroup)!.push(key);
        } else {
            result.ungrouped.push(key);
        }
    }

    // 按 propertyOrder 排序 (稳定排序，未指定时默认 0，保持声明顺序)
    const sortByOrder = (keys: string[]) => {
        keys.sort((a, b) => {
            const orderA = taowuMeta?.[a]?.propertyOrder ?? 0;
            const orderB = taowuMeta?.[b]?.propertyOrder ?? 0;
            return orderA - orderB;
        });
    };

    sortByOrder(result.ungrouped);
    for (const keys of result.foldoutGroups.values()) sortByOrder(keys);
    for (const tabs of result.tabGroups.values()) {
        for (const keys of tabs.values()) sortByOrder(keys);
    }
    for (const keys of result.boxGroups.values()) sortByOrder(keys);
    for (const keys of result.horizontalGroups.values()) sortByOrder(keys);

    return result;
}

/** 收集所有需要渲染的 key (dump 属性 + Button 方法) */
export function collectAllKeys(
    properties: Map<string, any>,
    taowuMeta: ITaoWuClassMeta
): string[] {
    const keys = Array.from(properties.keys());
    for (const key of Object.keys(taowuMeta)) {
        if (taowuMeta[key]?.button && !keys.includes(key)) {
            keys.push(key);
        }
    }
    return keys;
}
