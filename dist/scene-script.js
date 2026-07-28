"use strict";
/**
 * 场景脚本 — 在场景进程中运行，可访问游戏脚本的全局变量
 * 通过 globalThis.__TAOWU_REGISTRY__ 读取 TaoWu 装饰器注册的元数据
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.methods = {
    getMetadata(componentType) {
        const registry = globalThis.__TAOWU_REGISTRY__;
        if (!registry) {
            return null;
        }
        let meta = registry.getMetadata(componentType);
        if (meta)
            return meta;
        const cc = globalThis.cc;
        if (cc && cc.js) {
            const cls = cc.js.getClassByName(componentType);
            if (cls) {
                const actualName = cls.name;
                meta = registry.getMetadata(actualName);
                if (meta)
                    return meta;
            }
        }
        return null;
    },
    hasMetadata(componentType) {
        const registry = globalThis.__TAOWU_REGISTRY__;
        if (!registry)
            return false;
        if (registry.hasMetadata(componentType))
            return true;
        const cc = globalThis.cc;
        if (cc && cc.js) {
            const cls = cc.js.getClassByName(componentType);
            if (cls && registry.hasMetadata(cls.name))
                return true;
        }
        return false;
    },
    /**
     * 设置字典属性 (绕过 set-property 的 dump 限制)
     * @param uuid 组件 UUID
     * @param path 属性路径 (如 __comps__.0.resistanceMap)
     * @param value 完整的字典值对象
     */
    async setDictValue(uuid, path, value) {
        const cc = globalThis.cc;
        if (!cc || !cc.director)
            return false;
        const scene = cc.director.getScene();
        if (!scene)
            return false;
        // 通过 uuid 查找节点
        const node = cc.director.getScene().getChildByName(uuid) || findNodeByUuid(scene, uuid);
        if (!node) {
            // uuid 可能是组件 uuid, 尝试遍历
            const comp = findComponentByUuid(scene, uuid);
            if (comp) {
                setPropertyByPath(comp, path, value);
                return true;
            }
            return false;
        }
        // 从 path 解析组件索引和属性名
        const match = path.match(/__comps__\.(\d+)\.(.+)/);
        if (match) {
            const compIndex = parseInt(match[1]);
            const propName = match[2];
            const comps = node.components;
            if (comps && comps[compIndex]) {
                const comp = comps[compIndex];
                setNestedProperty(comp, propName, value);
                return true;
            }
        }
        return false;
    }
};
/** 通过 UUID 递归查找节点 */
function findNodeByUuid(root, uuid) {
    if (root.uuid === uuid)
        return root;
    for (const child of root.children) {
        const found = findNodeByUuid(child, uuid);
        if (found)
            return found;
    }
    return null;
}
/** 通过 UUID 查找组件 */
function findComponentByUuid(root, uuid) {
    for (const child of root.children) {
        for (const comp of child.components) {
            if (comp.uuid === uuid || comp.__id__ === uuid)
                return comp;
        }
        const found = findComponentByUuid(child, uuid);
        if (found)
            return found;
    }
    return null;
}
/** 按路径设置嵌套属性 */
function setNestedProperty(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
        if (!current)
            return;
    }
    current[parts[parts.length - 1]] = value;
}
