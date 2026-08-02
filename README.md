# TaoWu Inspector — 属性绘制插件

> 适用于 Cocos Creator 3.8+ 的自定义属性检查器扩展，通过装饰器为组件属性提供分组、条件显示、表格列表等增强绘制功能。同时支持 JsonAsset 资源的内联编辑面板。

## 功能特性

- 📦 **分组绘制** — FoldoutGroup / TabGroup / BoxGroup / HorizontalGroup 四种分组方式
- 🔀 **条件显示** — ShowIf / HideIf 根据其他属性值动态显示/隐藏
- 🔒 **条件禁用** — EnableIf / DisableIf 根据其他属性值动态启用/禁用编辑（属性仍可见）
- 🏷️ **自定义标签** — LabelText 修改属性显示名称（支持属性级和类级装饰）
- 🔒 **只读** — ReadOnly 标记属性不可编辑
- 📊 **数值范围** — Range / Min / Max 将数字属性渲染为滑块或限制范围
- 📝 **多行文本** — TextArea 将字符串属性渲染为多行输入框
- 💡 **信息提示** — Title / InfoBox 在属性上方添加标题和提示框
- 📋 **表格列表** — TableList 将数组渲染为网状表格，支持列宽拖拽
- 🗂️ **字典表格** — 对 `{ [key: string]: V }` 类型使用 TableList 渲染为 Key-Value 表格
- 🔁 **排序** — PropertyOrder 控制属性渲染顺序
- 🔘 **方法按钮** — Button 在 Inspector 中生成按钮，点击调用组件方法
- 📋 **值下拉选择** — ValueDropdown 为 number/string 属性提供下拉选择框，支持直接值、方法名、类名.静态方法名
- 🧩 **嵌套对象** — 支持自定义 class 的嵌套属性递归渲染，嵌套对象内部的装饰器（LabelText、ValueDropdown 等）自动生效

## 安装

1. 将 `taowu-inspector` 文件夹放入项目的 `extensions/` 目录
2. 在 Cocos Creator 中点击菜单 **TaoWuInspector / 导入Runtime脚本**，将 Runtime 脚本导入到 `assets/TaoWuInspector/Runtime/`
3. 点击菜单 **TaoWuInspector / 导入示例**，导入示例场景和组件

## 快速开始

### 1. 继承 TaoWuCompoent 基类

Runtime 导入后会生成 `TaoWuCompoent.ts`，这是一个继承自 `Component` 的基础类。所有需要使用 TaoWu Inspector 面板的组件只需继承它：

```typescript
import { _decorator, Color } from 'cc';
import { TaoWuCompoent } from '../Runtime/TaoWuCompoent';
const { ccclass, property } = _decorator;

@ccclass('MyComponent')
export class MyComponent extends TaoWuCompoent {
    // ...
}
```

> `TaoWuCompoent` 已在 `package.json` 的 `inspector.section.node` 中注册，继承它的组件会自动使用 TaoWu 自定义 Inspector 面板。如需为其他组件也启用，可在 `package.json` 中追加注册组件名。

### 2. 导入装饰器

```typescript
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
    Range,
    Min,
    Max,
    Title,
    InfoBox,
    PropertyOrder,
    TextArea,
    TableList,
    Button,
    ValueDropdown,
    OnValueChanged,
    OnCollectionChanged
} from '../Runtime/TaoWuDecorators';
```

### 3. 在组件中使用装饰器

```typescript
@ccclass('MyComponent')
export class MyComponent extends TaoWuCompoent {

    @property
    @FoldoutGroup('基础设置')
    @LabelText("移动速度")
    moveSpeed: number = 5;

    @property
    @FoldoutGroup('基础设置')
    @ShowIf('canFly')
    flySpeed: number = 10;

    @property
    @FoldoutGroup('基础设置')
    @EnableIf('canFly')
    glideSpeed: number = 5;

    @property
    @FoldoutGroup('基础设置')
    @DisableIf('canFly')
    walkSpeed: number = 3;

    @property
    @FoldoutGroup('基础设置')
    canFly: boolean = false;

    @property
    @BoxGroup('外观')
    mainColor: Color = new Color(255, 255, 255, 255);

    @property
    @Range(0, 100)
    health: number = 100;

    @property
    @ReadOnly()
    @PropertyOrder(100)
    debugId: string = 'AUTO_GENERATED';

    @property
    @Title('高级设置', true)
    @InfoBox('以下属性影响游戏核心逻辑，请谨慎修改', 'warning')
    advancedEnabled: boolean = false;
}
```

