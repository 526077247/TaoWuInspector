"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleImporter = void 0;
/** Runtime 脚本模板 */
const RUNTIME_TEMPLATES = [
    {
        fileName: "TaoWuTypes.ts",
        content: `/** TaoWu Inspector 属性元数据 */
export interface ITaoWuPropertyMeta {
    foldoutGroup?: string;
    tabGroup?: string;
    tabName?: string;
    boxGroup?: string;
    horizontalGroup?: string;
    showIf?: string;
    hideIf?: string;
    enableIf?: string;
    disableIf?: string;
    labelText?: string;
    readOnly?: boolean;
    title?: string;
    titleHorizontalLine?: boolean;
    infoBox?: { message: string; type: 'info' | 'warning' | 'error' };
    propertyOrder?: number;
    onValueChanged?: string;
    onCollectionChanged?: string;
    button?: { name?: string };
    range?: { min: number; max: number };
    textarea?: boolean;
    color?: boolean;
    tableList?: boolean;
}

export interface ITaoWuClassMeta {
    [propertyKey: string]: ITaoWuPropertyMeta;
}
`
    },
    {
        fileName: "TaoWuRegistry.ts",
        content: `import { ITaoWuClassMeta, ITaoWuPropertyMeta } from "./TaoWuTypes";

/**
 * TaoWu Inspector 元数据注册中心
 * 装饰器在类定义时调用 register 写入元数据
 * 场景脚本通过 globalThis.__TAOWU_REGISTRY__ 读取
 */
export class TaoWuRegistry {
    private static metadata: Map<string, ITaoWuClassMeta> = new Map();

    static register(className: string, propertyKey: string, meta: Partial<ITaoWuPropertyMeta>): void {
        if (!this.metadata.has(className)) {
            this.metadata.set(className, {});
        }
        const classMeta = this.metadata.get(className)!;
        if (!classMeta[propertyKey]) {
            classMeta[propertyKey] = {};
        }
        Object.assign(classMeta[propertyKey], meta);
    }

    static getMetadata(className: string): ITaoWuClassMeta | null {
        return this.metadata.get(className) || null;
    }

    static hasMetadata(className: string): boolean {
        return this.metadata.has(className);
    }

    static clear(): void {
        this.metadata.clear();
    }
}

declare global {
    // eslint-disable-next-line no-var
    var __TAOWU_REGISTRY__: typeof TaoWuRegistry;
}
globalThis.__TAOWU_REGISTRY__ = TaoWuRegistry;
`
    },
    {
        fileName: "TaoWuDecorators.ts",
        content: `import { TaoWuRegistry } from "./TaoWuRegistry";

function getClassName(target: any): string {
    const ctor = target.constructor;
    return ctor.name || ctor.toString().match(/class\\s+(\\w+)/)?.[1] || '';
}

/** 折叠分组 */
export function FoldoutGroup(groupPath: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { foldoutGroup: groupPath });
    };
}

/** Tab 标签页分组 */
export function TabGroup(groupName: string, tabName: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { tabGroup: groupName, tabName });
    };
}

/** 盒子分组 */
export function BoxGroup(groupName: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { boxGroup: groupName });
    };
}

/** 水平分组 */
export function HorizontalGroup(groupName: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { horizontalGroup: groupName });
    };
}

/** 当指定属性值为 true 时显示 */
export function ShowIf(conditionProperty: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { showIf: conditionProperty });
    };
}

/** 当指定属性值为 true 时隐藏 */
export function HideIf(conditionProperty: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { hideIf: conditionProperty });
    };
}

/** 当指定属性值为 true 时启用编辑，为 false 时禁用 (属性仍可见但不可编辑) */
export function EnableIf(conditionProperty: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { enableIf: conditionProperty });
    };
}

/** 当指定属性值为 true 时禁用编辑，为 false 时启用 (属性仍可见但不可编辑) */
export function DisableIf(conditionProperty: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { disableIf: conditionProperty });
    };
}

/** 自定义标签文本 */
export function LabelText(text: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { labelText: text });
    };
}

/** 只读 */
export function ReadOnly() {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { readOnly: true });
    };
}

/** 属性排序 */
export function PropertyOrder(order: number) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { propertyOrder: order });
    };
}

/** 数值范围滑块 */
export function PropertyRange(min: number, max: number) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { range: { min, max } });
    };
}

/** 标题 */
export function Title(title: string, horizontalLine: boolean = true) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, {
            title, titleHorizontalLine: horizontalLine
        });
    };
}

/** 信息提示框 */
export function InfoBox(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { infoBox: { message, type } });
    };
}

/** 多行文本 */
export function TextArea() {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { textarea: true });
    };
}

/** 表格列表 */
export function TableList() {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { tableList: true });
    };
}

/** 属性值变化时回调 (类似 Odin OnValueChanged) */
export function OnValueChanged(methodName: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { onValueChanged: methodName });
    };
}

/** 集合变更时回调 (类似 Odin OnCollectionChanged，数组增删时触发) */
export function OnCollectionChanged(methodName: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { onCollectionChanged: methodName });
    };
}

/** 在 Inspector 中生成按钮，点击时调用该方法 (类似 Odin Button) */
export function Button(name?: string) {
    return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { button: { name } });
    };
}
`
    }
];
/** Example 脚本和场景模板 */
const EXAMPLE_TEMPLATES = [
    {
        fileName: "TaoWuDemoComponent.ts",
        content: `import { _decorator, Component, Color, Vec3, CCInteger, CCString } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MapEntry')
class MapEntry {
    @property
    @LabelText("测试Key")
    key: string = '';
    @property
    value: number = 0;
}

@ccclass('WeaponConfig')
class WeaponConfig {
    @property
    @LabelText("武器名称")
    weaponName: string = '';
    @property
    @LabelText("伤害")
    damage: number = 0;
    @property
    @LabelText("暴击率")
    critRate: number = 0;
    @property
    @LabelText("元素类型")
    elementType: string = 'none';
    @property
    @LabelText("耐久度")
    durability: number = 100;
    // 嵌套 class
    @property({ type: MapEntry })
    @LabelText("附魔属性")
    enchant: MapEntry = (() => { const e = new MapEntry(); e.key = 'fire'; e.value = 5; return e; })();
}

@ccclass('SkillConfig')
class SkillConfig {
    @property
    @LabelText("技能名称")
    skillName: string = '';
    @property
    @LabelText("冷却时间")
    cooldown: number = 0;
    @property
    @LabelText("法力消耗")
    manaCost: number = 0;
    @property
    @LabelText("技能等级")
    level: number = 1;
    @property
    @LabelText("是否可用")
    enabled: boolean = true;
    // 嵌套 class
    @property({ type: WeaponConfig })
    @LabelText("所需武器")
    requiredWeapon: WeaponConfig = (() => { const w = new WeaponConfig(); w.weaponName = '无'; w.damage = 0; w.critRate = 0; w.elementType = 'none'; w.durability = 0; return w; })();
}

import {
    FoldoutGroup,
    TabGroup,
    BoxGroup,
    ShowIf,
    HideIf,
    EnableIf,
    DisableIf,
    LabelText,
    ReadOnly,
    PropertyRange,
    Title,
    InfoBox,
    PropertyOrder,
    TextArea,
    TableList,
    OnValueChanged,
    OnCollectionChanged,
    Button
} from '../Runtime/TaoWuDecorators';

@ccclass('TaoWuDemoComponent')
export class TaoWuDemoComponent extends Component {

    // ─── 基础属性 (无分组) ───
    @property
    componentName: string = 'Demo';

    @property
    @PropertyRange(0, 100)
    @OnValueChanged('onHealthChanged')
    health: number = 100;

    @property
    @FoldoutGroup('回调测试')
    @OnValueChanged('onMoveSpeedChanged')
    testSpeed: number = 10;

    @property([CCInteger])
    @FoldoutGroup('回调测试')
    @OnCollectionChanged('onListChanged')
    testList: number[] = [1, 2, 3];

    // ─── 回调方法 ───
    onHealthChanged(): void {
        console.log('[TaoWuDemo] health changed to:', this.health);
    }
    onMoveSpeedChanged(): void {
        console.log('[TaoWuDemo] testSpeed changed to:', this.testSpeed);
    }
    onListChanged(): void {
        console.log('[TaoWuDemo] testList changed:', this.testList);
    }

    // ─── Button 按钮 (类似 Odin Button) ───
    @Button('重置生命值')
    resetHealth(): void {
        this.health = 100;
        console.log('[TaoWuDemo] health reset to:', this.health);
    }

    @Button()
    randomizeHealth(): void {
        this.health = Math.floor(Math.random() * 100);
        console.log('[TaoWuDemo] health randomized to:', this.health);
    }

    @Button('打印调试信息')
    @FoldoutGroup('回调测试')
    printDebug(): void {
        console.log('[TaoWuDemo] Debug:', { health: this.health, speed: this.testSpeed, list: this.testList });
    }

    @Button('恢复满血')
    @EnableIf('canFly')
    fullHealth(): void {
        this.health = 100;
        console.log('[TaoWuDemo] full health (enabled when canFly)');
    }

    @Button('禁用示例')
    @DisableIf('canFly')
    disabledWhenFlying(): void {
        console.log('[TaoWuDemo] This button is disabled when canFly=true');
    }

    // ─── 折叠分组: 角色设置 ───
    @property
    @FoldoutGroup('角色设置')
    @LabelText("移动速度")
    moveSpeed: number = 5;

    @property
    @FoldoutGroup('角色设置')
    jumpHeight: number = 3;

    @property
    @FoldoutGroup('角色设置')
    @ShowIf('canFly')
    flySpeed: number = 10;

    @property
    @FoldoutGroup('角色设置')
    @EnableIf('canFly')
    glideSpeed: number = 5;

    @property
    @FoldoutGroup('角色设置')
    @DisableIf('canFly')
    walkSpeed: number = 3;

    @property
    @FoldoutGroup('角色设置')
    canFly: boolean = false;

    // ─── Tab 分组: 武器配置 ───
    @property
    @TabGroup('武器配置', '近战')
    meleeDamage: number = 20;

    @property
    @TabGroup('武器配置', '近战')
    meleeRange: number = 2;

    @property
    @TabGroup('武器配置', '远程')
    rangedDamage: number = 15;

    @property
    @TabGroup('武器配置', '远程')
    @PropertyRange(1, 100)
    attackRange: number = 50;

    @property
    @TabGroup('武器配置', '魔法')
    magicDamage: number = 30;

    @property
    @TabGroup('武器配置', '魔法')
    @LabelText("法力消耗")
    manaCost: number = 10;

    // ─── 盒子分组: 外观设置 ───
    @property
    @BoxGroup('外观设置')
    mainColor: Color = new Color(255, 255, 255, 255);

    @property
    @BoxGroup('外观设置')
    accentColor: Color = new Color(100, 149, 237, 255);

    @property
    @BoxGroup('外观设置')
    @HideIf('useDefaultSize')
    customSize: Vec3 = new Vec3(1, 1, 1);

    @property
    @BoxGroup('外观设置')
    @EnableIf('useDefaultSize')
    defaultScale: number = 1;

    @property
    @BoxGroup('外观设置')
    @DisableIf('useDefaultSize')
    customScale: number = 2;

    @property
    @BoxGroup('外观设置')
    useDefaultSize: boolean = true;

    // ─── 装饰性元素 ───
    @property
    @Title('高级设置', true)
    @InfoBox('以下属性影响游戏核心逻辑，请谨慎修改', 'warning')
    advancedEnabled: boolean = false;

    @property
    @ReadOnly()
    @PropertyOrder(100)
    debugId: string = 'AUTO_GENERATED';

    @property
    @TextArea()
    @FoldoutGroup('角色设置')
    description: string = '角色描述';

    // ─── List / TableList / Map ───
    @property([CCInteger])
    @FoldoutGroup('列表与字典')
    defaultList: number[] = [1, 2, 3];

    @property([CCInteger])
    @TableList()
    @FoldoutGroup('列表与字典')
    damageList: number[] = [10, 20, 30];

    @property([Vec3])
    @TableList()
    @FoldoutGroup('列表与字典')
    positionList: Vec3[] = [new Vec3(0, 0, 0), new Vec3(1, 1, 1)];

    @property({ type: [MapEntry] })
    @FoldoutGroup('列表与字典')
    configMap: MapEntry[] = [
        (() => { const e = new MapEntry(); e.key = 'attack'; e.value = 10; return e; })(),
        (() => { const e = new MapEntry(); e.key = 'defense'; e.value = 5; return e; })(),
    ];

    @property({ type: [MapEntry] })
    @TableList()
    @FoldoutGroup('列表与字典')
    configTableList: MapEntry[] = [
        (() => { const e = new MapEntry(); e.key = 'speed'; e.value = 8; return e; })(),
        (() => { const e = new MapEntry(); e.key = 'luck'; e.value = 3; return e; })(),
    ];

    // ─── 复杂嵌套 TableList ───
    @property({ type: [WeaponConfig] })
    @TableList()
    @FoldoutGroup('装备配置')
    weaponList: WeaponConfig[] = [
        (() => { const w = new WeaponConfig(); w.weaponName = '烈焰剑'; w.damage = 45; w.critRate = 0.15; w.elementType = 'fire'; w.durability = 200; return w; })(),
        (() => { const w = new WeaponConfig(); w.weaponName = '寒冰弓'; w.damage = 30; w.critRate = 0.25; w.elementType = 'ice'; w.durability = 150; return w; })(),
        (() => { const w = new WeaponConfig(); w.weaponName = '雷霆杖'; w.damage = 55; w.critRate = 0.1; w.elementType = 'thunder'; w.durability = 100; return w; })(),
    ];

    @property({ type: [SkillConfig] })
    @TableList()
    @FoldoutGroup('装备配置')
    skillList: SkillConfig[] = [
        (() => { const s = new SkillConfig(); s.skillName = '火球术'; s.cooldown = 5; s.manaCost = 20; s.level = 3; s.enabled = true; return s; })(),
        (() => { const s = new SkillConfig(); s.skillName = '治疗术'; s.cooldown = 10; s.manaCost = 30; s.level = 2; s.enabled = true; return s; })(),
        (() => { const s = new SkillConfig(); s.skillName = '隐身'; s.cooldown = 30; s.manaCost = 50; s.level = 1; s.enabled = false; return s; })(),
    ];

    @property({ type: [MapEntry] })
    @FoldoutGroup('装备配置')
    extraConfig: MapEntry[] = [
        (() => { const e = new MapEntry(); e.key = 'setBonus'; e.value = 10; return e; })(),
    ];

    // ─── 嵌套 class 属性 ───
    @property({ type: WeaponConfig })
    @FoldoutGroup('嵌套对象')
    equippedWeapon: WeaponConfig = (() => { const w = new WeaponConfig(); w.weaponName = '初始武器'; w.damage = 10; w.critRate = 0.05; w.elementType = 'physical'; w.durability = 50; return w; })();

    @property({ type: SkillConfig })
    @FoldoutGroup('嵌套对象')
    primarySkill: SkillConfig = (() => { const s = new SkillConfig(); s.skillName = '基础攻击'; s.cooldown = 1; s.manaCost = 0; s.level = 1; s.enabled = true; return s; })();

    @property({ type: MapEntry })
    @FoldoutGroup('嵌套对象')
    baseStats: MapEntry = (() => { const e = new MapEntry(); e.key = 'power'; e.value = 100; return e; })();

    // ─── Map 字典测试 ───
    @property({ type: CCInteger })
    @TableList()
    @FoldoutGroup('Map 字典')
    resistanceMap: { [key: string]: number } = { fire: 20, ice: 10, thunder: 5 };

    @property({ type: CCString })
    @TableList()
    @FoldoutGroup('Map 字典')
    dropRateMap: { [key: string]: string } = { gold: '75%', silver: '50%', bronze: '25%' };
}
`
    }
];
const ROOT_DIR = "db://assets/TaoWuInspector";
const RUNTIME_DIR = `${ROOT_DIR}/Runtime`;
const EXAMPLE_DIR = `${ROOT_DIR}/Example`;
class ExampleImporter {
    /**
     * 导入 Runtime 脚本到 assets/TaoWuInspector/Runtime
     */
    static async installRuntime() {
        console.log("[TaoWuInspector] 开始导入 Runtime 脚本...");
        await ExampleImporter.ensureDir(RUNTIME_DIR);
        for (const tpl of RUNTIME_TEMPLATES) {
            const url = `${RUNTIME_DIR}/${tpl.fileName}`;
            await ExampleImporter.createOrUpdate(url, tpl.content);
        }
        console.log("[TaoWuInspector] 等待脚本编译...");
        await ExampleImporter.waitFileReady(`${RUNTIME_DIR}/TaoWuDecorators.ts`);
        Editor.Dialog.info("Runtime 导入完成", {
            detail: "已创建 assets/TaoWuInspector/Runtime 目录，包含:\n• TaoWuTypes.ts\n• TaoWuRegistry.ts\n• TaoWuDecorators.ts",
            buttons: ["确定"],
        });
        console.log("[TaoWuInspector] Runtime 导入完成");
    }
    /**
     * 导入示例到 assets/TaoWuInspector/Example
     */
    static async importExample() {
        console.log("[TaoWuInspector] 开始导入示例...");
        // 检查 Runtime 是否已安装
        const runtimeCheck = await Editor.Message.request("asset-db", "query-asset-info", RUNTIME_DIR);
        if (!runtimeCheck) {
            Editor.Dialog.warn("请先导入 Runtime", {
                detail: "请先点击菜单 TaoWuInspector/Install 导入 Runtime 脚本，再导入示例。",
                buttons: ["确定"],
            });
            return;
        }
        await ExampleImporter.ensureDir(EXAMPLE_DIR);
        // 创建示例脚本
        for (const tpl of EXAMPLE_TEMPLATES) {
            const url = `${EXAMPLE_DIR}/${tpl.fileName}`;
            await ExampleImporter.createOrUpdate(url, tpl.content);
        }
        console.log("[TaoWuInspector] 等待脚本编译...");
        await ExampleImporter.waitFileReady(`${EXAMPLE_DIR}/TaoWuDemoComponent.ts`);
        // 创建场景
        const sceneUrl = `${EXAMPLE_DIR}/TaoWuDemo.scene`;
        const sceneContent = ExampleImporter.buildSceneJson();
        const sceneInfo = await ExampleImporter.createOrUpdate(sceneUrl, sceneContent);
        if (!sceneInfo) {
            console.error("[TaoWuInspector] 创建场景失败");
            return;
        }
        console.log("[TaoWuInspector] 场景创建成功: TaoWuDemo.scene");
        await ExampleImporter.delay(500);
        await ExampleImporter.openSceneAndAddNode(sceneInfo.uuid);
        Editor.Dialog.info("示例导入完成", {
            detail: "已创建 assets/TaoWuInspector/Example 目录，包含:\n• TaoWuDemoComponent.ts\n• TaoWuDemo.scene\n\n请选中场景中的节点查看 Inspector 效果。",
            buttons: ["确定"],
        });
        console.log("[TaoWuInspector] 示例导入完成");
    }
    /**
     * 打开场景并添加一个带 TaoWuDemoComponent 的节点
     */
    static async openSceneAndAddNode(sceneUuid) {
        try {
            await Editor.Message.request("asset-db", "open-asset", sceneUuid);
            let ready = false;
            for (let i = 0; i < 20; i++) {
                ready = await Editor.Message.request("scene", "query-is-ready");
                if (ready)
                    break;
                await ExampleImporter.delay(200);
            }
            if (!ready) {
                console.warn("[TaoWuInspector] 场景未就绪，跳过节点创建");
                return;
            }
            // 查询场景节点树获取根节点
            const tree = await Editor.Message.request("scene", "query-node-tree");
            if (!tree || !tree.uuid) {
                console.warn("[TaoWuInspector] 无法获取场景根节点");
                return;
            }
            // 在场景根节点下创建子节点
            const nodeResult = await Editor.Message.request("scene", "create-node", {
                parent: tree.uuid,
                name: "TaoWuDemoNode",
            });
            // create-node 返回格式不确定，统一提取 uuid 字符串
            let nodeUuid = null;
            if (typeof nodeResult === 'string') {
                nodeUuid = nodeResult;
            }
            else if (Array.isArray(nodeResult)) {
                const first = nodeResult[0];
                nodeUuid = typeof first === 'string' ? first : (first?.uuid || null);
            }
            else if (nodeResult && typeof nodeResult === 'object') {
                const obj = nodeResult;
                nodeUuid = obj.uuid || obj.value || null;
            }
            if (!nodeUuid) {
                console.warn("[TaoWuInspector] 创建节点失败，无返回 UUID");
                return;
            }
            // 等待节点创建完成
            await ExampleImporter.delay(300);
            // 添加 TaoWuDemoComponent 组件
            // create-component 返回值不可靠（成功也可能返回 null），只调用一次，始终保存场景
            try {
                await Editor.Message.request("scene", "create-component", {
                    uuid: nodeUuid,
                    component: "TaoWuDemoComponent",
                });
            }
            catch (e) {
                console.warn("[TaoWuInspector] 添加组件时出错:", e);
            }
            // 始终保存场景
            await Editor.Message.request("scene", "save-scene");
            console.log("[TaoWuInspector] 节点创建成功: TaoWuDemoNode");
            // 选中节点方便用户查看
            Editor.Selection.select("node", nodeUuid);
        }
        catch (e) {
            console.warn("[TaoWuInspector] 添加节点失败，场景和脚本已创建，请手动添加组件:", e);
        }
    }
    /** 确保目录存在 */
    static async ensureDir(url) {
        const existing = await Editor.Message.request("asset-db", "query-asset-info", url);
        if (existing)
            return;
        await Editor.Message.request("asset-db", "create-asset", url, null);
    }
    /** 创建或覆盖文件（已存在时原地更新，保留 .meta 和 UUID） */
    static async createOrUpdate(url, content) {
        const existing = await Editor.Message.request("asset-db", "query-asset-info", url);
        if (existing) {
            const fs = require('fs');
            const path = require('path');
            const fsPath = path.join(Editor.Project.path, url.replace('db://', ''));
            fs.writeFileSync(fsPath, content, 'utf-8');
            // 通知 asset-db 重新导入，触发脚本重编译
            await Editor.Message.request("asset-db", "refresh-asset", url);
            console.log(`[TaoWuInspector] 更新文件: ${url}`);
            return existing;
        }
        const info = await Editor.Message.request("asset-db", "create-asset", url, content);
        if (info) {
            console.log(`[TaoWuInspector] 创建文件: ${url}`);
        }
        else {
            console.error(`[TaoWuInspector] 创建文件失败: ${url}`);
        }
        return info;
    }
    /** 等待文件入库 + 编译 */
    static async waitFileReady(url) {
        for (let i = 0; i < 30; i++) {
            const info = await Editor.Message.request("asset-db", "query-asset-info", url);
            if (info)
                break;
            await ExampleImporter.delay(300);
        }
        // 等待脚本编译完成
        await ExampleImporter.delay(3000);
    }
    /** 构建场景 JSON */
    static buildSceneJson() {
        return JSON.stringify([
            {
                "__type__": "cc.SceneAsset",
                "_name": "TaoWuDemo",
                "_objFlags": 0,
                "__editorExtras__": {},
                "_native": "",
                "scene": { "__id__": 1 }
            },
            {
                "__type__": "cc.Scene",
                "_name": "TaoWuDemo",
                "_objFlags": 0,
                "__editorExtras__": {},
                "_parent": null,
                "_children": [],
                "_active": true,
                "_components": [],
                "_prefab": null,
                "_lpos": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0 },
                "_lrot": { "__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1 },
                "_lscale": { "__type__": "cc.Vec3", "x": 1, "y": 1, "z": 1 },
                "_mobility": 0,
                "_layer": 1073741824,
                "_euler": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0 },
                "autoReleaseAssets": false,
                "_globals": { "__id__": 2 }
            },
            {
                "__type__": "cc.SceneGlobals",
                "ambient": { "__id__": 3 },
                "shadows": { "__id__": 4 },
                "_skybox": { "__id__": 5 },
                "fog": { "__id__": 6 },
                "octree": { "__id__": 7 },
                "skin": { "__id__": 8 },
                "lightProbeInfo": { "__id__": 9 },
                "postSettings": { "__id__": 10 },
                "bakedWithStationaryMainLight": false,
                "bakedWithHighpLightmap": false
            },
            {
                "__type__": "cc.AmbientInfo",
                "_skyColorHDR": { "__type__": "cc.Vec4", "x": 0, "y": 0, "z": 0, "w": 0.520833125 },
                "_skyColor": { "__type__": "cc.Vec4", "x": 0, "y": 0, "z": 0, "w": 0.520833125 },
                "_skyIllumHDR": 20000,
                "_skyIllum": 20000,
                "_groundAlbedoHDR": { "__type__": "cc.Vec4", "x": 0, "y": 0, "z": 0, "w": 0 },
                "_groundAlbedo": { "__type__": "cc.Vec4", "x": 0, "y": 0, "z": 0, "w": 0 },
                "_skyColorLDR": { "__type__": "cc.Vec4", "x": 0.2, "y": 0.5, "z": 0.8, "w": 1 },
                "_skyIllumLDR": 20000,
                "_groundAlbedoLDR": { "__type__": "cc.Vec4", "x": 0.2, "y": 0.2, "z": 0.2, "w": 1 }
            },
            {
                "__type__": "cc.ShadowsInfo",
                "_enabled": false,
                "_type": 0,
                "_normal": { "__type__": "cc.Vec3", "x": 0, "y": 1, "z": 0 },
                "_distance": 0,
                "_planeBias": 1,
                "_shadowColor": { "__type__": "cc.Color", "r": 76, "g": 76, "b": 76, "a": 255 },
                "_maxReceived": 4,
                "_size": { "__type__": "cc.Vec2", "x": 512, "y": 512 }
            },
            {
                "__type__": "cc.SkyboxInfo",
                "_envLightingType": 0,
                "_envmapHDR": null,
                "_envmap": null,
                "_envmapLDR": null,
                "_diffuseMapHDR": null,
                "_diffuseMapLDR": null,
                "_enabled": false,
                "_useHDR": true,
                "_editableMaterial": null,
                "_reflectionHDR": null,
                "_reflectionLDR": null,
                "_rotationAngle": 0
            },
            {
                "__type__": "cc.FogInfo",
                "_type": 0,
                "_fogColor": { "__type__": "cc.Color", "r": 200, "g": 200, "b": 200, "a": 255 },
                "_enabled": false,
                "_fogDensity": 0.3,
                "_fogStart": 0.5,
                "_fogEnd": 300,
                "_fogAtten": 5,
                "_fogTop": 1.5,
                "_fogRange": 1.2,
                "_accurate": false
            },
            {
                "__type__": "cc.OctreeInfo",
                "_enabled": false,
                "_minPos": { "__type__": "cc.Vec3", "x": -1024, "y": -1024, "z": -1024 },
                "_maxPos": { "__type__": "cc.Vec3", "x": 1024, "y": 1024, "z": 1024 },
                "_depth": 8
            },
            {
                "__type__": "cc.SkinInfo",
                "_enabled": false,
                "_blurRadius": 0.01,
                "_sssIntensity": 3
            },
            {
                "__type__": "cc.LightProbeInfo",
                "_giScale": 1,
                "_giSamples": 1024,
                "_bounces": 2,
                "_reduceRinging": 0,
                "_showProbe": true,
                "_showWireframe": true,
                "_showConvex": false,
                "_data": null,
                "_lightProbeSphereVolume": 1
            },
            {
                "__type__": "cc.PostSettingsInfo",
                "_toneMappingType": 0
            }
        ], null, 2);
    }
    /** 延迟 */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.ExampleImporter = ExampleImporter;
