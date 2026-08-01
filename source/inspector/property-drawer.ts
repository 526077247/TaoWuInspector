import { ITaoWuPropertyMeta, evaluateEnabled, evaluateCondition } from './taowu-utils';
import { jsonState } from './json-asset-renderer';

/** 辅助: 调用 set-property，json-edit 模式跳过 */
async function safeSetProperty(compUuid: string, path: string, dump: any): Promise<any> {
    if (compUuid === 'json-edit' || !compUuid) {
        if (compUuid === 'json-edit' && jsonState.asset) {
            jsonState.dirty = true;
            if (jsonState.onDirty) jsonState.onDirty();
        }
        return null;
    }
    return await Editor.Message.request('scene', 'set-property', { uuid: compUuid, path, dump });
}

/** 辅助: 通过 scene-script 调用组件方法 */
async function invokeMethod(compUuid: string, compIndex: number, methodName: string): Promise<void> {
    try {
        await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'taowu-inspector',
            method: 'invokeMethod',
            args: [compUuid, compIndex, methodName]
        });
        const contentEl = document.querySelector('.taowu-content') as any;
        if (contentEl?.__taowuRerender) {
            await contentEl.__taowuRerender(undefined, undefined, true);
        }
    } finally {
        const btns = document.querySelectorAll('.taowu-button');
        btns.forEach(btn => btn.classList.remove('taowu-button-loading'));
    }
}

/** 辅助: 触发 OnValueChanged / OnCollectionChanged 回调 */
async function triggerCallbacks(compUuid: string, compIndex: number, propName: string): Promise<void> {
    try {
        await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'taowu-inspector', method: 'triggerValueChanged',
            args: [compUuid, compIndex, propName]
        });
    } catch (e) {}
}

/** camelCase 转为 Title Case (如 configMap → Config Map) */
function toDisplayName(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

/** 构建标准 set-property path */
function buildPath(propDump: any, compIndex: number, propName: string): string {
    const rawPath = propDump.path || `__comps__.${compIndex}.${propName}`;
    return rawPath.replace(/^__comps__[_.]*(\d+)[_.]/, (_m: string, idx: string) => `__comps__.${idx}.`);
}

/** 统一 Box 容器 (可折叠, 默认折叠) */
function createBoxContainer(title: string, propName?: string): { container: HTMLElement; content: HTMLElement } {
    const section = document.createElement('ui-section');
    section.className = 'taowu-collection taowu-box';
    section.setAttribute('header', title);
    if (propName) section.setAttribute('data-prop-name', propName);
    const content = document.createElement('div');
    content.className = 'taowu-box-content';
    const stop = (e: Event) => e.stopPropagation();
    content.addEventListener('click', stop);
    content.addEventListener('mousedown', stop);
    content.addEventListener('pointerdown', stop);
    content.addEventListener('change', stop);
    content.addEventListener('confirm', stop);
    section.appendChild(content);
    return { container: section, content };
}

function createAddButton(text: string): HTMLElement {
    const btn = document.createElement('div');
    btn.className = 'taowu-list-btn taowu-list-btn-add';
    btn.textContent = text;
    return btn;
}

function createDelButton(text: string): HTMLElement {
    const btn = document.createElement('span');
    btn.className = 'taowu-list-btn taowu-list-btn-del';
    btn.textContent = text;
    return btn;
}

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

function createInfoBoxElement(message: string, type: string): HTMLElement {
    const box = document.createElement('div');
    box.className = `taowu-infobox taowu-infobox-${type}`;
    box.textContent = message;
    return box;
}

export function createButtonElement(
    propName: string, taowuMeta: ITaoWuPropertyMeta, compUuid: string, compIndex: number, properties?: Map<string, any>
): HTMLElement {
    const btn = document.createElement('div');
    btn.className = 'taowu-button';
    btn.textContent = taowuMeta.button?.name || toDisplayName(propName);
    btn.addEventListener('click', async () => {
        btn.classList.add('taowu-button-loading');
        try {
            await invokeMethod(compUuid, compIndex, propName);
        } finally {
            btn.classList.remove('taowu-button-loading');
        }
    });
    const wrapper = document.createElement('div');
    wrapper.className = 'taowu-property-wrapper';
    wrapper.appendChild(btn);
    return wrapper;
}

export function createPropertyElement(
    propName: string, propDump: any, compUuid: string, compIndex: number,
    taowuMeta?: ITaoWuPropertyMeta, isRendering?: () => boolean, onPropChanged?: () => void,
    elementMetadata?: any, properties?: Map<string, any>
): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'taowu-property-wrapper';
    wrapper.dataset.propName = propName;
    // ShowIf/HideIf 条件检查
    if (taowuMeta?.showIf || taowuMeta?.hideIf) {
        const condProps = new Map<string, any>();
        if (jsonState.asset && typeof jsonState.asset === 'object') {
            for (const k of Object.keys(jsonState.asset)) {
                if (k !== '_t') condProps.set(k, jsonState.asset[k]);
            }
        }
        if (!evaluateCondition(taowuMeta, condProps)) {
            wrapper.style.display = 'none';
        }
    }

    // EnableIf/DisableIf
    const condProps2 = new Map<string, any>();
    if (jsonState.asset && typeof jsonState.asset === 'object') {
        for (const k of Object.keys(jsonState.asset)) {
            if (k !== '_t') condProps2.set(k, jsonState.asset[k]);
        }
    }
    const isEnabled = evaluateEnabled(taowuMeta, condProps2);

    if (taowuMeta?.title) {
        wrapper.appendChild(createTitleElement(taowuMeta.title, taowuMeta.titleHorizontalLine ?? true));
    }
    if (taowuMeta?.infoBox) {
        wrapper.appendChild(createInfoBoxElement(taowuMeta.infoBox.message, taowuMeta.infoBox.type));
    }
    const input = createInputElement(propDump, taowuMeta, compUuid, compIndex, propName, isRendering, false, elementMetadata);
    const tagName = input.tagName.toLowerCase();
    const isReadOnly = taowuMeta?.readOnly || propDump.readonly || !isEnabled;
    if (tagName === 'ui-prop' && input.getAttribute('type') === 'dump' && !input.hasAttribute('data-value-dropdown')) {
        requestAnimationFrame(() => {
            try { (input as any).dump = (input as any).dump || propDump; } catch (e) {}
            try { (input as any).render((input as any).dump); } catch (e) {}
            if (isReadOnly) input.setAttribute('disabled', '');
        });
    } else if (input.hasAttribute('data-value-dropdown')) {
        // ValueDropdown 的 ui-prop
        if (isReadOnly) {
            requestAnimationFrame(() => {
                const select = input.querySelector('ui-select') as any;
                if (select) select.setAttribute('disabled', '');
            });
        }
    } else {
        // 原生元素: ui-num-input, ui-input, ui-checkbox, ui-select, ui-vec3, ui-color 等
        if (isReadOnly) {
            if (tagName === 'ui-checkbox') {
                input.style.pointerEvents = 'none';
                input.style.opacity = '0.6';
            } else {
                input.setAttribute('disabled', '');
                input.setAttribute('readonly', '');
            }
        }
    }
    if (['ui-vec3','ui-vec2','ui-vec4','ui-color','ui-size'].includes(tagName)) {
        const val = propDump.value;
        const trySetValue = (attempts: number) => {
            if (attempts <= 0) return;
            requestAnimationFrame(() => {
                try {
                    if (tagName === 'ui-vec3') (input as any).value = { x: val.x, y: val.y, z: val.z };
                    else if (tagName === 'ui-vec2') (input as any).value = { x: val.x, y: val.y };
                    else if (tagName === 'ui-vec4') (input as any).value = { x: val.x, y: val.y, z: val.z, w: val.w || 0 };
                    else if (tagName === 'ui-color') (input as any).value = { r: val.r, g: val.g, b: val.b, a: val.a != null ? val.a : 255 };
                    else if (tagName === 'ui-size') (input as any).value = { width: val.width, height: val.height };
                    const cv = (input as any).value;
                    if (!cv || (cv.x === undefined && cv.r === undefined)) trySetValue(attempts - 1);
                } catch (e) { trySetValue(attempts - 1); }
            });
        };
        trySetValue(5);
    }
    wrapper.appendChild(input);
    const isContainer = input.classList.contains('taowu-collection');
    const isValueDropdown = input.hasAttribute('data-value-dropdown');
    if (!isContainer && !isValueDropdown) {
        setupChangeListener(input, propName, propDump, compUuid, compIndex, taowuMeta, isRendering, onPropChanged);
    }
    return wrapper;
}

export function createInputElement(
    propDump: any, taowuMeta: ITaoWuPropertyMeta | undefined, compUuid: string, compIndex: number,
    propName: string, isRendering?: () => boolean, rawElement?: boolean, elementMetadata?: any
): HTMLElement {
    const type = (propDump.type || '').toLowerCase();
    const value = propDump.value;
    if (propDump.isArray || Array.isArray(value)) {
        if (taowuMeta?.tableList) return createTableListElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
        return createListElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
    }
    if (type.startsWith('cc.') && Array.isArray(value)) {
        if (taowuMeta?.tableList) return createTableListElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
        return createListElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
    }
    if (rawElement) return createRawInputElement(propDump, taowuMeta, compUuid, compIndex);
    if (taowuMeta?.valueDropdown) return createValueDropdownElement(propDump, taowuMeta, compUuid, compIndex, propName, isRendering);
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !type.startsWith('cc.') && Object.keys(value).length > 0) {
        if (taowuMeta?.tableList) return createDictTableElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta);
        return createMapElement(propDump, compUuid, compIndex, propName, isRendering, taowuMeta, elementMetadata);
    }
    if (type === 'cc.jsonasset' || type === 'jsonasset') return createJsonAssetElement(propDump, taowuMeta, compUuid, compIndex, propName);
    const prop = document.createElement('ui-prop');
    prop.setAttribute('type', 'dump');
    const dumpCopy = Object.assign({}, propDump);
    if (taowuMeta?.labelText) dumpCopy.displayName = taowuMeta.labelText;
    else { const baseName = propDump.name || propName; dumpCopy.displayName = toDisplayName(baseName); }
    if (taowuMeta?.readOnly) dumpCopy.readonly = true;
    if (taowuMeta?.range) { dumpCopy.slide = true; dumpCopy.min = taowuMeta.range.min; dumpCopy.max = taowuMeta.range.max; }
    if (taowuMeta?.textarea) dumpCopy.multiline = true;
    try { (prop as any).dump = dumpCopy; } catch (e) {}
    return prop;
}