## 装饰器 API

### 分组类

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@FoldoutGroup(path)` | `path: string` — 分组路径，支持 `/` 嵌套 | 可折叠分组 |
| `@TabGroup(group, tab)` | `group: string` — 分组名<br>`tab: string` — 标签页名 | Tab 标签页分组 |
| `@BoxGroup(group)` | `group: string` — 分组名 | 盒子分组（带标题和边框） |
| `@HorizontalGroup(group)` | `group: string` — 分组名 | 水平排列分组 |

### 条件类

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@ShowIf(prop)` | `prop: string` — 条件属性名 | 当指定属性值为 true 时显示 |
| `@HideIf(prop)` | `prop: string` — 条件属性名 | 当指定属性值为 true 时隐藏 |
| `@EnableIf(prop)` | `prop: string` — 条件属性名 | 当指定属性值为 true 时启用编辑，否则禁用（属性仍可见） |
| `@DisableIf(prop)` | `prop: string` — 条件属性名 | 当指定属性值为 true 时禁用编辑，否则启用（属性仍可见） |

### 显示类

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@LabelText(text)` | `text: string` — 显示文本 | 自定义属性标签文本，也可修饰 class 定义类级别的显示名 |
| `@Title(title, line?)` | `title: string` — 标题<br>`line: boolean` — 是否显示分割线 | 在属性上方添加标题 |
| `@InfoBox(msg, type?)` | `msg: string` — 提示内容<br>`type: 'info'\|'warning'\|'error'` | 在属性上方添加信息提示框 |

### 输入类

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@ReadOnly()` | 无 | 标记属性为只读 |
| `@Range(min, max)` | `min: number`<br>`max: number` | 将数字属性渲染为滑块（同时设置最小/最大值） |
| `@Min(min)` | `min: number` | 设置数字属性最小值（不渲染滑块，仅限制范围） |
| `@Max(max)` | `max: number` | 设置数字属性最大值（不渲染滑块，仅限制范围） |
| `@TextArea()` | 无 | 将字符串属性渲染为多行文本框 |
| `@PropertyOrder(order)` | `order: number` — 排序值 | 控制属性渲染顺序（值大的在后） |

### LabelText 类级装饰

`@LabelText` 可用于 class 定义，作为嵌套对象容器的显示标题：

```typescript
@ccclass('WeaponConfig')
@LabelText("武器配置")
export class WeaponConfig {
    @property
    @LabelText("武器名称")
    weaponName: string = '';
    // ...
}
```

当 `WeaponConfig` 作为嵌套对象渲染时，容器标题显示为 "武器配置" 而非类型名。

### 值下拉选择

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@ValueDropdown(values, labels?)` | `values: (number\|string)[]` 或 `string`（方法名/字段名）<br>`labels?: string[]` — 可选标签 | 将 number/string 属性渲染为下拉选择框 |

**三种用法：**

```typescript
// 1. 直接值数组 + 标签
@property
@ValueDropdown([1, 2, 3, 5, 8, 13], ['一', '二', '三', '五', '八', '十三'])
@FoldoutGroup('ValueDropdown')
fibonacciChoice: number = 1;

// 2. 方法名 — 运行时调用组件实例方法获取可选值
@property
@ValueDropdown('getTextureSizes')
@FoldoutGroup('ValueDropdown')
textureSize: number = 256;

getTextureSizes() {
    return [32, 64, 128, 256, 512, 1024];
}

// 3. 类名.静态方法名 — 直接索引类的静态方法/字段
@property
@ValueDropdown('WeaponConfig.getRarityOptions')
@FoldoutGroup('ValueDropdown')
rarity: number = 1;

