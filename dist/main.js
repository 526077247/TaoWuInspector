"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
const example_importer_1 = require("./example-importer");
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
    }
};
function load() {
    console.log('[TaoWuInspector] 扩展已加载');
}
function unload() {
    console.log('[TaoWuInspector] 扩展已卸载');
}