function createJsonAssetElement(propDump: any, taowuMeta: any, compUuid: string, compIndex: number, propName: string): HTMLElement {
    const prop = document.createElement('ui-prop');
    prop.setAttribute('type', 'dump');
    const dumpCopy = Object.assign({}, propDump);
    dumpCopy.displayName = taowuMeta?.labelText || toDisplayName(propDump.name || propName);
    if (taowuMeta?.readOnly) dumpCopy.readonly = true;
    try { (prop as any).dump = dumpCopy; } catch (e) {}
    return prop;
}

function createValueDropdownElement(propDump: any, taowuMeta: ITaoWuPropertyMeta, compUuid: string, compIndex: number, propName: string, isRendering?: () => boolean): HTMLElement {
    const vd = taowuMeta.valueDropdown!;
    const propPath = buildPath(propDump, compIndex, propName);
    const isNumber = (propDump.type || '').toLowerCase() === 'number';
    const prop = document.createElement('ui-prop');
    prop.setAttribute('type', 'dump');
    prop.setAttribute('data-value-dropdown', '');
    const dumpCopy = Object.assign({}, propDump);
    dumpCopy.displayName = taowuMeta.labelText || toDisplayName(propDump.name || propName);
    if (taowuMeta.readOnly) dumpCopy.readonly = true;
    try { (prop as any).dump = dumpCopy; } catch (e) {}
    function applyEnumList(values: (number|string)[], labels?: string[]): void {
        dumpCopy.enumList = values.map((v, i) => ({ value: v, name: labels && labels[i] ? labels[i] : String(v) }));
        dumpCopy.value = isNumber ? Number(propDump.value) : propDump.value;
        dumpCopy.type = 'Enum';
        try { (prop as any).dump = dumpCopy; } catch (e) {}
        requestAnimationFrame(() => { try { (prop as any).render(dumpCopy); } catch (e) {} if (taowuMeta.readOnly) prop.setAttribute('disabled', ''); });
    }
    function setupEnumChange(): void {
        prop.addEventListener('confirm', async (e: Event) => {
            e.stopPropagation();
            const newVal = (prop as any).dump ? (prop as any).dump.value : undefined;
            if (newVal === undefined) return;
            const typedVal = isNumber ? Number(newVal) : newVal;
            propDump.value = typedVal;
            await safeSetProperty(compUuid, propPath, { type: propDump.type, value: typedVal });
        });
    }
    if (vd.values) { applyEnumList(vd.values, vd.labels); setupEnumChange(); }
    else if (vd.memberName) {
        applyEnumList([], []); setupEnumChange();
        // json-edit 模式: 通过类名解析 (无组件实例)
        if (compUuid === 'json-edit') {
            // 优先用 propDump._ownerType (嵌套对象所属类)，否则用根类型名
            const className = propDump._ownerType || propDump._t || (propDump.type && !['Number','String','Boolean'].includes(propDump.type) ? propDump.type : '') || jsonState.rootTypeName || '';
            Editor.Message.request('taowu-inspector', 'resolve-value-dropdown-by-class', className, vd.memberName)
                .then((result: any) => {
                    let values: (number|string)[] = []; let labels: string[] | undefined;
                    if (Array.isArray(result)) {
                        if (result.length > 0 && typeof result[0] === 'object' && result[0].value !== undefined) {
                            values = result.map((r: any) => r.value); labels = result.map((r: any) => r.label || String(r.value));
                        } else { values = result; }
                    }
                    applyEnumList(values, labels || vd.labels);
                }).catch(() => { applyEnumList([], []); });
        } else {
            Editor.Message.request('taowu-inspector', 'resolve-value-dropdown', compUuid, compIndex, vd.memberName)
                .then((result: any) => {
                    let values: (number|string)[] = []; let labels: string[] | undefined;
                    if (Array.isArray(result)) {
                        if (result.length > 0 && typeof result[0] === 'object' && result[0].value !== undefined) {
                            values = result.map((r: any) => r.value); labels = result.map((r: any) => r.label || String(r.value));
                        } else { values = result; }
                    }
                    applyEnumList(values, labels || vd.labels);
                }).catch(() => { applyEnumList([], []); });
        }
    }
    return prop;
}

function createRawInputElement(propDump: any, taowuMeta: ITaoWuPropertyMeta | undefined, compUuid?: string, compIndex?: number): HTMLElement {
    const type = (propDump.type || '').toLowerCase();
    const value = propDump.value;
    if (taowuMeta?.valueDropdown) {
        const vd = taowuMeta.valueDropdown; const isNumber = type === 'number';
        const select = document.createElement('ui-select'); select.style.width = '100%';
        function fillSelect(values: (number|string)[], labels?: string[]): void {
            for (let i = 0; i < values.length; i++) {
                const opt = document.createElement('option'); opt.value = String(values[i]);
                opt.textContent = labels && labels[i] ? labels[i] : String(values[i]); select.appendChild(opt);
            }
            (select as any).value = String(value);
        }
        if (vd.values) fillSelect(vd.values, vd.labels);
        else if (vd.memberName) {
            fillSelect([], []);
            if (compUuid === 'json-edit') {
                const className = propDump._ownerType || propDump._t || (propDump.type && !['Number','String','Boolean'].includes(propDump.type) ? propDump.type : '') || jsonState.rootTypeName || '';
                Editor.Message.request('taowu-inspector', 'resolve-value-dropdown-by-class', className, vd.memberName)
                    .then((result: any) => {
                        let values: (number|string)[] = []; let labels: string[] | undefined;
                        if (Array.isArray(result)) {
                            if (result.length > 0 && typeof result[0] === 'object' && result[0].value !== undefined) {
                                values = result.map((r: any) => r.value); labels = result.map((r: any) => r.label || String(r.value));
                            } else { values = result; }
                        }
                        const finalLabels = labels || vd.labels;
                        while (select.firstChild) select.removeChild(select.firstChild);
                        fillSelect(values, finalLabels);
                    }).catch(() => {});
            } else if (compUuid && compIndex !== undefined) {
                Editor.Message.request('taowu-inspector', 'resolve-value-dropdown', compUuid, compIndex, vd.memberName)
                    .then((result: any) => {
                        let values: (number|string)[] = []; let labels: string[] | undefined;
                        if (Array.isArray(result)) {
                            if (result.length > 0 && typeof result[0] === 'object' && result[0].value !== undefined) {
                                values = result.map((r: any) => r.value); labels = result.map((r: any) => r.label || String(r.value));
                            } else { values = result; }
                        }
                        const finalLabels = labels || vd.labels;
                        while (select.firstChild) select.removeChild(select.firstChild);
                        fillSelect(values, finalLabels);
                    }).catch(() => {});
            }
        }
        if (taowuMeta.readOnly) select.setAttribute('disabled', '');
        select.addEventListener('confirm', async (e: Event) => {
            e.stopPropagation();
            const newVal = (select as any).value; const typedVal = isNumber ? Number(newVal) : newVal; propDump.value = typedVal;
        });
        return select;
    }
    if (propDump.enumList && propDump.enumList.length > 0) {
        const select = document.createElement('ui-select');
        for (const item of propDump.enumList) { const option = document.createElement('option'); option.value = item.value; option.textContent = item.name; select.appendChild(option); }
        (select as any).value = String(value); return select;
    }
    if (type === 'boolean') { const checkbox = document.createElement('ui-checkbox'); if (value) checkbox.setAttribute('checked', ''); return checkbox; }
    if (type === 'number') { const numInput = document.createElement('ui-num-input'); try { (numInput as any).value = value; } catch (e) {} return numInput; }
    if (type === 'string') { const input = document.createElement('ui-input'); try { (input as any).value = value || ''; } catch (e) {} return input; }
    // Cocos 基础类型 (兼容 cc.Vec3 / Vec3 / vec3 等写法)
    const cocosType = type.startsWith('cc.') ? type : 'cc.' + type;
    if (cocosType === 'cc.vec3' && value) { const el = document.createElement('ui-vec3'); const _v = value.value || value; const _setVal = () => { try { (el as any).value = { x: _v.x, y: _v.y, z: _v.z }; } catch (e) {} }; _setVal(); el.addEventListener('attached-to-dom' as any, _setVal); requestAnimationFrame(() => _setVal()); return el; }
    if (cocosType === 'cc.vec2' && value) { const el = document.createElement('ui-vec2'); const _v = value.value || value; const _setVal = () => { try { (el as any).value = { x: _v.x, y: _v.y }; } catch (e) {} }; _setVal(); el.addEventListener('attached-to-dom' as any, _setVal); requestAnimationFrame(() => _setVal()); return el; }
    if (cocosType === 'cc.vec4' && value) { const el = document.createElement('ui-vec4'); const _v = value.value || value; const _setVal = () => { try { (el as any).value = { x: _v.x, y: _v.y, z: _v.z, w: _v.w || 0 }; } catch (e) {} }; _setVal(); el.addEventListener('attached-to-dom' as any, _setVal); requestAnimationFrame(() => _setVal()); return el; }
    if (cocosType === 'cc.color' && value) { const el = document.createElement('ui-color'); const _v = value.value || value; const _setVal = () => { try { (el as any).value = { r: _v.r, g: _v.g, b: _v.b, a: _v.a != null ? _v.a : 255 }; } catch (e) {} }; _setVal(); el.addEventListener('attached-to-dom' as any, _setVal); requestAnimationFrame(() => _setVal()); return el; }
    if (cocosType === 'cc.size' && value) { const el = document.createElement('ui-size'); const _v = value.value || value; const _setVal = () => { try { (el as any).value = { width: _v.width, height: _v.height }; } catch (e) {} }; _setVal(); el.addEventListener('attached-to-dom' as any, _setVal); requestAnimationFrame(() => _setVal()); return el; }
    const input = document.createElement('ui-input');
    try { (input as any).value = typeof value === 'string' ? value : (value != null ? JSON.stringify(value) : ''); } catch (e) {}
    return input;
}

