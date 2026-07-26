import { ExampleImporter } from "./example-importer";

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
    }
};

export function load() {
    console.log('[TaoWuInspector] 扩展已加载');
}

export function unload() {
    console.log('[TaoWuInspector] 扩展已卸载');
}
