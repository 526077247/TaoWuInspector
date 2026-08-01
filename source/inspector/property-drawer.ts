import { ITaoWuPropertyMeta, evaluateEnabled } from './taowu-utils';

/** 辅助: 通过 scene-script 调用组件方法 */
async function invokeMethod(compUuid: string, compIndex: number, methodName: string): Promise<void> {
    try {
        await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'taowu-inspector', method: 'invokeMethod',
            args: [compUuid, compIndex, methodName]
        });
    } catch (e) {
        console.error('[TaoWuInspector] Button invoke error:', e);
    }
}

/** 解包 IProperty: {value: 1, type: "Number"} → 1 */
function unwrapIProp(val: any): any {
    if (val && typeof val === 'object' && val.value !== undefined && (val.type !== undefined || val.path !== undefined)) {
        return val.value;
    }
    return val;
}
/** 解包 Vec/Color/Size 的子属性 IProperty */
function unwrapVecValue(val: any, keys: string[]): any {
    if (!val || typeof val !== 'object') return val;
    const result: any = {};
    for (const k of keys) {
        result[k] = unwrapIProp(val[k]);
    }
    return result;
}

/** 为表头添加拖拽调整列宽手柄 */
function syncColumnWidths(headerRow: HTMLElement, container: HTMLElement): void {
    const headerCells = Array.from(headerRow.querySelectorAll('.taowu-table-cell'));
    headerCells.forEach((cell, idx) => {
        if (cell.querySelector('.taowu-col-resizer')) return;
        const resizer = document.createElement('div');
        resizer.className = 'taowu-col-resizer';
        cell.appendChild(resizer);
        let startX = 0;
        let startW = 0;
        resizer.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            startX = e.clientX;
            startW = (cell as HTMLElement).getBoundingClientRect().width;
            const onMove = (ev: MouseEvent) => {
                const newW = Math.max(40, startW + ev.clientX - startX);
                (cell as HTMLElement).style.flex = '0 0 ' + newW + 'px';
                // 同步到数据行
                const dataRows = container.querySelectorAll('.taowu-table-row:not(.taowu-table-header)');
                dataRows.forEach(row => {
                    const cells = row.querySelectorAll('.taowu-table-cell');
                    if (cells[idx]) (cells[idx] as HTMLElement).style.flex = '0 0 ' + newW + 'px';
                });
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove as EventListener);
            document.addEventListener('mouseup', onUp);
        });
    });
}
/** camelCase 转为 Title Case (如 configMap → Config Map) */
function toDisplayName(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
}

/** 触发 OnValueChanged / OnCollectionChanged 回调 */
async function triggerCallbacks(compUuid: string, compIndex: number, propName: string): Promise<void> {
    try {
        await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'taowu-inspector', method: 'triggerValueChanged',
            args: [compUuid, compIndex, propName]
        });
    } catch (e) {}
}

/** 创建 Button 元素 (类似 Odin Button) */
export function createButtonElement(
    methodName: string,
    taowuMeta: ITaoWuPropertyMeta | undefined,
    compUuid: string,
    compIndex: number,
    properties?: Map<string, any>
): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'taowu-property-wrapper';
    wrapper.dataset.propName = methodName;

    const btn = document.createElement('div');
    btn.className = 'taowu-button';
    btn.textContent = taowuMeta?.button?.name || methodName;
    btn.style.userSelect = 'none';

    const isDisabled = !evaluateEnabled(taowuMeta, properties) || !!taowuMeta?.readOnly;
    if (isDisabled) {
        btn.classList.add('taowu-button-disabled');
    }

    btn.addEventListener('click', async () => {
        if (btn.classList.contains('taowu-button-disabled')) return;
        btn.classList.add('taowu-button-loading');
        try {
            await invokeMethod(compUuid, compIndex, methodName);
            // 执行后查询最新属性值并刷新面板
            const contentEl = wrapper.closest('.taowu-content') as any;
            if (contentEl?.__taowuRerender) {
                await contentEl.__taowuRerender(undefined, undefined, true);
            }
        } finally {
            btn.classList.remove('taowu-button-loading');
        }
    });

    wrapper.appendChild(btn);
    return wrapper;
}

/** 创建单个属性的 UI 元素 */
export function createPropertyElement(
    propName: string,
    propDump: any,
    compUuid: string,
    compIndex: number,
    taowuMeta?: ITaoWuPropertyMeta,
    isRendering?: () => boolean,
    onPropChanged?: () => void,
    elementMetadata?: any,
    properties?: Map<string, any>
): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'taowu-property-wrapper';
    wrapper.dataset.propName = propName;

    if (taowuMeta?.title) {
        const titleEl = createTitleElement(taowuMeta.title, taowuMeta.titleHorizontalLine ?? true);
        wrapper.appendChild(titleEl);
    }

    if (taowuMeta?.infoBox) {
        const infoEl = createInfoBoxElement(taowuMeta.infoBox.message, taowuMeta.infoBox.type);
        wrapper.appendChild(infoEl);
    }

    const input = createInputElement(propDump, taowuMeta, compUuid, compIndex, propName, isRendering, false, elementMetadata);

    // ui-prop[type="dump"] 需要在 DOM 挂载后重新设置 dump 并 render
    // 但 ValueDropdown 的 ui-prop 不需要 render (手动放了 ui-select)
    const tagName = input.tagName.toLowerCase();
    if (tagName === 'ui-prop' && input.getAttribute('type') === 'dump' && !input.hasAttribute('data-value-dropdown')) {
        const isReadOnly = taowuMeta?.readOnly || propDump.readonly || !evaluateEnabled(taowuMeta, properties);
        requestAnimationFrame(() => {
            try { (input as any).dump = (input as any).dump || propDump; } catch (e) {}
            try { (input as any).render((input as any).dump); } catch (e) {}
            if (isReadOnly) {
                input.setAttribute('disabled', '');
            }
        });
    }

    wrapper.appendChild(input);

    // List/TableList/Map/ValueDropdown 自带事件监听，跳过常规 setupChangeListener
    const isContainer = input.classList.contains('taowu-collection');
    const isValueDropdown = input.hasAttribute('data-value-dropdown');
    if (!isContainer && !isValueDropdown) {
        setupChangeListener(input, propName, propDump, compUuid, compIndex, taowuMeta, isRendering, onPropChanged);
    }

    return wrapper;
}

/** 构建标准 set-property path */
function buildPath(propDump: any, compIndex: number, propName: string): string {
    const rawPath = propDump.path || `__comps__.${compIndex}.${propName}`;
    return rawPath.replace(/^__comps__[_.]*(\d+)[_.]/, (_m: string, idx: string) => `__comps__.${idx}.`);
}



/** 统一 Box 容器 (可折叠, 默认折叠) */
function createBoxContainer(title: string): { container: HTMLElement; content: HTMLElement } {
    const section = document.createElement('ui-section');
    section.className = 'taowu-collection taowu-box';
    section.setAttribute('header', title);

    const content = document.createElement('div');
    content.className = 'taowu-box-content';
    // 拦截所有冒泡到 content 的事件，阻止触发 ui-section 折叠
    const stop = (e: Event) => e.stopPropagation();
    content.addEventListener('click', stop);
    content.addEventListener('mousedown', stop);
    content.addEventListener('pointerdown', stop);
    content.addEventListener('change', stop);
    content.addEventListener('confirm', stop);
    section.appendChild(content);

    return { container: section, content };
}

/** 创建添加按钮 */
function createAddButton(text: string): HTMLElement {
    const btn = document.createElement('div');
    btn.className = 'taowu-list-btn taowu-list-btn-add';
    btn.textContent = text;
    return btn;
}

/** 创建删除按钮 */
function createDelButton(text: string): HTMLElement {
    const btn = document.createElement('span');
    btn.className = 'taowu-list-btn taowu-list-btn-del';
    btn.textContent = text;
    return btn;
}

