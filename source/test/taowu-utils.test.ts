import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
    evaluateCondition,
    evaluateEnabled,
    getProperties,
    organizeProperties,
    collectAllKeys,
    ITaoWuPropertyMeta
} from '../inspector/taowu-utils';

/** 辅助: 构建属性 Map */
function buildProperties(props: Record<string, any>): Map<string, any> {
    const map = new Map<string, any>();
    for (const [k, v] of Object.entries(props)) {
        map.set(k, v);
    }
    return map;
}

// ─── evaluateCondition (ShowIf / HideIf) ───

describe('evaluateCondition', () => {
    test('无 meta 时返回 true', () => {
        const props = buildProperties({ flag: { value: true } });
        assert.strictEqual(evaluateCondition(undefined, props), true);
    });

    test('空 meta 对象返回 true', () => {
        const props = buildProperties({ flag: { value: true } });
        assert.strictEqual(evaluateCondition({}, props), true);
    });

    test('ShowIf 条件为 true 时可见', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta: ITaoWuPropertyMeta = { showIf: 'flag' };
        assert.strictEqual(evaluateCondition(meta, props), true);
    });

    test('ShowIf 条件为 false 时不可见', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta: ITaoWuPropertyMeta = { showIf: 'flag' };
        assert.strictEqual(evaluateCondition(meta, props), false);
    });

    test('ShowIf 条件为 0 时不可见', () => {
        const props = buildProperties({ count: { value: 0 } });
        const meta: ITaoWuPropertyMeta = { showIf: 'count' };
        assert.strictEqual(evaluateCondition(meta, props), false);
    });

    test('ShowIf 条件为非零数字时可见', () => {
        const props = buildProperties({ count: { value: 5 } });
        const meta: ITaoWuPropertyMeta = { showIf: 'count' };
        assert.strictEqual(evaluateCondition(meta, props), true);
    });

    test('ShowIf 引用不存在的属性时不可见', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta: ITaoWuPropertyMeta = { showIf: 'nonexistent' };
        assert.strictEqual(evaluateCondition(meta, props), false);
    });

    test('HideIf 条件为 true 时不可见', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta: ITaoWuPropertyMeta = { hideIf: 'flag' };
        assert.strictEqual(evaluateCondition(meta, props), false);
    });

    test('HideIf 条件为 false 时可见', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta: ITaoWuPropertyMeta = { hideIf: 'flag' };
        assert.strictEqual(evaluateCondition(meta, props), true);
    });

    test('HideIf 条件为 0 时可见', () => {
        const props = buildProperties({ count: { value: 0 } });
        const meta: ITaoWuPropertyMeta = { hideIf: 'count' };
        assert.strictEqual(evaluateCondition(meta, props), true);
    });
});

// ─── evaluateEnabled (EnableIf / DisableIf) ───

