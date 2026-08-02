import { createInputElement, createPropertyElement, createButtonElement } from './property-drawer';
import { JsonHelper } from './json-helper';
import { organizeProperties, ITaoWuClassMeta, evaluateCondition, evaluateEnabled } from './taowu-utils';
import { createFoldoutGroup, createBoxGroup, createTabGroup, createHorizontalGroup } from './group-drawer';

const CSS = `
<style>
.json-asset-container { padding: 8px 4px; display: flex; flex-direction: column; gap: 4px; }
.json-asset-title { font-size: 14px; font-weight: 600; color: #ccc; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
.json-asset-meta { font-size: 11px; color: #666; margin-bottom: 4px; }
.json-asset-empty { color: #666; font-size: 12px; padding: 16px; text-align: center; }
.json-save-btn { cursor: pointer; padding: 4px 12px; font-size: 12px; border-radius: 4px; background: #2a4a2a; color: #5b9; border: 1px solid #3a5a3a; user-select: none; transition: background 0.15s; }
.json-save-btn:hover { background: #3a5a3a; }
.json-save-btn:disabled { opacity: 0.4; cursor: default; }
.json-dirty-indicator { font-size: 11px; color: #faad14; }
/* 复用 TaoWu Inspector 的全部 CSS */
.taowu-property-wrapper { display: flex; flex-direction: column; gap: 2px; }
.taowu-content { width: 100%; }
.taowu-collection { margin: 4px 0; border: 1px solid #444; border-radius: 4px; overflow: hidden; }
.taowu-box-content { padding: 4px 8px; display: flex; flex-direction: column; gap: 2px; }
.taowu-box-group { margin: 4px 0; border: 1px solid #444; border-radius: 4px; overflow: hidden; }
.taowu-box-header { padding: 4px 8px; font-size: 12px; font-weight: 600; background: #222; border-bottom: 1px solid #444; }
.taowu-foldout { margin: 2px 0; border-radius: 4px; }
.taowu-foldout-content { padding: 4px 8px; border-left: 2px solid #444; margin-left: 0; }
.taowu-tab-group { margin: 4px 0; border: 1px solid #444; border-radius: 4px; overflow: hidden; }
.taowu-tab-headers { display: flex; border-bottom: 1px solid #444; background: #222; }
.taowu-tab-header { padding: 6px 16px; font-size: 12px; cursor: pointer; border-right: 1px solid #444; transition: background 0.2s; user-select: none; }
.taowu-tab-header:hover { background: #333; }
.taowu-tab-header.active { background: #555; color: #fff; font-weight: 600; }
.taowu-tab-content { display: none; padding: 8px; }
.taowu-tab-content.active { display: block; }
.taowu-horizontal-group { display: flex; flex-direction: row; gap: 8px; align-items: flex-end; }
.taowu-horizontal-item { flex: 1; }
.taowu-collection-items { display: flex; flex-direction: column; gap: 2px; }
.taowu-collection-row { display: flex; align-items: center; gap: 4px; margin: 1px 0; }
.taowu-collection-index { flex: 0 0 20px; font-size: 11px; color: #888; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.taowu-collection-label { flex: 0 0 auto; min-width: 50px; max-width: 120px; font-size: 11px; color: #888; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 4px; }
.taowu-collection-field { flex: 1; min-width: 0; flex-shrink: 1; }
.taowu-collection-field > * { width: 100%; }
.taowu-collection-field > ui-prop::part(label) { display: none; }
.taowu-collection-item-box { margin: 2px 0; border: 1px solid #3a3a3a; border-radius: 3px; overflow: visible; position: relative; }
.taowu-collection-item-wrapper { position: relative; margin: 2px 0; }
.taowu-collection-item-wrapper > .taowu-list-btn-del { position: absolute; top: 2px; right: 6px; z-index: 10; }
.taowu-collection-item-wrapper > .taowu-collection-item-box { width: 100%; }
.taowu-collection-item-header { display: flex; align-items: center; justify-content: space-between; padding: 3px 8px; font-size: 11px; font-weight: 600; background: #2a2a2a; border-bottom: 1px solid #3a3a3a; color: #aaa; }
.taowu-collection-item-content { padding: 4px 8px; display: flex; flex-direction: column; gap: 2px; }
.taowu-table-rows { display: grid; }
.taowu-table-row { display: flex; align-items: center; gap: 0; padding: 0; border-bottom: 1px solid #333; }
.taowu-table-row:last-child { border-bottom: none; }
.taowu-table-header { font-size: 11px; font-weight: 600; color: #aaa; background: #2a2a2a; border-bottom: 1px solid #444; }
.taowu-table-header .taowu-table-cell { text-align: center; padding: 2px 4px; white-space: nowrap; position: relative; }
.taowu-col-resizer { position: absolute; top: 0; right: -2px; width: 4px; height: 100%; cursor: col-resize; background: transparent; z-index: 5; }
.taowu-col-resizer:hover { background: #40a9ff; }
.taowu-table-index { flex: 0 0 24px; font-size: 11px; color: #888; text-align: center; }
.taowu-table-cell { flex: 1 1 0; min-width: 40px; overflow: hidden; }
.taowu-table-cell > * { width: 100%; max-width: 100%; }
.taowu-list-btn { cursor: pointer; padding: 2px 8px; font-size: 12px; border-radius: 3px; user-select: none; text-align: center; transition: background 0.15s; }
.taowu-list-btn-add { background: #2a3a2a; color: #5b9; border: 1px solid #3a4a3a; margin-top: 4px; text-align: center; }
.taowu-list-btn-add:hover { background: #3a4a3a; }
.taowu-list-btn-del { color: #c55; min-width: 20px; flex-shrink: 0; text-align: center; padding: 2px 6px; }
.taowu-list-btn-del:hover { color: #f77; }
.taowu-title { display: flex; align-items: center; gap: 8px; margin: 8px 0 4px 0; padding: 0 4px; }
.taowu-title-text { font-size: 13px; font-weight: 600; color: #ccc; white-space: nowrap; }
.taowu-title-line { flex: 1; border: none; border-top: 1px solid #444; margin: 0; }
.taowu-infobox { padding: 8px 12px; margin: 4px 0; border-radius: 4px; font-size: 12px; line-height: 1.5; border: 1px solid; }
.taowu-infobox-info { background: rgba(64, 169, 255, 0.1); border-left: 3px solid #40a9ff; border-color: rgba(64, 169, 255, 0.3); color: #40a9ff; }
.taowu-infobox-warning { background: rgba(250, 173, 20, 0.1); border-left: 3px solid #faad14; border-color: rgba(250, 173, 20, 0.3); color: #faad14; }
.taowu-infobox-error { background: rgba(245, 34, 45, 0.1); border-left: 3px solid #f5222d; border-color: rgba(245, 34, 45, 0.3); color: #f5222d; }
.taowu-button { cursor: pointer; padding: 6px 16px; font-size: 12px; text-align: center; border-radius: 4px; background: #2a3a4a; color: #6af; border: 1px solid #3a4a5a; user-select: none; transition: background 0.15s; margin: 2px 0; }
.taowu-button:hover { background: #3a4a5a; }
.taowu-button:active { background: #4a5a6a; }
.taowu-button-disabled { opacity: 0.4; cursor: default; pointer-events: none; }
.taowu-button-loading { opacity: 0.6; pointer-events: none; }
</style>
`;