/** 根据属性类型创建输入元素 */
function createInputElement(
    propDump: any,
    taowuMeta: ITaoWuPropertyMeta | undefined,
    compUuid: string,
    compIndex: number,
    propName: string,
    isRendering?: () => boolean,
    rawElement?: boolean,
    elementMetadata?: any
): HTMLElement {
    const type = (propDump.type || '').toLowerCase();
    const value = propDump.value;

    // Array — List 或 TableList (必须在 ValueDropdown 之前，数组走 List 渲染)
    if (propDump.isArray || Array.isArray(value)) {
        if (taowuMeta?.tableList) {
            return createTableListElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
        }
        return createListElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
    }

    // 检测 Vec3[] / Color[] 等: type 是 cc.Vec3 但 value 是数组
    if (type.startsWith('cc.') && Array.isArray(value)) {
        if (taowuMeta?.tableList) {
            return createTableListElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
        }
        return createListElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
    }

    // rawElement: 用于 List/TableList/Map 内部元素
    if (rawElement) {
        return createRawInputElement(propDump, taowuMeta, compUuid, compIndex);
    }

    // ValueDropdown — 下拉选择框 (仅在非数组、非 rawElement 时生效)
    if (taowuMeta?.valueDropdown) {
        return createValueDropdownElement(propDump, taowuMeta, compUuid, compIndex, propName, isRendering);
    }

    // Object/Map — 非 cc.* 类型的对象且有实际属性
    if (typeof value === 'object' && value !== null && !Array.isArray(value)
        && !type.startsWith('cc.') && Object.keys(value).length > 0) {
        if (taowuMeta?.tableList) {
            return createDictTableElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta);
        }
        return createMapElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
    }

    // 所有简单类型 (Number, String, Boolean, Enum, Vec, Color, Size, Asset, Node 等)
    // 统一使用 ui-prop + dump，让 Cocos 原生渲染 label 和输入框，确保对齐
    const prop = document.createElement('ui-prop');
    prop.setAttribute('type', 'dump');
    // 克隆 dump 并应用自定义元数据
    const dumpCopy = Object.assign({}, propDump);
    // 应用标签: 优先 labelText，否则用 toDisplayName 转大驼峰
    if (taowuMeta?.labelText) {
        dumpCopy.displayName = taowuMeta.labelText;
    } else {
        const baseName = propDump.name || propName;
        dumpCopy.displayName = toDisplayName(baseName);
    }
    if (taowuMeta?.readOnly) {
        dumpCopy.readonly = true;
    }
    if (taowuMeta?.range) {
        dumpCopy.slide = true;
        dumpCopy.min = taowuMeta.range.min;
        dumpCopy.max = taowuMeta.range.max;
    }
    if (taowuMeta?.textarea) {
        dumpCopy.multiline = true;
    }
    try { (prop as any).dump = dumpCopy; } catch (e) {}
    return prop;
}

// ─── ValueDropdown 渲染 ───

function createValueDropdownElement(
    propDump: any,
    taowuMeta: ITaoWuPropertyMeta,
    compUuid: string,
    compIndex: number,
    propName: string,
    isRendering?: () => boolean
): HTMLElement {
    const vd = taowuMeta.valueDropdown!;
    const propPath = buildPath(propDump, compIndex, propName);
    const isNumber = (propDump.type || '').toLowerCase() === 'number';

    // 使用 ui-prop[type="dump"] + enumList 让 Cocos 原生渲染 label + select
    const prop = document.createElement('ui-prop');
    prop.setAttribute('type', 'dump');
    prop.setAttribute('data-value-dropdown', '');
    const dumpCopy = Object.assign({}, propDump);
    const labelText = taowuMeta.labelText || propDump.displayName || toDisplayName(propName);
    dumpCopy.displayName = labelText;
    if (taowuMeta.readOnly) dumpCopy.readonly = true;
    try { (prop as any).dump = dumpCopy; } catch (e) {}

    function applyEnumList(values: (number | string)[], labels?: string[]): void {
        dumpCopy.enumList = values.map((v, i) => ({
            value: v,
            name: labels && labels[i] ? labels[i] : String(v),
        }));
        dumpCopy.value = isNumber ? Number(propDump.value) : propDump.value;
        // Cocos 需要 type 为 "Enum" 才会渲染 ui-select
        dumpCopy.type = 'Enum';
        try { (prop as any).dump = dumpCopy; } catch (e) {}
        requestAnimationFrame(() => {
            try { (prop as any).render(dumpCopy); } catch (e) {}
            if (taowuMeta.readOnly) prop.setAttribute('disabled', '');
        });
    }

    function setupEnumChange(): void {
        prop.addEventListener('confirm', async (e: Event) => {
            e.stopPropagation();
            const newVal = (prop as any).dump ? (prop as any).dump.value : undefined;
            if (newVal === undefined) return;
            const typedVal = isNumber ? Number(newVal) : newVal;
            propDump.value = typedVal;
            await Editor.Message.request('scene', 'set-property', {
                uuid: compUuid, path: propPath,
                dump: { type: propDump.type, value: typedVal },
            });
        });
    }

    if (vd.values) {
        applyEnumList(vd.values, vd.labels);
        setupEnumChange();
    } else if (vd.memberName) {
        // 先用空 enumList render 占位
        applyEnumList([], []);
        setupEnumChange();

        Editor.Message.request('taowu-inspector', 'resolve-value-dropdown', compUuid, compIndex, vd.memberName)
            .then((result: any) => {
                let values: (number | string)[] = [];
                let labels: string[] | undefined;
                if (Array.isArray(result)) {
                    if (result.length > 0 && typeof result[0] === 'object' && result[0].value !== undefined) {
                        values = result.map((r: any) => r.value);
                        labels = result.map((r: any) => r.label || String(r.value));
                    } else {
                        values = result;
                    }
                }
                const finalLabels = labels || vd.labels;
                applyEnumList(values, finalLabels);
            })
            .catch(() => {
                applyEnumList([], []);
            });
    }

    return prop;
}

/** 创建原始输入元素 (用于 List/TableList/Map 内部，不使用 ui-prop) */
function createRawInputElement(propDump: any, taowuMeta: ITaoWuPropertyMeta | undefined, compUuid?: string, compIndex?: number): HTMLElement {
    const type = (propDump.type || '').toLowerCase();
    const value = propDump.value;

    // ValueDropdown
    if (taowuMeta?.valueDropdown) {
        const vd = taowuMeta.valueDropdown;
        const isNumber = type === 'number';
        const select = document.createElement('ui-select');
        select.style.width = '100%';

        function fillSelect(values: (number | string)[], labels?: string[]): void {
            for (let i = 0; i < values.length; i++) {
                const opt = document.createElement('option');
                opt.value = String(values[i]);
                opt.textContent = labels && labels[i] ? labels[i] : String(values[i]);
                select.appendChild(opt);
            }
            (select as any).value = String(value);
        }

        if (vd.values) {
            fillSelect(vd.values, vd.labels);
        } else if (vd.memberName) {
            // 异步获取选项
            fillSelect([], []);
            if (compUuid && compIndex !== undefined) {
                Editor.Message.request('taowu-inspector', 'resolve-value-dropdown', compUuid, compIndex, vd.memberName)
                    .then((result: any) => {
                        let values: (number | string)[] = [];
                        let labels: string[] | undefined;
                        if (Array.isArray(result)) {
                            if (result.length > 0 && typeof result[0] === 'object' && result[0].value !== undefined) {
                                values = result.map((r: any) => r.value);
                                labels = result.map((r: any) => r.label || String(r.value));
                            } else {
                                values = result;
                            }
                        }
                        const finalLabels = labels || vd.labels;
                        while (select.firstChild) select.removeChild(select.firstChild);
                        fillSelect(values, finalLabels);
                    })
                    .catch(() => {});
            }
        }

        if (taowuMeta.readOnly) select.setAttribute('disabled', '');
        select.addEventListener('confirm', async (e: Event) => {
            e.stopPropagation();
            const newVal = (select as any).value;
            const typedVal = isNumber ? Number(newVal) : newVal;
            propDump.value = typedVal;
        });
        return select;
    }
    // Enum
    if (propDump.enumList && propDump.enumList.length > 0) {
        const select = document.createElement('ui-select');
        for (const item of propDump.enumList) {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.name;
            select.appendChild(option);
        }
        (select as any).value = String(value);
        return select;
    }
    // Boolean
    if (type === 'boolean') {
        const checkbox = document.createElement('ui-checkbox');
        if (value) checkbox.setAttribute('checked', '');
        return checkbox;
    }
    // Number
    if (type === 'number') {
        const numInput = document.createElement('ui-num-input');
        try { (numInput as any).value = value; } catch (e) {}
        return numInput;
    }
    // String
    if (type === 'string') {
        const input = document.createElement('ui-input');
        try { (input as any).value = value || ''; } catch (e) {}
        return input;
    }
    // Fallback
    const input = document.createElement('ui-input');
    try { (input as any).value = typeof value === 'string' ? value : (value != null ? JSON.stringify(value) : ''); } catch (e) {}
    return input;
}

