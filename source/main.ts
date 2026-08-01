import { ExampleImporter } from "./example-importer";
import * as fs from "fs";
import * as path from "path";

export const methods: { [key: string]: (...any: any) => any } = {
    /**
     * 查询组件的 TaoWu 元数据
     * 由 Inspector 渲染器调用，转发到场景脚本
     */
    async queryTaoWuMetadata(componentType: string): Promise<any> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'getMetadata',
                args: [componentType]
            });
            return result;
        } catch (e) {
            console.warn('[TaoWuInspector] 查询元数据失败:', e);
            return null;
        }
    },

    /**
     * 查询 Cocos 类的属性类型信息
     */
    async queryClassPropertyTypes(className: string): Promise<any> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'getClassPropertyTypes',
                args: [className]
            });
            return result;
        } catch (e) {
            return null;
        }
    },

    /**
     * 导入 Runtime 脚本到 assets/TaoWuInspector/Runtime
     */
    async installRuntime(): Promise<void> {
        await ExampleImporter.installRuntime();
    },

    /**
     * 导入示例场景和脚本到 assets/TaoWuInspector/Example
     */
    async importExample(): Promise<void> {
        await ExampleImporter.importExample();
    },

    /**
     * 解析 ValueDropdown memberName (方法名/字段名)
     */
    async resolveValueDropdown(uuid: string, compIndex: number, memberName: string): Promise<any> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'resolveValueDropdown',
                args: [uuid, compIndex, memberName]
            });
            return result;
        } catch (e) {
            console.warn('[TaoWuInspector] resolveValueDropdown 失败:', e);
            return null;
        }
    },

    /**
     * 通过类名解析 ValueDropdown (用于 JsonAsset，无组件实例)
     */
    async resolveValueDropdownByClassName(className: string, memberName: string): Promise<any> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'resolveValueDropdownByClassName',
                args: [className, memberName]
            });
            return result;
        } catch (e) {
            return null;
        }
    },

    /**
     * 读取文件内容 (用于 JsonAsset Inspector)
     */
    async readAssetFile(uuid: string): Promise<string | null> {
        try {
            const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
            if (!info || !info.file) return null;
            return fs.readFileSync(info.file, { encoding: 'utf-8' });
        } catch (e) {
            console.warn('[TaoWuInspector] readAssetFile 失败:', e);
            return null;
        }
    }
};

export function load() {
    console.log('[TaoWuInspector] 扩展已加载');
}

export function unload() {
    console.log('[TaoWuInspector] 扩展已卸载');
}
