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
        if (!registry) { return null; }
        let meta = registry.getMetadata(componentType);
        if (meta) return meta;
        const cc = globalThis.cc;
        if (cc && cc.js) {
            const cls = cc.js.getClassByName(componentType);
            if (cls) {
                meta = registry.getMetadata(cls.name);
                if (meta) return meta;
            }
        }
        return null;
    },
    hasMetadata(componentType) {
        const registry = globalThis.__TAOWU_REGISTRY__;
        if (!registry) return false;
        if (registry.hasMetadata(componentType)) return true;
        const cc = globalThis.cc;
        if (cc && cc.js) {
            const cls = cc.js.getClassByName(componentType);
            if (cls && registry.hasMetadata(cls.name)) return true;
        }
        return false;
    },
    async setDictValue(uuid, path, value) {
        const cc = globalThis.cc;
        if (!cc || !cc.director) return false;
        const scene = cc.director.getScene();
        if (!scene) return false;
        const node = findNodeByUuid(scene, uuid);
        let comp = null;
        let propName = null;
        const match = path.match(/__comps__\.(\d+)\.(.+)/);
        if (match) {
            const compIndex = parseInt(match[1]);
            propName = match[2];
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
                setNestedProperty(comp, propName, value);
            }
        }
        if (comp && propName) {
            triggerCallbacks(comp, propName);
            return true;
        }
        return false;
    },
    async triggerValueChanged(uuid, compIndex, propName) {
        const cc = globalThis.cc;
        if (!cc || !cc.director) return;
        const scene = cc.director.getScene();
        if (!scene) return;
        const node = findNodeByUuid(scene, uuid);
        if (!node) return;
        const comp = node.components && node.components[compIndex];
        if (comp) triggerCallbacks(comp, propName);
    }
};
function triggerCallbacks(comp, propName) {
    const registry = globalThis.__TAOWU_REGISTRY__;
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