export const template = `
${CSS}
<div class="json-asset-container">
    <div class="json-asset-title">
        <span class="json-asset-name"></span>
        <span class="json-dirty-indicator" style="display:none;">●</span>
        <span class="json-save-btn" style="margin-left:auto;">保存</span>
    </div>
    <div class="json-asset-meta"></div>
    <div class="json-asset-content"></div>
</div>
`;

export const $ = {
    container: '.json-asset-container',
    title: '.json-asset-title',
    nameEl: '.json-asset-name',
    dirtyEl: '.json-dirty-indicator',
    saveBtn: '.json-save-btn',
    meta: '.json-asset-meta',
    content: '.json-asset-content',
};

// 面板状态 — 导出供 property-drawer 使用
export const jsonState = {
    asset: null as any,           // 当前 JSON 对象 (可编辑)
    uuid: '' as string,           // 当前资源 UUID
    url: '' as string,            // 当前资源 URL
    dirty: false as boolean,      // 是否有修改
    onDirty: null as (() => void) | null,
    contentEl: null as any,       // content 元素引用 (用于 property-drawer 查找)
    lastVisibleKeys: '' as string, // 记录上次可见属性，用于检测 ShowIf/HideIf 变化
    classMeta: null as any,       // 当前类的元数据，用于条件判断
    rootTypeName: '' as string,   // 当前 JSON 的根类型名 (用于 ValueDropdown 方法调用)
};

