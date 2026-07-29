"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const taowu_utils_1 = require("../inspector/taowu-utils");
/** 辅助: 构建属性 Map */
function buildProperties(props) {
    const map = new Map();
    for (const [k, v] of Object.entries(props)) {
        map.set(k, v);
    }
    return map;
}
// ─── evaluateCondition (ShowIf / HideIf) ───
(0, node_test_1.describe)('evaluateCondition', () => {
    (0, node_test_1.test)('无 meta 时返回 true', () => {
        const props = buildProperties({ flag: { value: true } });
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(undefined, props), true);
    });
    (0, node_test_1.test)('空 meta 对象返回 true', () => {
        const props = buildProperties({ flag: { value: true } });
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)({}, props), true);
    });
    (0, node_test_1.test)('ShowIf 条件为 true 时可见', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta = { showIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), true);
    });
    (0, node_test_1.test)('ShowIf 条件为 false 时不可见', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta = { showIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), false);
    });
    (0, node_test_1.test)('ShowIf 条件为 0 时不可见', () => {
        const props = buildProperties({ count: { value: 0 } });
        const meta = { showIf: 'count' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), false);
    });
    (0, node_test_1.test)('ShowIf 条件为非零数字时可见', () => {
        const props = buildProperties({ count: { value: 5 } });
        const meta = { showIf: 'count' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), true);
    });
    (0, node_test_1.test)('ShowIf 引用不存在的属性时不可见', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta = { showIf: 'nonexistent' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), false);
    });
    (0, node_test_1.test)('HideIf 条件为 true 时不可见', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta = { hideIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), false);
    });
    (0, node_test_1.test)('HideIf 条件为 false 时可见', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta = { hideIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), true);
    });
    (0, node_test_1.test)('HideIf 条件为 0 时可见', () => {
        const props = buildProperties({ count: { value: 0 } });
        const meta = { hideIf: 'count' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), true);
    });
});
// ─── evaluateEnabled (EnableIf / DisableIf) ───
(0, node_test_1.describe)('evaluateEnabled', () => {
    (0, node_test_1.test)('无 meta 时返回 true (可编辑)', () => {
        const props = buildProperties({ flag: { value: true } });
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(undefined, props), true);
    });
    (0, node_test_1.test)('空 meta 对象返回 true (可编辑)', () => {
        const props = buildProperties({ flag: { value: true } });
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)({}, props), true);
    });
    // EnableIf
    (0, node_test_1.test)('EnableIf 条件为 true 时可编辑', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta = { enableIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), true);
    });
    (0, node_test_1.test)('EnableIf 条件为 false 时不可编辑', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta = { enableIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), false);
    });
    (0, node_test_1.test)('EnableIf 条件为 0 时不可编辑', () => {
        const props = buildProperties({ count: { value: 0 } });
        const meta = { enableIf: 'count' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), false);
    });
    (0, node_test_1.test)('EnableIf 条件为非零数字时可编辑', () => {
        const props = buildProperties({ count: { value: 5 } });
        const meta = { enableIf: 'count' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), true);
    });
    (0, node_test_1.test)('EnableIf 条件为非空字符串时可编辑', () => {
        const props = buildProperties({ name: { value: 'hello' } });
        const meta = { enableIf: 'name' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), true);
    });
    (0, node_test_1.test)('EnableIf 条件为空字符串时不可编辑', () => {
        const props = buildProperties({ name: { value: '' } });
        const meta = { enableIf: 'name' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), false);
    });
    (0, node_test_1.test)('EnableIf 引用不存在的属性时不可编辑', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta = { enableIf: 'nonexistent' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), false);
    });
    // DisableIf
    (0, node_test_1.test)('DisableIf 条件为 true 时不可编辑', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta = { disableIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), false);
    });
    (0, node_test_1.test)('DisableIf 条件为 false 时可编辑', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta = { disableIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), true);
    });
    (0, node_test_1.test)('DisableIf 条件为 0 时可编辑', () => {
        const props = buildProperties({ count: { value: 0 } });
        const meta = { disableIf: 'count' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), true);
    });
    (0, node_test_1.test)('DisableIf 条件为非零数字时不可编辑', () => {
        const props = buildProperties({ count: { value: 5 } });
        const meta = { disableIf: 'count' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), false);
    });
    (0, node_test_1.test)('DisableIf 引用不存在的属性时可编辑', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta = { disableIf: 'nonexistent' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), true);
    });
    // 组合: EnableIf + DisableIf
    (0, node_test_1.test)('EnableIf=true 且 DisableIf=false 时可编辑', () => {
        const props = buildProperties({
            enable: { value: true },
            disable: { value: false }
        });
        const meta = { enableIf: 'enable', disableIf: 'disable' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), true);
    });
    (0, node_test_1.test)('EnableIf=true 且 DisableIf=true 时不可编辑', () => {
        const props = buildProperties({
            enable: { value: true },
            disable: { value: true }
        });
        const meta = { enableIf: 'enable', disableIf: 'disable' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), false);
    });
    (0, node_test_1.test)('EnableIf=false 且 DisableIf=false 时不可编辑', () => {
        const props = buildProperties({
            enable: { value: false },
            disable: { value: false }
        });
        const meta = { enableIf: 'enable', disableIf: 'disable' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), false);
    });
});
// ─── evaluateCondition vs evaluateEnabled 对比 ───
(0, node_test_1.describe)('ShowIf/HideIf vs EnableIf/DisableIf 互不干扰', () => {
    (0, node_test_1.test)('有 showIf 但无 enableIf 时 evaluateEnabled 返回 true', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta = { showIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), true);
    });
    (0, node_test_1.test)('有 enableIf 但无 showIf 时 evaluateCondition 返回 true', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta = { enableIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), true);
    });
    (0, node_test_1.test)('同时有 showIf 和 enableIf，showIf=false 时不可见', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta = { showIf: 'flag', enableIf: 'flag' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), false);
    });
    (0, node_test_1.test)('同时有 showIf 和 enableIf，showIf=true 且 enableIf=false 时可见但不可编辑', () => {
        const props = buildProperties({
            show: { value: true },
            enable: { value: false }
        });
        const meta = { showIf: 'show', enableIf: 'enable' };
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateCondition)(meta, props), true);
        node_assert_1.default.strictEqual((0, taowu_utils_1.evaluateEnabled)(meta, props), false);
    });
});
// ─── getProperties 和 organizeProperties 集成测试 ───
(0, node_test_1.describe)('集成测试', () => {
    (0, node_test_1.test)('getProperties 排除内置字段', () => {
        const dump = {
            value: {
                _private: { value: 1 },
                __internal: { value: 2 },
                enabled: { value: true },
                uuid: { value: 'abc' },
                myProp: { value: 42 },
                name: { value: 'test' }
            }
        };
        const props = (0, taowu_utils_1.getProperties)(dump);
        node_assert_1.default.strictEqual(props.has('_private'), false);
        node_assert_1.default.strictEqual(props.has('__internal'), false);
        node_assert_1.default.strictEqual(props.has('enabled'), false);
        node_assert_1.default.strictEqual(props.has('uuid'), false);
        node_assert_1.default.strictEqual(props.has('name'), false);
        node_assert_1.default.strictEqual(props.has('myProp'), true);
        node_assert_1.default.strictEqual(props.get('myProp').value, 42);
    });
    (0, node_test_1.test)('organizeProperties 正确分组', () => {
        const keys = ['a', 'b', 'c', 'd', 'e'];
        const meta = {
            b: { foldoutGroup: 'Group1' },
            c: { tabGroup: 'Tabs', tabName: 'Tab1' },
            d: { boxGroup: 'Box1' },
            e: { horizontalGroup: 'HGroup' },
        };
        const result = (0, taowu_utils_1.organizeProperties)(keys, meta);
        node_assert_1.default.deepStrictEqual(result.ungrouped, ['a']);
        node_assert_1.default.ok(result.foldoutGroups.has('Group1'));
        node_assert_1.default.deepStrictEqual(result.foldoutGroups.get('Group1'), ['b']);
        node_assert_1.default.ok(result.tabGroups.has('Tabs'));
        node_assert_1.default.ok(result.tabGroups.get('Tabs').has('Tab1'));
        node_assert_1.default.deepStrictEqual(result.tabGroups.get('Tabs').get('Tab1'), ['c']);
        node_assert_1.default.ok(result.boxGroups.has('Box1'));
        node_assert_1.default.deepStrictEqual(result.boxGroups.get('Box1'), ['d']);
        node_assert_1.default.ok(result.horizontalGroups.has('HGroup'));
        node_assert_1.default.deepStrictEqual(result.horizontalGroups.get('HGroup'), ['e']);
    });
});
// ─── PropertyOrder 排序 ───
(0, node_test_1.describe)('PropertyOrder 排序', () => {
    (0, node_test_1.test)('未指定 propertyOrder 时保持声明顺序', () => {
        const keys = ['c', 'a', 'b'];
        const result = (0, taowu_utils_1.organizeProperties)(keys, {});
        node_assert_1.default.deepStrictEqual(result.ungrouped, ['c', 'a', 'b']);
    });
    (0, node_test_1.test)('指定 propertyOrder 的大值排在后面', () => {
        const keys = ['a', 'b', 'c'];
        const meta = {
            a: { propertyOrder: 0 },
            b: { propertyOrder: 100 },
            c: { propertyOrder: 50 },
        };
        const result = (0, taowu_utils_1.organizeProperties)(keys, meta);
        node_assert_1.default.deepStrictEqual(result.ungrouped, ['a', 'c', 'b']);
    });
    (0, node_test_1.test)('部分指定 propertyOrder，未指定的保持声明顺序', () => {
        const keys = ['first', 'second', 'third', 'fourth'];
        const meta = {
            third: { propertyOrder: -1 },
            fourth: { propertyOrder: 100 },
        };
        const result = (0, taowu_utils_1.organizeProperties)(keys, meta);
        // third(-1) < first(0) < second(0) < fourth(100)
        // first 和 second 均为默认 0，保持声明顺序
        node_assert_1.default.deepStrictEqual(result.ungrouped, ['third', 'first', 'second', 'fourth']);
    });
    (0, node_test_1.test)('分组内也按 propertyOrder 排序', () => {
        const keys = ['a', 'b', 'c', 'd'];
        const meta = {
            a: { foldoutGroup: 'G1', propertyOrder: 2 },
            b: { foldoutGroup: 'G1', propertyOrder: 1 },
            c: { foldoutGroup: 'G1' },
            d: { foldoutGroup: 'G1', propertyOrder: -1 },
        };
        const result = (0, taowu_utils_1.organizeProperties)(keys, meta);
        // d(-1) < b(1) < a(2), c 默认 0 排在 b 前面
        node_assert_1.default.deepStrictEqual(result.foldoutGroups.get('G1'), ['d', 'c', 'b', 'a']);
    });
    (0, node_test_1.test)('负数 propertyOrder 排在默认值前面', () => {
        const keys = ['a', 'b'];
        const meta = {
            a: { propertyOrder: 0 },
            b: { propertyOrder: -10 },
        };
        const result = (0, taowu_utils_1.organizeProperties)(keys, meta);
        node_assert_1.default.deepStrictEqual(result.ungrouped, ['b', 'a']);
    });
});
// ─── Button 与 collectAllKeys ───
(0, node_test_1.describe)('collectAllKeys', () => {
    (0, node_test_1.test)('包含 dump 属性 key', () => {
        const props = buildProperties({ a: { value: 1 }, b: { value: 2 } });
        const keys = (0, taowu_utils_1.collectAllKeys)(props, {});
        node_assert_1.default.ok(keys.includes('a'));
        node_assert_1.default.ok(keys.includes('b'));
        node_assert_1.default.strictEqual(keys.length, 2);
    });
    (0, node_test_1.test)('包含 Button 方法 key', () => {
        const props = buildProperties({ a: { value: 1 } });
        const meta = { doSomething: { button: { name: '执行' } } };
        const keys = (0, taowu_utils_1.collectAllKeys)(props, meta);
        node_assert_1.default.ok(keys.includes('a'));
        node_assert_1.default.ok(keys.includes('doSomething'));
        node_assert_1.default.strictEqual(keys.length, 2);
    });
    (0, node_test_1.test)('不重复包含既是属性又有 meta 的 key', () => {
        const props = buildProperties({ a: { value: 1 }, b: { value: 2 } });
        const meta = { a: { readOnly: true }, doBtn: { button: {} } };
        const keys = (0, taowu_utils_1.collectAllKeys)(props, meta);
        node_assert_1.default.strictEqual(keys.filter(k => k === 'a').length, 1);
        node_assert_1.default.ok(keys.includes('doBtn'));
        node_assert_1.default.strictEqual(keys.length, 3);
    });
    (0, node_test_1.test)('空 meta 时只返回属性 key', () => {
        const props = buildProperties({ x: { value: 0 }, y: { value: 0 } });
        const keys = (0, taowu_utils_1.collectAllKeys)(props, {});
        node_assert_1.default.deepStrictEqual(keys, ['x', 'y']);
    });
});
(0, node_test_1.describe)('Button 在 organizeProperties 中的分组', () => {
    (0, node_test_1.test)('Button 无分组时进入 ungrouped', () => {
        const props = buildProperties({ a: { value: 1 } });
        const meta = {
            a: {},
            doBtn: { button: { name: 'Do' } },
        };
        const keys = (0, taowu_utils_1.collectAllKeys)(props, meta);
        const result = (0, taowu_utils_1.organizeProperties)(keys, meta);
        node_assert_1.default.ok(result.ungrouped.includes('a'));
        node_assert_1.default.ok(result.ungrouped.includes('doBtn'));
    });
    (0, node_test_1.test)('Button 支持 FoldoutGroup', () => {
        const props = buildProperties({});
        const meta = {
            doBtn: { button: { name: 'Do' }, foldoutGroup: 'Actions' },
        };
        const keys = (0, taowu_utils_1.collectAllKeys)(props, meta);
        const result = (0, taowu_utils_1.organizeProperties)(keys, meta);
        node_assert_1.default.ok(result.foldoutGroups.has('Actions'));
        node_assert_1.default.ok(result.foldoutGroups.get('Actions').includes('doBtn'));
    });
    (0, node_test_1.test)('Button 支持 HorizontalGroup', () => {
        const props = buildProperties({});
        const meta = {
            btn1: { button: { name: 'A' }, horizontalGroup: 'BtnRow' },
            btn2: { button: { name: 'B' }, horizontalGroup: 'BtnRow' },
        };
        const keys = (0, taowu_utils_1.collectAllKeys)(props, meta);
        const result = (0, taowu_utils_1.organizeProperties)(keys, meta);
        node_assert_1.default.ok(result.horizontalGroups.has('BtnRow'));
        node_assert_1.default.strictEqual(result.horizontalGroups.get('BtnRow').length, 2);
    });
    (0, node_test_1.test)('Button 与属性混合排序', () => {
        const props = buildProperties({ prop1: { value: 1 }, prop2: { value: 2 } });
        const meta = {
            prop1: {},
            prop2: { propertyOrder: 1 },
            btn1: { button: { name: 'Btn1' }, propertyOrder: 0 },
            btn2: { button: { name: 'Btn2' }, propertyOrder: 2 },
        };
        const keys = (0, taowu_utils_1.collectAllKeys)(props, meta);
        const result = (0, taowu_utils_1.organizeProperties)(keys, meta);
        // prop1(0) < btn1(0) < prop2(1) < btn2(2)，同 order 保持声明顺序
        node_assert_1.default.deepStrictEqual(result.ungrouped, ['prop1', 'btn1', 'prop2', 'btn2']);
    });
});
