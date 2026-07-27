import {
    getComponentType,
    getCompIndex,
    getProperties,
    evaluateCondition,
    organizeProperties,
    ITaoWuClassMeta,
    ITaoWuPropertyMeta
} from './taowu-utils';
import { createPropertyElement } from './property-drawer';
import { createFoldoutGroup, createTabGroup, createBoxGroup, createHorizontalGroup } from './group-drawer';

type Selector<$> = { $: Record<keyof $, any | null> };

const CSS_STYLE = `
<style>
.taowu-inspector-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 0;
    box-sizing: border-box;
}
.taowu-loading {
    text-align: center;
    padding: 16px;
    color: #888;
    font-size: 12px;
}
.taowu-property-wrapper {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.taowu-content {
    width: 100%;
}
.taowu-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0 4px 0;
    padding: 0 4px;
}
.taowu-title-text {
    font-size: 13px;
    font-weight: 600;
    color: #ccc;
    white-space: nowrap;
}
.taowu-title-line {
    flex: 1;
    border: none;
    border-top: 1px solid #444;
    margin: 0;
}
.taowu-infobox {
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.5;
}
.taowu-infobox-info {
    background: rgba(64, 169, 255, 0.1);
    border-left: 3px solid #40a9ff;
    color: #40a9ff;
}
.taowu-infobox-warning {
    background: rgba(250, 173, 20, 0.1);
    border-left: 3px solid #faad14;
    color: #faad14;
}
.taowu-infobox-error {
    background: rgba(245, 34, 45, 0.1);
    border-left: 3px solid #f5222d;
    color: #f5222d;
}
.taowu-foldout {
    margin: 2px 0;
    border-radius: 4px;
}
.taowu-foldout-content {
    padding: 4px 8px;
    border-left: 2px solid #444;
    margin-left: 0;
}
.taowu-tab-group {
    margin: 4px 0;
    border: 1px solid #444;
    border-radius: 4px;
    overflow: hidden;
}
.taowu-tab-headers {
    display: flex;
    border-bottom: 1px solid #444;
    background: #222;
}
.taowu-tab-header {
    padding: 6px 16px;
    font-size: 12px;
    cursor: pointer;
    border-right: 1px solid #444;
    transition: background 0.2s;
    user-select: none;
}
.taowu-tab-header:hover {
    background: #333;
}
.taowu-tab-header.active {
    background: #555;
    color: #fff;
    font-weight: 600;
}
.taowu-tab-content {
    display: none;
    padding: 8px;
}
.taowu-tab-content.active {
    display: block;
}
.taowu-box-group {
    margin: 4px 0;
    border: 1px solid #444;
    border-radius: 4px;
    overflow: hidden;
}
.taowu-box-header {
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 600;
    background: #222;
    border-bottom: 1px solid #444;
}
.taowu-box-content {
    padding: 4px 8px;
}
.taowu-horizontal-group {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: flex-end;
}
.taowu-horizontal-item {
    flex: 1;
}
.taowu-debug {
    padding: 4px 8px;
    font-size: 11px;
    color: #f80;
    background: rgba(255,136,0,0.05);
    border: 1px dashed #f80;
    border-radius: 4px;
    margin: 4px 0;
    white-space: pre-wrap;
    word-break: break-all;
    user-select: text;
}
/* ─── Collection (List / TableList / Map) 统一 Box 风格 ─── */
.taowu-collection {
    margin: 4px 0;
    border: 1px solid #444;
    border-radius: 4px;
    overflow: hidden;
}
.taowu-box-content {
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.taowu-collection-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.taowu-collection-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 1px 0;
}
.taowu-collection-index {
    flex: 0 0 50px;
    font-size: 11px;
    color: #888;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.taowu-collection-field {
    flex: 1;
    min-width: 0;
}
.taowu-collection-field > * {
    width: 100%;
}
/* TableList 表格行风格 */
.taowu-table-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
    border-bottom: 1px solid #333;
}
.taowu-table-row:last-child { border-bottom: none; }
.taowu-table-header {
    font-size: 11px;
    font-weight: 600;
    color: #aaa;
    background: #2a2a2a;
    border-bottom: 1px solid #444;
}
.taowu-table-header .taowu-table-cell {
    text-align: center;
    padding: 2px 4px;
}
.taowu-table-index {
    flex: 0 0 24px;
    font-size: 11px;
    color: #888;
    text-align: center;
}
.taowu-table-cell {
    flex: 1;
    min-width: 0;
}
.taowu-table-cell > * { width: 100%; }
/* TableList 内部元素 Box (Vec3/Color 等仍用折叠盒子) */
.taowu-collection-item-box {
    margin: 2px 0;
    border: 1px solid #3a3a3a;
    border-radius: 3px;
    overflow: hidden;
}
.taowu-collection-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    background: #2a2a2a;
    border-bottom: 1px solid #3a3a3a;
    color: #aaa;
}
.taowu-collection-item-content {
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
/* 按钮 */
.taowu-list-btn {
    cursor: pointer;
    padding: 2px 8px;
    font-size: 12px;
    border-radius: 3px;
    user-select: none;
    text-align: center;
    transition: background 0.15s;
}
.taowu-list-btn-add {
    background: #2a3a2a;
    color: #5b9;
    border: 1px solid #3a4a3a;
    margin-top: 4px;
    text-align: center;
}
.taowu-list-btn-add:hover {
    background: #3a4a3a;
}
.taowu-list-btn-del {
    color: #c55;
    min-width: 20px;
    text-align: center;
    padding: 2px 6px;
}
.taowu-list-btn-del:hover {
    color: #f77;
}
</style>
`;

