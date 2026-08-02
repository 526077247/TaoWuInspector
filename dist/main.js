"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
const example_importer_1 = require("./example-importer");
const fs = __importStar(require("fs"));
exports.methods = {
    /**
     * 查询组件的 TaoWu 元数据
     * 由 Inspector 渲染器调用，转发到场景脚本
     */
    async queryTaoWuMetadata(componentType) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'getMetadata',
                args: [componentType]
            });
            return result;
        }
        catch (e) {
            console.warn('[TaoWuInspector] 查询元数据失败:', e);
            return null;
        }
    },
    /**
     * 查询 Cocos 类的属性类型信息
     */
    async queryClassPropertyTypes(className) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'getClassPropertyTypes',
                args: [className]
            });
            return result;
        }
        catch (e) {
            return null;
        }
    },
    /**
     * 导入 Runtime 脚本到 assets/TaoWuInspector/Runtime
     */
    async installRuntime() {
        await example_importer_1.ExampleImporter.installRuntime();
    },
    /**
     * 导入示例场景和脚本到 assets/TaoWuInspector/Example
     */
    async importExample() {
        await example_importer_1.ExampleImporter.importExample();
    },
    /**
     * 解析 ValueDropdown memberName (方法名/字段名)
     */
    async resolveValueDropdown(uuid, compIndex, memberName) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'resolveValueDropdown',
                args: [uuid, compIndex, memberName]
            });
            return result;
        }
        catch (e) {
            console.warn('[TaoWuInspector] resolveValueDropdown 失败:', e);
            return null;
        }
    },
    /**
     * 通过类名解析 ValueDropdown (用于 JsonAsset，无组件实例)
     */
    async resolveValueDropdownByClassName(className, memberName) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'resolveValueDropdownByClassName',
                args: [className, memberName]
            });
            return result;
        }
        catch (e) {
            return null;
        }
    },
    /**
     * 通过类名调用方法 (用于 JsonAsset 的 Button)
     */
    async invokeMethodByClassName(className, methodName, jsonData) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'invokeMethodByClassName',
                args: [className, methodName, jsonData]
            });
            return result;
        }
        catch (e) {
            console.warn('[TaoWuInspector] invokeMethodByClassName 失败:', e);
            return null;
        }
    },
    /**
     * 通过类名触发回调 (用于 JsonAsset 的 OnValueChanged/OnCollectionChanged)
     */
    async triggerValueChangedByClassName(className, methodName, jsonData) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'triggerValueChangedByClassName',
                args: [className, methodName, jsonData]
            });
            return result;
        }
        catch (e) {
            return null;
        }
    },
    /**
     * 读取文件内容 (用于 JsonAsset Inspector)
     */
    async readAssetFile(uuid) {
        try {
            const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
            if (!info || !info.file)
                return null;
            return fs.readFileSync(info.file, { encoding: 'utf-8' });
        }
        catch (e) {
            console.warn('[TaoWuInspector] readAssetFile 失败:', e);
            return null;
        }
    }
};
function load() {
    console.log('[TaoWuInspector] 扩展已加载');
}
function unload() {
    console.log('[TaoWuInspector] 扩展已卸载');
}
