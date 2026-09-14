/**
 * 纯函数工具集 —— 可在浏览器和 Node.js 中直接使用
 * 用于 iPhone 回收报价网站的下拉选项动态填充、XSS 防护、CSV 解析等
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js
        module.exports = factory();
    } else {
        // 浏览器
        root.QuoteUtils = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {

    /** HTML 转义：防止 XSS */
    function escapeHtml(v) {
        if (v === null || v === undefined) return '';
        return String(v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** CSV 单行解析（支持双引号包裹字段和 "" 转义） */
    function parseCsvLine(line) {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (line[i + 1] === '"') { cur += '"'; i++; }
                    else inQuotes = false;
                } else cur += ch;
            } else {
                if (ch === '"') inQuotes = true;
                else if (ch === ',') { result.push(cur); cur = ''; }
                else cur += ch;
            }
        }
        result.push(cur);
        return result;
    }

    /**
     * 从 Supabase 返回的行数据中提取 model/storage/source/warranty_status 的去重集合
     * @param {Array} rows - 查询结果行数组
     * @returns {{ models: Set, storages: Set, sources: Set, warranties: Set }}
     */
    function buildDistinctSets(rows) {
        const models = new Set();
        const storages = new Set();
        const sources = new Set();
        const warranties = new Set();
        (rows || []).forEach(r => {
            if (r.model) models.add(r.model);
            if (r.storage) storages.add(r.storage);
            if (r.source) sources.add(r.source);
            if (r.warranty_status) warranties.add(r.warranty_status);
        });
        return { models, storages, sources, warranties };
    }

    /**
     * 构建 机型 → Set(容量) 的映射
     * @param {Array} rows - 查询结果行数组
     * @returns {Object<string, Set>}
     */
    function groupStorageByModel(rows) {
        const map = {};
        (rows || []).forEach(r => {
            if (!r || !r.model) return;
            if (!map[r.model]) map[r.model] = new Set();
            if (r.storage) map[r.model].add(r.storage);
        });
        return map;
    }

    /**
     * 生成 select 下拉的 innerHTML（带首项占位）
     * @param {Array<string>|Set<string>} values - 选项值
     * @param {string} placeholder - 首项文本
     * @param {string} placeholderValue - 首项 value
     * @returns {string}
     */
    function buildSelectInnerHTML(values, placeholder, placeholderValue) {
        const list = (values instanceof Set ? [...values] : (values || [])).sort();
        const ph = `<option value="${escapeHtml(placeholderValue || '')}">${escapeHtml(placeholder || '')}</option>`;
        const opts = list.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
        return ph + opts;
    }

    /**
     * 确保 datalist 存在并填充选项（浏览器端）
     * @param {string} id - datalist id
     * @param {Array<string>|Set<string>} values - 选项值
     */
    function ensureDatalist(id, values) {
        if (typeof document === 'undefined') return; // Node.js 环境跳过
        let dl = document.getElementById(id);
        if (!dl) {
            dl = document.createElement('datalist');
            dl.id = id;
            document.body.appendChild(dl);
        }
        const list = (values instanceof Set ? [...values] : (values || [])).sort();
        dl.innerHTML = list.map(v => `<option value="${escapeHtml(v)}">`).join('');
    }

    /**
     * 填充 select 元素（浏览器端）
     * @param {HTMLSelectElement} selectEl - select DOM 元素
     * @param {Array<string>|Set<string>} values - 选项值
     * @param {string} placeholder - 首项文本
     * @param {string} placeholderValue - 首项 value
     */
    function populateSelect(selectEl, values, placeholder, placeholderValue) {
        if (!selectEl) return;
        selectEl.innerHTML = buildSelectInnerHTML(values, placeholder, placeholderValue);
    }

    return {
        escapeHtml,
        parseCsvLine,
        buildDistinctSets,
        groupStorageByModel,
        buildSelectInnerHTML,
        ensureDatalist,
        populateSelect
    };
});