export const template = `
${CSS_STYLE}
<div class="taowu-inspector-container">
    <div class="taowu-loading" style="display:none;">加载中...</div>
    <div class="taowu-debug" style="display:none;"></div>
    <div class="taowu-content"></div>
</div>
`;

export const $ = {
    container: '.taowu-inspector-container',
    loading: '.taowu-loading',
    debug: '.taowu-debug',
    content: '.taowu-content',
};

interface TaoWuPanelThis extends Selector<typeof $> {
    dump: any;
    taowuMetadata: any;
    elementMetadata: any;
    metadataLoading: boolean;
    metadataRequested: boolean;
    compIndex: number;
    componentType: string;
    nodeUuid: string;
    metaQueryResult: string;
    rendering: boolean;
    suppressRender: boolean;
    /** 记录 ui-section 展开状态 (key: header text) */
    sectionExpandState: Map<string, boolean>;
}

function showDebug(self: TaoWuPanelThis, msg: string): void {
    const el = self.$.debug;
    if (el) {
        el.style.display = 'block';
        el.textContent = msg;
    }
}

function doRender(self: TaoWuPanelThis): void {
    const content = self.$.content;
    if (!content || !self.dump) return;

    // 渲染前: 记录所有 ui-section 的展开状态
    if (!self.sectionExpandState) self.sectionExpandState = new Map();
    const existingSections = content.querySelectorAll('ui-section');
    existingSections.forEach((sec: any) => {
        const header = sec.getAttribute('header');
        if (header) {
            self.sectionExpandState.set(header, sec.hasAttribute('expand'));
        }
    });

    // 渲染期间阻止 change 事件
    self.rendering = true;

    content.innerHTML = '';
    self.$.loading.style.display = self.metadataLoading ? 'block' : 'none';

    const compIndex = getCompIndex(self.dump);
    self.compIndex = compIndex;
    const properties = getProperties(self.dump);
    const propKeys = Array.from(properties.keys());
    const taowuMeta: ITaoWuClassMeta = self.taowuMetadata || {};

    // Debug info
    const debugLines: string[] = [];
    debugLines.push('componentType: "' + self.componentType + '"');
    debugLines.push('nodeUuid: ' + self.nodeUuid);
    const ctlDump = properties.get('configTableList');
    if (ctlDump) debugLines.push('configTableList: ' + JSON.stringify(ctlDump).substring(0, 500));
    const cmDump = properties.get('configMap');
    if (cmDump) debugLines.push('configMap: ' + JSON.stringify(cmDump).substring(0, 500));
    showDebug(self, debugLines.join('\n'));

    // 使用 compUuid 作为 set-property 的 uuid
    const propUuid = self.compUuid || self.nodeUuid;
    const isRendering = () => self.rendering;
    const onPropChanged = () => {};

    // 存储 rerender 回调到 DOM，供 property-drawer 在 set-property 后调用
    // 接受可选的 (propName, newVal) 参数，手动 patch self.dump 以防 Cocos 的 update() 覆盖为旧值
    (self.$.content as any).__taowuRerender = (changedProp?: string, newVal?: any) => {
        if (changedProp !== undefined) {
            const dumpValue = self.dump.value || self.dump;
            if (dumpValue[changedProp]) {
                dumpValue[changedProp].value = newVal;
            }
        }
        if (conditionsChanged(self)) {
            doRender(self);
        } else {
            updatePropDumps(self);
        }
    };

    const organized = organizeProperties(propKeys, taowuMeta);
    const elementMetadata = self.elementMetadata || {};

    // 1. 无分组属性
    for (const key of organized.ungrouped) {
        const meta = taowuMeta[key];
        if (!evaluateCondition(meta, properties)) continue;

        const propDump = properties.get(key);
        if (propDump) {
            const el = createPropertyElement(key, propDump, propUuid, compIndex, meta, isRendering, onPropChanged, elementMetadata);
            content.appendChild(el);
        }
    }

    // 2. Foldout 分组
    for (const [groupPath, keys] of organized.foldoutGroups) {
        const visibleKeys = keys.filter(k => evaluateCondition(taowuMeta[k], properties));
        if (visibleKeys.length === 0) continue;
        const el = createFoldoutGroup(groupPath, visibleKeys, self.dump, propUuid, compIndex, taowuMeta, isRendering, onPropChanged, elementMetadata);
        content.appendChild(el);
    }

    // 3. Tab 分组
    for (const [groupName, tabs] of organized.tabGroups) {
        const el = createTabGroup(groupName, tabs, self.dump, propUuid, compIndex, taowuMeta, isRendering, onPropChanged, elementMetadata);
        content.appendChild(el);
    }

    // 4. Box 分组
    for (const [groupName, keys] of organized.boxGroups) {
        const visibleKeys = keys.filter(k => evaluateCondition(taowuMeta[k], properties));
        if (visibleKeys.length === 0) continue;
        const el = createBoxGroup(groupName, visibleKeys, self.dump, propUuid, compIndex, taowuMeta, isRendering, onPropChanged, elementMetadata);
        content.appendChild(el);
    }

    // 5. Horizontal 分组
    for (const [groupName, keys] of organized.horizontalGroups) {
        const visibleKeys = keys.filter(k => evaluateCondition(taowuMeta[k], properties));
        if (visibleKeys.length === 0) continue;
        const el = createHorizontalGroup(groupName, visibleKeys, self.dump, propUuid, compIndex, taowuMeta, isRendering, onPropChanged, elementMetadata);
        content.appendChild(el);
    }

    // 渲染后: 恢复展开状态，并阻止内容区域事件导致折叠
    {
        const newSections = content.querySelectorAll('ui-section');
        newSections.forEach((sec: any) => {
            const header = sec.getAttribute('header');
            if (header && self.sectionExpandState.has(header)) {
                if (self.sectionExpandState.get(header)) {
                    sec.setAttribute('expand', '');
                } else {
                    sec.removeAttribute('expand');
                }
            }
        });
    }

    // 记录当前可见属性，用于后续判断是否需要重建 DOM
    const visibleKeys: string[] = [];
    for (const key of organized.ungrouped) {
        if (evaluateCondition(taowuMeta[key], properties)) visibleKeys.push(key);
    }
    for (const [_gp, keys] of organized.foldoutGroups) {
        for (const k of keys) if (evaluateCondition(taowuMeta[k], properties)) visibleKeys.push(k);
    }
    for (const [_gn, tabs] of organized.tabGroups) {
        for (const [_tn, tabKeys] of tabs) {
            for (const k of tabKeys) if (evaluateCondition(taowuMeta[k], properties)) visibleKeys.push(k);
        }
    }
    for (const [_gn, keys] of organized.boxGroups) {
        for (const k of keys) if (evaluateCondition(taowuMeta[k], properties)) visibleKeys.push(k);
    }
    for (const [_gn, keys] of organized.horizontalGroups) {
        for (const k of keys) if (evaluateCondition(taowuMeta[k], properties)) visibleKeys.push(k);
    }
    self._lastVisibleKeys = visibleKeys.join(',');
    // 渲染完成，解除标志
    setTimeout(() => { self.rendering = false; }, 50);
}