// ─── 多数值输入 (Vec2/Vec3/Vec4/Color/Size 等) ───

function createMultiNumberInput(
    value: any,
    keys: string[],
    propDump: any,
    taowuMeta: ITaoWuPropertyMeta | undefined,
    compUuid: string,
    compIndex: number,
    propName: string,
    isRendering?: () => boolean
): HTMLElement {
    const container = document.createElement('div');
    container.className = 'taowu-multi-num';
    container.style.display = 'flex';
    container.style.gap = '4px';
    container.style.width = '100%';
    container.dataset.multiKeys = keys.join(',');

    const valObj = (typeof value === 'object' && value !== null) ? value : {};

    for (const k of keys) {
        const field = document.createElement('div');
        field.style.flex = '1';

        const numInput = document.createElement('ui-num-input');
        numInput.setAttribute('placeholder', k);
        try { (numInput as any).value = valObj[k] != null ? valObj[k] : 0; } catch (e) {}
        field.appendChild(numInput);

        container.appendChild(numInput);
    }

    // 监听变化: 整体写入
    container.addEventListener('change', async (e: Event) => {
        if (isRendering && isRendering()) return;
        const target = e.target as HTMLElement;
        if (target.tagName.toLowerCase() !== 'ui-num-input') return;

        const inputs = container.querySelectorAll('ui-num-input');
        const newVal: any = {};
        inputs.forEach((inp, idx) => {
            newVal[keys[idx]] = Number((inp as any).value);
        });

        const propPath = buildPath(propDump, compIndex, propName);
        const result = await Editor.Message.request('scene', 'set-property', {
            uuid: compUuid,
            path: propPath,
            dump: { type: propDump.type, value: newVal },
        });

        if (result) {
            propDump.value = newVal;
        }
    });

    return container;
}

// ─── List 渲染 (默认数组, Box 风格) ───

function createListElement(
    propDump: any,
    compUuid: string,
    compIndex: number,
    propName: string,
    isRendering?: () => boolean,
    taowuMeta?: ITaoWuPropertyMeta,
    elementMetadata?: any
): HTMLElement {
    const basePath = buildPath(propDump, compIndex, propName);
    // Cocos dump 中数组 value 是 IProperty[] 或原始值[]
    // 统一解包为原始值数组
    const rawItems: any[] = Array.isArray(propDump.value) ? propDump.value : [];
    // 解包 IProperty: 统一检测有 value + (type/default/name/path) 的对象
    const items: any[] = rawItems.map((item: any) => {
        if (!item || typeof item !== 'object') return item;
        if (item.value !== undefined) {
            const isIProp = item.type !== undefined || item.default !== undefined
                || item.name !== undefined || item.path !== undefined;
            if (isIProp) {
                return item.value;
            }
        }
        return item;
    });
    const elementTypeData = propDump.elementTypeData || { type: 'Number', value: 0 };

    const { container, content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'taowu-collection-items';
    content.appendChild(itemsContainer);

    function renderItems(): void {
        itemsContainer.innerHTML = '';
        for (let i = 0; i < items.length; i++) {
            const itemValue = items[i];
            // 检测是否为 Cocos 内置类型 (Vec3/Color/Size 等)，这些应该走简单行渲染
            const _isCocosType = (() => {
                if (typeof itemValue !== 'object' || itemValue === null || Array.isArray(itemValue)) return false;
                // IProperty 包装: {value: {x:1,y:1,z:1}, type: "cc.Vec3"}
                if (itemValue.type !== undefined && typeof itemValue.value === 'object' && itemValue.value !== null) {
                    const t = itemValue.type;
                    return t === 'cc.Vec3' || t === 'cc.Vec2' || t === 'cc.Vec4' || t === 'cc.Color' || t === 'cc.Size' || t === 'cc.Quat';
                }
                // 解包后: {x:1, y:1, z:1}
                const keys = Object.keys(itemValue);
                const hasXYZ = keys.includes('x') && keys.includes('y');
                const hasRGB = keys.includes('r') && keys.includes('g') && keys.includes('b');
                const hasWH = keys.includes('width') && keys.includes('height');
                return hasXYZ || hasRGB || hasWH;
            })();
            const isObj = typeof itemValue === 'object' && itemValue !== null && !Array.isArray(itemValue) && !_isCocosType;
            if (isObj) {
                // 对象元素: 删除按钮 + 可折叠 ui-section (同级)
                const wrapper = document.createElement('div');
                wrapper.className = 'taowu-collection-item-wrapper';
                const _elemTypeName = propDump.elementTypeData?.type;
                const _elemMeta = (_elemTypeName && elementMetadata && elementMetadata[_elemTypeName]) || {};
                const delBtn = createDelButton('×');
                delBtn.addEventListener('click', async (ev: Event) => {
                    ev.stopPropagation();
                    items.splice(i, 1);
                    await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: `${basePath}.length`, dump: { value: items.length } });
                    propDump.value = [...items];
                    updateHeader();
                    renderItems();
                    if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                });
                wrapper.appendChild(delBtn);
                const itemBox = document.createElement('ui-section');
                itemBox.className = 'taowu-collection-item-box';
                itemBox.setAttribute('header', `${_elemTypeName || 'Element'} ${i}`);
                const itemContent = document.createElement('div');
                itemContent.className = 'taowu-collection-item-content';
                const stop = (e: Event) => e.stopPropagation();
                itemContent.addEventListener('click', stop);
                itemContent.addEventListener('mousedown', stop);
                itemContent.addEventListener('pointerdown', stop);
                itemContent.addEventListener('change', stop);
                itemContent.addEventListener('confirm', stop);
                const unwrapped = (itemValue.value !== undefined && itemValue.type !== undefined && typeof itemValue.value === 'object')
                    ? itemValue.value : itemValue;
                const keys = Object.keys(unwrapped);
                for (const subKey of keys) {
                    const subRow = document.createElement('div');
                    subRow.className = 'taowu-collection-row';
                    const subLabel = document.createElement('span');
                    subLabel.className = 'taowu-collection-label';
                    subLabel.textContent = _elemMeta[subKey]?.labelText || toDisplayName(subKey);
                    subRow.appendChild(subLabel);
                    const subField = document.createElement('div');
                    subField.className = 'taowu-collection-field';
                    let subVal = unwrapped[subKey];
                    let subType = 'String';
                    let subPath = `${basePath}.${i}.${subKey}`;
                    let rawSubDump: any = null;
                    if (subVal && typeof subVal === 'object' && subVal.value !== undefined && subVal.type !== undefined) {
                        subType = subVal.type;
                        subVal = subVal.value;
                        rawSubDump = unwrapped[subKey];
                        if (rawSubDump && rawSubDump.path) { subPath = rawSubDump.path; }
                    } else {
                        subType = typeof subVal === 'number' ? 'Number' : typeof subVal === 'boolean' ? 'Boolean' : 'String';
                    }
                    const subDump = { value: subVal, type: subType };
                    const _isNestedObj = typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal) && subType !== 'Number' && subType !== 'Boolean' && subType !== 'String' && !subType.toLowerCase().startsWith('cc.');
                    const subInput = createInputElement(subDump, _elemMeta[subKey], compUuid, compIndex, propName, isRendering, !_isNestedObj, elementMetadata);
                    subField.appendChild(subInput);
                    const isSubInput = subInput.tagName.toLowerCase() === 'ui-input';
                    if (isSubInput) {
                        subInput.addEventListener('confirm', async (e: Event) => {
                            e.stopPropagation();
                            const newVal = getInputValue(subInput, subDump);
                            unwrapped[subKey] = newVal;
                            items[i] = { ...unwrapped };
                            const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                            await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: subPath, dump: setDump });
                            if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                        });
                    } else {
                        subInput.addEventListener('change', async () => {
                            if (isRendering && isRendering()) return;
                            const newVal = getInputValue(subInput, subDump);
                            unwrapped[subKey] = newVal;
                            items[i] = { ...unwrapped };
                            const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                            await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: subPath, dump: setDump });
                            if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                        });
                    }
                    subRow.appendChild(subField);
                    itemContent.appendChild(subRow);
                }
                itemBox.appendChild(itemContent);
                wrapper.appendChild(itemBox);
                itemsContainer.appendChild(wrapper);
            } else {
                // 简单类型 / Cocos 类型元素: 序号 + 内容 + 删除 (单行)
                const itemRow = document.createElement('div');
                itemRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin:1px 0;width:100%;';
                const indexLabel = document.createElement('span');
                indexLabel.style.cssText = 'flex:0 0 20px;font-size:11px;color:#888;text-align:center;';
                indexLabel.textContent = String(i);
                itemRow.appendChild(indexLabel);
                const itemContent = document.createElement('div');
                itemContent.style.cssText = 'flex:1 1 auto;min-width:0;overflow:hidden;';
                const _useRaw = !_isCocosType;
                let itemDump: any, itemPath: string;
                if (_isCocosType) {
                    // Cocos 类型: 使用原始 rawItems[i] 保留子属性 path，补上 type 和 displayName
                    const rawItem = rawItems[i];
                    itemDump = Object.assign({}, rawItem, { type: elementTypeData.type || 'cc.Vec3', displayName: '', name: '' });
                    itemPath = (rawItem && rawItem.path) ? rawItem.path : `${basePath}.${i}`;
                } else {
                    const itemType = elementTypeData.type || (typeof items[i] === 'number' ? 'Number' : 'String');
                    itemDump = { value: items[i], type: itemType };
                    itemPath = `${basePath}.${i}`;
                }
                const itemInput = createInputElement(itemDump, taowuMeta, compUuid, compIndex, propName, isRendering, _useRaw);
                itemContent.appendChild(itemInput);
                const _itemType = itemDump.type;
                if (itemInput.tagName.toLowerCase() === 'ui-prop') {
                    requestAnimationFrame(() => {
                        try { (itemInput as any).dump = itemDump; } catch (e) {}
                        try { (itemInput as any).render(itemDump); } catch (e) {}
                    });
                    itemInput.addEventListener('change-dump', async () => {
                        if (isRendering && isRendering()) return;
                        const newDump = (itemInput as any).dump;
                        if (!newDump) return;
                        items[i] = newDump.value;
                        await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: itemPath, dump: newDump });
                        propDump.value[i] = newDump.value;
                        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                    });
                } else {
                    itemInput.addEventListener('change', async () => {
                        if (isRendering && isRendering()) return;
                        const newVal = getInputValue(itemInput, itemDump);
                        items[i] = newVal;
                        await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: itemPath, dump: { type: _itemType, value: newVal } });
                        propDump.value[i] = newVal;
                        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                    });
                }
                itemRow.appendChild(itemContent);
                // 删除按钮: 固定宽度，不被挤压
                const delBtn = document.createElement('span');
                delBtn.textContent = '×';
                delBtn.style.cssText = 'flex:0 0 22px;width:22px;min-width:22px;max-width:22px;color:#c55;text-align:center;padding:2px 0;cursor:pointer;font-size:14px;user-select:none;';
                delBtn.addEventListener('mouseenter', () => { delBtn.style.color = '#f77'; });
                delBtn.addEventListener('mouseleave', () => { delBtn.style.color = '#c55'; });
                delBtn.addEventListener('click', async () => {
                    items.splice(i, 1);
                    await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: `${basePath}.length`, dump: { value: items.length } });
                    propDump.value = [...items];
                    updateHeader();
                    renderItems();
                    if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                });
                itemRow.appendChild(delBtn);
                itemsContainer.appendChild(itemRow);
            }
        }
    }

    function updateHeader(): void {
        container.setAttribute('header', `${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`);
    }

    renderItems();

    const addBtn = createAddButton('+ 添加');
    addBtn.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        const defaultVal = elementTypeData.value != null ? elementTypeData.value : 0;
        const newIdx = items.length;
        await Editor.Message.request('scene', 'set-property', {
            uuid: compUuid, path: `${basePath}.length`,
            dump: { value: newIdx + 1 },
        });
        await Editor.Message.request('scene', 'set-property', {
            uuid: compUuid, path: `${basePath}.${newIdx}`,
            dump: { type: elementTypeData.type, value: defaultVal },
        });
        items.push(defaultVal);
        updateHeader();
        renderItems();
        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
    });
    content.appendChild(addBtn);

    return container;
}

