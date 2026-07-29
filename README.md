# TaoWu Inspector — 属性绘制插件

> 适用于 Cocos Creator 3.8+ 的自定义属性检查器扩展，通过装饰器为组件属性提供分组、条件显示、表格列表等增强绘制功能。

## 功能特性

- 📦 **分组绘制** — FoldoutGroup / TabGroup / BoxGroup / HorizontalGroup 四种分组方式
- 🔀 **条件显示** — ShowIf / HideIf 根据其他属性值动态显示/隐藏
- 🔒 **条件禁用** — EnableIf / DisableIf 根据其他属性值动态启用/禁用编辑（属性仍可见）
- 🏷️ **自定义标签** — LabelText 修改属性显示名称
- 🔒 **只读** — ReadOnly 标记属性不可编辑
- 📊 **数值滑块** — PropertyRange 将数字属性渲染为滑块
- 📝 **多行文本** — TextArea 将字符串属性渲染为多行输入框
- 💡 **信息提示** — Title / InfoBox 在属性上方添加标题和提示框
- 📋 **表格列表** — TableList 将数组渲染为网状表格，支持列宽拖拽
- 🗂️ **字典表格** — 对 `{ [key: string]: V }` 类型使用 TableList 渲染为 Key-Value 表格
- 🔁 **排序** — PropertyOrder 控制属性渲染顺序
- 🔘 **方法按钮** — Button 在 Inspector 中生成按钮，点击调用组件方法
- 🧩 **嵌套对象** — 支持自定义 class 的嵌套属性渲染

## 安装

1. 将 `taowu-inspector` 文件夹放入项目的 `extensions/` 目录
2. 在 Cocos Creator 中点击菜单 **TaoWuInspector / 导入Runtime脚本**，将 Runtime 脚本导入到 `assets/TaoWuInspector/Runtime/`
3. 点击菜单 **TaoWuInspector / 导入示例**，导入示例场景和组件

## 快速开始

### 1. 导入装饰器

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
    PropertyRange,
    Title,
    InfoBox,
    PropertyOrder,
    TextArea,
    TableList,
    Button
} from '../Runtime/TaoWuDecorators';
```

### 2. 在组件中使用装饰器

```typescript
@ccclass('MyComponent')
export class MyComponent extends Component {

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
    @PropertyRange(0, 100)
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

### 3. 注册自定义 Inspector

在 `extensions/taowu-inspector/package.json` 的 `contributions.inspector.section.node` 中注册组件名：

```json
{
    "contributions": {
        "inspector": {
            "section": {
                "node": {
                    "MyComponent": "./dist/inspector/taowu-renderer.js"
                }
            }
        }
    }
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
| `@LabelText(text)` | `text: string` — 显示文本 | 自定义属性标签文本 |
| `@Title(title, line?)` | `title: string` — 标题<br>`line: boolean` — 是否显示分割线 | 在属性上方添加标题 |
| `@InfoBox(msg, type?)` | `msg: string` — 提示内容<br>`type: 'info'\|'warning'\|'error'` | 在属性上方添加信息提示框 |

### 输入类

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@ReadOnly()` | 无 | 标记属性为只读 |
| `@PropertyRange(min, max)` | `min: number`<br>`max: number` | 将数字属性渲染为滑块 |
| `@TextArea()` | 无 | 将字符串属性渲染为多行文本框 |
| `@PropertyOrder(order)` | `order: number` — 排序值 | 控制属性渲染顺序（值大的在后） |

### 回调类

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@OnValueChanged(method)` | `method: string` — 方法名 | 属性值变化时调用组件上的指定方法 |
| `@OnCollectionChanged(method)` | `method: string` — 方法名 | 数组/字典增删元素时调用组件上的指定方法 |

**使用示例：**

```typescript
@property
@PropertyRange(0, 100)
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
- 表头显示 `#` - 字段名（自动从 camelCase 转为 Title Case）
- 每行显示一个元素的序号、各字段值、删除按钮
- 表头列宽可拖拽调整
- 简单类型（Number/String）显示 `#` - `Item` 表头
- Cocos 内置类型（Vec3/Color/Size）使用原生 `ui-prop` 渲染

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
- **对象类型**（如 MapEntry）：折叠盒子，标题显示类型名 + 序号，内部垂直排列各字段
- **Cocos 类型**（Vec3/Color）：与简单类型相同的行布局，使用原生 `ui-prop` 渲染

## 嵌套对象渲染

自定义 class 作为属性（非数组）时，自动递归渲染为可折叠的 Box：

```typescript
@ccclass('WeaponConfig')
class WeaponConfig {
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

## 项目结构

```
extensions/taowu-inspector/
├── package.json          # 扩展配置
├── tsconfig.json         # TypeScript 配置
├── README.md             # 本文档
├── source/               # TypeScript 源码
│   ├── main.ts           # 扩展主入口
│   ├── example-importer.ts  # 示例导入器
│   ├── scene-script.ts   # 场景脚本（元数据查询）
│   └── inspector/
│       ├── taowu-renderer.ts  # Inspector 面板渲染器
│       ├── property-drawer.ts # 属性绘制器
│       ├── group-drawer.ts    # 分组绘制器
│       └── taowu-utils.ts     # 工具函数
├── dist/                 # 编译输出
│   ├── main.js
│   ├── scene-script.js
│   ├── example-importer.js
│   └── inspector/
│       ├── taowu-renderer.js
│       ├── property-drawer.js
│       ├── group-drawer.js
│       ├── taowu-utils.js
│       └── ...
└── @types/               # 类型定义

assets/TaoWuInspector/
├── Runtime/              # 运行时脚本（由扩展导入）
│   ├── TaoWuTypes.ts    # 类型定义
│   ├── TaoWuRegistry.ts # 元数据注册中心
│   └── TaoWuDecorators.ts # 装饰器
└── Example/              # 示例（由扩展导入）
    ├── TaoWuDemoComponent.ts
    └── TaoWuDemo.scene
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