function getInputValue(input: HTMLElement, propDump: any): any {
    const tagName = input.tagName.toLowerCase();
    if (tagName === 'ui-checkbox') return (input as any).checked || input.hasAttribute('checked');
    if (tagName === 'ui-select') { const val = (input as any).value; return propDump.enumList ? Number(val) : val; }
    if (tagName === 'ui-slider' || tagName === 'ui-num-input') return Number((input as any).value);
    if (tagName === 'ui-color') { const v = (input as any).value; return { r: v.r, g: v.g, b: v.b, a: v.a }; }
    if (tagName === 'ui-vec2') { const v = (input as any).value; return { x: v.x, y: v.y }; }
    if (tagName === 'ui-vec3') { const v = (input as any).value; return { x: v.x, y: v.y, z: v.z }; }
    if (tagName === 'ui-vec4') { const v = (input as any).value; return { x: v.x, y: v.y, z: v.z, w: v.w }; }
    if (tagName === 'ui-size') { const v = (input as any).value; return { width: v.width, height: v.height }; }
    if (input.classList && input.classList.contains('taowu-multi-num')) {
        const keys = (input.dataset.multiKeys || '').split(','); const inputs = input.querySelectorAll('ui-num-input'); const result: any = {};
        inputs.forEach((inp, idx) => { if (idx < keys.length) result[keys[idx]] = Number((inp as any).value); });
        return result;
    }
    return (input as any).value;
}

function setInputValue(input: HTMLElement, value: any, propDump: any): void {
    const tagName = input.tagName.toLowerCase();
    if (tagName === 'ui-checkbox') { if (value) input.setAttribute('checked', ''); else input.removeAttribute('checked'); }
    else { try { (input as any).value = value; } catch (e) {} }
}

function syncColumnWidths(header: HTMLElement, container: HTMLElement): void {
    const headerCells = header.querySelectorAll('.taowu-table-cell, .taowu-table-index');
    const firstRow = container.querySelector('.taowu-table-row:not(.taowu-table-header)');
    if (!firstRow) return;
    const rowCells = firstRow.querySelectorAll('.taowu-table-cell, .taowu-table-index');
    headerCells.forEach((h, i) => { if (rowCells[i]) { (h as HTMLElement).style.width = (rowCells[i] as HTMLElement).offsetWidth + 'px'; } });
}