// ─── TableList 渲染 (可折叠表格列表, Box 风格) ───

function createTableListElement(
    propDump: any,
    compUuid: string,
    compIndex: number,
    propName: string,
    isRendering?: () => boolean,
    taowuMeta?: ITaoWuPropertyMeta,
    elementMetadata?: any
): HTMLElement {
    const basePath = buildPath(propDump, compIndex, propName);
    // 解包 IProperty[] 为原始值[]
    let rawItems: any[] = [];
    if (Array.isArray(propDump.value)) {
        rawItems = propDump.value;
    } else if (propDump.value && typeof propDump.value === 'object') {
        // 有些 dump 格式中数组值可能是对象 {0: ..., 1: ..., length: 3}
        const valObj = propDump.value as any;
        if (valObj.length != null) {
            for (let k = 0; k < valObj.length; k++) {
                rawItems.push(valObj[k]);
            }
        }
    }
    const items: any[] = rawItems.map((item: any) => {
        if (!item || typeof item !== 'object') return item;
        // 检测 IProperty 包装: 有 value 字段且有 type/default/name/path 之一
        if (item.value !== undefined) {
            const isIProp = item.type !== undefined || item.default !== undefined
                || item.name !== undefined || item.path !== undefined;
            if (isIProp && typeof item.value === 'object' && item.value !== null) {
                return item.value;
            }
            // value 是原始值 (Number/String/Boolean)
            if (isIProp) {
                return item.value;
            }
        }
        return item;
    });
    const elementTypeData = propDump.elementTypeData;

    const { container, content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'taowu-collection-items';
    content.appendChild(itemsContainer);

    function renderItems(): void {
        itemsContainer.innerHTML = '';
        // 表头行
        if (items.length > 0) {
            const firstItem = items[0];
            if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
                const firstUnwrapped = (firstItem.value !== undefined && firstItem.type !== undefined && typeof firstItem.value === 'object')
                    ? firstItem.value : firstItem;
                const firstKeys = Object.keys(firstUnwrapped);
                const firstIsCocos = (firstKeys.includes('x') && firstKeys.includes('y')) || firstKeys.includes('r') || firstKeys.includes('width');
                if (!firstIsCocos) {
                    const headerRow = document.createElement('div');
                    headerRow.className = 'taowu-table-row taowu-table-header';
                    const headerIndex = document.createElement('span');
                    headerIndex.className = 'taowu-table-index';
                    headerIndex.textContent = '#';
                    headerRow.appendChild(headerIndex);
                    const elemTypeName = propDump.elementTypeData?.type;
                    const elemMeta = (elemTypeName && elementMetadata && elementMetadata[elemTypeName]) || {};
                    for (const key of firstKeys) {
                        const cell = document.createElement('div');
                        cell.className = 'taowu-table-cell';
                        cell.textContent = elemMeta[key]?.labelText || toDisplayName(key);
                        headerRow.appendChild(cell);
                    }
                    const spacer = document.createElement('span');
                    spacer.className = 'taowu-table-index';
                    spacer.textContent = '';
                    headerRow.appendChild(spacer);
                    itemsContainer.appendChild(headerRow);
                }
            }
        }
        for (let i = 0; i < items.length; i++) {
            // 普通对象 (MapEntry 等) 使用表格行风格
            const _itemValue = items[i];
            if (typeof _itemValue === 'object' && _itemValue !== null && !Array.isArray(_itemValue)) {
                const _unwrapped = (_itemValue.value !== undefined && _itemValue.type !== undefined && typeof _itemValue.value === 'object')
                    ? _itemValue.value : _itemValue;
                const _keys = Object.keys(_unwrapped);
                const _isCocos = (_keys.includes('x') && _keys.includes('y')) || _keys.includes('r') || _keys.includes('width');
                const _elemTypeName = propDump.elementTypeData?.type;
                const _elemMeta = (_elemTypeName && elementMetadata && elementMetadata[_elemTypeName]) || {};
                if (!_isCocos) {
                    const tableRow = document.createElement('div');
                    tableRow.className = 'taowu-table-row';
                    const indexSpan = document.createElement('span');
                    indexSpan.className = 'taowu-table-index';
                    indexSpan.textContent = String(i);
                    tableRow.appendChild(indexSpan);
                    for (const subKey of _keys) {
                        const cell = document.createElement('div');
                        cell.className = 'taowu-table-cell';
                        let subVal = _unwrapped[subKey];
                        let subType = 'String';
                        let subPath = `${basePath}.${i}.${subKey}`;
                        let rawSubDump: any = null;
                        if (subVal && typeof subVal === 'object' && subVal.value !== undefined && subVal.type !== undefined) {
                            subType = subVal.type;
                            subVal = subVal.value;
                            rawSubDump = _unwrapped[subKey];
                            if (rawSubDump && rawSubDump.path) { subPath = rawSubDump.path; }
                        } else {
                            subType = typeof subVal === 'number' ? 'Number' : typeof subVal === 'boolean' ? 'Boolean' : 'String';
                        }
                        const subDump = { value: subVal, type: subType };
                        const _isNestedObj = typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal) && subType !== 'Number' && subType !== 'Boolean' && subType !== 'String' && !subType.toLowerCase().startsWith('cc.');
                        const subInput = createInputElement(subDump, _elemMeta[subKey], compUuid, compIndex, propName, isRendering, !_isNestedObj, elementMetadata);
                        cell.appendChild(subInput);
                        const isSubInput = subInput.tagName.toLowerCase() === 'ui-input';
                        if (isSubInput) {
                            subInput.addEventListener('confirm', async (e: Event) => {
                                e.stopPropagation();
                                const newVal = getInputValue(subInput, subDump);
                                _unwrapped[subKey] = newVal;
                                const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                                await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: subPath, dump: setDump });
                            });
                        } else {
                            subInput.addEventListener('change', async () => {
                                if (isRendering && isRendering()) return;
                                const newVal = getInputValue(subInput, subDump);
                                _unwrapped[subKey] = newVal;
                                const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                                await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: subPath, dump: setDump });
                            });
                        }
                        tableRow.appendChild(cell);
                    }
                    const tblDelBtn = createDelButton('×');
                    tblDelBtn.addEventListener('click', async () => {
                        items.splice(i, 1);
                        await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: `${basePath}.length`, dump: { value: items.length } });
                        for (let j = 0; j < items.length; j++) {
                            const v = items[j];
                            if (typeof v === 'object' && v !== null) {
                                await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: `${basePath}.${j}`, dump: { type: propDump.elementTypeData?.type || 'Object', value: JSON.parse(JSON.stringify(v)) } });
                            } else {
                                await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: `${basePath}.${j}`, dump: { type: typeof v === 'number' ? 'Number' : 'String', value: v } });
                            }
                        }
                        propDump.value = [...items];
                        updateHeader();
                        renderItems();
                    });
                    tableRow.appendChild(tblDelBtn);
                    itemsContainer.appendChild(tableRow);
                    continue;
                }
                // Cocos 类型 (Vec3/Color/Size 等): 表格行风格 # - ui-prop - ×
                if (_isCocos) {
                    const tableRow = document.createElement('div');
                    tableRow.className = 'taowu-table-row';
                    const indexSpan = document.createElement('span');
                    indexSpan.className = 'taowu-table-index';
                    indexSpan.textContent = String(i);
                    tableRow.appendChild(indexSpan);
                    const cell = document.createElement('div');
                    cell.className = 'taowu-table-cell';
                    // 使用原始 rawItems[i] 保留子属性 path
                    const rawItem = rawItems[i];
                    const itemDump: any = Object.assign({}, rawItem, { type: propDump.elementTypeData?.type || 'cc.Vec3', displayName: '', name: '' });
                    const itemPath = (rawItem && rawItem.path) ? rawItem.path : `${basePath}.${i}`;
                    const prop = document.createElement('ui-prop');
                    prop.setAttribute('type', 'dump');
                    try { (prop as any).dump = itemDump; } catch (e) {}
                    cell.appendChild(prop);
                    requestAnimationFrame(() => {
                        try { (prop as any).dump = itemDump; } catch (e) {}
                        try { (prop as any).render(itemDump); } catch (e) {}
                    });
                    prop.addEventListener('change-dump', async () => {
                        if (isRendering && isRendering()) return;
                        const newDump = (prop as any).dump;
                        if (!newDump) return;
                        items[i] = newDump.value;
                        await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: itemPath, dump: newDump });
                        propDump.value[i] = newDump.value;
                        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                    });
                    tableRow.appendChild(cell);
                    const tblDelBtn = document.createElement('span');
                    tblDelBtn.textContent = '×';
                    tblDelBtn.style.cssText = 'flex:0 0 22px;width:22px;min-width:22px;max-width:22px;color:#c55;text-align:center;padding:2px 0;cursor:pointer;font-size:14px;user-select:none;overflow:visible;';
                    tblDelBtn.addEventListener('mouseenter', () => { tblDelBtn.style.color = '#f77'; });
                    tblDelBtn.addEventListener('mouseleave', () => { tblDelBtn.style.color = '#c55'; });
                    tblDelBtn.addEventListener('click', async () => {
                        items.splice(i, 1);
                        await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: `${basePath}.length`, dump: { value: items.length } });
                        for (let j = 0; j < items.length; j++) {
                            const v = items[j];
                            if (typeof v === 'object' && v !== null) {
                                await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: `${basePath}.${j}`, dump: { type: propDump.elementTypeData?.type || 'Object', value: JSON.parse(JSON.stringify(v)) } });
                            } else {
                                await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: `${basePath}.${j}`, dump: { type: typeof v === 'number' ? 'Number' : 'String', value: v } });
                            }
                        }
                        propDump.value = [...items];
                        updateHeader();
                        renderItems();
                    });
                    tableRow.appendChild(tblDelBtn);
                    itemsContainer.appendChild(tableRow);
                    continue;
                }
            }
            const itemBox = document.createElement('div');
            itemBox.className = 'taowu-collection-item-box';

            const itemHeader = document.createElement('div');
            itemHeader.className = 'taowu-collection-item-header';
            itemHeader.textContent = `Element ${i}`;

            const delBtn = createDelButton('×');
            delBtn.addEventListener('click', async () => {
                const removed = items.splice(i, 1);
                // 重建整个数组: 先设长度，再逐个设置元素
                await Editor.Message.request('scene', 'set-property', {
                    uuid: compUuid, path: `${basePath}.length`,
                    dump: { value: items.length },
                });
                for (let j = 0; j < items.length; j++) {
                    const v = items[j];
                    if (typeof v === 'object' && v !== null) {
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: compUuid, path: `${basePath}.${j}`,
                            dump: { type: propDump.elementTypeData?.type || 'Object', value: JSON.parse(JSON.stringify(v)) },
                        });
                    } else {
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: compUuid, path: `${basePath}.${j}`,
                            dump: { type: typeof v === 'number' ? 'Number' : 'String', value: v },
                        });
                    }
                }
                propDump.value = [...items];
                updateHeader();
                renderItems();
            });
            itemHeader.appendChild(delBtn);
            itemBox.appendChild(itemHeader);

            const itemContent = document.createElement('div');
            itemContent.className = 'taowu-collection-item-content';

            const itemValue = items[i];
            const isObject = typeof itemValue === 'object' && itemValue !== null && !Array.isArray(itemValue);

            if (isObject) {
                // 解包 IProperty 包装: { value: {...}, type: "cc.Vec3" } → 取 value
                const unwrapped = (itemValue.value !== undefined && itemValue.type !== undefined && typeof itemValue.value === 'object')
                    ? itemValue.value : itemValue;
                const keys = Object.keys(unwrapped);
                const isVec2 = keys.includes('x') && keys.includes('y') && !keys.includes('z');
                const isVec3 = keys.includes('x') && keys.includes('y') && keys.includes('z') && !keys.includes('w');
                const isVec4 = keys.includes('x') && keys.includes('y') && keys.includes('z') && keys.includes('w');
                const isColor = keys.includes('r') && keys.includes('g') && keys.includes('b');
                const isSize = keys.includes('width') && keys.includes('height');

                if (isVec2 || isVec3 || isVec4 || isColor || isSize) {
                    let itemType = 'cc.Vec3';
                    if (isVec2) itemType = 'cc.Vec2';
                    else if (isVec3) itemType = 'cc.Vec3';
                    else if (isVec4) itemType = 'cc.Vec4';
                    else if (isColor) itemType = 'cc.Color';
                    else if (isSize) itemType = 'cc.Size';

                    // 使用 ui-prop + dump 渲染，与 Cocos 原生 Inspector 一致
                    const prop = document.createElement('ui-prop');
                    prop.setAttribute('type', 'dump');
                    const itemDump: any = {
                        value: unwrapped,
                        type: itemType,
                        path: `${basePath}.${i}`,
                    };
                    try { (prop as any).dump = itemDump; } catch (e) {}
                    // 挂载后再 render
                    itemContent.appendChild(prop);
                    try { (prop as any).render(itemDump); } catch (e) {}
                    try { (prop as any).dump = itemDump; } catch (e) {}

                    prop.addEventListener('change-dump', async () => {
                        if (isRendering && isRendering()) return;
                        const newVal = (prop as any).dump ? (prop as any).dump.value : undefined;
                        if (newVal === undefined) return;
                        items[i] = newVal;
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: compUuid, path: `${basePath}.${i}`,
                            dump: { type: itemType, value: newVal },
                        });
                        propDump.value[i] = newVal;
                        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                    });
                } else {
                    // 普通对象: 渲染每个子属性
                    const _elemTypeName = propDump.elementTypeData?.type;
                    const _elemMeta = (_elemTypeName && elementMetadata && elementMetadata[_elemTypeName]) || {};
                    for (const subKey of keys) {
                        const subRow = document.createElement('div');
                        subRow.className = 'taowu-collection-row';

                        const subLabel = document.createElement('span');
                        subLabel.className = 'taowu-collection-label';
                        subLabel.textContent = _elemMeta[subKey]?.labelText || toDisplayName(subKey);
                        subRow.appendChild(subLabel);

                        const subField = document.createElement('div');
                        subField.className = 'taowu-collection-field';

                        // 解包子属性 IProperty
                        let subVal = unwrapped[subKey];
                        let subType = 'String';
                        let subPath = `${basePath}.${i}.${subKey}`;
                        let rawSubDump: any = null;
                        if (subVal && typeof subVal === 'object' && subVal.value !== undefined && subVal.type !== undefined) {
                            subType = subVal.type;
                            subVal = subVal.value;
                            rawSubDump = unwrapped[subKey];
                            // 使用 dump 中的原始 path，不做格式转换
                            if (rawSubDump && rawSubDump.path) {
                                subPath = rawSubDump.path;
                            }
                        } else {
                            subType = typeof subVal === 'number' ? 'Number'
                                : typeof subVal === 'boolean' ? 'Boolean' : 'String';
                        }
                        const subDump = { value: subVal, type: subType };
                        const _isNestedObj = typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal) && subType !== 'Number' && subType !== 'Boolean' && subType !== 'String' && !subType.toLowerCase().startsWith('cc.');
                        const subInput = createInputElement(subDump, _elemMeta[subKey], compUuid, compIndex, propName, isRendering, !_isNestedObj, elementMetadata);
                        subField.appendChild(subInput);

                        const isSubInput = subInput.tagName.toLowerCase() === 'ui-input';
                        if (isSubInput) {
                            subInput.addEventListener('confirm', async (e: Event) => {
                                e.stopPropagation();
                                const newVal = getInputValue(subInput, subDump);
                                unwrapped[subKey] = newVal;
                                const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                                await Editor.Message.request('scene', 'set-property', {
                                    uuid: compUuid, path: subPath,
                                    dump: setDump,
                                });
                            });
                        } else {
                            subInput.addEventListener('change', async () => {
                                if (isRendering && isRendering()) return;
                                const newVal = getInputValue(subInput, subDump);
                                unwrapped[subKey] = newVal;
                                const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                                await Editor.Message.request('scene', 'set-property', {
                                    uuid: compUuid, path: subPath,
                                    dump: setDump,
                                });
                            });
                        }

                        subRow.appendChild(subField);
                        itemContent.appendChild(subRow);
                    }
                }
            } else {
                // 简单类型 / Cocos 类型元素: 表格行风格 # - 内容 - ×
                const tableRow = document.createElement('div');
                tableRow.className = 'taowu-table-row';
                const indexSpan = document.createElement('span');
                indexSpan.className = 'taowu-table-index';
                indexSpan.textContent = String(i);
                tableRow.appendChild(indexSpan);
                const cell = document.createElement('div');
                cell.className = 'taowu-table-cell';
                const itemDump = {
                    value: itemValue,
                    type: typeof itemValue === 'number' ? 'Number' : 'String',
                };
                const itemInput = createInputElement(itemDump, taowuMeta, compUuid, compIndex, propName, isRendering, true);
                cell.appendChild(itemInput);

                itemInput.addEventListener('change', async () => {
                    if (isRendering && isRendering()) return;
                    const newVal = getInputValue(itemInput, itemDump);
                    items[i] = newVal;
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: compUuid, path: `${basePath}.${i}`,
                        dump: { type: itemDump.type, value: newVal },
                    });
                    propDump.value[i] = newVal;
                    if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                });
                tableRow.appendChild(cell);
                const tblDelBtn = createDelButton('×');
                tblDelBtn.addEventListener('click', async () => {
                    items.splice(i, 1);
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: compUuid, path: `${basePath}.length`,
                        dump: { value: items.length },
                    });
                    propDump.value = [...items];
                    updateHeader();
                    renderItems();
                    if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                });
                    tableRow.appendChild(tblDelBtn);
                    itemsContainer.appendChild(tableRow);
                    continue;
                }
                itemBox.appendChild(itemContent);
                itemsContainer.appendChild(itemBox);
        }
        // 数据行渲染完成后，同步表头列宽
        const headerEl = itemsContainer.querySelector('.taowu-table-header');
        if (headerEl) syncColumnWidths(headerEl as HTMLElement, itemsContainer);
    }

    function updateHeader(): void {
        container.setAttribute('header', `${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`);
    }

    renderItems();

    const addBtn = createAddButton('+ 添加元素');
    addBtn.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        const newIdx = items.length;
        const template = items[0];

        // 检测模板类型
        let isCocosValue = false;
        if (template && typeof template === 'object') {
            const keys = Object.keys(template);
            const hasXYZ = keys.includes('x') && keys.includes('y') && keys.includes('z');
            const hasRGBA = keys.includes('r') && keys.includes('g') && keys.includes('b');
            const hasWH = keys.includes('width') && keys.includes('height');
            isCocosValue = hasXYZ || hasRGBA || hasWH;
        }

        if (isCocosValue) {
            // Vec3/Vec4/Color/Size: 设置整个元素，不拆分子属性
            let itemType = 'cc.Vec3';
            let itemVal: any = template;
            if (template.r !== undefined) itemType = 'cc.Color';
            else if (template.width !== undefined) itemType = 'cc.Size';
            else if (template.w !== undefined) itemType = 'cc.Vec4';

            // 先设置长度
            await Editor.Message.request('scene', 'set-property', {
                uuid: compUuid, path: `${basePath}.length`,
                dump: { value: newIdx + 1 },
            });
            // 再设置整个元素值
            await Editor.Message.request('scene', 'set-property', {
                uuid: compUuid, path: `${basePath}.${newIdx}`,
                dump: { type: itemType, value: JSON.parse(JSON.stringify(template)) },
            });
        } else if (template && typeof template === 'object') {
            // MapEntry 等自定义类: 整体设置元素，保留 IProperty 结构
            const rawTemplate = JSON.parse(JSON.stringify(template));
            await Editor.Message.request('scene', 'set-property', {
                uuid: compUuid, path: `${basePath}.length`,
                dump: { value: newIdx + 1 },
            });
            await Editor.Message.request('scene', 'set-property', {
                uuid: compUuid, path: `${basePath}.${newIdx}`,
                dump: { type: propDump.elementTypeData?.type || 'Object', value: rawTemplate },
            });
        } else if (template != null) {
            // 简单类型
            await Editor.Message.request('scene', 'set-property', {
                uuid: compUuid, path: `${basePath}.length`,
                dump: { value: newIdx + 1 },
            });
            await Editor.Message.request('scene', 'set-property', {
                uuid: compUuid, path: `${basePath}.${newIdx}`,
                dump: { type: typeof template === 'number' ? 'Number' : 'String', value: template },
            });
        }
        // 将新元素加入本地数组并重新渲染
        if (isCocosValue) {
            items.push(JSON.parse(JSON.stringify(template)));
        } else if (template && typeof template === 'object') {
            const newObj: any = {};
            for (const subKey of Object.keys(template)) {
                let subVal = template[subKey];
                if (subVal && typeof subVal === 'object' && subVal.value !== undefined) {
                    subVal = subVal.value;
                }
                newObj[subKey] = subVal;
            }
            items.push(newObj);
        } else if (template != null) {
            items.push(template);
        } else {
            items.push(0);
        }
        updateHeader();
        renderItems();
        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
    });
    content.appendChild(addBtn);

    return container;
}