export function update(this: TaoWuPanelThis, dump: any) {
    this.dump = dump;

    let componentType = getComponentType(dump);
    if (!componentType) {
        if (dump.type && typeof dump.type === 'string') {
            componentType = dump.type;
        } else if (dump.type?.value) {
            componentType = dump.type.value;
        }
    }
    this.componentType = componentType;
    this.compIndex = getCompIndex(dump);

    const compUuid = dump.uuid?.value || dump.uuid || '';
    this.compUuid = compUuid;

    if (!this.metadataRequested || !this.nodeUuid) {
        this.metadataRequested = true;
        this.metadataLoading = true;
        this.$.loading.style.display = 'block';
        this.metaQueryResult = 'pending...';
        this.nodeUuid = '';

        const initAsync = async (): Promise<void> => {
            // 方式1: query-node 用组件 UUID 查询
            try {
                const nodeInfo = await Editor.Message.request('scene', 'query-node', compUuid);
                if (nodeInfo) {
                    if (nodeInfo.uuid?.value) {
                        this.nodeUuid = String(nodeInfo.uuid.value);
                    }
                    if (nodeInfo.parent?.value) {
                        this.nodeUuid = String(nodeInfo.parent.value);
                    }
                    if (!componentType && nodeInfo.__comps__) {
                        const comp = nodeInfo.__comps__[this.compIndex];
                        if (comp?.type) {
                            this.componentType = comp.type;
                            componentType = comp.type;
                        }
                    }
                    if (nodeInfo.__type__) {
                        this.componentType = nodeInfo.__type__;
                        componentType = nodeInfo.__type__;
                    }
                }
            } catch (e) {
                // ignore
            }

            // 方式2: 通过当前选中节点获取
            if (!this.nodeUuid) {
                try {
                    const selected = Editor.Selection.getSelected("node");
                    if (selected && selected.length > 0) {
                        this.nodeUuid = selected[0];
                    }
                } catch (e) {
                    // ignore
                }
            }

            // 方式3: 兜底用组件 UUID
            if (!this.nodeUuid) {
                this.nodeUuid = compUuid;
            }

            this.metaQueryResult = 'type: "' + componentType + '", nodeUuid: "' + this.nodeUuid + '", compUuid: "' + compUuid + '"';

            try {
                const meta = await Editor.Message.request('taowu-inspector', 'query-taowu-metadata', componentType);
                this.taowuMetadata = meta || {};
                this.metadataLoading = false;
                this.metaQueryResult = 'resolved';

                // 获取数组元素类型的元数据 (如 MapEntry)
                this.elementMetadata = {};
                const props = getProperties(this.dump);
                for (const [_k, pd] of props) {
                    const et = pd.elementTypeData?.type;
                    if (et && !et.startsWith('cc.') && !this.elementMetadata[et]) {
                        try {
                            const em = await Editor.Message.request('taowu-inspector', 'query-taowu-metadata', et);
                            this.elementMetadata[et] = em || {};
                        } catch (e) {}
                    }
                }
            } catch (err) {
                this.taowuMetadata = {};
                this.metadataLoading = false;
                this.metaQueryResult = 'error: ' + JSON.stringify(err);
            }
            doRender(this);
        };

        initAsync();
    } else {
        // 已渲染过：检查 ShowIf/HideIf 条件是否变化
        if (conditionsChanged(this)) {
            // 条件变化，需要重建 DOM 以显示/隐藏属性
            doRender(this);
        } else {
            // 条件未变，只更新 dump 值，避免滑动条断触
            updatePropDumps(this);
        }
    }
}