/** 拖拽调整列宽: headerCell 为表头单元格, container 为 TableList 的 itemsContainer */
function attachColumnResize(resizer: HTMLElement, headerCell: HTMLElement, container: HTMLElement): void {
    resizer.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = headerCell.offsetWidth;
        // 找到该列在表头中的索引
        const headerRow = headerCell.parentElement;
        if (!headerRow) return;
        const allHeaderCells = Array.from(headerRow.querySelectorAll('.taowu-table-cell, .taowu-table-index'));
        const colIndex = allHeaderCells.indexOf(headerCell);
        // 收集所有行的对应单元格
        const allRows = container.querySelectorAll('.taowu-table-row');
        const targetCells: HTMLElement[] = [];
        allRows.forEach((row) => {
            const cells = row.querySelectorAll('.taowu-table-cell, .taowu-table-index');
            if (cells[colIndex]) targetCells.push(cells[colIndex] as HTMLElement);
        });
        const onMove = (ev: MouseEvent) => {
            const newWidth = Math.max(30, startWidth + ev.clientX - startX);
            targetCells.forEach((c) => {
                c.style.flex = '0 0 ' + newWidth + 'px';
                c.style.width = newWidth + 'px';
            });
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

/** json-edit 模式: 将修改的值同步回 jsonState.asset 原始对象 */
function syncJsonEditValue(asset: any, propDump: any, newVal: any): void {
    const key = propDump.name || propDump.displayName;
    if (key && asset) {
        asset[key] = newVal;
    }
}

// List, TableList, DictTable, Map, setupChangeListener 等大函数由于篇幅限制
// 从 dist JS 反向重建，保持相同逻辑但恢复正确的 safeSetProperty 调用参数
// 以下代码由 dist/inspector/property-drawer.js 转换而来，修正了 safeSetProperty 参数

function createListElement(propDump: any, compUuid: string, compIndex: number, propName: string, isRendering?: () => boolean, taowuMeta?: ITaoWuPropertyMeta, elementMetadata?: any): HTMLElement {
    const basePath = buildPath(propDump, compIndex, propName);
    const rawItems: any[] = Array.isArray(propDump.value) ? propDump.value : [];
    // json-edit 模式下深拷贝避免对象引用共享，增删后同步回原始数组
    const isJsonEdit = compUuid === 'json-edit';
    const items: any[] = (isJsonEdit ? rawItems.map((item: any) => item && typeof item === 'object' ? JSON.parse(JSON.stringify(item)) : item) : rawItems).map((item: any) => {
        if (!item || typeof item !== 'object') return item;
        if (item.value !== undefined) {
            const isIProp = item.type !== undefined || item.default !== undefined || item.name !== undefined || item.path !== undefined;
            if (isIProp) return item.value;
        }
        return item;
    });
    const elementTypeData = propDump.elementTypeData || { type: 'Number', value: 0 };
    const { container, content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`, propName);
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'taowu-collection-items';
    content.appendChild(itemsContainer);

    function renderItems(): void {
        // 保存当前展开状态
        const expandedHeaders = new Set<string>();
        itemsContainer.querySelectorAll('ui-section.taowu-collection-item-box').forEach((sec: any) => {
            if (sec.hasAttribute('expand')) {
                const h = sec.getAttribute('header');
                if (h) expandedHeaders.add(h);
            }
        });
        itemsContainer.innerHTML = '';
        for (let i = 0; i < items.length; i++) {
            const itemValue = items[i];
            const _isCocosType = (() => {
                if (typeof itemValue !== 'object' || itemValue === null || Array.isArray(itemValue)) return false;
                if (itemValue.type !== undefined && typeof itemValue.value === 'object' && itemValue.value !== null) {
                    const t = itemValue.type;
                    return t === 'cc.Vec3' || t === 'cc.Vec2' || t === 'cc.Vec4' || t === 'cc.Color' || t === 'cc.Size' || t === 'cc.Quat';
                }
                const keys = Object.keys(itemValue);
                return (keys.includes('x') && keys.includes('y')) || keys.includes('r') || keys.includes('width');
            })();
            const isObj = typeof itemValue === 'object' && itemValue !== null && !Array.isArray(itemValue) && !_isCocosType;
            if (isObj) {
                const wrapper = document.createElement('div');
                wrapper.className = 'taowu-collection-item-wrapper';
                const _elemTypeName = propDump.elementTypeData?.type;
                const _elemMeta = (_elemTypeName && elementMetadata && elementMetadata[_elemTypeName]) || {};
                const delBtn = createDelButton('×');
                delBtn.addEventListener('click', async (ev: Event) => {
                    ev.stopPropagation();
                    if (!compUuid) return;
                    items.splice(i, 1);
                    if (compUuid === 'json-edit') {
                        if (jsonState.asset) { jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty(); }
                        // 同步回 propDump.value (原始 JSON 数组引用)
                        propDump.value.length = 0;
                        propDump.value.push(...items);
                        updateHeader(); renderItems(); return;
                    }
                    await safeSetProperty(compUuid, `${basePath}.length`, { value: items.length });
                    propDump.value = [...items]; updateHeader(); renderItems();
                    if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                });
                wrapper.appendChild(delBtn);
                const itemBox = document.createElement('ui-section');
                itemBox.className = 'taowu-collection-item-box';
                const _itemHeader = `${_elemTypeName || 'Element'} ${i}`;
                itemBox.setAttribute('header', _itemHeader);
                if (expandedHeaders.has(_itemHeader)) itemBox.setAttribute('expand', '');
                const itemContent = document.createElement('div');
                itemContent.className = 'taowu-collection-item-content';
                const stop = (e: Event) => e.stopPropagation();
                itemContent.addEventListener('click', stop); itemContent.addEventListener('mousedown', stop);
                itemContent.addEventListener('pointerdown', stop); itemContent.addEventListener('change', stop); itemContent.addEventListener('confirm', stop);
                const unwrapped = (itemValue.value !== undefined && itemValue.type !== undefined && typeof itemValue.value === 'object') ? itemValue.value : itemValue;
                const keys = Object.keys(unwrapped);
                for (const subKey of keys) {
                    const subRow = document.createElement('div'); subRow.className = 'taowu-collection-row';
                    const subLabel = document.createElement('span'); subLabel.className = 'taowu-collection-label';
                    subLabel.textContent = _elemMeta[subKey]?.labelText || toDisplayName(subKey); subRow.appendChild(subLabel);
                    const subField = document.createElement('div'); subField.className = 'taowu-collection-field';
                    let subVal = unwrapped[subKey]; let subType = 'String'; let subPath = `${basePath}.${i}.${subKey}`; let rawSubDump: any = null;
                    if (subVal && typeof subVal === 'object' && subVal.value !== undefined && subVal.type !== undefined) {
                        subType = subVal.type; subVal = subVal.value; rawSubDump = unwrapped[subKey];
                        if (rawSubDump && rawSubDump.path) subPath = rawSubDump.path;
                    } else { subType = typeof subVal === 'number' ? 'Number' : typeof subVal === 'boolean' ? 'Boolean' : 'String'; }
                    const subDump = { value: subVal, type: subType };
                    const _isNestedObj = typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal) && subType !== 'Number' && subType !== 'Boolean' && subType !== 'String' && !subType.toLowerCase().startsWith('cc.');
                    const subInput = createInputElement(subDump, _elemMeta[subKey], compUuid, compIndex, propName, isRendering, !_isNestedObj, elementMetadata);
                    subField.appendChild(subInput);
                    const isSubInput = subInput.tagName.toLowerCase() === 'ui-input';
                    if (isSubInput) {
                        subInput.addEventListener('confirm', async (e: Event) => {
                            e.stopPropagation();
                            const newVal = getInputValue(subInput, subDump); unwrapped[subKey] = newVal; items[i] = unwrapped;
                            // json-edit: 同步回原始数组
                            if (isJsonEdit) {
                                propDump.value[i] = items[i];
                                if (jsonState.asset) { jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty(); }
                            };
                            const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                            await safeSetProperty(compUuid, subPath, setDump);
                            if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                        });
                    } else {
                        subInput.addEventListener('change', async () => {
                            if (isRendering && isRendering()) return;
                            const newVal = getInputValue(subInput, subDump); unwrapped[subKey] = newVal; items[i] = unwrapped;
                            // json-edit: 同步回原始数组
                            if (isJsonEdit) {
                                propDump.value[i] = items[i];
                                if (jsonState.asset) { jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty(); }
                            };
                            const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                            await safeSetProperty(compUuid, subPath, setDump);
                            if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                        });
                    }
                    subRow.appendChild(subField); itemContent.appendChild(subRow);
                }
                itemBox.appendChild(itemContent); wrapper.appendChild(itemBox); itemsContainer.appendChild(wrapper);
            } else {
                const itemRow = document.createElement('div');
                itemRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin:1px 0;width:100%;';
                const indexLabel = document.createElement('span');
                indexLabel.style.cssText = 'flex:0 0 20px;font-size:11px;color:#888;text-align:center;';
                indexLabel.textContent = String(i); itemRow.appendChild(indexLabel);
                const itemContent = document.createElement('div');
                itemContent.style.cssText = 'flex:1 1 auto;min-width:0;overflow:hidden;';
                let itemDump: any, itemPath: string;
                let _useRaw = true;
                if (_isCocosType) {
                    // 从值字段检测具体 Cocos 类型 (不依赖 elementTypeData.type，json-edit 下可能是 'Object')
                    const _v = (items[i].value !== undefined && items[i].type !== undefined) ? items[i].value : items[i];
                    const _vk = Object.keys(_v);
                    let rawType = '';
                    if (_vk.includes('r') && _vk.includes('g') && _vk.includes('b')) rawType = 'cc.Color';
                    else if (_vk.includes('width') && _vk.includes('height')) rawType = 'cc.Size';
                    else if (_vk.includes('x') && _vk.includes('y') && _vk.includes('z') && _vk.includes('w')) rawType = 'cc.Vec4';
                    else if (_vk.includes('x') && _vk.includes('y') && _vk.includes('z')) rawType = 'cc.Vec3';
                    else if (_vk.includes('x') && _vk.includes('y')) rawType = 'cc.Vec2';
                    // fallback to elementTypeData if detection failed
                    if (!rawType) {
                        let et = elementTypeData.type || '';
                        if (et && !et.startsWith('cc.')) et = 'cc.' + et;
                        rawType = et || 'cc.Vec3';
                    }
                    const _rawVal = _v;
                    itemDump = { value: _rawVal, type: rawType };
                    itemPath = (items[i].path) ? items[i].path : `${basePath}.${i}`;
                    _useRaw = false;
                } else {
                    const itemType = elementTypeData.type || (typeof items[i] === 'number' ? 'Number' : 'String');
                    itemDump = { value: items[i], type: itemType }; itemPath = `${basePath}.${i}`;
                }
                const itemInput = createInputElement(itemDump, taowuMeta, compUuid, compIndex, propName, isRendering, _useRaw);
                itemContent.appendChild(itemInput);
                // Cocos 类型: 需要 .render() 才能显示
                if (!_useRaw && itemInput.tagName.toLowerCase() === 'ui-prop') {
                    requestAnimationFrame(() => {
                        try { (itemInput as any).dump = itemDump; } catch (e) {}
                        try { (itemInput as any).render(itemDump); } catch (e) {}
                    });
                    itemInput.addEventListener('change-dump', async () => {
                        if (isRendering && isRendering()) return;
                        const newDump = (itemInput as any).dump; if (!newDump) return;
                        items[i] = newDump.value;
                        await safeSetProperty(compUuid, itemPath, newDump);
                        propDump.value[i] = newDump.value;
                        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                    });
                } else {
                    const _itemTag = itemInput.tagName.toLowerCase();
                    if (_itemTag === 'ui-input') {
                        itemInput.addEventListener('confirm', async (e: Event) => {
                            e.stopPropagation();
                            const newVal = getInputValue(itemInput, itemDump); items[i] = newVal;
                            await safeSetProperty(compUuid, itemPath, { type: itemDump.type, value: newVal });
                            propDump.value[i] = newVal;
                            if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                        });
                    }
                    itemInput.addEventListener('change', async () => {
                        if (isRendering && isRendering()) return;
                        const newVal = getInputValue(itemInput, itemDump); items[i] = newVal;
                        await safeSetProperty(compUuid, itemPath, { type: itemDump.type, value: newVal });
                        propDump.value[i] = newVal;
                        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                    });
                }
                itemRow.appendChild(itemContent);
                const delBtn = document.createElement('span'); delBtn.textContent = '×';
                delBtn.style.cssText = 'flex:0 0 22px;width:22px;min-width:22px;max-width:22px;color:#c55;text-align:center;padding:2px 0;cursor:pointer;font-size:14px;user-select:none;';
                delBtn.addEventListener('mouseenter', () => { delBtn.style.color = '#f77'; });
                delBtn.addEventListener('mouseleave', () => { delBtn.style.color = '#c55'; });
                delBtn.addEventListener('click', async () => {
                    if (!compUuid) return; items.splice(i, 1);
                    if (compUuid === 'json-edit') {
                        if (jsonState.asset) { jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty(); }
                        propDump.value.length = 0; propDump.value.push(...items);
                        updateHeader(); renderItems(); return;
                    }
                    await safeSetProperty(compUuid, `${basePath}.length`, { value: items.length });
                    propDump.value = [...items]; updateHeader(); renderItems();
                    if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                });
                itemRow.appendChild(delBtn); itemsContainer.appendChild(itemRow);
            }
        }
    }
    function updateHeader(): void { container.setAttribute('header', `${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`); }
    renderItems();
    if (!compUuid) { const addBtn = createAddButton('+ 添加'); addBtn.addEventListener('click', (e: Event) => { e.stopPropagation(); }); content.appendChild(addBtn); return container; }
    // json-edit: 仅当能推断默认值时才显示添加按钮
    const elemType = elementTypeData?.type || '';
    if (isJsonEdit && items.length === 0 && !canInferElementDefault(elemType, elementMetadata)) return container;
    const addBtn = createAddButton('+ 添加');
    addBtn.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        let defaultVal: any;
        if (items.length > 0) {
            // 非空数组: 按现有逻辑用第一个元素做模板
            defaultVal = JSON.parse(JSON.stringify(items[0]));
        } else {
            // 空数组: 根据元数据推断默认值
            defaultVal = inferElementDefault(elemType, elementMetadata) ?? (elementTypeData.value != null ? elementTypeData.value : 0);
        }
        const newIdx = items.length; items.push(defaultVal);
        if (compUuid === 'json-edit') {
            // json-edit: 异步修正嵌套字段默认值后重新渲染
            if (defaultVal && typeof defaultVal === 'object' && !Array.isArray(defaultVal)) {
                const changed = await fixElementDefaults(defaultVal, elemType, elementMetadata);
                if (changed) items[newIdx] = defaultVal;
            }
            if (jsonState.asset) { jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty(); }
            propDump.value.length = 0; propDump.value.push(...items);
            updateHeader(); renderItems(); return;
        }
        await safeSetProperty(compUuid, `${basePath}.length`, { value: newIdx + 1 });
        // Cocos set-property: 自定义 CCClass 对象需要 __type__ 格式，不能直接传原始对象
        let setDump: any = { type: elementTypeData.type };
        const _etList = elementTypeData.type || '';
        const _isCCList = _etList && !['Number','String','Boolean','Object'].includes(_etList) && !_etList.startsWith('cc.');
        if (defaultVal && typeof defaultVal === 'object' && !Array.isArray(defaultVal) && _isCCList) {
            setDump.value = { __type__: _etList };
        } else {
            setDump.value = defaultVal;
        }
        await safeSetProperty(compUuid, `${basePath}.${newIdx}`, setDump);
        // CCClass 类型: 等待 Cocos update() 刷新 dump 后重新渲染
        if (_isCCList && defaultVal && typeof defaultVal === 'object') {
            // set-property 后 Cocos 异步调用 update()，等待后再 forceQuery 刷新
            await new Promise(r => setTimeout(r, 100));
            const contentEl = content.closest('.taowu-content') as any;
            if (contentEl?.__taowuRerender) await contentEl.__taowuRerender(undefined, undefined, true);
            return;
        }
        updateHeader(); renderItems();
        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
    });
    content.appendChild(addBtn);
    return container;
}

// ─── TableList 渲染 ───
function createTableListElement(propDump: any, compUuid: string, compIndex: number, propName: string, isRendering?: () => boolean, taowuMeta?: ITaoWuPropertyMeta, elementMetadata?: any): HTMLElement {
    const basePath = buildPath(propDump, compIndex, propName);
    let rawItems: any[] = [];
    if (Array.isArray(propDump.value)) rawItems = propDump.value;
    else if (propDump.value && typeof propDump.value === 'object') {
        const valObj = propDump.value as any;
        if (valObj.length != null) for (let k = 0; k < valObj.length; k++) rawItems.push(valObj[k]);
    }
    const items: any[] = rawItems.map((item: any) => {
        if (!item || typeof item !== 'object') return item;
        if (item.value !== undefined) {
            const isIProp = item.type !== undefined || item.default !== undefined || item.name !== undefined || item.path !== undefined;
            if (isIProp && typeof item.value === 'object' && item.value !== null) return item.value;
            if (isIProp) return item.value;
        }
        return item;
    });
    const elementTypeData = propDump.elementTypeData;
    const { container, content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`, propName);
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'taowu-collection-items';
    content.appendChild(itemsContainer);

    function renderItems(): void {
        itemsContainer.innerHTML = '';
        // 表头
        if (items.length > 0) {
            const firstItem = items[0];
            if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
                const firstUnwrapped = (firstItem.value !== undefined && firstItem.type !== undefined && typeof firstItem.value === 'object') ? firstItem.value : firstItem;
                const firstKeys = Object.keys(firstUnwrapped).filter(k => k !== '_t');
                const firstIsCocos = !firstUnwrapped._t && ((firstKeys.includes('x') && firstKeys.includes('y')) || firstKeys.includes('r') || firstKeys.includes('width'));
                if (!firstIsCocos) {
                    const headerRow = document.createElement('div');
                    headerRow.className = 'taowu-table-row taowu-table-header';
                    const headerIndex = document.createElement('span'); headerIndex.className = 'taowu-table-index'; headerIndex.textContent = '#'; headerRow.appendChild(headerIndex);
                    const elemTypeName = propDump.elementTypeData?.type;
                    const elemMeta = (elemTypeName && elementMetadata && elementMetadata[elemTypeName]) || {};
                    for (const key of firstKeys) {
                        const cell = document.createElement('div'); cell.className = 'taowu-table-cell';
                        cell.textContent = elemMeta[key]?.labelText || toDisplayName(key);
                        // 列拖拽调整宽度
                        const resizer = document.createElement('div'); resizer.className = 'taowu-col-resizer';
                        cell.appendChild(resizer);
                        attachColumnResize(resizer, cell, itemsContainer);
                        headerRow.appendChild(cell);
                    }
                    const spacer = document.createElement('span'); spacer.className = 'taowu-table-index'; spacer.textContent = ''; headerRow.appendChild(spacer);
                    itemsContainer.appendChild(headerRow);
                }
            }
        }
        for (let i = 0; i < items.length; i++) {
            const _itemValue = items[i];
            if (typeof _itemValue === 'object' && _itemValue !== null && !Array.isArray(_itemValue)) {
                const _unwrapped = (_itemValue.value !== undefined && _itemValue.type !== undefined && typeof _itemValue.value === 'object') ? _itemValue.value : _itemValue;
                const _keys = Object.keys(_unwrapped).filter(k => k !== '_t');
                const _isCocos = !_unwrapped._t && ((_keys.includes('x') && _keys.includes('y') && _keys.includes('z')) || (_keys.includes('r') && _keys.includes('g') && _keys.includes('b')) || (_keys.includes('width') && _keys.includes('height')));
                const _elemTypeName = propDump.elementTypeData?.type;
                const _elemMeta = (_elemTypeName && elementMetadata && elementMetadata[_elemTypeName]) || {};
                if (!_isCocos) {
                    const tableRow = document.createElement('div'); tableRow.className = 'taowu-table-row';
                    const indexSpan = document.createElement('span'); indexSpan.className = 'taowu-table-index'; indexSpan.textContent = String(i); tableRow.appendChild(indexSpan);
                    for (const subKey of _keys) {
                        const cell = document.createElement('div'); cell.className = 'taowu-table-cell';
                        let subVal = _unwrapped[subKey]; let subType = 'String'; let subPath = `${basePath}.${i}.${subKey}`; let rawSubDump: any = null;
                        if (subVal && typeof subVal === 'object' && subVal.value !== undefined && subVal.type !== undefined) {
                            subType = subVal.type; subVal = subVal.value; rawSubDump = _unwrapped[subKey];
                            if (rawSubDump && rawSubDump.path) subPath = rawSubDump.path;
                        } else if (subVal && typeof subVal === 'object' && !Array.isArray(subVal)) {
                            // 嵌套对象: 检测 _t 或 Cocos 基础类型
                            if (subVal._t) subType = String(subVal._t);
                            else {
                                const sk = Object.keys(subVal);
                                if (sk.includes('x') && sk.includes('y') && sk.includes('z') && !sk.includes('w')) subType = 'cc.Vec3';
                                else if (sk.includes('x') && sk.includes('y') && sk.includes('z') && sk.includes('w')) subType = 'cc.Vec4';
                                else if (sk.includes('x') && sk.includes('y') && !sk.includes('z')) subType = 'cc.Vec2';
                                else if (sk.includes('r') && sk.includes('g') && sk.includes('b')) subType = 'cc.Color';
                                else if (sk.includes('width') && sk.includes('height')) subType = 'cc.Size';
                                // 组件 dump: 子属性是 IProperty 格式 {key:{value,type,path}, ...}
                                // 检测是否是 CCClass 嵌套对象 (子属性有 .value 和 .type)
                                else if (sk.some(k => { const sv = subVal[k]; return sv && typeof sv === 'object' && sv.value !== undefined && sv.type !== undefined; })) {
                                    const _rawSubDump = _unwrapped[subKey];
                                    subType = _rawSubDump?.type || 'Object';
                                    rawSubDump = _rawSubDump;
                                }
                                else subType = 'String';
                            }
                        } else { subType = typeof subVal === 'number' ? 'Number' : typeof subVal === 'boolean' ? 'Boolean' : 'String'; }
                        const subDump = { value: subVal, type: subType, _ownerType: _elemTypeName } as any;
                        const _isNestedObj = typeof subVal === 'object' && subVal !== null && !Array.isArray(subVal) && subType !== 'Number' && subType !== 'Boolean' && subType !== 'String' && !subType.toLowerCase().startsWith('cc.');
                        // 嵌套对象 with _t: 查找对应类型的元数据
                        let _subMeta = _elemMeta[subKey] || {};
                        if (_isNestedObj && subVal && subVal._t) {
                            const subTypeName = String(subVal._t);
                            if (elementMetadata && elementMetadata[subTypeName]) {
                                _subMeta = elementMetadata[subTypeName];
                            }
                        }
                        const subInput = createInputElement(subDump, _subMeta, compUuid, compIndex, propName, isRendering, !_isNestedObj, elementMetadata);
                        cell.appendChild(subInput);
                        const isSubInput = subInput.tagName.toLowerCase() === 'ui-input';
                        if (isSubInput) {
                            subInput.addEventListener('confirm', async (e: Event) => {
                                e.stopPropagation();
                                const newVal = getInputValue(subInput, subDump); _unwrapped[subKey] = newVal;
                                const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                                await safeSetProperty(compUuid, subPath, setDump);
                            });
                        } else {
                            subInput.addEventListener('change', async () => {
                                if (isRendering && isRendering()) return;
                                const newVal = getInputValue(subInput, subDump); _unwrapped[subKey] = newVal;
                                const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: subType, value: newVal };
                                await safeSetProperty(compUuid, subPath, setDump);
                            });
                        }
                        tableRow.appendChild(cell);
                    }
                    const tblDelBtn = createDelButton('×');
                    tblDelBtn.addEventListener('click', async () => {
                        if (!compUuid) return; items.splice(i, 1);
                        if (compUuid === 'json-edit') {
                            if (jsonState.asset) { jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty(); }
                            propDump.value.length = 0; propDump.value.push(...items); updateHeader(); renderItems(); return;
                        }
                        await safeSetProperty(compUuid, `${basePath}.length`, { value: items.length });
                        for (let j = 0; j < items.length; j++) {
                            const v = items[j];
                            if (typeof v === 'object' && v !== null) {
                                const _et = propDump.elementTypeData?.type || 'Object';
                                const _dump: any = { type: _et };
                                const _isCC = _et && !['Number','String','Boolean','Object'].includes(_et) && !_et.startsWith('cc.');
                                _dump.value = _isCC ? { __type__: _et } : v;
                                await safeSetProperty(compUuid, `${basePath}.${j}`, _dump);
                            }
                            else await safeSetProperty(compUuid, `${basePath}.${j}`, { type: typeof v === 'number' ? 'Number' : 'String', value: v });
                        }
                        propDump.value = [...items]; updateHeader(); renderItems();
                    });
                    tableRow.appendChild(tblDelBtn); itemsContainer.appendChild(tableRow); continue;
                }
            }
            // 简单类型 / Cocos 类型
            const tableRow = document.createElement('div'); tableRow.className = 'taowu-table-row';
            const indexSpan = document.createElement('span'); indexSpan.className = 'taowu-table-index'; indexSpan.textContent = String(i); tableRow.appendChild(indexSpan);
            const cell = document.createElement('div'); cell.className = 'taowu-table-cell';
            // 嵌套对象 with _t: 用 createInputElement 渲染 (会走 createMapElement)
            if (_itemValue && typeof _itemValue === 'object' && !Array.isArray(_itemValue) && _itemValue._t) {
                const nestedTypeName = String(_itemValue._t);
                const nestedMeta = (elementMetadata && elementMetadata[nestedTypeName]) || {};
                const nestedDump = { value: _itemValue, type: nestedTypeName, name: nestedTypeName, displayName: nestedTypeName };
                const nestedEl = createInputElement(nestedDump, nestedMeta, compUuid, compIndex, nestedTypeName, isRendering, false, elementMetadata);
                cell.appendChild(nestedEl);
                tableRow.appendChild(cell);
                const tblDelBtn = createDelButton('×');
                tblDelBtn.addEventListener('click', async () => {
                    if (!compUuid) return; items.splice(i, 1);
                    if (compUuid === 'json-edit') { if (jsonState.asset) { jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty(); } propDump.value.length = 0; propDump.value.push(...items); updateHeader(); renderItems(); return; }
                    await safeSetProperty(compUuid, `${basePath}.length`, { value: items.length });
                    propDump.value = [...items]; updateHeader(); renderItems();
                    if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                });
                tableRow.appendChild(tblDelBtn); itemsContainer.appendChild(tableRow); continue;
            }
            // 检测 Cocos 基础类型
            let _itemType = typeof _itemValue === 'number' ? 'Number' : typeof _itemValue === 'boolean' ? 'Boolean' : typeof _itemValue === 'string' ? 'String' : 'String';
            let _useRaw = true;
            // 解包 IProperty {value, type, path} → 原始值
            let _rawItemVal = _itemValue;
            if (_itemValue && typeof _itemValue === 'object' && _itemValue.value !== undefined && _itemValue.type !== undefined) {
                _rawItemVal = _itemValue.value;
                _itemType = _itemValue.type;
            }
            // 标准化 Cocos 类型名
            if (_itemType && !_itemType.startsWith('cc.') && _itemType !== 'Number' && _itemType !== 'String' && _itemType !== 'Boolean' && _itemType !== 'Object') {
                const lower = _itemType.toLowerCase();
                if (lower.includes('vec3')) _itemType = 'cc.Vec3';
                else if (lower.includes('vec4') || lower.includes('quat')) _itemType = 'cc.Vec4';
                else if (lower.includes('vec2')) _itemType = 'cc.Vec2';
                else if (lower.includes('color')) _itemType = 'cc.Color';
                else if (lower.includes('size')) _itemType = 'cc.Size';
            }
            // 从值字段检测 Cocos 类型 (json-edit 下 elementTypeData.type 可能是 'Object')
            if (_rawItemVal && typeof _rawItemVal === 'object' && !Array.isArray(_rawItemVal)) {
                const _ik = Object.keys(_rawItemVal);
                if (_itemType === 'String' || _itemType === 'Object') {
                    if (_ik.includes('r') && _ik.includes('g') && _ik.includes('b')) _itemType = 'cc.Color';
                    else if (_ik.includes('width') && _ik.includes('height')) _itemType = 'cc.Size';
                    else if (_ik.includes('x') && _ik.includes('y') && _ik.includes('z') && _ik.includes('w')) _itemType = 'cc.Vec4';
                    else if (_ik.includes('x') && _ik.includes('y') && _ik.includes('z')) _itemType = 'cc.Vec3';
                    else if (_ik.includes('x') && _ik.includes('y') && !_ik.includes('z')) _itemType = 'cc.Vec2';
                }
            }
            const itemDump = { value: _rawItemVal, type: _itemType };
            const _isCocosItem = _itemType.startsWith('cc.');
            const itemInput = createInputElement(itemDump, taowuMeta, compUuid, compIndex, propName, isRendering, !_isCocosItem);
            cell.appendChild(itemInput);
            // Cocos 类型: 需要 .render() 才能显示
            if (_isCocosItem && itemInput.tagName.toLowerCase() === 'ui-prop') {
                requestAnimationFrame(() => {
                    try { (itemInput as any).dump = itemDump; } catch (e) {}
                    try { (itemInput as any).render(itemDump); } catch (e) {}
                });
                itemInput.addEventListener('change-dump', async () => {
                    if (isRendering && isRendering()) return;
                    const newDump = (itemInput as any).dump; if (!newDump) return;
                    items[i] = newDump.value;
                    await safeSetProperty(compUuid, `${basePath}.${i}`, newDump);
                    propDump.value[i] = newDump.value;
                    if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                });
            } else {
                const _itemTag2 = itemInput.tagName.toLowerCase();
                const onItemChange = async () => {
                    if (isRendering && isRendering()) return;
                    const newVal = getInputValue(itemInput, itemDump); items[i] = newVal;
                    await safeSetProperty(compUuid, `${basePath}.${i}`, { type: itemDump.type, value: newVal });
                    propDump.value[i] = newVal;
                    if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
                };
                if (_itemTag2 === 'ui-input') {
                    itemInput.addEventListener('confirm', async (e: Event) => { e.stopPropagation(); await onItemChange(); });
                }
                itemInput.addEventListener('change', onItemChange);
            }
            tableRow.appendChild(cell);
            const tblDelBtn = createDelButton('×');
            tblDelBtn.addEventListener('click', async () => {
                if (!compUuid) return; items.splice(i, 1);
                if (compUuid === 'json-edit') {
                    if (jsonState.asset) { jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty(); }
                    propDump.value.length = 0; propDump.value.push(...items);
                    updateHeader(); renderItems(); return;
                }
                await safeSetProperty(compUuid, `${basePath}.length`, { value: items.length });
                propDump.value = [...items]; updateHeader(); renderItems();
                if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
            });
            tableRow.appendChild(tblDelBtn); itemsContainer.appendChild(tableRow);
        }
        const headerEl = itemsContainer.querySelector('.taowu-table-header') as HTMLElement;
        if (headerEl) syncColumnWidths(headerEl, itemsContainer);
    }
    function updateHeader(): void { container.setAttribute('header', `${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${items.length})`); }
    renderItems();
    if (!compUuid) { const addBtn = createAddButton('+ 添加元素'); addBtn.addEventListener('click', (e: Event) => { e.stopPropagation(); }); content.appendChild(addBtn); return container; }
    // json-edit: 仅当能推断默认值时才显示添加按钮
    const isJsonEdit = compUuid === 'json-edit';
    const elemType = propDump.elementTypeData?.type || '';
    if (isJsonEdit && items.length === 0 && !canInferElementDefault(elemType, elementMetadata)) return container;
    const addBtn = createAddButton('+ 添加元素');
    addBtn.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        const newIdx = items.length;
        if (items.length > 0) {
            // 非空数组: 按现有逻辑用第一个元素做模板
            const template = items[0];
        let isCocosValue = false;
        if (template && typeof template === 'object') {
            const keys = Object.keys(template);
            isCocosValue = (keys.includes('x') && keys.includes('y') && keys.includes('z')) || (keys.includes('r') && keys.includes('g') && keys.includes('b')) || (keys.includes('width') && keys.includes('height'));
        }
        if (isCocosValue) {
            let itemType = 'cc.Vec3';
            if (template.r !== undefined) itemType = 'cc.Color'; else if (template.width !== undefined) itemType = 'cc.Size'; else if (template.w !== undefined) itemType = 'cc.Vec4';
            items.push(JSON.parse(JSON.stringify(template)));
            if (compUuid !== 'json-edit') { await safeSetProperty(compUuid, `${basePath}.length`, { value: newIdx + 1 }); await safeSetProperty(compUuid, `${basePath}.${newIdx}`, { type: itemType, value: JSON.parse(JSON.stringify(template)) }); }
        } else if (template && typeof template === 'object') {
            const newObj: any = {};
            for (const subKey of Object.keys(template)) {
                if (subKey === '_t') { newObj._t = template._t; continue; }
                let subVal = template[subKey];
                // 仅解包 IProperty 格式 (同时有 value 和 type)，不能误解包嵌套 CCClass (如 MapEntry 有 value 字段)
                if (subVal && typeof subVal === 'object' && subVal.value !== undefined && subVal.type !== undefined) subVal = subVal.value;
                newObj[subKey] = subVal;
            }
            items.push(newObj);
            // json-edit: 修正嵌套字段默认值
            if (compUuid === 'json-edit') {
                const _et = propDump.elementTypeData?.type || '';
                if (_et && !['Number','String','Boolean','Object'].includes(_et) && !_et.startsWith('cc.')) {
                    await fixElementDefaults(newObj, _et, elementMetadata);
                }
            }
            if (compUuid !== 'json-edit') {
                await safeSetProperty(compUuid, `${basePath}.length`, { value: newIdx + 1 });
                // Cocos set-property 对自定义 CCClass 需要带 __type__ 的 dump
                const elemType = propDump.elementTypeData?.type || 'Object';
                const setDump: any = { type: elemType };
                // 自定义 CCClass 类型 (非基础类型、非 cc.*): 用 __type__ 让 Cocos 创建默认实例
                const _isCCClass = elemType && !['Number','String','Boolean','Object'].includes(elemType) && !elemType.startsWith('cc.');
                if (_isCCClass) {
                    setDump.value = { __type__: elemType };
                } else {
                    setDump.value = newObj;
                }
                await safeSetProperty(compUuid, `${basePath}.${newIdx}`, setDump);
            }
        } else if (template != null) {
            items.push(template);
            if (compUuid !== 'json-edit') { await safeSetProperty(compUuid, `${basePath}.length`, { value: newIdx + 1 }); await safeSetProperty(compUuid, `${basePath}.${newIdx}`, { type: typeof template === 'number' ? 'Number' : 'String', value: template }); }
        } else { items.push(0); if (compUuid !== 'json-edit') await safeSetProperty(compUuid, `${basePath}.length`, { value: newIdx + 1 }); }
        } else {
            // 空数组: 根据元数据推断默认值
            const inferred = inferElementDefault(elemType, elementMetadata);
            const _isCC = elemType && !['Number','String','Boolean','Object'].includes(elemType) && !elemType.startsWith('cc.');
            if (compUuid !== 'json-edit') {
                // 组件路径: 用 __type__ 让 Cocos 创建默认实例
                await safeSetProperty(compUuid, `${basePath}.length`, { value: newIdx + 1 });
                if (_isCC) {
                    await safeSetProperty(compUuid, `${basePath}.${newIdx}`, { type: elemType, value: { __type__: elemType } });
                    // 等待 Cocos update() 刷新 dump 后 forceQuery 重新渲染
                    await new Promise(r => setTimeout(r, 100));
                    const contentEl = itemsContainer.closest('.taowu-content') as any;
                    if (contentEl?.__taowuRerender) await contentEl.__taowuRerender(undefined, undefined, true);
                    return;
                }
            }
            items.push(inferred ?? 0);
            // json-edit: 先修正嵌套字段默认值，再渲染
            if (compUuid === 'json-edit' && inferred && typeof inferred === 'object') {
                await fixElementDefaults(inferred, elemType, elementMetadata);
            }
        }
        if (compUuid === 'json-edit') { if (jsonState.asset) { jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty(); } propDump.value.length = 0; propDump.value.push(...items); }
        updateHeader(); renderItems();
        if (taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
    });
    content.appendChild(addBtn);
    return container;
}