// ─── 字典 TableList 渲染 (Record<string, V> + @TableList) ───
function buildCleanDict(valueObj: any): any {
    const result: any = {};
    for (const k in valueObj) {
        const v = valueObj[k];
        if (v && typeof v === 'object' && v.value !== undefined && v.type !== undefined) {
            result[k] = v.value;
        } else {
            result[k] = v;
        }
    }
    return result;
}
function createDictTableElement(
    propDump: any,
    compUuid: string,
    compIndex: number,
    propName: string,
    isRendering?: () => boolean,
    taowuMeta?: ITaoWuPropertyMeta
): HTMLElement {
    const basePath = buildPath(propDump, compIndex, propName);
    let valueObj: any = propDump.value || {};
    let keys = Object.keys(valueObj);
    const { container, content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${keys.length})`);
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'taowu-collection-items';
    content.appendChild(itemsContainer);

    function renderItems(): void {
        itemsContainer.innerHTML = '';
        keys = Object.keys(valueObj);
        // 表头
        {
            const headerRow = document.createElement('div');
            headerRow.className = 'taowu-table-row taowu-table-header';
            const hIdx = document.createElement('span');
            hIdx.className = 'taowu-table-index'; hIdx.textContent = '#';
            headerRow.appendChild(hIdx);
            const hKey = document.createElement('div');
            hKey.className = 'taowu-table-cell'; hKey.textContent = 'Key';
            headerRow.appendChild(hKey);
            const hVal = document.createElement('div');
            hVal.className = 'taowu-table-cell'; hVal.textContent = 'Value';
            headerRow.appendChild(hVal);
            const spacer = document.createElement('span');
            spacer.className = 'taowu-table-index'; spacer.textContent = '';
            headerRow.appendChild(spacer);
            itemsContainer.appendChild(headerRow);
        }
        // 数据行
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            let val = valueObj[key];
            let rawValDump: any = null;
            if (val && typeof val === 'object' && val.value !== undefined && val.type !== undefined) {
                rawValDump = val;
                val = val.value;
            }
            const valType = typeof val === 'number' ? 'Number' : typeof val === 'boolean' ? 'Boolean' : 'String';
            const tableRow = document.createElement('div');
            tableRow.className = 'taowu-table-row';
            const indexSpan = document.createElement('span');
            indexSpan.className = 'taowu-table-index';
            indexSpan.textContent = String(i);
            tableRow.appendChild(indexSpan);
            // Key 输入
            const keyCell = document.createElement('div');
            keyCell.className = 'taowu-table-cell';
            const keyInput = document.createElement('ui-input');
            keyInput.style.width = '100%';
            try { (keyInput as any).value = key; } catch (e) {}
            keyCell.appendChild(keyInput);
            tableRow.appendChild(keyCell);
            // Value 输入
            const valCell = document.createElement('div');
            valCell.className = 'taowu-table-cell';
            const valDump = { value: val, type: valType };
            const valInput = createInputElement(valDump, undefined, compUuid, compIndex, propName, isRendering, true);
            valCell.appendChild(valInput);
            tableRow.appendChild(valCell);
            // 事件: Key 修改
            ((k: string, ki: HTMLElement) => {
                ki.addEventListener('confirm', async (e: Event) => {
                    e.stopPropagation();
                    const newKey = (ki as any).value;
                    if (newKey === k) return;
                    if (valueObj[newKey] !== undefined) {
                        console.error('[TaoWuInspector] 字典 key 已存在:', newKey);
                        (ki as any).value = k;
                        return;
                    }
                    valueObj[newKey] = valueObj[k];
                    delete valueObj[k];
                    // 通过 scene-script 直接修改组件属性 (绕过 set-property 的 dump 限制)
                    const cleanVal = buildCleanDict(valueObj);
                    await Editor.Message.request('scene', 'execute-scene-script', {
                        name: 'taowu-inspector', method: 'setDictValue',
                        args: [compUuid, basePath, cleanVal]
                    });
                    renderItems();
                });
            })(key, keyInput);
            // 事件: Value 修改
            ((k: string, vi: HTMLElement, vd: any) => {
                const isVi = vi.tagName.toLowerCase() === 'ui-input';
                if (isVi) {
                    vi.addEventListener('confirm', async (e: Event) => {
                        e.stopPropagation();
                        const newVal = getInputValue(vi, vd);
                        valueObj[k] = newVal;
                        const setDump: any = rawValDump ? Object.assign({}, rawValDump, { value: newVal }) : { type: valType, value: newVal };
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: compUuid, path: basePath + '.' + k,
                            dump: setDump
                        });
                        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                    });
                } else {
                    vi.addEventListener('change', async () => {
                        if (isRendering && isRendering()) return;
                        const newVal = getInputValue(vi, vd);
                        valueObj[k] = newVal;
                        const setDump: any = rawValDump ? Object.assign({}, rawValDump, { value: newVal }) : { type: valType, value: newVal };
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: compUuid, path: basePath + '.' + k,
                            dump: setDump
                        });
                        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                    });
                }
            })(key, valInput, valDump);
            // 删除按钮
            const delBtn = document.createElement('span');
            delBtn.textContent = '×';
            delBtn.style.cssText = 'flex:0 0 22px;width:22px;min-width:22px;max-width:22px;color:#c55;text-align:center;padding:2px 0;cursor:pointer;font-size:14px;user-select:none;overflow:visible;';
            delBtn.addEventListener('mouseenter', () => { delBtn.style.color = '#f77'; });
            delBtn.addEventListener('mouseleave', () => { delBtn.style.color = '#c55'; });
            ((k: string) => {
                delBtn.addEventListener('click', async () => {
                    delete valueObj[k];
                    const cleanVal = buildCleanDict(valueObj);
                    await Editor.Message.request('scene', 'execute-scene-script', {
                        name: 'taowu-inspector', method: 'setDictValue',
                        args: [compUuid, basePath, cleanVal]
                    });
                    renderItems();
                });
            })(key);
            tableRow.appendChild(delBtn);
            itemsContainer.appendChild(tableRow);
        }
        // 添加区: Key 输入 + 添加按钮
        const addRow = document.createElement('div');
        addRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:4px;';
        const addKeyInput = document.createElement('ui-input');
        addKeyInput.setAttribute('placeholder', '输入 Key');
        addKeyInput.style.cssText = 'flex:1;min-width:0;';
        addRow.appendChild(addKeyInput);
        const addBtn = document.createElement('div');
        addBtn.className = 'taowu-list-btn taowu-list-btn-add';
        addBtn.textContent = '+ 添加';
        addRow.appendChild(addBtn);
        addBtn.addEventListener('click', async () => {
            const newKey = (addKeyInput as any).value;
            if (!newKey) {
                console.error('[TaoWuInspector] 请输入 Key');
                return;
            }
            if (valueObj[newKey] !== undefined) {
                console.error('[TaoWuInspector] 字典 key 已存在:', newKey);
                return;
            }
            const firstKey = Object.keys(valueObj)[0];
            const defaultVal = firstKey !== undefined ? (typeof valueObj[firstKey] === 'number' ? 0 : '') : 0;
            valueObj[newKey] = defaultVal;
            const cleanVal = buildCleanDict(valueObj);
            await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector', method: 'setDictValue',
                args: [compUuid, basePath, cleanVal]
            });
            (addKeyInput as any).value = '';
            renderItems();
        });
        itemsContainer.appendChild(addRow);
        // 同步列宽
        const headerEl = itemsContainer.querySelector('.taowu-table-header');
        if (headerEl) syncColumnWidths(headerEl as HTMLElement, itemsContainer);
    }

    function updateHeader(): void {
        container.setAttribute('header', `${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${keys.length})`);
    }
    renderItems();
    return container;
}

// ─── Map 渲染 (对象/字典, Box 风格) ───

function createMapElement(
    propDump: any,
    compUuid: string,
    compIndex: number,
    propName: string,
    isRendering?: () => boolean,
    taowuMeta?: ITaoWuPropertyMeta,
    elementMetadata?: any
): HTMLElement {
    const basePath = buildPath(propDump, compIndex, propName);
    const valueObj: Record<string, any> = propDump.value || {};
    const keys = Object.keys(valueObj);

    const { container, content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${keys.length})`);

    // 获取元素类型元数据用于 LabelText
    const _elemTypeName = propDump.type;
    let _elemMeta = (_elemTypeName && elementMetadata && elementMetadata[_elemTypeName]) || {};

    // 如果元数据中没有该类型，异步查询
    if (_elemTypeName && !_elemMeta && _elemTypeName !== 'Object' && !_elemTypeName.startsWith('cc.')) {
        Editor.Message.request('taowu-inspector', 'query-taowu-metadata', _elemTypeName).then((em: any) => {
            if (em) {
                _elemMeta = em;
                if (elementMetadata) elementMetadata[_elemTypeName] = em;
                // 重新渲染标签
                for (const key of Object.keys(em)) {
                    const labelEl = container.querySelector(`[data-prop-key="${key}"]`);
                    if (labelEl && em[key]?.labelText) {
                        labelEl.textContent = em[key].labelText;
                    }
                }
            }
        }).catch(() => {});
    }

    for (const key of keys) {
        const row = document.createElement('div');
        row.className = 'taowu-collection-row';

        const keyLabel = document.createElement('span');
        keyLabel.className = 'taowu-collection-label';
        keyLabel.textContent = _elemMeta[key]?.labelText || toDisplayName(key);
        row.appendChild(keyLabel);

        const valField = document.createElement('div');
        valField.className = 'taowu-collection-field';

        let val = valueObj[key];
        let valType = 'String';
        let rawSubDump: any = null;
        if (val && typeof val === 'object' && val.value !== undefined && val.type !== undefined) {
            valType = val.type;
            val = val.value;
            rawSubDump = valueObj[key];
        } else {
            valType = typeof val === 'number' ? 'Number' : typeof val === 'boolean' ? 'Boolean' : 'String';
        }

        // 如果子属性本身是对象 (嵌套 class)，递归渲染
        if (val && typeof val === 'object' && !Array.isArray(val) && !valType.toLowerCase().startsWith('cc.') && Object.keys(val).length > 0) {
            const nestedDump = rawSubDump || { value: val, type: valType, path: `${basePath}.${key}`, name: key };
            const nestedEl = createMapElement(nestedDump, compUuid, compIndex, key, isRendering, _elemMeta[key], elementMetadata);
            valField.appendChild(nestedEl);
        } else {
            const valDump = { value: val, type: valType };
            const valInput = createInputElement(valDump, _elemMeta[key], compUuid, compIndex, propName, isRendering, true);
            valField.appendChild(valInput);

            const subPath = (rawSubDump && rawSubDump.path) ? rawSubDump.path : `${basePath}.${key}`;
            const isValInput = valInput.tagName.toLowerCase() === 'ui-input';
            if (isValInput) {
                valInput.addEventListener('confirm', async (e: Event) => {
                    e.stopPropagation();
                    const newVal = getInputValue(valInput, valDump);
                    valueObj[key] = newVal;
                    const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: valType, value: newVal };
                    await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: subPath, dump: setDump });
                });
            } else {
                valInput.addEventListener('change', async () => {
                    if (isRendering && isRendering()) return;
                    const newVal = getInputValue(valInput, valDump);
                    valueObj[key] = newVal;
                    const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: valType, value: newVal };
                    await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: subPath, dump: setDump });
                });
            }
        }

        row.appendChild(valField);
        content.appendChild(row);
    }

    return container;
}

