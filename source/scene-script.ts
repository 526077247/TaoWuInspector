/**
 * 场景脚本 — 在场景进程中运行，可访问游戏脚本的全局变量
 * 通过 globalThis.__TAOWU_REGISTRY__ 读取 TaoWu 装饰器注册的元数据
 */

interface ITaoWuRegistry {
    getMetadata(className: string): any;
    hasMetadata(className: string): boolean;
}

export const methods = {
    getMetadata(componentType: string): any {
        const registry: ITaoWuRegistry | undefined = (globalThis as any).__TAOWU_REGISTRY__;
        if (!registry) {
            return null;
        }
        let meta = registry.getMetadata(componentType);
        if (meta) return meta;

        const cc = (globalThis as any).cc;
        if (cc && cc.js) {
            const cls = cc.js.getClassByName(componentType);
            if (cls) {
                const actualName = cls.name;
                meta = registry.getMetadata(actualName);
                if (meta) return meta;
            }
        }
        return null;
    },

    hasMetadata(componentType: string): boolean {
        const registry: ITaoWuRegistry | undefined = (globalThis as any).__TAOWU_REGISTRY__;
        if (!registry) return false;
        if (registry.hasMetadata(componentType)) return true;
        const cc = (globalThis as any).cc;
        if (cc && cc.js) {
            const cls = cc.js.getClassByName(componentType);
            if (cls && registry.hasMetadata(cls.name)) return true;
        }
        return false;
    },

    /**
     * 设置字典属性 (绕过 set-property 的 dump 限制)
     */
    async setDictValue(uuid: string, path: string, value: any): Promise<boolean> {
        const cc = (globalThis as any).cc;
        if (!cc || !cc.director) return false;
        const scene = cc.director.getScene();
        if (!scene) return false;
        let comp: any = null;
        let propName: string | null = null;
        const match = path.match(/__comps__\.(\d+)\.(.+)/);
        if (match) {
            const compIndex = parseInt(match[1]);
            propName = match[2];
            const node = findNodeByUuid(scene, uuid);
            if (node) {
                const comps = node.components;
                if (comps && comps[compIndex]) {
                    comp = comps[compIndex];
                    setNestedProperty(comp, propName, value);
                }
            }
        }
        if (!comp) {
            comp = findComponentByUuid(scene, uuid);
            if (comp && match) {
                setNestedProperty(comp, match[2], value);
            }
        }
        if (comp && propName) {
            triggerCallbacks(comp, propName);
            return true;
        }
        return false;
    },

    /**
     * 触发属性值变化回调
     */
    async triggerValueChanged(uuid: string, compIndex: number, propName: string): Promise<void> {
        const cc = (globalThis as any).cc;
        if (!cc || !cc.director) return;
        const scene = cc.director.getScene();
        if (!scene) return;
        const node = findNodeByUuid(scene, uuid);
        if (!node) return;
        const comp = node.components && node.components[compIndex];
        if (comp) triggerCallbacks(comp, propName);
    },

    /**
     * 调用组件上的方法 (Button 装饰器)
     */
    async invokeMethod(uuid: string, compIndex: number, methodName: string): Promise<any> {
        const cc = (globalThis as any).cc;
        if (!cc || !cc.director) return null;
        const scene = cc.director.getScene();
        if (!scene) return null;
        let comp: any = null;
        const node = findNodeByUuid(scene, uuid);
        if (node && node.components) {
            comp = node.components[compIndex];
        }
        if (!comp) {
            comp = findComponentByUuid(scene, uuid);
        }
        if (comp && typeof comp[methodName] === 'function') {
            try { return await comp[methodName](); }
            catch (e) { console.error('[TaoWuInspector] invokeMethod error:', e); }
        }
        return null;
    },

    /**
     * 获取组件当前属性值 (用于 Button 执行后刷新面板)
     * propKeys: 需要查询的属性名列表 (来自 Inspector dump)
     */
    async getComponentDump(uuid: string, compIndex: number, propKeys: string[]): Promise<Record<string, any> | null> {
        const cc = (globalThis as any).cc;
        if (!cc || !cc.director) return null;
        const scene = cc.director.getScene();
        if (!scene) return null;
        let comp: any = null;
        const node = findNodeByUuid(scene, uuid);
        if (node && node.components) {
            comp = node.components[compIndex];
        }
        if (!comp) {
            comp = findComponentByUuid(scene, uuid);
        }
        if (!comp) return null;
        const result: Record<string, any> = {};
        for (const key of propKeys) {
            try {
                const val = comp[key];
                if (val !== undefined) {
                    result[key] = val;
                }
            } catch (e) {}
        }
        return result;
    }
};

function triggerCallbacks(comp: any, propName: string): void {
    const registry: ITaoWuRegistry | undefined = (globalThis as any).__TAOWU_REGISTRY__;
    if (!registry) return;
    const className = comp.constructor ? comp.constructor.name : '';
    const meta = registry.getMetadata(className);
    if (!meta || !meta[propName]) return;
    const propMeta = meta[propName];
    if (propMeta.onValueChanged && typeof comp[propMeta.onValueChanged] === 'function') {
        try { comp[propMeta.onValueChanged](); } catch (e) { console.error('[TaoWuInspector] onValueChanged error:', e); }
    }
    if (propMeta.onCollectionChanged && typeof comp[propMeta.onCollectionChanged] === 'function') {
        try { comp[propMeta.onCollectionChanged](); } catch (e) { console.error('[TaoWuInspector] onCollectionChanged error:', e); }
    }
}

function findNodeByUuid(root: any, uuid: string): any {
    if (root.uuid === uuid) return root;
    for (const child of root.children) {
        const found = findNodeByUuid(child, uuid);
        if (found) return found;
    }
    return null;
}

function findComponentByUuid(root: any, uuid: string): any {
    for (const child of root.children) {
        for (const comp of child.components) {
            if (comp.uuid === uuid || comp.__id__ === uuid) return comp;
        }
        const found = findComponentByUuid(child, uuid);
        if (found) return found;
    }
    return null;
}

function setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
        if (!current) return;
    }
    current[parts[parts.length - 1]] = value;
}