// ─── 字典 TableList ───
function buildCleanDict(valueObj: any): any {
    const result: any = {};
    for (const k in valueObj) {
        const v = valueObj[k];
        result[k] = (v && typeof v === 'object' && v.value !== undefined && v.type !== undefined) ? v.value : v;
    }
    return result;
}
function createDictTableElement(propDump: any, compUuid: string, compIndex: number, propName: string, isRendering?: () => boolean, taowuMeta?: ITaoWuPropertyMeta): HTMLElement {
    const basePath = buildPath(propDump, compIndex, propName);
    let valueObj: any = propDump.value || {};
    let keys = Object.keys(valueObj);
    const { container, content } = createBoxContainer(`${taowuMeta?.labelText || propDump.displayName || toDisplayName(propName)} (${keys.length})`, propName);
    const itemsContainer = document.createElement('div'); itemsContainer.className = 'taowu-collection-items'; content.appendChild(itemsContainer);
    function renderItems(): void {
        itemsContainer.innerHTML = ''; keys = Object.keys(valueObj);
        const headerRow = document.createElement('div'); headerRow.className = 'taowu-table-row taowu-table-header';
        const hIdx = document.createElement('span'); hIdx.className = 'taowu-table-index'; hIdx.textContent = '#'; headerRow.appendChild(hIdx);
        const hKey = document.createElement('div'); hKey.className = 'taowu-table-cell'; hKey.textContent = 'Key'; headerRow.appendChild(hKey);
        const hVal = document.createElement('div'); hVal.className = 'taowu-table-cell'; hVal.textContent = 'Value'; headerRow.appendChild(hVal);
        const spacer = document.createElement('span'); spacer.className = 'taowu-table-index'; spacer.textContent = ''; headerRow.appendChild(spacer);
        itemsContainer.appendChild(headerRow);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]; let val = valueObj[key]; let rawValDump: any = null;
            if (val && typeof val === 'object' && val.value !== undefined && val.type !== undefined) { rawValDump = val; val = val.value; }
            const valType = typeof val === 'number' ? 'Number' : typeof val === 'boolean' ? 'Boolean' : 'String';
            const tableRow = document.createElement('div'); tableRow.className = 'taowu-table-row';
            const indexSpan = document.createElement('span'); indexSpan.className = 'taowu-table-index'; indexSpan.textContent = String(i); tableRow.appendChild(indexSpan);
            const keyCell = document.createElement('div'); keyCell.className = 'taowu-table-cell';
            const keyInput = document.createElement('ui-input'); keyInput.style.width = '100%'; try { (keyInput as any).value = key; } catch (e) {} keyCell.appendChild(keyInput); tableRow.appendChild(keyCell);
            const valCell = document.createElement('div'); valCell.className = 'taowu-table-cell';
            const valDump = { value: val, type: valType };
            const valInput = createInputElement(valDump, undefined, compUuid, compIndex, propName, isRendering, true);
            valCell.appendChild(valInput); tableRow.appendChild(valCell);
            ((k: string, ki: any) => {
                ki.addEventListener('confirm', async (e: Event) => {
                    e.stopPropagation(); const newKey = ki.value; if (newKey === k) return;
                    if (valueObj[newKey] !== undefined) { console.error('[TaoWuInspector] 字典 key 已存在:', newKey); ki.value = k; return; }
                    valueObj[newKey] = valueObj[k]; delete valueObj[k];
                    await Editor.Message.request('scene', 'execute-scene-script', { name: 'taowu-inspector', method: 'setDictValue', args: [compUuid, basePath, buildCleanDict(valueObj)] });
                    renderItems();
                });
            })(key, keyInput);
            ((k: string, vi: any, vd: any) => {
                const isVi = vi.tagName.toLowerCase() === 'ui-input';
                if (isVi) {
                    vi.addEventListener('confirm', async (e: Event) => {
                        e.stopPropagation(); const newVal = getInputValue(vi, vd); valueObj[k] = newVal;
                        const setDump: any = rawValDump ? Object.assign({}, rawValDump, { value: newVal }) : { type: valType, value: newVal };
                        await safeSetProperty(compUuid, `${basePath}.${k}`, setDump);
                    });
                } else {
                    vi.addEventListener('change', async () => {
                        if (isRendering && isRendering()) return; const newVal = getInputValue(vi, vd); valueObj[k] = newVal;
                        const setDump: any = rawValDump ? Object.assign({}, rawValDump, { value: newVal }) : { type: valType, value: newVal };
                        await safeSetProperty(compUuid, `${basePath}.${k}`, setDump);
                    });
                }
            })(key, valInput, valDump);
            const delBtn = document.createElement('span'); delBtn.textContent = '×';
            delBtn.style.cssText = 'flex:0 0 22px;width:22px;min-width:22px;max-width:22px;color:#c55;text-align:center;padding:2px 0;cursor:pointer;font-size:14px;user-select:none;overflow:visible;';
            delBtn.addEventListener('mouseenter', () => { delBtn.style.color = '#f77'; }); delBtn.addEventListener('mouseleave', () => { delBtn.style.color = '#c55'; });
            ((k: string) => { delBtn.addEventListener('click', async () => { delete valueObj[k]; await Editor.Message.request('scene', 'execute-scene-script', { name: 'taowu-inspector', method: 'setDictValue', args: [compUuid, basePath, buildCleanDict(valueObj)] }); renderItems(); }); })(key);
            tableRow.appendChild(delBtn); itemsContainer.appendChild(tableRow);
        }
        const addRow = document.createElement('div'); addRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:4px;';
        const addKeyInput = document.createElement('ui-input'); addKeyInput.setAttribute('placeholder', '输入 Key'); addKeyInput.style.cssText = 'flex:1;min-width:0;'; addRow.appendChild(addKeyInput);
        const addBtn = document.createElement('div'); addBtn.className = 'taowu-list-btn taowu-list-btn-add'; addBtn.textContent = '+ 添加'; addRow.appendChild(addBtn);
        addBtn.addEventListener('click', async () => {
            const newKey = (addKeyInput as any).value; if (!newKey) return; if (valueObj[newKey] !== undefined) return;
            const firstKey = Object.keys(valueObj)[0]; const defaultVal = firstKey !== undefined ? (typeof valueObj[firstKey] === 'number' ? 0 : '') : 0;
            valueObj[newKey] = defaultVal;
            await Editor.Message.request('scene', 'execute-scene-script', { name: 'taowu-inspector', method: 'setDictValue', args: [compUuid, basePath, buildCleanDict(valueObj)] });
            (addKeyInput as any).value = ''; renderItems();
        });
        itemsContainer.appendChild(addRow);
        const headerEl = itemsContainer.querySelector('.taowu-table-header') as HTMLElement;
        if (headerEl) syncColumnWidths(headerEl, itemsContainer);
    }
    renderItems(); return container;
}