// ─── 事件监听 ───

function setupChangeListener(
    input: HTMLElement,
    propName: string,
    propDump: any,
    compUuid: string,
    compIndex: number,
    taowuMeta?: ITaoWuPropertyMeta,
    isRendering?: () => boolean,
    onPropChanged?: () => void
): void {
    const propPath = buildPath(propDump, compIndex, propName);

    // ui-prop with type="dump" uses change-dump event
    if (input.tagName.toLowerCase() === 'ui-prop') {
        let lastValue = JSON.parse(JSON.stringify(propDump.value));
        const handleChange = async () => {
            if (isRendering && isRendering()) return;
            await new Promise(r => requestAnimationFrame(r));
            const newVal = (input as any).dump ? (input as any).dump.value : undefined;
            if (newVal === undefined) return;
            if (JSON.stringify(newVal) === JSON.stringify(lastValue)) return;
            lastValue = JSON.parse(JSON.stringify(newVal));
            propDump.value = newVal;
            const result = await Editor.Message.request('scene', 'set-property', {
                uuid: compUuid,
                path: propPath,
                dump: { type: propDump.type, value: newVal },
            });
            if (result) {
                const contentEl = input.closest('.taowu-content');
                if (contentEl && (contentEl as any).__taowuRerender) {
                    (contentEl as any).__taowuRerender(propName, newVal);
                }
                // 触发 OnValueChanged / OnCollectionChanged 回调
                if (taowuMeta?.onValueChanged || taowuMeta?.onCollectionChanged) {
                    await triggerCallbacks(compUuid, compIndex, propName);
                }
            }
        };
        input.addEventListener('change-dump', handleChange);
        return;
    }

    const isSlider = input.tagName.toLowerCase() === 'ui-slider';
    let lastWrittenValue: any = propDump.value;

    const doSetProperty = async () => {
        const newValue = getInputValue(input, propDump);
        if (JSON.stringify(newValue) === JSON.stringify(lastWrittenValue)) return;

        const setDump: any = {
            type: propDump.type,
            value: newValue,
        };

        const result = await Editor.Message.request('scene', 'set-property', {
            uuid: compUuid,
            path: propPath,
            dump: setDump,
        });

        if (!result) {
            console.warn('[TaoWuInspector] set-property failed');
            try { setInputValue(input, propDump.value, propDump); } catch (e) {}
        } else {
            propDump.value = newValue;
            lastWrittenValue = newValue;
        }

        if (taowuMeta?.onValueChanged || taowuMeta?.onCollectionChanged) {
            await triggerCallbacks(compUuid, compIndex, propName);
        }
    };

    // ui-input: 用 confirm 事件写入 (与 Cocos Inspector 一致)
    // ui-slider: 也用 confirm 事件
    const isInputLike = input.tagName.toLowerCase() === 'ui-input' || isSlider;

    if (isInputLike) {
        input.addEventListener('confirm', (e: Event) => {
            e.stopPropagation();
            doSetProperty();
        });
    } else {
        input.addEventListener('change', () => {
            doSetProperty();
        });
    }
}