// 也可用于静态字段
@property
@ValueDropdown('TaoWuDemoComponent.StaticElementTypes', ['火', '冰', '雷', '毒'])
@FoldoutGroup('ValueDropdown')
elementType: string = 'fire';

static StaticElementTypes = ['fire', 'ice', 'lightning', 'poison'];
```

**方法返回值支持格式：**
- `(number | string)[]` — 纯值数组
- `{ value: number | string, label: string }[]` — 带标签的对象数组

```typescript
// 返回带标签的选项
getRarityOptions() {
    return [
        { value: 0, label: '普通' },
        { value: 1, label: '精良' },
        { value: 2, label: '史诗' },
        { value: 3, label: '传说' },
    ];
}
```

**在数组和嵌套对象中使用：**

```typescript
// 数组中每个元素使用下拉选择
@property([CCInteger])
@ValueDropdown([10, 20, 30, 50, 100], ['十个', '二十', '三十', '五十', '一百'])
dropdownDamageList: number[] = [10, 20, 30];

// TableList 中的自定义类内部字段使用下拉选择
@ccclass('WeaponConfig')
class WeaponConfig {
    @property
    @ValueDropdown(['physical', 'fire', 'ice', 'lightning'], ['物理', '火', '冰', '雷'])
    elementType: string = 'physical';

    @property
    @ValueDropdown('getRarityOptions')
    rarity: number = 1;

    getRarityOptions() {
        return [
            { value: 0, label: '普通' },
            { value: 1, label: '精良' },
        ];
    }
}
```

> `@ValueDropdown` 仅适用于 `number` 和 `string` 基本类型属性。在数组/嵌套对象中使用时，每个 number/string 元素会渲染为独立的下拉框。JsonAsset 编辑时，方法名形式的 ValueDropdown 通过类名创建临时实例调用方法。

### 回调类

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@OnValueChanged(method)` | `method: string` — 方法名 | 属性值变化时调用组件上的指定方法 |
| `@OnCollectionChanged(method)` | `method: string` — 方法名 | 数组/字典增删元素时调用组件上的指定方法 |

**使用示例：**

```typescript
@property
@Range(0, 100)
@OnValueChanged('onHealthChanged')
health: number = 100;

@property([CCInteger])
@OnCollectionChanged('onListChanged')
itemList: number[] = [1, 2, 3];

// 组件中定义回调方法
onHealthChanged(): void {
    console.log('health changed to:', this.health);
}
onListChanged(): void {
    console.log('itemList changed:', this.itemList);
}
```

### 列表类

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@TableList()` | 无 | 将数组/字典渲染为表格风格 |

### 方法类

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@Button(name?)` | `name: string` — 按钮显示文本（可选，默认方法名） | 在 Inspector 中生成按钮，点击时调用该方法 |

**使用示例：**

```typescript
@Button('重置生命值')
resetHealth(): void {
    this.health = 100;
}

@Button()
randomizeHealth(): void {
    this.health = Math.floor(Math.random() * 100);
}

// Button 支持分组、条件等装饰器组合
@Button('打印调试信息')
@FoldoutGroup('调试')
printDebug(): void {
    console.log('Debug:', { health: this.health });
}

@Button('恢复满血')
@EnableIf('canFly')
fullHealth(): void {
    this.health = 100;
}
```

> Button 是方法装饰器，放在无参的实例方法上。支持与其他装饰器组合：`@FoldoutGroup`、`@BoxGroup`、`@HorizontalGroup`、`@ShowIf`/`@HideIf`、`@EnableIf`/`@DisableIf`、`@PropertyOrder`。

## TableList 使用

### 数组表格

对 `number[]`、`string[]`、`Vec3[]` 等数组使用 `@TableList()`，渲染为网状表格：

```typescript
@property([CCInteger])
@TableList()
damageList: number[] = [10, 20, 30];

@property([Vec3])
@TableList()
positionList: Vec3[] = [new Vec3(0, 0, 0), new Vec3(1, 1, 1)];

@property({ type: [MapEntry] })
@TableList()
configTableList: MapEntry[] = [...];
```