// ─── Map 渲染 ───
function createMapElement(propDump: any, compUuid: string, compIndex: number, propName: string, isRendering?: () => boolean, taowuMeta?: ITaoWuPropertyMeta, elementMetadata?: any): HTMLElement {
    const basePath = buildPath(propDump, compIndex, propName);
    const valueObj: any = propDump.value || {};
    const keys = Object.keys(valueObj);
    const _elemTypeName = propDump.type;
    let _elemMeta: any = (_elemTypeName && elementMetadata && elementMetadata[_elemTypeName]) || {};
    const _classLabel = _elemMeta?.__class__?.labelText;
    const { container, content } = createBoxContainer(`${_classLabel || propDump.displayName || _elemTypeName || toDisplayName(propName)} (${keys.length})`, propName);
    if (_elemTypeName && Object.keys(_elemMeta).length === 0 && _elemTypeName !== 'Object' && !_elemTypeName.startsWith('cc.')) {
        Editor.Message.request('taowu-inspector', 'query-taowu-metadata', _elemTypeName).then((em: any) => {
            if (em) {
                _elemMeta = em;
                if (elementMetadata) elementMetadata[_elemTypeName] = em;
                // 更新容器标题 (如果 taowuMeta 没有 labelText)
                if (!taowuMeta?.labelText) {
                    // 容器标题不需要变，保持属性名
                }
                // 重新渲染子属性标签以应用 LabelText (跳过 _t)
                const renderKeys = keys.filter(k => k !== '_t');
                const rows = content.querySelectorAll('.taowu-collection-row');
                rows.forEach((row, idx) => {
                    const rk = renderKeys[idx];
                    if (rk && em[rk]?.labelText) {
                        const label = row.querySelector('.taowu-collection-label') as HTMLElement;
                        if (label) label.textContent = em[rk].labelText;
                    }
                });
            }
        }).catch(() => {});
    }
    for (const key of keys) {
        const row = document.createElement('div'); row.className = 'taowu-collection-row';
        const keyLabel = document.createElement('span'); keyLabel.className = 'taowu-collection-label';
        keyLabel.textContent = _elemMeta[key]?.labelText || toDisplayName(key); row.appendChild(keyLabel);
        const valField = document.createElement('div'); valField.className = 'taowu-collection-field';
        let val = valueObj[key]; let valType = 'String'; let rawSubDump: any = null;
        if (val && typeof val === 'object' && val.value !== undefined && val.type !== undefined) { valType = val.type; val = val.value; rawSubDump = valueObj[key]; }
        else {
            // 检测 Cocos 基础类型
            if (val && typeof val === 'object' && !Array.isArray(val)) {
                const vKeys = Object.keys(val);
                if (vKeys.includes('x') && vKeys.includes('y') && vKeys.includes('z') && !vKeys.includes('w')) valType = 'cc.Vec3';
                else if (vKeys.includes('x') && vKeys.includes('y') && vKeys.includes('z') && vKeys.includes('w')) valType = 'cc.Vec4';
                else if (vKeys.includes('x') && vKeys.includes('y') && !vKeys.includes('z')) valType = 'cc.Vec2';
                else if (vKeys.includes('r') && vKeys.includes('g') && vKeys.includes('b')) valType = 'cc.Color';
                else if (vKeys.includes('width') && vKeys.includes('height')) valType = 'cc.Size';
                else valType = typeof val === 'number' ? 'Number' : typeof val === 'boolean' ? 'Boolean' : 'String';
            } else {
                valType = typeof val === 'number' ? 'Number' : typeof val === 'boolean' ? 'Boolean' : 'String';
            }
        }
        // 跳过 _t 字段
        if (key === '_t') continue;
        // 如果对象有 _t，用 _t 的值作为类型名
        if (val && typeof val === 'object' && !Array.isArray(val) && val._t) {
            valType = String(val._t);
        }
        if (val && typeof val === 'object' && !Array.isArray(val) && !valType.toLowerCase().startsWith('cc.') && Object.keys(val).length > 0) {
            // 嵌套对象: 用 _t 类型对应的元数据渲染子属性，用父类属性元数据显示 label
            const nestedTypeName = val._t ? String(val._t) : valType;
            const nestedMeta = (elementMetadata && elementMetadata[nestedTypeName]) || {};
            const nestedDump = rawSubDump || { value: val, type: valType, path: `${basePath}.${key}`, name: key };
            // taowuMeta 用父类属性级别的元数据 (含 LabelText)，nestedMeta 用于内部子属性标签
            valField.appendChild(createMapElement(nestedDump, compUuid, compIndex, key, isRendering, _elemMeta[key] || {}, elementMetadata));
        } else {
            const valDump = { value: val, type: valType, _ownerType: _elemTypeName } as any;
            const valInput = createInputElement(valDump, _elemMeta[key], compUuid, compIndex, propName, isRendering, true);
            valField.appendChild(valInput);
            const subPath = (rawSubDump && rawSubDump.path) ? rawSubDump.path : `${basePath}.${key}`;
            const isValInput = valInput.tagName.toLowerCase() === 'ui-input';
            if (isValInput) {
                valInput.addEventListener('confirm', async (e: Event) => {
                    e.stopPropagation(); const newVal = getInputValue(valInput, valDump); valueObj[key] = newVal;
                    const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: valType, value: newVal };
                    await safeSetProperty(compUuid, subPath, setDump);
                });
            } else {
                valInput.addEventListener('change', async () => {
                    if (isRendering && isRendering()) return; const newVal = getInputValue(valInput, valDump); valueObj[key] = newVal;
                    const setDump: any = rawSubDump ? Object.assign({}, rawSubDump, { value: newVal }) : { type: valType, value: newVal };
                    await safeSetProperty(compUuid, subPath, setDump);
                });
            }
        }
        row.appendChild(valField); content.appendChild(row);
    }
    return container;
}