/** 检查 ShowIf/HideIf 条件是否变化 */
function conditionsChanged(self: TaoWuPanelThis): boolean {
    if (!self._lastVisibleKeys) return false;
    const properties = getProperties(self.dump);
    const taowuMeta = self.taowuMetadata || {};
    const organized = organizeProperties(Array.from(properties.keys()), taowuMeta);
    const visibleKeys: string[] = [];
    for (const key of organized.ungrouped) {
        if (evaluateCondition(taowuMeta[key], properties)) visibleKeys.push(key);
    }
    for (const [_gp, keys] of organized.foldoutGroups) {
        for (const k of keys) if (evaluateCondition(taowuMeta[k], properties)) visibleKeys.push(k);
    }
    for (const [_gn, tabs] of organized.tabGroups) {
        for (const [_tn, tabKeys] of tabs) {
            for (const k of tabKeys) if (evaluateCondition(taowuMeta[k], properties)) visibleKeys.push(k);
        }
    }
    for (const [_gn, keys] of organized.boxGroups) {
        for (const k of keys) if (evaluateCondition(taowuMeta[k], properties)) visibleKeys.push(k);
    }
    for (const [_gn, keys] of organized.horizontalGroups) {
        for (const k of keys) if (evaluateCondition(taowuMeta[k], properties)) visibleKeys.push(k);
    }
    const curr = visibleKeys.join(',');
    const prev = self._lastVisibleKeys;
    self._lastVisibleKeys = curr;
    return curr !== prev;
}

