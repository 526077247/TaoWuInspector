"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPropertyElement = createPropertyElement;
/** 解包 IProperty: {value: 1, type: "Number"} → 1 */
function unwrapIProp(val) {
    if (val && typeof val === 'object' && val.value !== undefined && (val.type !== undefined || val.path !== undefined)) {
        return val.value;
    }
    return val;
}
/** 解包 Vec/Color/Size 的子属性 IProperty */
function unwrapVecValue(val, keys) {
    if (!val || typeof val !== 'object') return val;
    const result = {};
    for (const k of keys) {
        result[k] = unwrapIProp(val[k]);
    }
    return result;
}
/** camelCase 转为 Title Case (如 configMap → Config Map) */
/** 为表头添加拖拽调整列宽手柄 */
function syncColumnWidths(headerRow, container) {
    var headerCells = Array.from(headerRow.querySelectorAll('.taowu-table-cell'));
    headerCells.forEach(function(cell, idx) {
        if (cell.querySelector('.taowu-col-resizer')) return;
        var resizer = document.createElement('div');
        resizer.className = 'taowu-col-resizer';
        cell.appendChild(resizer);
        var startX = 0;
        var startW = 0;
        resizer.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startX = e.clientX;
            startW = cell.getBoundingClientRect().width;
            var onMove = function(ev) {
                var newW = Math.max(40, startW + ev.clientX - startX);
                cell.style.flex = '0 0 ' + newW + 'px';
                // 同步到数据行
                var dataRows = container.querySelectorAll('.taowu-table-row:not(.taowu-table-header)');
                dataRows.forEach(function(row) {
                    var cells = row.querySelectorAll('.taowu-table-cell');
                    if (cells[idx]) cells[idx].style.flex = '0 0 ' + newW + 'px';
                });
            };
            var onUp = function() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    });
}
function toDisplayName(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
}
/** 创建单个属性的 UI 元素 */
function createPropertyElement(propName, propDump, compUuid, compIndex, taowuMeta, isRendering, onPropChanged, elementMetadata) {
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
    var tagName = input.tagName.toLowerCase();
    if (tagName === 'ui-prop') {
        if (taowuMeta?.readOnly || propDump.readonly) {
            input.setAttribute('disabled', '');
        }
        requestAnimationFrame(function () {
            try { input.dump = input.dump || propDump; } catch (e) { }
            try { input.render(input.dump); } catch (e) { }
        });
    }
    wrapper.appendChild(input);
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
function createInputElement(propDump, taowuMeta, compUuid, compIndex, propName, isRendering, rawElement, elementMetadata) {
    const type = (propDump.type || '').toLowerCase();
    const value = propDump.value;
    // Array — List 或 TableList (必须在 cc.* 类型检查之前)
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
    // Object/Map — 非 cc.* 类型的对象且有实际属性
    if (typeof value === 'object' && value !== null && !Array.isArray(value)
        && !type.startsWith('cc.') && Object.keys(value).length > 0) {
        if (taowuMeta?.tableList) {
            return createDictTableElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta);
        }
        return createMapElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
    }
    // rawElement: 用于 List/TableList/Map 内部元素，不使用 ui-prop
    if (rawElement) {
        return createRawInputElement(propDump, taowuMeta);
    }
    // 所有简单类型 (Number, String, Boolean, Enum, Vec, Color, Size, Asset, Node 等)
    // 统一使用 ui-prop + dump，让 Cocos 原生渲染 label 和输入框，确保对齐
    const prop = document.createElement('ui-prop');
    prop.setAttribute('type', 'dump');
    // 克隆 dump 并应用自定义元数据
    var dumpCopy = Object.assign({}, propDump);
    if (taowuMeta?.labelText) {
        dumpCopy.displayName = taowuMeta.labelText;
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
    try { prop.dump = dumpCopy; } catch (e) { }
    return prop;
}
/** 创建原始输入元素 (用于 List/TableList/Map 内部，不使用 ui-prop) */
function createRawInputElement(propDump, taowuMeta) {
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
        if (value) checkbox.setAttribute('checked', '');
        return checkbox;
    }
    // Number
    if (type === 'number') {
        const numInput = document.createElement('ui-num-input');
        try { numInput.value = value; } catch (e) {}
        return numInput;
    }
    // String
    if (type === 'string') {
        const input = document.createElement('ui-input');
        try { input.value = value || ''; } catch (e) {}
        return input;
    }
    // Fallback
    const input = document.createElement('ui-input');
    try { input.value = typeof value === 'string' ? value : (value != null ? JSON.stringify(value) : ''); } catch (e) {}
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
function createListElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata) {
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
    const { container, content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`);
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'taowu-collection-items';
    content.appendChild(itemsContainer);
    function renderItems() {
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
                delBtn.addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    items.splice(i, 1);
                    await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: `${basePath}.length`, dump: { value: items.length } });
                    propDump.value = [...items];
                    updateHeader();
                    renderItems();
                });
                wrapper.appendChild(delBtn);
                const itemBox = document.createElement('ui-section');
                itemBox.className = 'taowu-collection-item-box';
                itemBox.setAttribute('header', `${_elemTypeName || 'Element'} ${i}`);
                const itemContent = document.createElement('div');
                itemContent.className = 'taowu-collection-item-content';
                const stop = (e) => e.stopPropagation();
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
                    subLabel.textContent = _elemMeta[subKey]?.labelText || subKey;
                    subRow.appendChild(subLabel);
                    const subField = document.createElement('div');
                    subField.className = 'taowu-collection-field';
                    let subVal = unwrapped[subKey];
                    let subType = 'String';
                    let subPath = `${basePath}.${i}.${subKey}`;
                    let rawSubDump = null;
                    if (subVal && typeof subVal === 'object' && subVal.value !== undefined && subVal.type !== undefined) {
                        subType = subVal.type;
                        subVal = subVal.value;
                        rawSubDump = unwrapped[subKey];
                        if (rawSubDump && rawSubDump.path) { subPath = rawSubDump.path; }
                    } else {
                        subType = typeof subVal === 'number' ? 'Number' : typeof subVal === 'boolean' ? 'Boolean' : 'String';
                    }
                    const subDump = { value: subVal, type: subType };
                    const subInput = createInputElement(subDump, _elemMeta[subKey], compUuid, compIndex, propName, isRendering, true);
                    subField.appendChild(subInput);
                    const isSubInput = subInput.tagName.toLowerCase() === 'ui-input';
                    if (isSubInput) {
                        subInput.addEventListener('confirm', async (e) => {
                            e.stopPropagation();
                            const newVal = getInputValue(subInput, subDump);
                            unwrapped[subKey] = newVal;
                            items[i] = { ...unwrapped };
                            const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                            await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: subPath, dump: setDump });
                        });
                    } else {
                        subInput.addEventListener('change', async () => {
                            if (isRendering && isRendering()) return;
                            const newVal = getInputValue(subInput, subDump);
                            unwrapped[subKey] = newVal;
                            items[i] = { ...unwrapped };
                            const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                            await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: subPath, dump: setDump });
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
                let itemDump, itemPath;
                if (_isCocosType) {
                    // Cocos 类型: 使用原始 rawItems[i] 保留子属性 path，补上 type，清空 name/displayName 避免重复索引
                    const rawItem = rawItems[i];
                    itemDump = Object.assign({}, rawItem, { type: elementTypeData.type || 'cc.Vec3', displayName: '', name: '' });
                    itemPath = (rawItem && rawItem.path) ? rawItem.path : `${basePath}.${i}`;
                } else {
                    const itemType = elementTypeData.type || (typeof items[i] === 'number' ? 'Number' : 'String');
                    itemDump = { value: items[i], type: itemType };
                    itemPath = `${basePath}.${i}`;
                }
                const itemInput = createInputElement(itemDump, undefined, compUuid, compIndex, propName, isRendering, _useRaw);
                itemContent.appendChild(itemInput);
                const _itemType = itemDump.type;
                if (itemInput.tagName.toLowerCase() === 'ui-prop') {
                    requestAnimationFrame(() => {
                        try { itemInput.dump = itemDump; } catch (e) {}
                        try { itemInput.render(itemDump); } catch (e) {}
                    });
                    itemInput.addEventListener('change-dump', async () => {
                        if (isRendering && isRendering()) return;
                        const newDump = itemInput.dump;
                        if (!newDump) return;
                        items[i] = newDump.value;
                        await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: itemPath, dump: newDump });
                        propDump.value[i] = newDump.value;
                    });
                } else {
                    itemInput.addEventListener('change', async () => {
                        if (isRendering && isRendering()) return;
                        const newVal = getInputValue(itemInput, itemDump);
                        items[i] = newVal;
                        await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: itemPath, dump: { type: _itemType, value: newVal } });
                        propDump.value[i] = newVal;
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
                });
                itemRow.appendChild(delBtn);
                itemsContainer.appendChild(itemRow);
            }
        }
    }
    function updateHeader() {
        container.setAttribute('header', `${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`);
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
        items.push(defaultVal);
        updateHeader();
        renderItems();
    });
    content.appendChild(addBtn);
    return container;
}
// ─── TableList 渲染 (可折叠表格列表, Box 风格) ───
function createTableListElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata) {
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
    const { container, content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`);
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'taowu-collection-items';
    content.appendChild(itemsContainer);
    function renderItems() {
        itemsContainer.innerHTML = '';
        // 表头行: 简单类型显示 #-Item，对象类型显示 #-字段名...
        if (items.length > 0) {
            const firstItem = items[0];
            const isFirstObj = typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem);
            const isFirstCocos = isFirstObj && (() => {
                const u = (firstItem.value !== undefined && firstItem.type !== undefined && typeof firstItem.value === 'object')
                    ? firstItem.value : firstItem;
                const k = Object.keys(u);
                return (k.includes('x') && k.includes('y')) || k.includes('r') || k.includes('width');
            })();
            if (isFirstObj && !isFirstCocos) {
                const firstUnwrapped = (firstItem.value !== undefined && firstItem.type !== undefined && typeof firstItem.value === 'object')
                    ? firstItem.value : firstItem;
                const firstKeys = Object.keys(firstUnwrapped);
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
            } else if (!isFirstObj || isFirstCocos) {
                // 简单类型 / Cocos 类型表头: #-Item
                const headerRow = document.createElement('div');
                headerRow.className = 'taowu-table-row taowu-table-header';
                const headerIndex = document.createElement('span');
                headerIndex.className = 'taowu-table-index';
                headerIndex.textContent = '#';
                headerRow.appendChild(headerIndex);
                const headerCell = document.createElement('div');
                headerCell.className = 'taowu-table-cell';
                headerCell.textContent = 'Item';
                headerRow.appendChild(headerCell);
                const spacer = document.createElement('span');
                spacer.className = 'taowu-table-index';
                spacer.textContent = '';
                headerRow.appendChild(spacer);
                itemsContainer.appendChild(headerRow);
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
                        let rawSubDump = null;
                        if (subVal && typeof subVal === 'object' && subVal.value !== undefined && subVal.type !== undefined) {
                            subType = subVal.type;
                            subVal = subVal.value;
                            rawSubDump = _unwrapped[subKey];
                            if (rawSubDump && rawSubDump.path) { subPath = rawSubDump.path; }
                        } else {
                            subType = typeof subVal === 'number' ? 'Number' : typeof subVal === 'boolean' ? 'Boolean' : 'String';
                        }
                        const subDump = { value: subVal, type: subType };
                        const subInput = createInputElement(subDump, _elemMeta[subKey], compUuid, compIndex, propName, isRendering, true);
                        cell.appendChild(subInput);
                        const isSubInput = subInput.tagName.toLowerCase() === 'ui-input';
                        if (isSubInput) {
                            subInput.addEventListener('confirm', async (e) => {
                                e.stopPropagation();
                                const newVal = getInputValue(subInput, subDump);
                                _unwrapped[subKey] = newVal;
                                const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                                await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: subPath, dump: setDump });
                            });
                        } else {
                            subInput.addEventListener('change', async () => {
                                if (isRendering && isRendering()) return;
                                const newVal = getInputValue(subInput, subDump);
                                _unwrapped[subKey] = newVal;
                                const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
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
                    const itemDump = Object.assign({}, rawItem, { type: propDump.elementTypeData?.type || 'cc.Vec3', displayName: '', name: '' });
                    const itemPath = (rawItem && rawItem.path) ? rawItem.path : `${basePath}.${i}`;
                    const prop = document.createElement('ui-prop');
                    prop.setAttribute('type', 'dump');
                    try { prop.dump = itemDump; } catch (e) {}
                    cell.appendChild(prop);
                    requestAnimationFrame(() => {
                        try { prop.dump = itemDump; } catch (e) {}
                        try { prop.render(itemDump); } catch (e) {}
                    });
                    prop.addEventListener('change-dump', async () => {
                        if (isRendering && isRendering()) return;
                        const newDump = prop.dump;
                        if (!newDump) return;
                        items[i] = newDump.value;
                        await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: itemPath, dump: newDump });
                        propDump.value[i] = newDump.value;
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
                        subLabel.className = 'taowu-collection-label';
                        subLabel.textContent = _elemMeta[subKey]?.labelText || subKey;
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
                        const subInput = createInputElement(subDump, _elemMeta[subKey], compUuid, compIndex, propName, isRendering, true);
                        subField.appendChild(subInput);

                        const isSubInput = subInput.tagName.toLowerCase() === 'ui-input';
                        if (isSubInput) {
                            subInput.addEventListener('confirm', async (e) => {
                                e.stopPropagation();
                                const newVal = getInputValue(subInput, subDump);
                                unwrapped[subKey] = newVal;
                                const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                                await Editor.Message.request('scene', 'set-property', {
                                    uuid: compUuid, path: subPath,
                                    dump: setDump,
                                });
                            });
                        } else {
                            subInput.addEventListener('change', async () => {
                                if (isRendering && isRendering())
                                    return;
                                const newVal = getInputValue(subInput, subDump);
                                unwrapped[subKey] = newVal;
                                const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
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
            }
            else {
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
                const itemInput = createInputElement(itemDump, undefined, compUuid, compIndex, propName, isRendering, true);
                cell.appendChild(itemInput);
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
        if (headerEl) syncColumnWidths(headerEl, itemsContainer);
    }
    function updateHeader() {
        container.setAttribute('header', `${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`);
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
        // 将新元素加入本地数组并重新渲染
        if (isCocosValue) {
            items.push(JSON.parse(JSON.stringify(template)));
        } else if (template && typeof template === 'object') {
            const newObj = {};
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
    });
    content.appendChild(addBtn);
    return container;
}
// ─── 字典 TableList 渲染 (Record<string, V> + @TableList) ───
function buildCleanDict(valueObj) {
    var result = {};
    for (var k in valueObj) {
        var v = valueObj[k];
        if (v && typeof v === 'object' && v.value !== undefined && v.type !== undefined) {
            result[k] = v.value;
        } else {
            result[k] = v;
        }
    }
    return result;
}
function createDictTableElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta) {
    var basePath = buildPath(propDump, compIndex, propName);
    var valueObj = propDump.value || {};
    var keys = Object.keys(valueObj);
    var { container: container, content: content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${keys.length})`);
    var itemsContainer = document.createElement('div');
    itemsContainer.className = 'taowu-collection-items';
    content.appendChild(itemsContainer);

    function renderItems() {
        itemsContainer.innerHTML = '';
        keys = Object.keys(valueObj);
        // 表头
        if (keys.length > 0 || true) {
            var headerRow = document.createElement('div');
            headerRow.className = 'taowu-table-row taowu-table-header';
            var hIdx = document.createElement('span');
            hIdx.className = 'taowu-table-index'; hIdx.textContent = '#';
            headerRow.appendChild(hIdx);
            var hKey = document.createElement('div');
            hKey.className = 'taowu-table-cell'; hKey.textContent = 'Key';
            headerRow.appendChild(hKey);
            var hVal = document.createElement('div');
            hVal.className = 'taowu-table-cell'; hVal.textContent = 'Value';
            headerRow.appendChild(hVal);
            var spacer = document.createElement('span');
            spacer.className = 'taowu-table-index'; spacer.textContent = '';
            headerRow.appendChild(spacer);
            itemsContainer.appendChild(headerRow);
        }
        // 数据行
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var val = valueObj[key];
            // 解包 IProperty
            var rawValDump = null;
            if (val && typeof val === 'object' && val.value !== undefined && val.type !== undefined) {
                rawValDump = val;
                val = val.value;
            }
            var valType = typeof val === 'number' ? 'Number' : typeof val === 'boolean' ? 'Boolean' : 'String';
            var tableRow = document.createElement('div');
            tableRow.className = 'taowu-table-row';
            var indexSpan = document.createElement('span');
            indexSpan.className = 'taowu-table-index';
            indexSpan.textContent = String(i);
            tableRow.appendChild(indexSpan);
            // Key 输入
            var keyCell = document.createElement('div');
            keyCell.className = 'taowu-table-cell';
            var keyInput = document.createElement('ui-input');
            keyInput.style.width = '100%';
            try { keyInput.value = key; } catch (e) {}
            keyCell.appendChild(keyInput);
            tableRow.appendChild(keyCell);
            // Value 输入
            var valCell = document.createElement('div');
            valCell.className = 'taowu-table-cell';
            var valDump = { value: val, type: valType };
            var valInput = createInputElement(valDump, undefined, compUuid, compIndex, propName, isRendering, true);
            valCell.appendChild(valInput);
            tableRow.appendChild(valCell);
            // 事件: Key 修改
            (function(k, ki) {
                ki.addEventListener('confirm', async function(e) {
                    e.stopPropagation();
                    var newKey = ki.value;
                    if (newKey === k) return;
                    if (valueObj[newKey] !== undefined) {
                        console.error('[TaoWuInspector] 字典 key 已存在:', newKey);
                        ki.value = k;
                        return;
                    }
                    valueObj[newKey] = valueObj[k];
                    delete valueObj[k];
                    // 通过 scene-script 直接修改组件属性 (绕过 set-property 的 dump 限制)
                    var cleanVal = buildCleanDict(valueObj);
                    await Editor.Message.request('scene', 'execute-scene-script', {
                        name: 'taowu-inspector', method: 'setDictValue',
                        args: [compUuid, basePath, cleanVal]
                    });
                    renderItems();
                });
            })(key, keyInput);
            // 事件: Value 修改
            (function(k, vi, vd) {
                var isVi = vi.tagName.toLowerCase() === 'ui-input';
                if (isVi) {
                    vi.addEventListener('confirm', async function(e) {
                        e.stopPropagation();
                        var newVal = getInputValue(vi, vd);
                        valueObj[k] = newVal;
                        var setDump = rawValDump ? Object.assign({}, rawValDump, { value: newVal }) : { type: valType, value: newVal };
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: compUuid, path: basePath + '.' + k,
                            dump: setDump
                        });
                    });
                } else {
                    vi.addEventListener('change', async function() {
                        if (isRendering && isRendering()) return;
                        var newVal = getInputValue(vi, vd);
                        valueObj[k] = newVal;
                        var setDump = rawValDump ? Object.assign({}, rawValDump, { value: newVal }) : { type: valType, value: newVal };
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: compUuid, path: basePath + '.' + k,
                            dump: setDump
                        });
                    });
                }
            })(key, valInput, valDump);
            // 删除按钮
            var delBtn = document.createElement('span');
            delBtn.textContent = '×';
            delBtn.style.cssText = 'flex:0 0 22px;width:22px;min-width:22px;max-width:22px;color:#c55;text-align:center;padding:2px 0;cursor:pointer;font-size:14px;user-select:none;overflow:visible;';
            delBtn.addEventListener('mouseenter', function() { delBtn.style.color = '#f77'; });
            delBtn.addEventListener('mouseleave', function() { delBtn.style.color = '#c55'; });
            (function(k) {
                delBtn.addEventListener('click', async function() {
                    delete valueObj[k];
                    var cleanVal = buildCleanDict(valueObj);
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
        var addRow = document.createElement('div');
        addRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:4px;';
        var addKeyInput = document.createElement('ui-input');
        addKeyInput.setAttribute('placeholder', '输入 Key');
        addKeyInput.style.cssText = 'flex:1;min-width:0;';
        addRow.appendChild(addKeyInput);
        var addBtn = document.createElement('div');
        addBtn.className = 'taowu-list-btn taowu-list-btn-add';
        addBtn.textContent = '+ 添加';
        addRow.appendChild(addBtn);
        addBtn.addEventListener('click', async function() {
            var newKey = addKeyInput.value;
            if (!newKey) {
                console.error('[TaoWuInspector] 请输入 Key');
                return;
            }
            if (valueObj[newKey] !== undefined) {
                console.error('[TaoWuInspector] 字典 key 已存在:', newKey);
                return;
            }
            // 推断默认值类型
            var firstKey = Object.keys(valueObj)[0];
            var defaultVal = firstKey !== undefined ? (typeof valueObj[firstKey] === 'number' ? 0 : '') : 0;
            valueObj[newKey] = defaultVal;
                    var cleanVal = buildCleanDict(valueObj);
                    await Editor.Message.request('scene', 'execute-scene-script', {
                        name: 'taowu-inspector', method: 'setDictValue',
                        args: [compUuid, basePath, cleanVal]
                    });
                    addKeyInput.value = '';
                    renderItems();
        });
        itemsContainer.appendChild(addRow);
        // 同步列宽
        var headerEl = itemsContainer.querySelector('.taowu-table-header');
        if (headerEl) syncColumnWidths(headerEl, itemsContainer);
    }

    function updateHeader() {
        container.setAttribute('header', `${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${keys.length})`);
    }
    renderItems();
    return container;
}
// ─── Map 渲染 (对象/字典, Box 风格) ───
function createMapElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata) {
    const basePath = buildPath(propDump, compIndex, propName);
    const valueObj = propDump.value || {};
    const keys = Object.keys(valueObj);
    const { container, content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${keys.length})`);
    for (const key of keys) {
        const row = document.createElement('div');
        row.className = 'taowu-collection-row';
        const keyLabel = document.createElement('span');
        keyLabel.className = 'taowu-collection-label';
        // 获取元素类型元数据用于 LabelText
        const _elemTypeName = propDump.type;
        const _elemMeta = (_elemTypeName && elementMetadata && elementMetadata[_elemTypeName]) || {};
        keyLabel.textContent = _elemMeta[key]?.labelText || key;
        row.appendChild(keyLabel);
        const valField = document.createElement('div');
        valField.className = 'taowu-collection-field';
        let val = valueObj[key];
        let valType = 'String';
        let rawSubDump = null;
        if (val && typeof val === 'object' && val.value !== undefined && val.type !== undefined) {
            valType = val.type;
            val = val.value;
            rawSubDump = valueObj[key];
        }
        else {
            valType = typeof val === 'number' ? 'Number' : typeof val === 'boolean' ? 'Boolean' : 'String';
        }
        // 如果子属性本身是对象 (嵌套 class)，递归渲染
        if (val && typeof val === 'object' && !Array.isArray(val) && !valType.startsWith('cc.') && Object.keys(val).length > 0) {
            const nestedDump = rawSubDump || { value: val, type: valType, path: `${basePath}.${key}` };
            const nestedEl = createMapElement(nestedDump, compUuid, compIndex, propName, isRendering, _elemMeta[key], elementMetadata);
            valField.appendChild(nestedEl);
        }
        else {
            const valDump = { value: val, type: valType };
            const valInput = createInputElement(valDump, _elemMeta[key], compUuid, compIndex, propName, isRendering, true);
            valField.appendChild(valInput);
            const subPath = (rawSubDump && rawSubDump.path) ? rawSubDump.path : `${basePath}.${key}`;
            const isValInput = valInput.tagName.toLowerCase() === 'ui-input';
            if (isValInput) {
                valInput.addEventListener('confirm', async (e) => {
                    e.stopPropagation();
                    const newVal = getInputValue(valInput, valDump);
                    valueObj[key] = newVal;
                    const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: valType, value: newVal };
                    await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path: subPath, dump: setDump });
                });
            } else {
                valInput.addEventListener('change', async () => {
                    if (isRendering && isRendering()) return;
                    const newVal = getInputValue(valInput, valDump);
                    valueObj[key] = newVal;
                    const setDump = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: valType, value: newVal };
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
function setupChangeListener(input, propName, propDump, compUuid, compIndex, taowuMeta, isRendering, onPropChanged) {
    const propPath = buildPath(propDump, compIndex, propName);
    // ui-prop with type="dump" uses change-dump event
    if (input.tagName.toLowerCase() === 'ui-prop') {
        let lastValue = JSON.parse(JSON.stringify(propDump.value));
        const handleChange = async () => {
            if (isRendering && isRendering()) return;
            await new Promise(r => requestAnimationFrame(r));
            const newVal = input.dump ? input.dump.value : undefined;
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
                if (contentEl && contentEl.__taowuRerender) {
                    contentEl.__taowuRerender(propName, newVal);
                }
            }
        };
        input.addEventListener('change-dump', handleChange);
        return;
    }
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