**表格特点：**
- 表头显示 `#` - 字段名（自动从 camelCase 转为 Title Case，或使用 LabelText）
- 每行显示一个元素的序号、各字段值、删除按钮
- 表头列宽可拖拽调整
- 简单类型（Number/String）显示 `#` - `Item` 表头
- Cocos 内置类型（Vec3/Color/Size）使用原生 `ui-prop` 渲染
- 自定义 CCClass 类型递归渲染嵌套对象，支持 LabelText / ValueDropdown 等装饰器

### 字典表格

对 `{ [key: string]: V }` 类型使用 `@TableList()`，渲染为 Key-Value 表格：

```typescript
@property({ type: CCInteger })
@TableList()
resistanceMap: { [key: string]: number } = { fire: 20, ice: 10 };

@property
@TableList()
dropRateMap: { [key: string]: string } = { gold: '75%', silver: '50%' };
```

**字典表格特点：**
- 表头显示 `#` - `Key` - `Value`
- Key 可编辑，修改时检查重复（重复则报错并恢复）
- 底部有 Key 输入框 + 添加按钮，新增时检查 key 不为空且不重复
- 删除和新增会整体更新字典 dump

## 非 TableList 数组渲染

不带 `@TableList()` 的数组使用以下风格：

- **简单类型**（Number/String）：`序号 + 内容 + 删除按钮`，单行布局
- **对象类型**（如 MapEntry）：折叠盒子，标题显示类型名或 `@LabelText` + 序号，内部垂直排列各字段
- **Cocos 类型**（Vec3/Color）：与简单类型相同的行布局，使用原生 `ui-prop` 渲染

## 嵌套对象渲染

自定义 class 作为属性（非数组）时，自动递归渲染为可折叠的 Box：

```typescript
@ccclass('WeaponConfig')
@LabelText("武器配置")
export class WeaponConfig {
    @property
    @LabelText("武器名称")
    weaponName: string = '';

    @property
    @LabelText("伤害")
    damage: number = 0;

    // 支持继续嵌套
    @property({ type: MapEntry })
    @LabelText("附魔属性")
    enchant: MapEntry = new MapEntry();
}

@property({ type: WeaponConfig })
@FoldoutGroup('装备')
equippedWeapon: WeaponConfig = new WeaponConfig();
```

**嵌套对象特点：**
- 容器标题优先使用类级 `@LabelText`，其次类型名
- 子属性标签使用属性级 `@LabelText`
- 支持 `@ValueDropdown`、`@Range`、`@Min`、`@Max` 等所有装饰器
- 深层嵌套自动递归渲染

## JsonAsset Inspector

选中 `.json` 资源文件时，TaoWu Inspector 自动接管 Inspector 面板，提供可视化编辑。

### 基本用法

1. 创建一个带 `_t` 字段的 JSON 文件，`_t` 值为 TS 类名：

```json
{
    "_t": "TaoWuDemoConfig",
    "componentName": "Demo",
    "health": 100,
    "moveSpeed": 5,
    "canFly": false
}
```

2. 对应的 TS 类用 `@ccclass` 注册并用 TaoWu 装饰器标注：

```typescript
@ccclass('TaoWuDemoConfig')
export class TaoWuDemoConfig {
    @property
    componentName: string = 'Demo';

    @property
    @Range(0, 100)
    health: number = 100;

    @property
    @FoldoutGroup('角色设置')
    @LabelText("移动速度")
    moveSpeed: number = 5;

    @property
    @FoldoutGroup('角色设置')
    canFly: boolean = false;

    @property
    @FoldoutGroup('角色设置')
    @ShowIf('canFly')
    flySpeed: number = 10;
}
```

3. 在 Inspector 中选中该 JSON 文件，即可看到与组件 Inspector 一致的分组渲染。

### JSON 格式要求

- **`_t` 字段** — 必须为 TS 类名（`@ccclass` 注册的名称），用于匹配元数据
- **嵌套对象** — 嵌套的自定义 class 对象也需要 `_t` 字段标识类型
- **Cocos 类型** — Vec3/Color 等直接写原始字段（`{x:0,y:0,z:0}`），不需要 `_t`
- **缺失字段** — JSON 中缺失的字段会自动从类定义推断默认值并补全
- **空 JSON** — `{"_t":"TaoWuDemoConfig"}` 也能显示完整的类字段