describe('evaluateEnabled', () => {
    test('无 meta 时返回 true (可编辑)', () => {
        const props = buildProperties({ flag: { value: true } });
        assert.strictEqual(evaluateEnabled(undefined, props), true);
    });

    test('空 meta 对象返回 true (可编辑)', () => {
        const props = buildProperties({ flag: { value: true } });
        assert.strictEqual(evaluateEnabled({}, props), true);
    });

    // EnableIf
    test('EnableIf 条件为 true 时可编辑', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta: ITaoWuPropertyMeta = { enableIf: 'flag' };
        assert.strictEqual(evaluateEnabled(meta, props), true);
    });

    test('EnableIf 条件为 false 时不可编辑', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta: ITaoWuPropertyMeta = { enableIf: 'flag' };
        assert.strictEqual(evaluateEnabled(meta, props), false);
    });

    test('EnableIf 条件为 0 时不可编辑', () => {
        const props = buildProperties({ count: { value: 0 } });
        const meta: ITaoWuPropertyMeta = { enableIf: 'count' };
        assert.strictEqual(evaluateEnabled(meta, props), false);
    });

    test('EnableIf 条件为非零数字时可编辑', () => {
        const props = buildProperties({ count: { value: 5 } });
        const meta: ITaoWuPropertyMeta = { enableIf: 'count' };
        assert.strictEqual(evaluateEnabled(meta, props), true);
    });

    test('EnableIf 条件为非空字符串时可编辑', () => {
        const props = buildProperties({ name: { value: 'hello' } });
        const meta: ITaoWuPropertyMeta = { enableIf: 'name' };
        assert.strictEqual(evaluateEnabled(meta, props), true);
    });

    test('EnableIf 条件为空字符串时不可编辑', () => {
        const props = buildProperties({ name: { value: '' } });
        const meta: ITaoWuPropertyMeta = { enableIf: 'name' };
        assert.strictEqual(evaluateEnabled(meta, props), false);
    });

    test('EnableIf 引用不存在的属性时不可编辑', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta: ITaoWuPropertyMeta = { enableIf: 'nonexistent' };
        assert.strictEqual(evaluateEnabled(meta, props), false);
    });

    // DisableIf
    test('DisableIf 条件为 true 时不可编辑', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta: ITaoWuPropertyMeta = { disableIf: 'flag' };
        assert.strictEqual(evaluateEnabled(meta, props), false);
    });

    test('DisableIf 条件为 false 时可编辑', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta: ITaoWuPropertyMeta = { disableIf: 'flag' };
        assert.strictEqual(evaluateEnabled(meta, props), true);
    });

    test('DisableIf 条件为 0 时可编辑', () => {
        const props = buildProperties({ count: { value: 0 } });
        const meta: ITaoWuPropertyMeta = { disableIf: 'count' };
        assert.strictEqual(evaluateEnabled(meta, props), true);
    });

    test('DisableIf 条件为非零数字时不可编辑', () => {
        const props = buildProperties({ count: { value: 5 } });
        const meta: ITaoWuPropertyMeta = { disableIf: 'count' };
        assert.strictEqual(evaluateEnabled(meta, props), false);
    });

    test('DisableIf 引用不存在的属性时可编辑', () => {
        const props = buildProperties({ flag: { value: true } });
        const meta: ITaoWuPropertyMeta = { disableIf: 'nonexistent' };
        assert.strictEqual(evaluateEnabled(meta, props), true);
    });

    // 组合: EnableIf + DisableIf
    test('EnableIf=true 且 DisableIf=false 时可编辑', () => {
        const props = buildProperties({
            enable: { value: true },
            disable: { value: false }
        });
        const meta: ITaoWuPropertyMeta = { enableIf: 'enable', disableIf: 'disable' };
        assert.strictEqual(evaluateEnabled(meta, props), true);
    });

    test('EnableIf=true 且 DisableIf=true 时不可编辑', () => {
        const props = buildProperties({
            enable: { value: true },
            disable: { value: true }
        });
        const meta: ITaoWuPropertyMeta = { enableIf: 'enable', disableIf: 'disable' };
        assert.strictEqual(evaluateEnabled(meta, props), false);
    });

    test('EnableIf=false 且 DisableIf=false 时不可编辑', () => {
        const props = buildProperties({
            enable: { value: false },
            disable: { value: false }
        });
        const meta: ITaoWuPropertyMeta = { enableIf: 'enable', disableIf: 'disable' };
        assert.strictEqual(evaluateEnabled(meta, props), false);
    });
});

// ─── evaluateCondition vs evaluateEnabled 对比 ───

describe('ShowIf/HideIf vs EnableIf/DisableIf 互不干扰', () => {
    test('有 showIf 但无 enableIf 时 evaluateEnabled 返回 true', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta: ITaoWuPropertyMeta = { showIf: 'flag' };
        assert.strictEqual(evaluateEnabled(meta, props), true);
    });

    test('有 enableIf 但无 showIf 时 evaluateCondition 返回 true', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta: ITaoWuPropertyMeta = { enableIf: 'flag' };
        assert.strictEqual(evaluateCondition(meta, props), true);
    });

    test('同时有 showIf 和 enableIf，showIf=false 时不可见', () => {
        const props = buildProperties({ flag: { value: false } });
        const meta: ITaoWuPropertyMeta = { showIf: 'flag', enableIf: 'flag' };
        assert.strictEqual(evaluateCondition(meta, props), false);
    });

    test('同时有 showIf 和 enableIf，showIf=true 且 enableIf=false 时可见但不可编辑', () => {
        const props = buildProperties({
            show: { value: true },
            enable: { value: false }
        });
        const meta: ITaoWuPropertyMeta = { showIf: 'show', enableIf: 'enable' };
        assert.strictEqual(evaluateCondition(meta, props), true);
        assert.strictEqual(evaluateEnabled(meta, props), false);
    });
});

