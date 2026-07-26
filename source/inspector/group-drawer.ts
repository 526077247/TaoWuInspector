import { ITaoWuPropertyMeta } from './taowu-utils';
import { createPropertyElement } from './property-drawer';

type IsRendering = () => boolean;
type OnPropChanged = () => void;

/** 创建折叠分组 */
export function createFoldoutGroup(
    groupPath: string,
    propKeys: string[],
    dump: any,
    compUuid: string,
    compIndex: number,
    taowuMeta: { [key: string]: ITaoWuPropertyMeta },
    isRendering?: IsRendering,
    onPropChanged?: OnPropChanged
): HTMLElement {
    const section = document.createElement('ui-section');
    section.className = 'taowu-foldout';
    section.setAttribute('expand', '');

    const parts = groupPath.split('/');
    section.setAttribute('header', parts[parts.length - 1]);

    const content = document.createElement('div');
    content.className = 'taowu-foldout-content';
    // 阻止内容区域事件冒泡到 ui-section，避免误触折叠
    content.addEventListener('click', (e) => e.stopPropagation());
    content.addEventListener('mousedown', (e) => e.stopPropagation());
    content.addEventListener('pointerdown', (e) => e.stopPropagation());

    for (const key of propKeys) {
        const propDump = dump.value[key] || dump[key];
        if (propDump) {
            const el = createPropertyElement(key, propDump, compUuid, compIndex, taowuMeta[key], isRendering, onPropChanged);
            content.appendChild(el);
        }
    }

    section.appendChild(content);
    return section;
}

/** 创建 Tab 分组 */
export function createTabGroup(
    groupName: string,
    tabs: Map<string, string[]>,
    dump: any,
    compUuid: string,
    compIndex: number,
    taowuMeta: { [key: string]: ITaoWuPropertyMeta },
    isRendering?: IsRendering,
    onPropChanged?: OnPropChanged
): HTMLElement {
    const container = document.createElement('div');
    container.className = 'taowu-tab-group';
    container.dataset.tabGroup = groupName;

    const headerContainer = document.createElement('div');
    headerContainer.className = 'taowu-tab-headers';

    const contentContainer = document.createElement('div');
    contentContainer.className = 'taowu-tab-contents';

    let firstTab = true;
    for (const [tabName, propKeys] of tabs) {
        const tabBtn = document.createElement('div');
        tabBtn.className = 'taowu-tab-header' + (firstTab ? ' active' : '');
        tabBtn.textContent = tabName;
        tabBtn.dataset.tabName = tabName;

        const tabContent = document.createElement('div');
        tabContent.className = 'taowu-tab-content' + (firstTab ? ' active' : '');
        tabContent.dataset.tabName = tabName;

        for (const key of propKeys) {
            const propDump = dump.value[key] || dump[key];
            if (propDump) {
                const el = createPropertyElement(key, propDump, compUuid, compIndex, taowuMeta[key], isRendering, onPropChanged);
                tabContent.appendChild(el);
            }
        }

        tabBtn.addEventListener('click', () => {
            headerContainer.querySelectorAll('.taowu-tab-header').forEach(el => el.classList.remove('active'));
            contentContainer.querySelectorAll('.taowu-tab-content').forEach(el => el.classList.remove('active'));
            tabBtn.classList.add('active');
            tabContent.classList.add('active');
        });

        headerContainer.appendChild(tabBtn);
        contentContainer.appendChild(tabContent);
        firstTab = false;
    }

    container.appendChild(headerContainer);
    container.appendChild(contentContainer);
    return container;
}

/** 创建盒子分组 */
export function createBoxGroup(
    groupName: string,
    propKeys: string[],
    dump: any,
    compUuid: string,
    compIndex: number,
    taowuMeta: { [key: string]: ITaoWuPropertyMeta },
    isRendering?: IsRendering,
    onPropChanged?: OnPropChanged
): HTMLElement {
    const container = document.createElement('div');
    container.className = 'taowu-box-group';

    const header = document.createElement('div');
    header.className = 'taowu-box-header';
    header.textContent = groupName;
    container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'taowu-box-content';

    for (const key of propKeys) {
        const propDump = dump.value[key] || dump[key];
        if (propDump) {
            const el = createPropertyElement(key, propDump, compUuid, compIndex, taowuMeta[key], isRendering, onPropChanged);
            content.appendChild(el);
        }
    }

    container.appendChild(content);
    return container;
}

/** 创建水平分组 */
export function createHorizontalGroup(
    groupName: string,
    propKeys: string[],
    dump: any,
    compUuid: string,
    compIndex: number,
    taowuMeta: { [key: string]: ITaoWuPropertyMeta },
    isRendering?: IsRendering,
    onPropChanged?: OnPropChanged
): HTMLElement {
    const container = document.createElement('div');
    container.className = 'taowu-horizontal-group';

    for (const key of propKeys) {
        const propDump = dump.value[key] || dump[key];
        if (propDump) {
            const el = createPropertyElement(key, propDump, compUuid, compIndex, taowuMeta[key], isRendering, onPropChanged);
            el.classList.add('taowu-horizontal-item');
            container.appendChild(el);
        }
    }

    return container;
}