### JsonAsset 编辑特性

| 特性 | 说明 |
|------|------|
| 分组渲染 | FoldoutGroup / TabGroup / BoxGroup / HorizontalGroup 一致支持 |
| 条件显示 | ShowIf / HideIf 修改条件属性后自动刷新 |
| 条件禁用 | EnableIf / DisableIf 动态启用/禁用编辑（属性仍可见），修改条件属性后自动刷新 |
| 只读 | ReadOnly 标记属性不可编辑，对所有元素类型生效（ui-prop/ui-num-input/ui-checkbox 等） |
| LabelText | 属性级和类级 `@LabelText` 均生效 |
| ValueDropdown | 方法名形式通过类名创建临时实例调用 |
| 数组编辑 | 支持增删元素，空数组根据类型推断默认值 |
| TableList | 表格渲染、列宽拖拽、嵌套对象递归渲染 |
| 嵌套对象 | 递归渲染所有 `_t` 类型的字段，装饰器自动应用 |
| 自动保存 | 离开面板自动保存，也可手动点击保存按钮 |
| Button | 通过创建临时类实例调用方法，修改的属性同步回 JSON |
| OnValueChanged / OnCollectionChanged | 属性值变化时触发回调，通过临时实例调用 |
| 滑块不断触 | 拖动滑块时不会重建 DOM，仅 ShowIf/HideIf/EnableIf/DisableIf 条件变化时才重新渲染 |

> **Button / 回调**：`@Button`、`@OnValueChanged`、`@OnCollectionChanged` 在 JsonAsset 中通过创建临时类实例实现。方法内修改的属性值会同步回 JSON。限制：方法内访问 `this.node`/`this.scene` 等组件上下文不可用。

## 项目结构

```
extensions/taowu-inspector/
├── package.json              # 扩展配置
├── tsconfig.json             # TypeScript 配置
├── README.md                 # 本文档
├── source/                   # TypeScript 源码
│   ├── main.ts               # 扩展主入口（消息转发）
│   ├── example-importer.ts   # 示例导入器（Runtime/Example 模板）
│   ├── scene-script.ts       # 场景脚本（元数据查询、属性类型推断、ValueDropdown 解析）
│   └── inspector/
│       ├── taowu-renderer.ts     # 组件 Inspector 面板渲染器
│       ├── property-drawer.ts    # 属性绘制器（List/TableList/Map/ValueDropdown 等）
│       ├── group-drawer.ts       # 分组绘制器（FoldoutGroup/TabGroup/BoxGroup/HorizontalGroup）
│       ├── taowu-utils.ts       # 工具函数（类型检测、条件评估、属性组织）
│       └── json-asset-renderer.ts # JsonAsset Inspector 渲染器
├── dist/                     # 编译输出
└── @types/                   # 类型定义

assets/TaoWuInspector/
├── Runtime/                  # 运行时脚本（由扩展导入）
│   ├── TaoWuTypes.ts        # 类型定义
│   ├── TaoWuRegistry.ts     # 元数据注册中心
│   ├── TaoWuDecorators.ts   # 装饰器实现
│   └── TaoWuCompoent.ts     # 基础组件类（继承后自动启用 TaoWu Inspector）
└── Example/                  # 示例（由扩展导入）
    ├── TaoWuDemoComponent.ts # 组件示例（所有装饰器演示）
    ├── TaoWuDemoConfig.ts    # JsonAsset 配置示例
    ├── TaoWuDemo.json        # JSON 数据示例
    └── TaoWuDemo.scene       # 示例场景
```

## 构建

```bash
cd extensions/taowu-inspector
npm install
npm run build    # 编译 TypeScript
npm run watch    # 监听模式
npm test         # 编译并运行测试
```

## 环境要求

- Cocos Creator >= 3.8.5
- Node.js >= 18

## 许可证

MIT