// ─── getProperties 和 organizeProperties 集成测试 ───

describe('集成测试', () => {
    test('getProperties 排除内置字段', () => {
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
        const props = getProperties(dump);
        assert.strictEqual(props.has('_private'), false);
        assert.strictEqual(props.has('__internal'), false);
        assert.strictEqual(props.has('enabled'), false);
        assert.strictEqual(props.has('uuid'), false);
        assert.strictEqual(props.has('name'), false);
        assert.strictEqual(props.has('myProp'), true);
        assert.strictEqual(props.get('myProp')!.value, 42);
    });

    test('organizeProperties 正确分组', () => {
        const keys = ['a', 'b', 'c', 'd', 'e'];
        const meta = {
            b: { foldoutGroup: 'Group1' },
            c: { tabGroup: 'Tabs', tabName: 'Tab1' },
            d: { boxGroup: 'Box1' },
            e: { horizontalGroup: 'HGroup' },
        };
        const result = organizeProperties(keys, meta);
        assert.deepStrictEqual(result.ungrouped, ['a']);
        assert.ok(result.foldoutGroups.has('Group1'));
        assert.deepStrictEqual(result.foldoutGroups.get('Group1'), ['b']);
        assert.ok(result.tabGroups.has('Tabs'));
        assert.ok(result.tabGroups.get('Tabs')!.has('Tab1'));
        assert.deepStrictEqual(result.tabGroups.get('Tabs')!.get('Tab1'), ['c']);
        assert.ok(result.boxGroups.has('Box1'));
        assert.deepStrictEqual(result.boxGroups.get('Box1'), ['d']);
        assert.ok(result.horizontalGroups.has('HGroup'));
        assert.deepStrictEqual(result.horizontalGroups.get('HGroup'), ['e']);
    });
});

// ─── PropertyOrder 排序 ───

describe('PropertyOrder 排序', () => {
    test('未指定 propertyOrder 时保持声明顺序', () => {
        const keys = ['c', 'a', 'b'];
        const result = organizeProperties(keys, {});
        assert.deepStrictEqual(result.ungrouped, ['c', 'a', 'b']);
    });

    test('指定 propertyOrder 的大值排在后面', () => {
        const keys = ['a', 'b', 'c'];
        const meta = {
            a: { propertyOrder: 0 },
            b: { propertyOrder: 100 },
            c: { propertyOrder: 50 },
        };
        const result = organizeProperties(keys, meta);
        assert.deepStrictEqual(result.ungrouped, ['a', 'c', 'b']);
    });

    test('部分指定 propertyOrder，未指定的保持声明顺序', () => {
        const keys = ['first', 'second', 'third', 'fourth'];
        const meta = {
            third: { propertyOrder: -1 },
            fourth: { propertyOrder: 100 },
        };
        const result = organizeProperties(keys, meta);
        // third(-1) < first(0) < second(0) < fourth(100)
        // first 和 second 均为默认 0，保持声明顺序
        assert.deepStrictEqual(result.ungrouped, ['third', 'first', 'second', 'fourth']);
    });

    test('分组内也按 propertyOrder 排序', () => {
        const keys = ['a', 'b', 'c', 'd'];
        const meta = {
            a: { foldoutGroup: 'G1', propertyOrder: 2 },
            b: { foldoutGroup: 'G1', propertyOrder: 1 },
            c: { foldoutGroup: 'G1' },
            d: { foldoutGroup: 'G1', propertyOrder: -1 },
        };
        const result = organizeProperties(keys, meta);
        // d(-1) < b(1) < a(2), c 默认 0 排在 b 前面
        assert.deepStrictEqual(result.foldoutGroups.get('G1'), ['d', 'c', 'b', 'a']);
    });

    test('负数 propertyOrder 排在默认值前面', () => {
        const keys = ['a', 'b'];
        const meta = {
            a: { propertyOrder: 0 },
            b: { propertyOrder: -10 },
        };
        const result = organizeProperties(keys, meta);
        assert.deepStrictEqual(result.ungrouped, ['b', 'a']);
    });
});