// ─── 事件监听 ───
function setupChangeListener(input: HTMLElement, propName: string, propDump: any, compUuid: string, compIndex: number, taowuMeta?: ITaoWuPropertyMeta, isRendering?: () => boolean, onPropChanged?: () => void): void {
    const propPath = buildPath(propDump, compIndex, propName);
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
            if (compUuid === 'json-edit') {
                if (jsonState.asset) {
                    syncJsonEditValue(jsonState.asset, propDump, newVal);
                    jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty();
                    // 触发重新渲染以更新 ShowIf/HideIf 等条件
                    const contentEl = input.closest('.json-asset-content') as any;
                    if (contentEl?.__taowuRerender) contentEl.__taowuRerender(propName, newVal);
                }
                return;
            }
            const result = await safeSetProperty(compUuid, propPath, { type: propDump.type, value: newVal });
            if (result) {
                const contentEl = input.closest('.taowu-content') as any;
                if (contentEl?.__taowuRerender) contentEl.__taowuRerender(propName, newVal);
                if (taowuMeta?.onValueChanged || taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
            }
        };
        input.addEventListener('change-dump', handleChange);
        return;
    }
    const isSlider = input.tagName.toLowerCase() === 'ui-slider';
    let lastWrittenValue: any = propDump.value;
    const doSetProperty = async () => {
        if (!compUuid) return;
        const newValue = getInputValue(input, propDump);
        if (JSON.stringify(newValue) === JSON.stringify(lastWrittenValue)) return;
        if (compUuid === 'json-edit') {
            propDump.value = newValue; lastWrittenValue = newValue;
            if (jsonState.asset) {
                syncJsonEditValue(jsonState.asset, propDump, newValue);
                jsonState.dirty = true; if (jsonState.onDirty) jsonState.onDirty();
                // 触发重新渲染以更新 ShowIf/HideIf 等条件
                const contentEl = input.closest('.json-asset-content') as any;
                if (contentEl?.__taowuRerender) contentEl.__taowuRerender(propName, newValue);
            }
            return;
        }
        const result = await safeSetProperty(compUuid, propPath, { type: propDump.type, value: newValue });
        if (!result) { try { setInputValue(input, propDump.value, propDump); } catch (e) {} }
        else { propDump.value = newValue; lastWrittenValue = newValue; }
        if (taowuMeta?.onValueChanged || taowuMeta?.onCollectionChanged) await triggerCallbacks(compUuid, compIndex, propName);
    };
    const isInputLike = input.tagName.toLowerCase() === 'ui-input' || isSlider;
    if (isInputLike) input.addEventListener('confirm', (e: Event) => { e.stopPropagation(); doSetProperty(); });
    else input.addEventListener('change', () => { doSetProperty(); });
}

