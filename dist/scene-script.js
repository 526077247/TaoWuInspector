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
    /** 查询 Cocos 类的属性类型信息 (@property 装饰器中的 type) */
    getClassPropertyTypes(className) {
        const cc = globalThis.cc;
        if (!cc || !cc.js)
            return null;
        const cls = cc.js.getClassByName(className);
        if (!cls)
            return null;
        const result = {};
        const attrs = cls.__attrs__ || {};
        const propNames = cls.__props__ || Object.keys(attrs).map(k => k.split('$_$')[0]).filter((v, i, a) => a.indexOf(v) === i);
        for (const propName of propNames) {
            // Cocos 3.8.7: 属性类型信息存储在 __attrs__[propName$_$type] 和 [propName$_$ctor]
            const typeKey = propName + '$_$type';
            const ctorKey = propName + '$_$ctor';
            const typeVal = attrs[typeKey];
            const ctorVal = attrs[ctorKey];
            // 优先用 ctor (构造函数，包含真实类名)，type 可能是通用类型名 'Object'
            const ctorInfo = ctorVal;
            const typeInfo = ctorInfo || typeVal;
            if (typeInfo) {
                let elemName = '';
                let isArray = false;
                if (Array.isArray(typeInfo)) {
                    isArray = true;
                    const elemCls = typeInfo[0];
                    elemName = (typeof elemCls === 'function') ? (elemCls.name || '') : (typeof elemCls === 'string' ? elemCls : '');
                }
                else if (typeof typeInfo === 'function') {
                    elemName = typeInfo.name || '';
                }
                else if (typeof typeInfo === 'string') {
                    elemName = typeInfo;
                }
                if (elemName) {
                    result[propName] = { isArray: isArray, elementType: elemName };
                }
            }
            else {
                // 无 type 参数的 @property: 从默认值推断类型
                const defaultKey = propName + '$_$default';
                const defaultVal = attrs[defaultKey];
                if (defaultVal !== undefined) {
                    const defaultType = typeof defaultVal;
                    if (defaultType === 'number' || defaultType === 'string' || defaultType === 'boolean') {
                        result[propName] = { isArray: false, elementType: defaultType.charAt(0).toUpperCase() + defaultType.slice(1) };
                    }
                }
            }
        }
        return result;
    },
    /**
     * 设置字典属性 (绕过 set-property 的 dump 限制)
     */
    async setDictValue(uuid, path, value) {
        const cc = globalThis.cc;
        if (!cc || !cc.director)
            return false;
        const scene = cc.director.getScene();
        if (!scene)
            return false;
        let comp = null;
        let propName = null;
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
    async triggerValueChanged(uuid, compIndex, propName) {
        const cc = globalThis.cc;
        if (!cc || !cc.director)
            return;
        const scene = cc.director.getScene();
        if (!scene)
            return;
        const node = findNodeByUuid(scene, uuid);
        if (!node)
            return;
        const comp = node.components && node.components[compIndex];
        if (comp)
            triggerCallbacks(comp, propName);
    },
    /**
     * 调用组件上的方法 (Button 装饰器)
     */
    async invokeMethod(uuid, compIndex, methodName) {
        const cc = globalThis.cc;
        if (!cc || !cc.director)
            return null;
        const scene = cc.director.getScene();
        if (!scene)
            return null;
        let comp = null;
        const node = findNodeByUuid(scene, uuid);
        if (node && node.components) {
            comp = node.components[compIndex];
        }
        if (!comp) {
            comp = findComponentByUuid(scene, uuid);
        }
        // 支持 "ClassName.staticMethod" 格式
        if (methodName.includes('.')) {
            const result = findMember(null, methodName);
            if (result !== undefined)
                return result;
        }
        if (comp && typeof comp[methodName] === 'function') {
            try {
                return await comp[methodName]();
            }
            catch (e) {
                console.error('[TaoWuInspector] invokeMethod error:', e);
            }
        }
        // 在嵌套对象中查找
        if (comp) {
            for (const key of Object.keys(comp)) {
                if (key.startsWith('_'))
                    continue;
                const nested = comp[key];
                if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
                    if (typeof nested[methodName] === 'function') {
                        try {
                            return await nested[methodName]();
                        }
                        catch (e) { /* ignore */ }
                    }
                }
                if (Array.isArray(nested)) {
                    for (const item of nested) {
                        if (item && typeof item === 'object' && typeof item[methodName] === 'function') {
                            try {
                                return await item[methodName]();
                            }
                            catch (e) { /* ignore */ }
                        }
                    }
                }
            }
        }
        return null;
    },
    /**
     * 解析 ValueDropdown 的 memberName (方法名或字段名)
     * 返回可选值数组
     */
    async resolveValueDropdown(uuid, compIndex, memberName) {
        const cc = globalThis.cc;
        if (!cc || !cc.director)
            return null;
        const scene = cc.director.getScene();
        if (!scene)
            return null;
        let comp = null;
        const node = findNodeByUuid(scene, uuid);
        if (node && node.components) {
            comp = node.components[compIndex];
        }
        if (!comp) {
            comp = findComponentByUuid(scene, uuid);
        }
        if (!comp)
            return null;
        // 1. 优先在组件实例上查找
        const found = findMember(comp, memberName);
        if (found !== undefined)
            return found;
        // 2. 在组件的所有嵌套属性中查找 (嵌套 class)
        for (const key of Object.keys(comp)) {
            if (key.startsWith('_'))
                continue;
            const nested = comp[key];
            if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
                const nestedFound = findMember(nested, memberName);
                if (nestedFound !== undefined)
                    return nestedFound;
                // 再深一层
                for (const k2 of Object.keys(nested)) {
                    if (k2.startsWith('_'))
                        continue;
                    const nested2 = nested[k2];
                    if (nested2 && typeof nested2 === 'object' && !Array.isArray(nested2)) {
                        const found2 = findMember(nested2, memberName);
                        if (found2 !== undefined)
                            return found2;
                    }
                }
            }
            // 数组中的嵌套对象
            if (Array.isArray(nested)) {
                for (const item of nested) {
                    if (item && typeof item === 'object') {
                        const arrFound = findMember(item, memberName);
                        if (arrFound !== undefined)
                            return arrFound;
                    }
                }
            }
        }
        return null;
    },
    /**
     * 通过类名解析 ValueDropdown 的 memberName (用于 JsonAsset，无组件实例)
     * 创建临时类实例调用方法
     */
    async resolveValueDropdownByClassName(className, memberName) {
        const cc = globalThis.cc;
        if (!cc || !cc.js)
            return null;
        // 支持 "ClassName.staticMethod" 格式
        if (memberName.includes('.')) {
            return findMember(null, memberName);
        }
        const cls = cc.js.getClassByName(className);
        if (!cls)
            return null;
        // 尝试静态方法
        if (typeof cls[memberName] === 'function') {
            try {
                return cls[memberName]();
            }
            catch (e) { /* ignore */ }
        }
        // 尝试静态字段
        if (cls[memberName] !== undefined && Array.isArray(cls[memberName])) {
            return cls[memberName];
        }
        // 创建临时实例调用方法
        try {
            const instance = new cls();
            if (instance && typeof instance[memberName] === 'function') {
                return instance[memberName]();
            }
            if (instance && instance[memberName] !== undefined && Array.isArray(instance[memberName])) {
                return instance[memberName];
            }
        }
        catch (e) { /* ignore */ }
        return null;
    },
    /**
     * 通过类名创建临时实例调用方法 (用于 JsonAsset 的 Button)
     * 把 JSON 数据拷贝到实例，调用方法后同步回 JSON
     */
    async invokeMethodByClassName(className, methodName, jsonData) {
        const cc = globalThis.cc;
        if (!cc || !cc.js || !className)
            return null;
        const cls = cc.js.getClassByName(className);
        if (!cls)
            return null;
        try {
            const instance = new cls();
            jsonToInstance(instance, jsonData, cc);
            if (typeof instance[methodName] === 'function') {
                instance[methodName]();
            }
            const result = instanceToJson(instance, jsonData, cc);
            return result;
        }
        catch (e) {
            console.error('[TaoWuInspector] invokeMethodByClassName error:', e);
            return null;
        }
    },
    /**
     * 通过类名触发回调 (用于 JsonAsset 的 OnValueChanged / OnCollectionChanged)
     */
    async triggerValueChangedByClassName(className, methodName, jsonData) {
        const cc = globalThis.cc;
        if (!cc || !cc.js || !className)
            return null;
        const cls = cc.js.getClassByName(className);
        if (!cls)
            return null;
        try {
            const instance = new cls();
            jsonToInstance(instance, jsonData, cc);
            if (typeof instance[methodName] === 'function') {
                instance[methodName]();
            }
            const result = instanceToJson(instance, jsonData, cc);
            return result;
        }
        catch (e) {
            return null;
        }
    }
};
/** 在对象上查找成员 (方法或字段)，返回结果或 undefined
 *  支持 "ClassName.staticMethodName" 格式直接索引类的静态方法/字段
 */
