"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$ = exports.template = void 0;
exports.update = update;
exports.ready = ready;
exports.close = close;
const taowu_utils_1 = require("./taowu-utils");
const property_drawer_1 = require("./property-drawer");
const group_drawer_1 = require("./group-drawer");
const CSS_STYLE = `
<style>
.taowu-inspector-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 4px;
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
.taowu-prop {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 2px 0;
    min-height: 24px;
}
.taowu-prop-label {
    flex: 0 0 130px;
    font-size: 12px;
    color: #ccc;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-top: 3px;
}
.taowu-prop-content {
    flex: 1;
    min-width: 0;
}
.taowu-prop-content > * {
    width: 100%;
}
.taowu-prop-content ui-input[multiline] {
    vertical-align: top;
    display: block;
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
    padding: 4px 0 4px 12px;
    border-left: 2px solid #444;
    margin-left: 8px;
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
/* TableList 内部元素 Box */
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
exports.template = `
${CSS_STYLE}
<div class="taowu-inspector-container">
    <div class="taowu-loading" style="display:none;">加载中...</div>
    <div class="taowu-debug" style="display:none;"></div>
    <div class="taowu-content"></div>
</div>
`;
exports.$ = {
    container: '.taowu-inspector-container',
    loading: '.taowu-loading',
    debug: '.taowu-debug',
    content: '.taowu-content',
};
function showDebug(self, msg) {
    const el = self.$.debug;
    if (el) {
        el.style.display = 'block';
        el.textContent = msg;
    }
}
function doRender(self) {
    const content = self.$.content;
    if (!content || !self.dump)
        return;
    // 渲染前: 记录所有 ui-section 的展开状态
    if (!self.sectionExpandState)
        self.sectionExpandState = new Map();
    const existingSections = content.querySelectorAll('ui-section');
    existingSections.forEach((sec) => {
        const header = sec.getAttribute('header');
        if (header) {
            self.sectionExpandState.set(header, sec.hasAttribute('expand'));
        }
    });
    // 渲染期间阻止 change 事件
    self.rendering = true;
    content.innerHTML = '';
    self.$.loading.style.display = self.metadataLoading ? 'block' : 'none';
    const compIndex = (0, taowu_utils_1.getCompIndex)(self.dump);
    self.compIndex = compIndex;
    const properties = (0, taowu_utils_1.getProperties)(self.dump);
    const propKeys = Array.from(properties.keys());
    const taowuMeta = self.taowuMetadata || {};
    // Debug info
    const debugLines = [];
    debugLines.push('componentType: "' + self.componentType + '"');
    debugLines.push('nodeUuid: ' + self.nodeUuid);
    const ctlDump = properties.get('configTableList');
    if (ctlDump)
        debugLines.push('configTableList: ' + JSON.stringify(ctlDump).substring(0, 500));
    const cmDump = properties.get('configMap');
    if (cmDump)
        debugLines.push('configMap: ' + JSON.stringify(cmDump).substring(0, 500));
    showDebug(self, debugLines.join('\n'));
    // 使用 nodeUuid 作为 set-property 的 uuid
    const propUuid = self.nodeUuid;
    const isRendering = () => self.rendering;
    const onPropChanged = () => { };
    const organized = (0, taowu_utils_1.organizeProperties)(propKeys, taowuMeta);
    // 1. 无分组属性
    for (const key of organized.ungrouped) {
        const meta = taowuMeta[key];
        if (!(0, taowu_utils_1.evaluateCondition)(meta, properties))
            continue;
        const propDump = properties.get(key);
        if (propDump) {
            const el = (0, property_drawer_1.createPropertyElement)(key, propDump, propUuid, compIndex, meta, isRendering, onPropChanged);
            content.appendChild(el);
        }
    }
    // 2. Foldout 分组
    for (const [groupPath, keys] of organized.foldoutGroups) {
        const visibleKeys = keys.filter(k => (0, taowu_utils_1.evaluateCondition)(taowuMeta[k], properties));
        if (visibleKeys.length === 0)
            continue;
        const el = (0, group_drawer_1.createFoldoutGroup)(groupPath, visibleKeys, self.dump, propUuid, compIndex, taowuMeta, isRendering, onPropChanged);
        content.appendChild(el);
    }
    // 3. Tab 分组
    for (const [groupName, tabs] of organized.tabGroups) {
        const el = (0, group_drawer_1.createTabGroup)(groupName, tabs, self.dump, propUuid, compIndex, taowuMeta, isRendering, onPropChanged);
        content.appendChild(el);
    }
    // 4. Box 分组
    for (const [groupName, keys] of organized.boxGroups) {
        const visibleKeys = keys.filter(k => (0, taowu_utils_1.evaluateCondition)(taowuMeta[k], properties));
        if (visibleKeys.length === 0)
            continue;
        const el = (0, group_drawer_1.createBoxGroup)(groupName, visibleKeys, self.dump, propUuid, compIndex, taowuMeta, isRendering, onPropChanged);
        content.appendChild(el);
    }
    // 5. Horizontal 分组
    for (const [groupName, keys] of organized.horizontalGroups) {
        const visibleKeys = keys.filter(k => (0, taowu_utils_1.evaluateCondition)(taowuMeta[k], properties));
        if (visibleKeys.length === 0)
            continue;
        const el = (0, group_drawer_1.createHorizontalGroup)(groupName, visibleKeys, self.dump, propUuid, compIndex, taowuMeta, isRendering, onPropChanged);
        content.appendChild(el);
    }
    // 渲染后: 恢复展开状态，并阻止内容区域事件导致折叠
    {
        const newSections = content.querySelectorAll('ui-section');
        newSections.forEach((sec) => {
            const header = sec.getAttribute('header');
            if (header && self.sectionExpandState.has(header)) {
                if (self.sectionExpandState.get(header)) {
                    sec.setAttribute('expand', '');
                }
                else {
                    sec.removeAttribute('expand');
                }
            }
        });
    }
    // 渲染完成，解除标志
    setTimeout(() => { self.rendering = false; }, 50);
}
function update(dump) {
    this.dump = dump;
    let componentType = (0, taowu_utils_1.getComponentType)(dump);
    if (!componentType) {
        if (dump.type && typeof dump.type === 'string') {
            componentType = dump.type;
        }
        else if (dump.type?.value) {
            componentType = dump.type.value;
        }
    }
    this.componentType = componentType;
    this.compIndex = (0, taowu_utils_1.getCompIndex)(dump);
    const compUuid = dump.uuid?.value || dump.uuid || '';
    if (!this.metadataRequested || !this.nodeUuid) {
        this.metadataRequested = true;
        this.metadataLoading = true;
        this.$.loading.style.display = 'block';
        this.metaQueryResult = 'pending...';
        this.nodeUuid = '';
        const initAsync = async () => {
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
            }
            catch (e) {
                // ignore
            }
            // 方式2: 通过当前选中节点获取
            if (!this.nodeUuid) {
                try {
                    const selected = Editor.Selection.getSelected("node");
                    if (selected && selected.length > 0) {
                        this.nodeUuid = selected[0];
                    }
                }
                catch (e) {
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
            }
            catch (err) {
                this.taowuMetadata = {};
                this.metadataLoading = false;
                this.metaQueryResult = 'error: ' + JSON.stringify(err);
            }
            doRender(this);
        };
        initAsync();
    }
    else {
        doRender(this);
    }
}
function ready() {
}
function close() {
    this.taowuMetadata = undefined;
    this.metadataRequested = false;
    this.dump = null;
    this.nodeUuid = '';
    this.suppressRender = false;
    this.rendering = false;
    this.sectionExpandState = new Map();
}