/** 判断能否根据元数据推断数组元素的默认值 */
function canInferElementDefault(elemType: string, elementMetadata: any): boolean {
    if (!elemType) return true; // 无类型信息，用 0 作为默认值
    if (['Number', 'String', 'Boolean'].includes(elemType)) return true;
    if (['cc.Vec3', 'cc.Vec2', 'cc.Vec4', 'cc.Color', 'cc.Size'].includes(elemType)) return true;
    if (elemType.startsWith('cc.')) return true;
    // 自定义类型: 检查是否有元数据
    if (elementMetadata && elementMetadata[elemType]) return true;
    return false;
}

/** 根据元数据推断数组元素的默认值 */
function inferElementDefault(elemType: string, elementMetadata: any): any {
    if (!elemType) return 0;
    if (elemType === 'Number') return 0;
    if (elemType === 'String') return '';
    if (elemType === 'Boolean') return false;
    if (elemType === 'cc.Vec3') return { x: 0, y: 0, z: 0 };
    if (elemType === 'cc.Vec2') return { x: 0, y: 0 };
    if (elemType === 'cc.Vec4') return { x: 0, y: 0, z: 0, w: 0 };
    if (elemType === 'cc.Color') return { r: 255, g: 255, b: 255, a: 255 };
    if (elemType === 'cc.Size') return { width: 0, height: 0 };
    // 自定义类型: 根据元数据构建默认对象
    const meta = elementMetadata?.[elemType];
    if (meta) {
        const obj: any = { _t: elemType };
        for (const key of Object.keys(meta)) {
            if (key === '_t' || key === '__class__') continue;
            const propMeta = meta[key];
            if (propMeta?.button) continue;
            if (propMeta?.range) obj[key] = propMeta.range.min;
            else if (propMeta?.valueDropdown) {
                const vd = propMeta.valueDropdown;
                obj[key] = (vd.values && vd.values.length > 0) ? vd.values[0] : 0;
            }
            else if (propMeta?.tableList) obj[key] = [];
            else if (propMeta?.textarea) obj[key] = '';
            else obj[key] = 0; // 未知类型默认 0, 后续异步修正
        }
        return obj;
    }
    return 0;
}

/** 异步修正自定义类型对象的字段默认值 (用 Cocos @property 类型信息) */
async function fixElementDefaults(obj: any, elemType: string, elementMetadata: any): Promise<boolean> {
    if (!obj || !elemType || elemType.startsWith('cc.') || ['Number','String','Boolean'].includes(elemType)) return false;
    try {
        const propTypes = await Editor.Message.request('taowu-inspector', 'query-class-property-types', elemType);
        if (!propTypes) return false;
        let changed = false;
        // 先补充 obj 中缺失的字段 (propTypes 中有但 obj 中没有的)
        for (const key of Object.keys(propTypes)) {
            if (key === '_t') continue;
            if (!(key in obj)) {
                const pt = propTypes[key];
                if (pt.isArray) {
                    obj[key] = []; changed = true;
                } else if (pt.elementType && !['Number','String','Boolean'].includes(pt.elementType) && !pt.elementType.startsWith('cc.')) {
                    obj[key] = { _t: pt.elementType }; changed = true;
                } else if (pt.elementType === 'String') {
                    obj[key] = ''; changed = true;
                } else if (pt.elementType === 'Boolean') {
                    obj[key] = false; changed = true;
                } else {
                    obj[key] = 0; changed = true;
                }
            }
        }
        for (const key of Object.keys(obj)) {
            if (key === '_t') continue;
            const pt = propTypes[key];
            if (!pt) continue;
            if (pt.isArray) {
                if (!Array.isArray(obj[key])) { obj[key] = []; changed = true; }
            } else if (pt.elementType && !['Number','String','Boolean'].includes(pt.elementType) && !pt.elementType.startsWith('cc.')) {
                if (typeof obj[key] !== 'object' || obj[key] === null) {
                    obj[key] = inferElementDefault(pt.elementType, elementMetadata);
                    if (obj[key] === 0) obj[key] = { _t: pt.elementType };
                    changed = true;
                }
                // 递归修正嵌套对象的字段
                if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    const nestedChanged = await fixElementDefaults(obj[key], pt.elementType, elementMetadata);
                    if (nestedChanged) changed = true;
                }
            } else if (pt.elementType === 'String' && obj[key] === 0) {
                obj[key] = ''; changed = true;
            } else if (pt.elementType === 'Boolean' && obj[key] === 0) {
                obj[key] = false; changed = true;
            }
        }
        return changed;
    } catch (e) { return false; }
}