function findMember(obj, memberName) {
    // 支持 "ClassName.staticMethod" 格式 — 不需要 obj
    if (memberName.includes('.')) {
        const parts = memberName.split('.');
        const className = parts[0];
        const member = parts.slice(1).join('.');
        const cc = globalThis.cc;
        if (cc && cc.js) {
            const cls = cc.js.getClassByName(className);
            if (cls) {
                if (typeof cls[member] === 'function') {
                    try {
                        return cls[member]();
                    }
                    catch (e) { /* ignore */ }
                }
                if (cls[member] !== undefined && Array.isArray(cls[member])) {
                    return cls[member];
                }
            }
        }
        return undefined;
    }
    if (!obj || typeof obj !== 'object')
        return undefined;
    // 实例方法
    if (typeof obj[memberName] === 'function') {
        try {
            return obj[memberName]();
        }
        catch (e) { /* ignore */ }
    }
    // 实例字段
    if (obj[memberName] !== undefined && Array.isArray(obj[memberName])) {
        return obj[memberName];
    }
    // 静态字段
    const ctor = obj.constructor;
    if (ctor && ctor[memberName] !== undefined && Array.isArray(ctor[memberName])) {
        return ctor[memberName];
    }
    return undefined;
}
function triggerCallbacks(comp, propName) {
    const registry = globalThis.__TAOWU_REGISTRY__;
    if (!registry)
        return;
    const className = comp.constructor ? comp.constructor.name : '';
    const meta = registry.getMetadata(className);
    if (!meta || !meta[propName])
        return;
    const propMeta = meta[propName];
    if (propMeta.onValueChanged && typeof comp[propMeta.onValueChanged] === 'function') {
        try {
            comp[propMeta.onValueChanged]();
        }
        catch (e) {
            console.error('[TaoWuInspector] onValueChanged error:', e);
        }
    }
    if (propMeta.onCollectionChanged && typeof comp[propMeta.onCollectionChanged] === 'function') {
        try {
            comp[propMeta.onCollectionChanged]();
        }
        catch (e) {
            console.error('[TaoWuInspector] onCollectionChanged error:', e);
        }
    }
}
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
/** 递归把 JSON 数据拷贝到类实例 (含嵌套 _t 对象) */
function jsonToInstance(instance, json, cc) {
    if (!instance || !json || typeof json !== 'object')
        return;
    for (const key of Object.keys(json)) {
        if (key === '_t')
            continue;
        const val = json[key];
        if (val && typeof val === 'object' && !Array.isArray(val) && val._t) {
            // 嵌套 CCClass 对象
            const subCls = cc.js.getClassByName(val._t);
            if (subCls) {
                const subInstance = new subCls();
                jsonToInstance(subInstance, val, cc);
                instance[key] = subInstance;
            }
            else {
                instance[key] = val;
            }
        }
        else if (Array.isArray(val)) {
            // 数组: 深拷贝元素，嵌套 _t 对象创建实例
            instance[key] = val.map((item) => {
                if (item && typeof item === 'object' && item._t) {
                    const itemCls = cc.js.getClassByName(item._t);
                    if (itemCls) {
                        const itemInstance = new itemCls();
                        jsonToInstance(itemInstance, item, cc);
                        return itemInstance;
                    }
                }
                return item;
            });
        }
        else {
            instance[key] = val;
        }
    }
}
/** 递归把类实例属性同步回 JSON 对象 (跳过函数和内部字段，保留 _t) */
function instanceToJson(instance, json, cc) {
    if (!instance || !json || typeof json !== 'object')
        return json;
    for (const key of Object.keys(json)) {
        if (key === '_t')
            continue;
        const instVal = instance[key];
        if (typeof instVal === 'function')
            continue;
        if (instVal === undefined)
            continue;
        if (instVal && typeof instVal === 'object' && !Array.isArray(instVal)) {
            // 嵌套对象: 保留 _t，同步属性
            const subJson = json[key] || {};
            if (subJson._t) {
                for (const subKey of Object.keys(subJson)) {
                    if (subKey === '_t')
                        continue;
                    if (typeof instVal[subKey] !== 'function' && instVal[subKey] !== undefined) {
                        subJson[subKey] = instVal[subKey];
                    }
                }
                json[key] = subJson;
            }
            else {
                // 不是 CCClass 嵌套对象，直接拷贝
                json[key] = JSON.parse(JSON.stringify(instVal));
            }
        }
        else if (Array.isArray(instVal)) {
            // 数组: 同步元素，保留 _t
            json[key] = instVal.map((item, idx) => {
                if (item && typeof item === 'object' && json[key] && json[key][idx] && json[key][idx]._t) {
                    const itemJson = json[key][idx];
                    for (const itemKey of Object.keys(itemJson)) {
                        if (itemKey === '_t')
                            continue;
                        if (typeof item[itemKey] !== 'function' && item[itemKey] !== undefined) {
                            itemJson[itemKey] = item[itemKey];
                        }
                    }
                    return itemJson;
                }
                return item;
            });
        }
        else {
            // 基本类型
            json[key] = instVal;
        }
    }
    return json;
}
