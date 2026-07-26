"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPropertyElement = createPropertyElement;
/** 创建单个属性的 UI 元素 */
function createPropertyElement(propName, propDump, compUuid, compIndex, taowuMeta, isRendering, onPropChanged) {
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
    const row = document.createElement('div');
    row.className = 'taowu-prop';
    const input = createInputElement(propDump, taowuMeta, compUuid, compIndex, propName, isRendering);
    if (taowuMeta?.readOnly || propDump.readonly) {
        input.setAttribute('disabled', '');
    }
    // 始终添加 label
    const labelText = taowuMeta?.labelText || propDump.displayName || propName;
    const label = document.createElement('span');
    label.className = 'taowu-prop-label';
    label.textContent = labelText;
    if (propDump.tooltip) {
        label.title = propDump.tooltip;
    }
    row.appendChild(label);
    const content = document.createElement('div');
    content.className = 'taowu-prop-content';
    content.appendChild(input);
    // Cocos 自定义元素 (ui-vec3/ui-color 等) 挂载后需要重新设置 value
    const tagName = input.tagName.toLowerCase();
    if (['ui-vec3', 'ui-vec2', 'ui-vec4', 'ui-color', 'ui-size'].includes(tagName)) {
        const val = propDump.value;
        // 多次尝试设置 value，确保在 DOM 挂载后生效
        const trySetValue = (attempts) => {
            if (attempts <= 0)
                return;
            requestAnimationFrame(() => {
                try {
                    if (tagName === 'ui-vec3')
                        input.value = { x: val.x, y: val.y, z: val.z };
                    else if (tagName === 'ui-vec2')
                        input.value = { x: val.x, y: val.y };
                    else if (tagName === 'ui-vec4')
                        input.value = { x: val.x, y: val.y, z: val.z, w: val.w || 0 };
                    else if (tagName === 'ui-color')
                        input.value = { r: val.r, g: val.g, b: val.b, a: val.a != null ? val.a : 255 };
                    else if (tagName === 'ui-size')
                        input.value = { width: val.width, height: val.height };
                    // 检查是否设置成功，未成功则重试
                    const currentVal = input.value;
                    if (!currentVal || (currentVal.x === undefined && currentVal.r === undefined)) {
                        trySetValue(attempts - 1);
                    }
                }
                catch (e) {
                    trySetValue(attempts - 1);
                }
            });
        };
        trySetValue(5);
    }
    row.appendChild(content);
    wrapper.appendChild(row);
    // List/TableList/Map 自带事件监听，跳过常规 setupChangeListener
    const isContainer = input.classList.contains('taowu-collection');
    if (!isContainer) {
        setupChangeListener(input, propName, propDump, compUuid, compIndex, taowuMeta, isRendering, onPropChanged);
    }
    return wrapper;
}
/** 构建标准 set-property path */
function buildPath(propDump, compIndex, propName) {
    const rawPath = propDump.path || `__comps__.${compIndex}.${propName}`;
    return rawPath.replace(/^__comps__[_.]*(\d+)[_.]/, (_m, idx) => `__comps__.${idx}.`);
}
/** 统一 Box 容器 (可折叠, 默认折叠) */
function createBoxContainer(title) {
    const section = document.createElement('ui-section');
    section.className = 'taowu-collection taowu-box';
    section.setAttribute('header', title);
    const content = document.createElement('div');
    content.className = 'taowu-box-content';
    // 拦截所有冒泡到 content 的事件，阻止触发 ui-section 折叠
    const stop = (e) => e.stopPropagation();
    content.addEventListener('click', stop);
    content.addEventListener('mousedown', stop);
    content.addEventListener('pointerdown', stop);
    content.addEventListener('change', stop);
    content.addEventListener('confirm', stop);
    section.appendChild(content);
    return { container: section, content };
}
/** 创建添加按钮 */
function createAddButton(text) {
    const btn = document.createElement('div');
    btn.className = 'taowu-list-btn taowu-list-btn-add';
    btn.textContent = text;
    return btn;
}
/** 创建删除按钮 */
function createDelButton(text) {
    const btn = document.createElement('span');
    btn.className = 'taowu-list-btn taowu-list-btn-del';
    btn.textContent = text;
    return btn;
}
/** 根据属性类型创建输入元素 */
function createInputElement(propDump, taowuMeta, compUuid, compIndex, propName, isRendering) {
    const type = (propDump.type || '').toLowerCase();
    const value = propDump.value;
    // Enum
    if (propDump.enumList && propDump.enumList.length > 0) {
        const select = document.createElement('ui-select');
        for (const item of propDump.enumList) {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.name;
            select.appendChild(option);
        }
        select.value = String(value);
        return select;
    }
    // Boolean
    if (type === 'boolean') {
        const checkbox = document.createElement('ui-checkbox');
        if (value)
            checkbox.setAttribute('checked', '');
        return checkbox;
    }
    // Number
    if (type === 'number') {
        if (taowuMeta?.range || propDump.slide) {
            const slider = document.createElement('ui-slider');
            const min = taowuMeta?.range?.min ?? propDump.min ?? 0;
            const max = taowuMeta?.range?.max ?? propDump.max ?? 1;
            slider.setAttribute('min', String(min));
            slider.setAttribute('max', String(max));
            if (propDump.step)
                slider.setAttribute('step', String(propDump.step));
            try {
                slider.value = value;
            }
            catch (e) { }
            return slider;
        }
        const numInput = document.createElement('ui-num-input');
        if (propDump.min != null)
            numInput.setAttribute('min', String(propDump.min));
        if (propDump.max != null)
            numInput.setAttribute('max', String(propDump.max));
        if (propDump.step)
            numInput.setAttribute('step', String(propDump.step));
        try {
            numInput.value = value;
        }
        catch (e) { }
        return numInput;
    }
    // Array — List 或 TableList (必须在 cc.* 类型检查之前)
    if (propDump.isArray || Array.isArray(value)) {
        if (taowuMeta?.tableList) {
            return createTableListElement(propDump, compUuid, compIndex, propName, isRendering);
        }
        return createListElement(propDump, compUuid, compIndex, propName, isRendering);
    }
    // 检测 Vec3[] / Color[] 等: type 是 cc.Vec3 但 value 是数组
    if (type.startsWith('cc.') && Array.isArray(value)) {
        if (taowuMeta?.tableList) {
            return createTableListElement(propDump, compUuid, compIndex, propName, isRendering);
        }
        return createListElement(propDump, compUuid, compIndex, propName, isRendering);
    }
    // Color
    if (taowuMeta?.color || type === 'cc.color') {
        const color = document.createElement('ui-color');
        if (typeof value === 'object' && value && value.r != null) {
            try {
                color.value = { r: value.r, g: value.g, b: value.b, a: value.a != null ? value.a : 255 };
            }
            catch (e) { }
        }
        return color;
    }
    // Vec2
    if (type === 'cc.vec2') {
        const vec = document.createElement('ui-vec2');
        if (typeof value === 'object' && value && value.x != null) {
            try {
                vec.value = { x: value.x, y: value.y };
            }
            catch (e) { }
        }
        return vec;
    }
    // Vec3
    if (type === 'cc.vec3') {
        const vec = document.createElement('ui-vec3');
        if (typeof value === 'object' && value && value.x != null) {
            try {
                vec.value = { x: value.x, y: value.y, z: value.z };
            }
            catch (e) { }
        }
        return vec;
    }
    // Vec4 / Quat
    if (type === 'cc.vec4' || type === 'cc.quat') {
        const vec = document.createElement('ui-vec4');
        if (typeof value === 'object' && value && value.x != null) {
            try {
                vec.value = { x: value.x, y: value.y, z: value.z, w: value.w != null ? value.w : 0 };
            }
            catch (e) { }
        }
        return vec;
    }
    // Size
    if (type === 'cc.size') {
        const size = document.createElement('ui-size');
        if (typeof value === 'object' && value && value.width != null) {
            try {
                size.value = { width: value.width, height: value.height };
            }
            catch (e) { }
        }
        return size;
    }
    // String
    if (type === 'string') {
        if (taowuMeta?.textarea || propDump.multiline) {
            const input = document.createElement('ui-input');
            input.setAttribute('multiline', '');
            input.style.width = '100%';
            input.style.display = 'block';
            try {
                input.value = value || '';
            }
            catch (e) { }
            return input;
        }
        const input = document.createElement('ui-input');
        try {
            input.value = value || '';
        }
        catch (e) { }
        return input;
    }
    // Node reference
    if (type === 'cc.node') {
        const node = document.createElement('ui-node');
        return node;
    }
    // Object/Map — 非 cc.* 类型的对象且有实际属性
    if (typeof value === 'object' && value !== null && !Array.isArray(value)
        && !type.startsWith('cc.') && Object.keys(value).length > 0) {
        return createMapElement(propDump, compUuid, compIndex, propName, isRendering);
    }
    // Asset reference
    if (type.startsWith('cc.')) {
        const asset = document.createElement('ui-asset');
        return asset;
    }
    // Fallback
    const input = document.createElement('ui-input');
    try {
        input.value = typeof value === 'string' ? value : (value != null ? JSON.stringify(value) : '');
    }
    catch (e) { }
    return input;
}
// ─── 多数值输入 (Vec2/Vec3/Vec4/Color/Size 等) ───
function createMultiNumberInput(value, keys, propDump, taowuMeta, compUuid, compIndex, propName, isRendering) {
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
        try {
            numInput.value = valObj[k] != null ? valObj[k] : 0;
        }
        catch (e) { }
        field.appendChild(numInput);
        container.appendChild(numInput);
    }
    // 监听变化: 整体写入
    container.addEventListener('change', async (e) => {
        if (isRendering && isRendering())
            return;
        const target = e.target;
        if (target.tagName.toLowerCase() !== 'ui-num-input')
            return;
        const inputs = container.querySelectorAll('ui-num-input');
        const newVal = {};
        inputs.forEach((inp, idx) => {
            newVal[keys[idx]] = Number(inp.value);
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
function createListElement(propDump, compUuid, compIndex, propName, isRendering) {
    const basePath = buildPath(propDump, compIndex, propName);
    // Cocos dump 中数组 value 是 IProperty[] 或原始值[]
    // 统一解包为原始值数组
    const rawItems = Array.isArray(propDump.value) ? propDump.value : [];
    // 解包 IProperty: 统一检测有 value + (type/default/name/path) 的对象
    const items = rawItems.map((item) => {
        if (!item || typeof item !== 'object')
            return item;
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
    const { container, content } = createBoxContainer(`List (${items.length})`);
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'taowu-collection-items';
    content.appendChild(itemsContainer);
    function renderItems() {
        itemsContainer.innerHTML = '';
        for (let i = 0; i < items.length; i++) {
            const itemValue = items[i];
            const isObj = typeof itemValue === 'object' && itemValue !== null && !Array.isArray(itemValue);
            if (isObj) {
                // 对象元素: 用 Element Box 渲染 (与 TableList 一致)
                const itemBox = document.createElement('div');
                itemBox.className = 'taowu-collection-item-box';
                const itemHeader = document.createElement('div');
                itemHeader.className = 'taowu-collection-item-header';
                itemHeader.textContent = `Element ${i}`;
                const delBtn = createDelButton('×');
                delBtn.addEventListener('click', async () => {
                    items.splice(i, 1);
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: compUuid, path: `${basePath}.length`,
                        dump: { value: items.length },
                    });
                    propDump.value = [...items];
                    updateHeader();
                    renderItems();
                });
                itemHeader.appendChild(delBtn);
                itemBox.appendChild(itemHeader);
                const itemContent = document.createElement('div');
                itemContent.className = 'taowu-collection-item-content';
                // 解包 IProperty
                const unwrapped = (itemValue.value !== undefined && itemValue.type !== undefined && typeof itemValue.value === 'object')
                    ? itemValue.value : itemValue;
                const keys = Object.keys(unwrapped);
                for (const subKey of keys) {
                    const subRow = document.createElement('div');
                    subRow.className = 'taowu-collection-row';
                    const subLabel = document.createElement('span');
                    subLabel.className = 'taowu-collection-index';
                    subLabel.textContent = subKey;
                    subRow.appendChild(subLabel);
                    const subField = document.createElement('div');
                    subField.className = 'taowu-collection-field';
                    // 解包子属性 IProperty: {value: "attack", type: "String", path: "..."} → "attack"
                    let subVal = unwrapped[subKey];
                    let subType = 'String';
                    let subPath = `${basePath}.${i}.${subKey}`;
                    let rawSubDump = null;
                    if (subVal && typeof subVal === 'object' && subVal.value !== undefined && subVal.type !== undefined) {
                        subType = subVal.type;
                        subVal = subVal.value;
                        rawSubDump = unwrapped[subKey];
                        // 使用 dump 中的原始 path，不做格式转换
                        if (rawSubDump && rawSubDump.path) {
                            subPath = rawSubDump.path;
                        }
                    }
                    else {
                        subType = typeof subVal === 'number' ? 'Number'
                            : typeof subVal === 'boolean' ? 'Boolean' : 'String';
                    }
                    const subDump = { value: subVal, type: subType };
                    const subInput = createInputElement(subDump, undefined, compUuid, compIndex, propName, isRendering);
                    subField.appendChild(subInput);
                    const isSubInput = subInput.tagName.toLowerCase() === 'ui-input';
                    if (isSubInput) {
                        subInput.addEventListener('confirm', async (e) => {
                            e.stopPropagation();
                            const newVal = getInputValue(subInput, subDump);
                            unwrapped[subKey] = newVal;
                            items[i] = { ...unwrapped };
                            // 使用原始 IProperty dump, 只覆盖 value
                            const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                            console.log('[TaoWuInspector] List sub confirm:', {
                                path: subPath,
                                newVal: newVal,
                                subType: subType,
                                setDump: setDump,
                            });
                            const result = await Editor.Message.request('scene', 'set-property', {
                                uuid: compUuid, path: subPath,
                                dump: setDump,
                            });
                            console.log('[TaoWuInspector] List sub result:', result);
                        });
                    }
                    else {
                        subInput.addEventListener('change', async () => {
                            if (isRendering && isRendering())
                                return;
                            const newVal = getInputValue(subInput, subDump);
                            unwrapped[subKey] = newVal;
                            items[i] = { ...unwrapped };
                            const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                            console.log('[TaoWuInspector] List sub change:', {
                                path: subPath,
                                newVal: newVal,
                                subType: subType,
                                tagName: subInput.tagName,
                                setDump: setDump,
                            });
                            const result = await Editor.Message.request('scene', 'set-property', {
                                uuid: compUuid, path: subPath,
                                dump: setDump,
                            });
                            console.log('[TaoWuInspector] List sub result:', result);
                        });
                    }
                    subRow.appendChild(subField);
                    itemContent.appendChild(subRow);
                }
                itemBox.appendChild(itemContent);
                itemsContainer.appendChild(itemBox);
            }
            else {
                // 简单类型元素: 单行渲染
                const itemRow = document.createElement('div');
                itemRow.className = 'taowu-collection-row';
                const indexLabel = document.createElement('span');
                indexLabel.className = 'taowu-collection-index';
                indexLabel.textContent = String(i);
                itemRow.appendChild(indexLabel);
                const itemContent = document.createElement('div');
                itemContent.className = 'taowu-collection-field';
                const itemType = elementTypeData.type || (typeof items[i] === 'number' ? 'Number' : 'String');
                const itemDump = { value: items[i], type: itemType };
                const itemInput = createInputElement(itemDump, undefined, compUuid, compIndex, propName, isRendering);
                itemContent.appendChild(itemInput);
                const itemPath = `${basePath}.${i}`;
                itemInput.addEventListener('change', async () => {
                    if (isRendering && isRendering())
                        return;
                    const newVal = getInputValue(itemInput, itemDump);
                    items[i] = newVal;
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: compUuid, path: itemPath,
                        dump: { type: itemType, value: newVal },
                    });
                    propDump.value[i] = newVal;
                });
                itemRow.appendChild(itemContent);
                const delBtn = createDelButton('×');
                delBtn.addEventListener('click', async () => {
                    items.splice(i, 1);
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: compUuid, path: `${basePath}.length`,
                        dump: { value: items.length },
                    });
                    propDump.value = [...items];
                    updateHeader();
                    renderItems();
                });
                itemRow.appendChild(delBtn);
                itemsContainer.appendChild(itemRow);
            }
        }
    }
    function updateHeader() {
        container.setAttribute('header', `List (${items.length})`);
    }
    renderItems();
    const addBtn = createAddButton('+ 添加');
    addBtn.addEventListener('click', async (e) => {
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
        updateHeader();
    });
    content.appendChild(addBtn);
    return container;
}
// ─── TableList 渲染 (可折叠表格列表, Box 风格) ───
function createTableListElement(propDump, compUuid, compIndex, propName, isRendering) {
    const basePath = buildPath(propDump, compIndex, propName);
    // 解包 IProperty[] 为原始值[]
    let rawItems = [];
    if (Array.isArray(propDump.value)) {
        rawItems = propDump.value;
    }
    else if (propDump.value && typeof propDump.value === 'object') {
        // 有些 dump 格式中数组值可能是对象 {0: ..., 1: ..., length: 3}
        const valObj = propDump.value;
        if (valObj.length != null) {
            for (let k = 0; k < valObj.length; k++) {
                rawItems.push(valObj[k]);
            }
        }
    }
    const items = rawItems.map((item) => {
        if (!item || typeof item !== 'object')
            return item;
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
    const { container, content } = createBoxContainer(`TableList (${items.length})`);
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'taowu-collection-items';
    content.appendChild(itemsContainer);
    function renderItems() {
        itemsContainer.innerHTML = '';
        for (let i = 0; i < items.length; i++) {
            const itemBox = document.createElement('div');
            itemBox.className = 'taowu-collection-item-box';
            const itemHeader = document.createElement('div');
            itemHeader.className = 'taowu-collection-item-header';
            itemHeader.textContent = `Element ${i}`;
            const delBtn = createDelButton('×');
            delBtn.addEventListener('click', async () => {
                items.splice(i, 1);
                await Editor.Message.request('scene', 'set-property', {
                    uuid: compUuid, path: `${basePath}.length`,
                    dump: { value: items.length },
                });
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
                    if (isVec2)
                        itemType = 'cc.Vec2';
                    else if (isVec3)
                        itemType = 'cc.Vec3';
                    else if (isVec4)
                        itemType = 'cc.Vec4';
                    else if (isColor)
                        itemType = 'cc.Color';
                    else if (isSize)
                        itemType = 'cc.Size';
                    // 使用 ui-prop + dump 渲染，与 Cocos 原生 Inspector 一致
                    const prop = document.createElement('ui-prop');
                    prop.setAttribute('type', 'dump');
                    const itemDump = {
                        value: unwrapped,
                        type: itemType,
                        path: `${basePath}.${i}`,
                    };
                    try {
                        prop.dump = itemDump;
                    }
                    catch (e) { }
                    // 挂载后再 render
                    itemContent.appendChild(prop);
                    try {
                        prop.render(itemDump);
                    }
                    catch (e) { }
                    try {
                        prop.dump = itemDump;
                    }
                    catch (e) { }
                    prop.addEventListener('change-dump', async () => {
                        if (isRendering && isRendering())
                            return;
                        const newVal = prop.dump ? prop.dump.value : undefined;
                        if (newVal === undefined)
                            return;
                        items[i] = newVal;
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: compUuid, path: `${basePath}.${i}`,
                            dump: { type: itemType, value: newVal },
                        });
                        propDump.value[i] = newVal;
                    });
                }
                else {
                    // 普通对象: 渲染每个子属性
                    for (const subKey of keys) {
                        const subRow = document.createElement('div');
                        subRow.className = 'taowu-collection-row';
                        const subLabel = document.createElement('span');
                        subLabel.className = 'taowu-collection-index';
                        subLabel.textContent = subKey;
                        subRow.appendChild(subLabel);
                        const subField = document.createElement('div');
                        subField.className = 'taowu-collection-field';
                        // 解包子属性 IProperty
                        let subVal = unwrapped[subKey];
                        let subType = 'String';
                        let subPath = `${basePath}.${i}.${subKey}`;
                        let rawSubDump = null;
                        if (subVal && typeof subVal === 'object' && subVal.value !== undefined && subVal.type !== undefined) {
                            subType = subVal.type;
                            subVal = subVal.value;
                            rawSubDump = unwrapped[subKey];
                            // 使用 dump 中的原始 path，不做格式转换
                            if (rawSubDump && rawSubDump.path) {
                                subPath = rawSubDump.path;
                            }
                        }
                        else {
                            subType = typeof subVal === 'number' ? 'Number'
                                : typeof subVal === 'boolean' ? 'Boolean' : 'String';
                        }
                        const subDump = { value: subVal, type: subType };
                        const subInput = createInputElement(subDump, undefined, compUuid, compIndex, propName, isRendering);
                        subField.appendChild(subInput);
                        const isSubInput = subInput.tagName.toLowerCase() === 'ui-input';
                        if (isSubInput) {
                            subInput.addEventListener('confirm', async (e) => {
                                e.stopPropagation();
                                const newVal = getInputValue(subInput, subDump);
                                unwrapped[subKey] = newVal;
                                const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                                console.log('[TaoWuInspector] TableList sub confirm:', {
                                    path: subPath,
                                    newVal: newVal,
                                    setDump: setDump,
                                });
                                const result = await Editor.Message.request('scene', 'set-property', {
                                    uuid: compUuid, path: subPath,
                                    dump: setDump,
                                });
                                console.log('[TaoWuInspector] TableList sub result:', result);
                            });
                        }
                        else {
                            subInput.addEventListener('change', async () => {
                                if (isRendering && isRendering())
                                    return;
                                const newVal = getInputValue(subInput, subDump);
                                unwrapped[subKey] = newVal;
                                const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                                console.log('[TaoWuInspector] TableList sub change:', {
                                    path: subPath,
                                    newVal: newVal,
                                    setDump: setDump,
                                });
                                const result = await Editor.Message.request('scene', 'set-property', {
                                    uuid: compUuid, path: subPath,
                                    dump: setDump,
                                });
                                console.log('[TaoWuInspector] TableList sub result:', result);
                            });
                        }
                        subRow.appendChild(subField);
                        itemContent.appendChild(subRow);
                    }
                }
            }
            else {
                // 简单类型元素
                const itemDump = {
                    value: itemValue,
                    type: typeof itemValue === 'number' ? 'Number' : 'String',
                };
                const itemInput = createInputElement(itemDump, undefined, compUuid, compIndex, propName, isRendering);
                itemInput.style.width = '100%';
                itemContent.appendChild(itemInput);
                itemInput.addEventListener('change', async () => {
                    if (isRendering && isRendering())
                        return;
                    const newVal = getInputValue(itemInput, itemDump);
                    items[i] = newVal;
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: compUuid, path: `${basePath}.${i}`,
                        dump: { type: itemDump.type, value: newVal },
                    });
                    propDump.value[i] = newVal;
                });
            }
            itemBox.appendChild(itemContent);
            itemsContainer.appendChild(itemBox);
        }
    }
    function updateHeader() {
        container.setAttribute('header', `TableList (${items.length})`);
    }
    renderItems();
    const addBtn = createAddButton('+ 添加元素');
    addBtn.addEventListener('click', async (e) => {
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
            let itemVal = template;
            if (template.r !== undefined)
                itemType = 'cc.Color';
            else if (template.width !== undefined)
                itemType = 'cc.Size';
            else if (template.w !== undefined)
                itemType = 'cc.Vec4';
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
        }
        else if (template && typeof template === 'object') {
            // MapEntry 等自定义类: 设置长度后逐个设置子属性
            await Editor.Message.request('scene', 'set-property', {
                uuid: compUuid, path: `${basePath}.length`,
                dump: { value: newIdx + 1 },
            });
            for (const subKey of Object.keys(template)) {
                let subVal = template[subKey];
                if (subVal && typeof subVal === 'object' && subVal.value !== undefined) {
                    subVal = subVal.value;
                }
                const subType = typeof subVal === 'number' ? 'Number' : 'String';
                let subPath = `${basePath}.${newIdx}.${subKey}`;
                const rawSub = template[subKey];
                if (rawSub && rawSub.path) {
                    subPath = rawSub.path.replace(/\.configTableList\.\d+\./, `.configTableList.${newIdx}.`);
                    subPath = subPath.replace(/\.configMap\.\d+\./, `.configMap.${newIdx}.`);
                    subPath = subPath.replace(/\.positionList\.\d+\./, `.positionList.${newIdx}.`);
                    subPath = subPath.replace(/\.defaultList\.\d+\./, `.defaultList.${newIdx}.`);
                    subPath = subPath.replace(/\.damageList\.\d+\./, `.damageList.${newIdx}.`);
                }
                await Editor.Message.request('scene', 'set-property', {
                    uuid: compUuid, path: subPath,
                    dump: { type: subType, value: subVal },
                });
            }
        }
        else if (template != null) {
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
        updateHeader();
    });
    content.appendChild(addBtn);
    return container;
}
// ─── Map 渲染 (对象/字典, Box 风格) ───
function createMapElement(propDump, compUuid, compIndex, propName, isRendering) {
    const basePath = buildPath(propDump, compIndex, propName);
    const valueObj = propDump.value || {};
    const keys = Object.keys(valueObj);
    const { container, content } = createBoxContainer(`Map (${keys.length})`);
    for (const key of keys) {
        const row = document.createElement('div');
        row.className = 'taowu-collection-row';
        const keyLabel = document.createElement('span');
        keyLabel.className = 'taowu-collection-index';
        keyLabel.textContent = key;
        row.appendChild(keyLabel);
        const valField = document.createElement('div');
        valField.className = 'taowu-collection-field';
        // 解包 IProperty: {value: 10, type: "Number"} → 10
        let val = valueObj[key];
        let valType = 'String';
        if (val && typeof val === 'object' && val.value !== undefined && val.type !== undefined) {
            valType = val.type;
            val = val.value;
        }
        else {
            valType = typeof val === 'number' ? 'Number' : typeof val === 'boolean' ? 'Boolean' : 'String';
        }
        const valDump = { value: val, type: valType };
        const valInput = createInputElement(valDump, undefined, compUuid, compIndex, propName, isRendering);
        valField.appendChild(valInput);
        valInput.addEventListener('change', async () => {
            if (isRendering && isRendering())
                return;
            const newVal = getInputValue(valInput, valDump);
            valueObj[key] = newVal;
            await Editor.Message.request('scene', 'set-property', {
                uuid: compUuid, path: `${basePath}.${key}`,
                dump: { type: valType, value: newVal },
            });
            propDump.value[key] = newVal;
        });
        row.appendChild(valField);
        content.appendChild(row);
    }
    return container;
}
// ─── 事件监听 ───
function setupChangeListener(input, propName, propDump, compUuid, compIndex, taowuMeta, isRendering, onPropChanged) {
    const propPath = buildPath(propDump, compIndex, propName);
    const isSlider = input.tagName.toLowerCase() === 'ui-slider';
    let lastWrittenValue = propDump.value;
    const doSetProperty = async () => {
        const newValue = getInputValue(input, propDump);
        if (JSON.stringify(newValue) === JSON.stringify(lastWrittenValue))
            return;
        const setDump = {
            type: propDump.type,
            value: newValue,
        };
        console.log('[TaoWuInspector] confirm set-property:', {
            uuid: compUuid,
            path: propPath,
            propDumpPath: propDump.path,
            newValue: newValue,
            oldValue: lastWrittenValue,
            type: propDump.type,
        });
        const result = await Editor.Message.request('scene', 'set-property', {
            uuid: compUuid,
            path: propPath,
            dump: setDump,
        });
        console.log('[TaoWuInspector] confirm result:', result);
        if (!result) {
            console.warn('[TaoWuInspector] set-property failed');
            try {
                setInputValue(input, propDump.value, propDump);
            }
            catch (e) { }
        }
        else {
            propDump.value = newValue;
            lastWrittenValue = newValue;
        }
        if (taowuMeta?.onValueChanged) {
            await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'taowu-inspector',
                method: 'onValueChanged',
                args: [compUuid, compIndex, propName, taowuMeta.onValueChanged]
            });
        }
    };
    // ui-input: 用 confirm 事件写入 (与 Cocos Inspector 一致)
    // ui-slider: 也用 confirm 事件
    const isInputLike = input.tagName.toLowerCase() === 'ui-input' || isSlider;
    if (isInputLike) {
        input.addEventListener('confirm', (e) => {
            e.stopPropagation();
            doSetProperty();
        });
    }
    else {
        input.addEventListener('change', () => {
            doSetProperty();
        });
    }
}
/** 从 UI 元素获取值 */
function getInputValue(input, propDump) {
    const tagName = input.tagName.toLowerCase();
    if (tagName === 'ui-checkbox') {
        return input.checked || input.hasAttribute('checked');
    }
    if (tagName === 'ui-select') {
        const val = input.value;
        return propDump.enumList ? Number(val) : val;
    }
    if (tagName === 'ui-slider' || tagName === 'ui-num-input') {
        return Number(input.value);
    }
    if (tagName === 'ui-color') {
        const v = input.value;
        return { r: v.r, g: v.g, b: v.b, a: v.a };
    }
    if (tagName === 'ui-vec2') {
        const v = input.value;
        return { x: v.x, y: v.y };
    }
    if (tagName === 'ui-vec3') {
        const v = input.value;
        return { x: v.x, y: v.y, z: v.z };
    }
    if (tagName === 'ui-vec4') {
        const v = input.value;
        return { x: v.x, y: v.y, z: v.z, w: v.w };
    }
    if (tagName === 'ui-size') {
        const v = input.value;
        return { width: v.width, height: v.height };
    }
    if (input.classList && input.classList.contains('taowu-multi-num')) {
        const keys = (input.dataset.multiKeys || '').split(',');
        const inputs = input.querySelectorAll('ui-num-input');
        const result = {};
        inputs.forEach((inp, idx) => {
            if (idx < keys.length)
                result[keys[idx]] = Number(inp.value);
        });
        return result;
    }
    return input.value;
}
/** 设置 UI 元素的值 */
function setInputValue(input, value, propDump) {
    const tagName = input.tagName.toLowerCase();
    if (tagName === 'ui-checkbox') {
        if (value)
            input.setAttribute('checked', '');
        else
            input.removeAttribute('checked');
    }
    else {
        try {
            input.value = value;
        }
        catch (e) { }
    }
}
/** 创建标题元素 */
function createTitleElement(title, horizontalLine) {
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
function createInfoBoxElement(message, type) {
    const box = document.createElement('div');
    box.className = `taowu-infobox taowu-infobox-${type}`;
    box.textContent = message;
    return box;
}
