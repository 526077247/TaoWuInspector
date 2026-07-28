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
        // 通过 uuid 查找节点
        const node = findNodeByUuid(scene, uuid);
        if (node) {
            const match = path.match(/__comps__\.(\d+)\.(.+)/);
            if (match) {
                const compIndex = parseInt(match[1]);
                const propName = match[2];
                const comps = node.components;
                if (comps && comps[compIndex]) {
                    setNestedProperty(comps[compIndex], propName, value);
                    return true;
                }
            }
        }
        // uuid 可能是组件 uuid
        const comp = findComponentByUuid(scene, uuid);
        if (comp) {
            const match = path.match(/__comps__\.(\d+)\.(.+)/);
            if (match) {
                setNestedProperty(comp, match[2], value);
                return true;
            }
        }
        return false;
    }
};

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