export function update(this: any, assetList: any[], metaList: any[]) {
    const content = this.$.content;
    const nameEl = this.$.nameEl;
    const metaEl = this.$.meta;
    content.innerHTML = '';
    nameEl.textContent = '';
    metaEl.textContent = '';

    jsonState.asset = null;
    jsonState.uuid = '';
    jsonState.url = '';
    jsonState.contentEl = content;
    jsonState.dirty = false;
    updateDirtyUI();

    if (!assetList || assetList.length === 0) {
        content.innerHTML = '<div class="json-asset-empty">未选择资源</div>';
        return;
    }

    const asset = assetList[0];
    nameEl.textContent = asset.name || 'JSON';

    if (assetList.length > 1) {
        metaEl.textContent = `多选 ${assetList.length} 个资源`;
        content.innerHTML = '<div class="json-asset-empty">不支持多选编辑</div>';
        return;
    }

    metaEl.textContent = asset.url || '';
    jsonState.uuid = asset.uuid;
    jsonState.url = asset.url || '';
    jsonState.onDirty = updateDirtyUI;

    Editor.Message.request('taowu-inspector', 'read-asset-file', asset.uuid)
        .then((text: any) => {
            if (text === null || text === undefined) {
                content.innerHTML = '<div class="json-asset-empty">无法读取内容</div>';
                return;
            }
            content.innerHTML = '';
            if (!text) {
                content.innerHTML = '<div class="json-asset-empty">空文件</div>';
                return;
            }
            try {
                // 用 JSON.parse 保留 _t 字段，JsonHelper.parse 会消费 _t 导致保存时丢失
                const cleanText = text
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/(^|[^:])\/\/[^\n\r]*/g, '$1')
                    .replace(/,\s*([}\]])/g, '$1');
                jsonState.asset = JSON.parse(cleanText);
            } catch (e) {
                content.innerHTML = '<div class="json-asset-empty">Invalid JSON: ' + (e as Error).message + '</div>';
                return;
            }
            // 存储 rerender 回调，供 property-drawer 在属性变更后触发重新渲染 (ShowIf/HideIf 等)
            (content as any).__taowuRerender = (changedProp?: string, newVal?: any) => {
                if (changedProp !== undefined && jsonState.asset) {
                    jsonState.asset[changedProp] = newVal;
                }
                // 检查 ShowIf/HideIf 和 EnableIf/DisableIf 条件是否变化
                const _meta = jsonState.classMeta || {};
                const _props: any = {};
                if (jsonState.asset && typeof jsonState.asset === 'object') {
                    for (const k of Object.keys(jsonState.asset)) {
                        if (k !== '_t') _props[k] = jsonState.asset[k];
                    }
                }
                const condProps = new Map(Object.entries(_props));
                let visibleKeys = '';
                for (const key of Object.keys(_meta)) {
                    if (key === '__class__') continue;
                    const m = _meta[key];
                    if (m?.showIf || m?.hideIf) {
                        if (evaluateCondition(m, condProps)) visibleKeys += 's' + key + ',';
                    }
                    if (m?.enableIf || m?.disableIf) {
                        if (evaluateEnabled(m, condProps)) visibleKeys += 'e' + key + ',';
                    }
                }
                if (visibleKeys !== jsonState.lastVisibleKeys) {
                    jsonState.lastVisibleKeys = visibleKeys;
                    renderJsonAsInspector(content, jsonState.asset);
                }
                // 条件没变化时不重新渲染，避免滑块断触
            };
            renderJsonAsInspector(content, jsonState.asset);
        })
        .catch(() => {
            content.innerHTML = '<div class="json-asset-empty">读取失败</div>';
        });
}

export function ready(this: any) {
    this.$.saveBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        saveJson();
    });
}

export function close(this: any) {
    if (jsonState.dirty && jsonState.asset && jsonState.url) {
        const savedAsset = jsonState.asset;
        const savedUrl = jsonState.url;
        // 直接用 JSON.stringify 保留所有字段 (包括 _t)
        const content = JSON.stringify(savedAsset);
        Editor.Message.request('asset-db', 'save-asset', savedUrl, content)
            .then((result: any) => {
                if (result) {
                    jsonState.dirty = false;
                    console.log('[TaoWuInspector] JSON 离开时保存成功');
                } else {
                    console.warn('[TaoWuInspector] JSON 离开时保存失败');
                }
            })
            .catch((e: any) => {
                console.error('[TaoWuInspector] JSON 离开时保存异常:', e);
            });
    }
    jsonState.asset = null;
    jsonState.uuid = '';
    jsonState.url = '';
    jsonState.dirty = false;
    jsonState.onDirty = null;
}

