/**
 * 场景脚本 — 在场景进程中运行，可访问游戏脚本的全局变量
 * 通过 globalThis.__TAOWU_REGISTRY__ 读取 TaoWu 装饰器注册的元数据
 */

interface ITaoWuRegistry {
    getMetadata(className: string): any;
    hasMetadata(className: string): boolean;
}

export const methods = {
    /**
     * 获取指定组件类的 TaoWu 元数据
     * @param componentType 组件类名 (ccclass 注册名)
     * @returns 元数据对象或 null
     */
    getMetadata(componentType: string): any {
        const registry: ITaoWuRegistry | undefined = (globalThis as any).__TAOWU_REGISTRY__;
        if (!registry) {
            return null;
        }
        // 先直接按类名查
        let meta = registry.getMetadata(componentType);
        if (meta) return meta;

        // 兼容: 通过 cc.js 查找类，取实际类名再查
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

    /**
     * 检查组件是否有 TaoWu 元数据
     */
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
    }
};
