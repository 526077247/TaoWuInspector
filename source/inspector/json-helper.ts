/** 简化版 StringHelper (编辑器端用) */
export function isNullOrEmpty(str: string | null | undefined): boolean {
    return !str || str === '';
}

/**
 * JsonHelper (编辑器端副本)
 * 支持带 _t 的序列化/反序列化格式
 */
export class JsonHelper {
    private static typeRegistry = new Map<string, new () => any>();
    private static ignoreProperties = new Map<string, Set<string>>();

    static registerClass<T>(type: new (...args: any[]) => T, className: string, ignoreProps?: string[]): void {
        if (!className) className = type.name;
        if (this.typeRegistry.has(className)) return;
        this.typeRegistry.set(className, type);
        if (ignoreProps) this.ignoreProperties.set(className, new Set(ignoreProps));
    }

    static isIgnoreProperty(className: string, propName: string): boolean {
        const ignoreSet = this.ignoreProperties.get(className);
        return ignoreSet ? ignoreSet.has(propName) : false;
    }

    /**
     * 解析 JSON 字符串（支持注释、尾逗号、_t 格式）
     */
    public static parse(json: string): any {
        if (isNullOrEmpty(json)) return null;
        // 去除注释 (只去除行首的 // 注释和 /* */ 块注释，不影响字符串内的 //)
        const cleanText = json
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/[^\n\r]*/g, '$1')
            .replace(/,\s*([}\]])/g, '$1');
        const parsed = JSON.parse(cleanText);
        return this.deserialize(null, parsed);
    }

    /**
     * 反序列化（处理 _t 字段）
     */
    public static deserialize<T>(type: (new (...args: any[]) => T) | null, data: any, path: string = ''): any {
        if (data === null || typeof data !== 'object') return data;
        if (Array.isArray(data)) {
            return data.map((item, i) => this.deserialize(null, item, `${path}[${i}]`));
        }
        if ('_t' in data || type) {
            const typeName = data._t;
            if (typeName === 'Date') return new Date(data._value);
            if (typeName === 'Map') {
                return new Map(
                    (data._value as [any, any][]).map(([key, value]) => [
                        this.deserialize(null, key, `${path}.key`),
                        this.deserialize(null, value, `${path}.value`)
                    ])
                );
            }
            if (typeName === 'Set') {
                return new Set(
                    (data._value as any[]).map((value, i) => this.deserialize(null, value, `${path}[${i}]`))
                );
            }
            let hasIgnore = false;
            if (JsonHelper.typeRegistry.has(typeName)) {
                hasIgnore = JsonHelper.ignoreProperties.has(typeName);
                type = JsonHelper.typeRegistry.get(typeName)!;
            }
            if (!type) {
                // 没有 type 构造函数，作为普通对象处理但保留 _t
                const result: Record<string, any> = {};
                for (const key in data) {
                    if (data.hasOwnProperty(key)) {
                        result[key] = this.deserialize(null, data[key], `${path}.${key}`);
                    }
                }
                return result;
            }
            const instance = new type();
            for (const key in data) {
                if (key !== '_t' && data.hasOwnProperty(key) && (!hasIgnore || !JsonHelper.isIgnoreProperty(typeName, key))) {
                    (instance as any)[key] = this.deserialize(null, data[key], `${path}.${key}`);
                }
            }
            if (typeof (instance as any).fromJSON === 'function') {
                return (instance as any).fromJSON(data);
            }
            return instance;
        }
        const result: Record<string, any> = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                result[key] = this.deserialize(null, data[key], `${path}.${key}`);
            }
        }
        return result;
    }

    /**
     * 序列化对象为 JSON 字符串
     */
    public static toJson(obj: any, pretty: boolean = false): string {
        const serialized = this.serialize(obj);
        return pretty ? JSON.stringify(serialized, null, 2) : JSON.stringify(serialized);
    }

    public static serialize(obj: any, path: string = ''): any {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
            return obj.map((item, i) => this.serialize(item, `${path}[${i}]`));
        }
        if (obj instanceof Date) return { _t: 'Date', _value: obj.toISOString() };
        if (obj instanceof Map) {
            return {
                _t: 'Map',
                _value: Array.from(obj.entries()).map(([key, value]) => [
                    this.serialize(key, `${path}.key`),
                    this.serialize(value, `${path}.value`)
                ])
            };
        }
        if (obj instanceof Set) {
            return {
                _t: 'Set',
                _value: Array.from(obj.values()).map((value, i) => this.serialize(value, `${path}[${i}]`))
            };
        }
        const className = obj.constructor.name;
        if (JsonHelper.typeRegistry.has(className)) {
            const hasIgnore = JsonHelper.ignoreProperties.has(className);
            const serializedObj: Record<string, any> = { _t: className };
            for (const key in obj) {
                if (obj.hasOwnProperty(key) && obj[key] != null && (!hasIgnore || !JsonHelper.isIgnoreProperty(className, key))) {
                    serializedObj[key] = this.serialize(obj[key], `${path}.${key}`);
                }
            }
            if (typeof obj.toJSON === 'function') {
                const custom = obj.toJSON();
                return { ...this.serialize(custom, `${path}.toJSON()`), _t: className };
            }
            return serializedObj;
        }
        const result: Record<string, any> = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] != null) {
                result[key] = this.serialize(obj[key], `${path}.${key}`);
            }
        }
        return result;
    }
}