function updateDirtyUI(): void {
    const dirtyEl = document.querySelector('.json-dirty-indicator') as HTMLElement;
    const saveBtn = document.querySelector('.json-save-btn') as HTMLElement;
    if (dirtyEl) dirtyEl.style.display = jsonState.dirty ? 'inline' : 'none';
    if (saveBtn) {
        if (jsonState.dirty) saveBtn.removeAttribute('disabled');
        else saveBtn.setAttribute('disabled', '');
    }
}

async function saveJson(): Promise<void> {
    if (!jsonState.asset || !jsonState.url) return;
    const saveBtn = document.querySelector('.json-save-btn') as HTMLElement;
    if (saveBtn) {
        saveBtn.textContent = '保存中...';
        saveBtn.setAttribute('disabled', '');
    }
    try {
        // 直接用 JSON.stringify 保留所有字段 (包括 _t)
        const content = JSON.stringify(jsonState.asset);
        const result = await Editor.Message.request('asset-db', 'save-asset', jsonState.url, content);
        if (result) {
            jsonState.dirty = false;
            updateDirtyUI();
            console.log('[TaoWuInspector] JSON 保存成功');
        } else {
            console.warn('[TaoWuInspector] JSON 保存失败');
        }
    } catch (e) {
        console.error('[TaoWuInspector] JSON 保存异常:', e);
    }
    if (saveBtn) {
        saveBtn.textContent = '保存';
        if (jsonState.dirty) saveBtn.removeAttribute('disabled');
    }
}

function saveJsonSync(): void {
    if (!jsonState.asset || !jsonState.url) return;
    try {
        const content = JsonHelper.toJson(jsonState.asset, false);
        Editor.Message.request('asset-db', 'save-asset', jsonState.url, content);
    } catch (e) {
        console.error('[TaoWuInspector] JSON 同步保存异常:', e);
    }
}

/** 将 JSON 值转换为 IProperty dump 格式 */
function jsonValueToDump(val: any, key: string): any {
    if (val === null) {
        return { value: 'null', type: 'String', name: key };
    }
    if (typeof val === 'number') {
        return { value: val, type: 'Number', name: key };
    }
    if (typeof val === 'boolean') {
        return { value: val, type: 'Boolean', name: key };
    }
    if (typeof val === 'string') {
        return { value: val, type: 'String', name: key };
    }
    if (Array.isArray(val)) {
        const items = val.map((v, i) => {
            const itemDump = jsonValueToDump(v, String(i));
            return { value: itemDump.value, type: itemDump.type, name: String(i) };
        });
        return {
            value: items,
            isArray: true,
            name: key,
            elementTypeData: {
                type: val.length > 0
                    ? (typeof val[0] === 'number' ? 'Number' : typeof val[0] === 'boolean' ? 'Boolean' : typeof val[0] === 'object' ? (val[0]._t ? String(val[0]._t) : 'Object') : 'String')
                    : 'String',
                value: val.length > 0 ? val[0] : '',
            },
        };
    }
    const obj: any = {};
    for (const k of Object.keys(val)) {
        if (k === '_t') continue;
        obj[k] = jsonValueToDump(val[k], k);
    }
    const typeName = val._t ? String(val._t) : 'Object';
    return { value: obj, type: typeName, name: key };
}