/** 只更新已有 ui-prop 的 dump，不重建 DOM */
function updatePropDumps(self: TaoWuPanelThis): void {
    const content = self.$.content;
    if (!content) return;

    const properties = getProperties(self.dump);
    const taowuMeta = self.taowuMetadata || {};
    const organized = organizeProperties(Array.from(properties.keys()), taowuMeta);

    // 收集所有可见属性的 key (按渲染顺序)
    const allKeys: string[] = [];
    for (const key of organized.ungrouped) {
        const meta = taowuMeta[key];
        if (!evaluateCondition(meta, properties)) continue;
        allKeys.push(key);
    }
    for (const [groupPath, keys] of organized.foldoutGroups) {
        for (const k of keys) {
            if (evaluateCondition(taowuMeta[k], properties)) allKeys.push(k);
        }
    }
    for (const [groupName, keys] of organized.boxGroups) {
        for (const k of keys) {
            if (evaluateCondition(taowuMeta[k], properties)) allKeys.push(k);
        }
    }

    // 遍历所有 ui-prop 元素，更新 dump
    const propElements = content.querySelectorAll('ui-prop[type="dump"]');
    let keyIdx = 0;
    for (let i = 0; i < propElements.length; i++) {
        const el = propElements[i] as any;
        if (keyIdx < allKeys.length) {
            const propKey = allKeys[keyIdx];
            const propDump = properties.get(propKey);
            if (propDump) {
                const meta = taowuMeta[propKey];
                const dumpCopy = Object.assign({}, propDump);
                if (meta?.labelText) dumpCopy.displayName = meta.labelText;
                if (meta?.readOnly) dumpCopy.readonly = true;
                if (meta?.range) { dumpCopy.slide = true; dumpCopy.min = meta.range.min; dumpCopy.max = meta.range.max; }
                if (meta?.textarea) dumpCopy.multiline = true;
                try { el.dump = dumpCopy; } catch (e) {}
            }
        }
        keyIdx++;
    }
}

export function ready(this: TaoWuPanelThis) {
}

export function close(this: TaoWuPanelThis) {
    this.taowuMetadata = undefined;
    this.elementMetadata = undefined;
    this.metadataRequested = false;
    this.dump = null;
    this.nodeUuid = '';
    this.suppressRender = false;
    this.rendering = false;
    this.sectionExpandState = new Map();
}