/** 从 UI 元素获取值 */
function getInputValue(input: HTMLElement, propDump: any): any {
    const tagName = input.tagName.toLowerCase();

    if (tagName === 'ui-checkbox') {
        return (input as any).checked || input.hasAttribute('checked');
    }
    if (tagName === 'ui-select') {
        const val = (input as any).value;
        return propDump.enumList ? Number(val) : val;
    }
    if (tagName === 'ui-slider' || tagName === 'ui-num-input') {
        return Number((input as any).value);
    }
    if (tagName === 'ui-color') {
        const v = (input as any).value;
        return { r: v.r, g: v.g, b: v.b, a: v.a };
    }
    if (tagName === 'ui-vec2') {
        const v = (input as any).value;
        return { x: v.x, y: v.y };
    }
    if (tagName === 'ui-vec3') {
        const v = (input as any).value;
        return { x: v.x, y: v.y, z: v.z };
    }
    if (tagName === 'ui-vec4') {
        const v = (input as any).value;
        return { x: v.x, y: v.y, z: v.z, w: v.w };
    }
    if (tagName === 'ui-size') {
        const v = (input as any).value;
        return { width: v.width, height: v.height };
    }
    if (input.classList && input.classList.contains('taowu-multi-num')) {
        const keys = (input.dataset.multiKeys || '').split(',');
        const inputs = input.querySelectorAll('ui-num-input');
        const result: any = {};
        inputs.forEach((inp, idx) => {
            if (idx < keys.length) result[keys[idx]] = Number((inp as any).value);
        });
        return result;
    }
    return (input as any).value;
}

/** 设置 UI 元素的值 */
function setInputValue(input: HTMLElement, value: any, propDump: any): void {
    const tagName = input.tagName.toLowerCase();
    if (tagName === 'ui-checkbox') {
        if (value) input.setAttribute('checked', '');
        else input.removeAttribute('checked');
    } else {
        try { (input as any).value = value; } catch (e) {}
    }
}

/** 创建标题元素 */
function createTitleElement(title: string, horizontalLine: boolean): HTMLElement {
    const container = document.createElement('div');
    container.className = 'taowu-title';

    const text = document.createElement('span');
    text.className = 'taowu-title-text';
    text.textContent = title;
    container.appendChild(text);

    if (horizontalLine) {
        const line = document.createElement('hr');
        line.className = 'taowu-title-line';
        container.appendChild(line);
    }

    return container;
}

/** 创建信息提示框 */
function createInfoBoxElement(message: string, type: string): HTMLElement {
    const box = document.createElement('div');
    box.className = `taowu-infobox taowu-infobox-${type}`;
    box.textContent = message;
    return box;
}