/** 直接用 JSON 原始值作为 propDump.value，这样编辑时修改 propDump.value 就是修改原始 JSON 对象 */
async function renderJsonAsInspector(container: HTMLElement, json: any): Promise<void> {
    if (typeof json !== 'object' || json === null) {
        const dump = { value: json, type: typeof json === 'number' ? 'Number' : typeof json === 'boolean' ? 'Boolean' : 'String', name: 'value' };
        const el = createPropertyElement('value', dump, 'json-edit', 0, {}, () => false, () => {});
        container.appendChild(el);
        return;
    }

    const typeName = json._t ? String(json._t) : '';
    jsonState.rootTypeName = typeName;
    let classMeta: ITaoWuClassMeta = {};
    let propertyTypes: any = null;
    if (typeName) {
        try {
            const meta = await Editor.Message.request('taowu-inspector', 'query-taowu-metadata', typeName);
            classMeta = meta || {};
            jsonState.classMeta = classMeta;
        } catch (e) {
            classMeta = {};
            jsonState.classMeta = classMeta;
        }
        // 查询 Cocos 类的属性类型信息 (@property type)
        try {
            propertyTypes = await Editor.Message.request('taowu-inspector', 'query-class-property-types', typeName);
        } catch (e) {
            propertyTypes = null;
        }
    }

    // 预查询所有嵌套类型的元数据
    const elementMetadata: any = {};
    const queriedTypes = new Set<string>();
    const collectNestedTypes = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { obj.forEach(collectNestedTypes); return; }
        if (obj._t && typeof obj._t === 'string' && !queriedTypes.has(obj._t)) {
            queriedTypes.add(obj._t);
        }
        for (const k of Object.keys(obj)) {
            if (k === '_t') continue;
            collectNestedTypes(obj[k]);
        }
    };
    collectNestedTypes(json);
    // 也从 Cocos 属性类型信息中收集数组元素的自定义类型
    if (propertyTypes) {
        for (const propName of Object.keys(propertyTypes)) {
            const pt = propertyTypes[propName];
            if (pt.isArray && pt.elementType && !pt.elementType.startsWith('cc.') && !['Number','String','Boolean','Object'].includes(pt.elementType)) {
                queriedTypes.add(pt.elementType);
            }
        }
    }
    // 移除根类型自身 (已查询)
    queriedTypes.delete(typeName);
    for (const nt of queriedTypes) {
        if (nt.startsWith('cc.') || nt === 'Number' || nt === 'String' || nt === 'Boolean' || nt === 'Object') continue;
        try {
            const em = await Editor.Message.request('taowu-inspector', 'query-taowu-metadata', nt);
            elementMetadata[nt] = em || {};
        } catch (e) {
            elementMetadata[nt] = {};
        }
    }

    // 保存滚动位置 (renderJsonAsInspector 会清空 innerHTML 导致滚动重置)
    const scrollTop = container.scrollTop;
    container.innerHTML = '';
    renderWithMeta(container, json, classMeta, elementMetadata, propertyTypes);
    // 恢复滚动位置
    container.scrollTop = scrollTop;
}