// ─── Button 与 collectAllKeys ───

describe('collectAllKeys', () => {
    test('包含 dump 属性 key', () => {
        const props = buildProperties({ a: { value: 1 }, b: { value: 2 } });
        const keys = collectAllKeys(props, {});
        assert.ok(keys.includes('a'));
        assert.ok(keys.includes('b'));
        assert.strictEqual(keys.length, 2);
    });

    test('包含 Button 方法 key', () => {
        const props = buildProperties({ a: { value: 1 } });
        const meta = { doSomething: { button: { name: '执行' } } };
        const keys = collectAllKeys(props, meta);
        assert.ok(keys.includes('a'));
        assert.ok(keys.includes('doSomething'));
        assert.strictEqual(keys.length, 2);
    });

    test('不重复包含既是属性又有 meta 的 key', () => {
        const props = buildProperties({ a: { value: 1 }, b: { value: 2 } });
        const meta = { a: { readOnly: true }, doBtn: { button: {} } };
        const keys = collectAllKeys(props, meta);
        assert.strictEqual(keys.filter(k => k === 'a').length, 1);
        assert.ok(keys.includes('doBtn'));
        assert.strictEqual(keys.length, 3);
    });

    test('空 meta 时只返回属性 key', () => {
        const props = buildProperties({ x: { value: 0 }, y: { value: 0 } });
        const keys = collectAllKeys(props, {});
        assert.deepStrictEqual(keys, ['x', 'y']);
    });
});

describe('Button 在 organizeProperties 中的分组', () => {
    test('Button 无分组时进入 ungrouped', () => {
        const props = buildProperties({ a: { value: 1 } });
        const meta = {
            a: {},
            doBtn: { button: { name: 'Do' } },
        };
        const keys = collectAllKeys(props, meta);
        const result = organizeProperties(keys, meta);
        assert.ok(result.ungrouped.includes('a'));
        assert.ok(result.ungrouped.includes('doBtn'));
    });

    test('Button 支持 FoldoutGroup', () => {
        const props = buildProperties({});
        const meta = {
            doBtn: { button: { name: 'Do' }, foldoutGroup: 'Actions' },
        };
        const keys = collectAllKeys(props, meta);
        const result = organizeProperties(keys, meta);
        assert.ok(result.foldoutGroups.has('Actions'));
        assert.ok(result.foldoutGroups.get('Actions')!.includes('doBtn'));
    });

    test('Button 支持 HorizontalGroup', () => {
        const props = buildProperties({});
        const meta = {
            btn1: { button: { name: 'A' }, horizontalGroup: 'BtnRow' },
            btn2: { button: { name: 'B' }, horizontalGroup: 'BtnRow' },
        };
        const keys = collectAllKeys(props, meta);
        const result = organizeProperties(keys, meta);
        assert.ok(result.horizontalGroups.has('BtnRow'));
        assert.strictEqual(result.horizontalGroups.get('BtnRow')!.length, 2);
    });

    test('Button 与属性混合排序', () => {
        const props = buildProperties({ prop1: { value: 1 }, prop2: { value: 2 } });
        const meta = {
            prop1: {},
            prop2: { propertyOrder: 1 },
            btn1: { button: { name: 'Btn1' }, propertyOrder: 0 },
            btn2: { button: { name: 'Btn2' }, propertyOrder: 2 },
        };
        const keys = collectAllKeys(props, meta);
        const result = organizeProperties(keys, meta);
        // prop1(0) < btn1(0) < prop2(1) < btn2(2)，同 order 保持声明顺序
        assert.deepStrictEqual(result.ungrouped, ['prop1', 'btn1', 'prop2', 'btn2']);
    });
});