function renderWithMeta(container: HTMLElement, json: any, classMeta: ITaoWuClassMeta, elementMetadata: any = {}, propertyTypes: any = null): void {
    // 收集所有需要渲染的 key: JSON 中已有的 key + classMeta 中声明但 JSON 缺失的 key
    const jsonKeys = Object.keys(json).filter(k => k !== '_t');
    const metaKeys = Object.keys(classMeta).filter(k => !jsonKeys.includes(k));
    const allKeys = [...jsonKeys, ...metaKeys];
    // 构建 IProperty 格式的 dump (与组件 dump 一致)
    const dumpValue: any = {};
    for (const key of allKeys) {
        const val = json[key];
        if (val === undefined) {
            // JSON 中缺失的字段: 根据元数据和 Cocos 属性类型推断默认值
            const meta = classMeta[key];
            if (meta?.button) continue; // Button 方法不需要 dump
            // 如果 Cocos 属性类型显示是数组，用空数组
            const propType = propertyTypes?.[key];
            if (propType?.isArray || meta?.tableList) {
                const elemType = propType?.elementType || 'String';
                json[key] = []; // 写回 json 以便编辑
                dumpValue[key] = { value: [], isArray: true, name: key, elementTypeData: { type: elemType, value: '' } };
                continue;
            }
            const defaultVal = inferDefaultValue(meta);
            const defaultType = inferDefaultType(meta, defaultVal);
            json[key] = defaultVal; // 写回 json 以便编辑
            dumpValue[key] = { value: defaultVal, type: defaultType, name: key };
            continue;
        }
        // 检测 Cocos 基础类型
        let cocosType = '';
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            if ('x' in val && 'y' in val && 'z' in val && !('w' in val)) cocosType = 'cc.Vec3';
            else if ('x' in val && 'y' in val && 'z' in val && 'w' in val) cocosType = 'cc.Vec4';
            else if ('x' in val && 'y' in val && !('z' in val)) cocosType = 'cc.Vec2';
            else if ('r' in val && 'g' in val && 'b' in val) cocosType = 'cc.Color';
            else if ('width' in val && 'height' in val) cocosType = 'cc.Size';
        }
        const type = cocosType || (Array.isArray(val) ? undefined
            : typeof val === 'number' ? 'Number'
            : typeof val === 'boolean' ? 'Boolean'
            : typeof val === 'string' ? 'String'
            : (val && val._t) ? String(val._t) : 'Object');
        if (Array.isArray(val)) {
            // 确定数组元素类型: 优先从已有元素推断，其次从 Cocos 属性类型信息获取
            let elemType = 'String';
            if (val.length > 0) {
                elemType = typeof val[0] === 'number' ? 'Number' : typeof val[0] === 'boolean' ? 'Boolean' : typeof val[0] === 'object' ? (val[0]._t ? String(val[0]._t) : 'Object') : 'String';
            } else if (propertyTypes && propertyTypes[key]?.isArray) {
                elemType = propertyTypes[key].elementType || 'String';
            }
            dumpValue[key] = {
                value: val, isArray: true, name: key,
                elementTypeData: { type: elemType, value: val.length > 0 ? val[0] : '' }
            };
        } else {
            dumpValue[key] = { value: val, type: type, name: key };
        }
    }
    const dump = { value: dumpValue };
    // 收集 Button 方法的 key (不在 dumpValue 中，但需要渲染)
    const buttonKeys: string[] = [];
    for (const key of Object.keys(classMeta)) {
        if (key === '__class__') continue;
        if (classMeta[key]?.button && !dumpValue[key]) {
            buttonKeys.push(key);
        }
    }
    const propKeys = [...Object.keys(dumpValue), ...buttonKeys];
    const organized = organizeProperties(propKeys, classMeta);

    // 1. 无分组属性
    for (const key of organized.ungrouped) {
        const meta = classMeta[key];
        if (meta?.button) {
            const el = createButtonElement(key, meta, 'json-edit', 0, new Map(Object.entries(dumpValue)));
            container.appendChild(el);
            continue;
        }
        const propDump = dumpValue[key];
        if (propDump) {
            const el = createPropertyElement(key, propDump, 'json-edit', 0, meta, () => false, () => {}, elementMetadata, new Map(Object.entries(dumpValue)));
            container.appendChild(el);
        }
    }
    // 2. Foldout 分组
    for (const [groupPath, fkeys] of organized.foldoutGroups) {
        const el = createFoldoutGroup(groupPath, fkeys, dump, 'json-edit', 0, classMeta, () => false, () => {}, elementMetadata);
        container.appendChild(el);
    }
    // 3. Tab 分组
    for (const [groupName, tabs] of organized.tabGroups) {
        const el = createTabGroup(groupName, tabs, dump, 'json-edit', 0, classMeta, () => false, () => {}, elementMetadata);
        container.appendChild(el);
    }
    // 4. Box 分组
    for (const [groupName, bkeys] of organized.boxGroups) {
        const el = createBoxGroup(groupName, bkeys, dump, 'json-edit', 0, classMeta, () => false, () => {}, elementMetadata);
        container.appendChild(el);
    }
    // 5. Horizontal 分组
    for (const [groupName, hkeys] of organized.horizontalGroups) {
        const el = createHorizontalGroup(groupName, hkeys, dump, 'json-edit', 0, classMeta, () => false, () => {}, elementMetadata);
        container.appendChild(el);
    }
}

/** 根据元数据推断默认值 */
function inferDefaultValue(meta: any): any {
    if (meta?.range) return meta.range.min;
    if (meta?.valueDropdown) {
        const vd = meta.valueDropdown;
        if (vd.values && vd.values.length > 0) return vd.values[0];
        return 0;
    }
    if (meta?.tableList) return [];
    if (meta?.textarea) return '';
    return 0; // 默认 number
}

/** 根据元数据和默认值推断类型 */
function inferDefaultType(meta: any, defaultVal: any): string {
    if (meta?.valueDropdown) {
        return typeof defaultVal === 'number' ? 'Number' : 'String';
    }
    if (meta?.tableList || Array.isArray(defaultVal)) return undefined;
    if (typeof defaultVal === 'number') return 'Number';
    if (typeof defaultVal === 'boolean') return 'Boolean';
    if (typeof defaultVal === 'string') return 'String';
    return 'Object';
}
