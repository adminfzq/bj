/**
 * Node.js 纯函数单元测试 — 直接运行：node test_node.js
 * 不依赖任何框架，仅使用 Node 内置 assert 模块
 */
const assert = require('assert');
const U = require('./js/utils.js');
const { escapeHtml, parseCsvLine, buildDistinctSets, groupStorageByModel, buildSelectInnerHTML } = U;

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); pass++; console.log('  OK   ' + name); }
    catch (e) { fail++; console.log('  FAIL ' + name + ' — ' + e.message); }
}
function s(name) { console.log('\n🧪 ' + name); }

// ========== escapeHtml ==========
s('escapeHtml — XSS 防护');
t('普通字符串不变', () => assert.strictEqual(escapeHtml('iPhone 17'), 'iPhone 17'));
t('null 返回空串', () => assert.strictEqual(escapeHtml(null), ''));
t('undefined 返回空串', () => assert.strictEqual(escapeHtml(undefined), ''));
t('HTML 标签转义', () => assert.strictEqual(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;'));
t('双引号转义', () => assert.strictEqual(escapeHtml('He said "hi"'), 'He said &quot;hi&quot;'));
t('单引号转义', () => assert.strictEqual(escapeHtml("O'Brien"), 'O&#39;Brien'));
t('& 符号转义', () => assert.strictEqual(escapeHtml('AT&T'), 'AT&amp;T'));
t('数字转字符串', () => assert.strictEqual(escapeHtml(123), '123'));

// ========== parseCsvLine ==========
s('parseCsvLine — CSV 单行解析');
t('简单逗号分隔', () => assert.deepStrictEqual(parseCsvLine('a,b,c'), ['a', 'b', 'c']));
t('空字段', () => assert.deepStrictEqual(parseCsvLine('a,,c'), ['a', '', 'c']));
t('引号包裹含逗号', () => assert.deepStrictEqual(parseCsvLine('"hello, world",foo'), ['hello, world', 'foo']));
t('双引号转义', () => assert.deepStrictEqual(parseCsvLine('"he said ""hi""",bar'), ['he said "hi"', 'bar']));
t('整行空串', () => assert.deepStrictEqual(parseCsvLine(''), ['']));
t('单字段', () => assert.deepStrictEqual(parseCsvLine('hello'), ['hello']));

// ========== buildDistinctSets ==========
s('buildDistinctSets — 去重聚合');
t('正常去重', () => {
    const rows = [
        { model: 'A', storage: '128G', source: 'S1', warranty_status: '在保' },
        { model: 'A', storage: '256G', source: 'S2', warranty_status: '过保' },
        { model: 'B', storage: '128G', source: 'S1', warranty_status: '在保' },
    ];
    const r = buildDistinctSets(rows);
    assert.deepStrictEqual([...r.models].sort(), ['A', 'B']);
    assert.deepStrictEqual([...r.storages].sort(), ['128G', '256G']);
    assert.deepStrictEqual([...r.sources].sort(), ['S1', 'S2']);
    assert.deepStrictEqual([...r.warranties].sort(), ['在保', '过保']);
});
t('空数组', () => { const r = buildDistinctSets([]); assert.strictEqual(r.models.size, 0); });
t('null 防御', () => { const r = buildDistinctSets(null); assert.ok(r.models instanceof Set); });
t('缺字段跳过', () => {
    const r = buildDistinctSets([{ model: 'A' }, { storage: '128G' }]);
    assert.deepStrictEqual([...r.models], ['A']);
    assert.deepStrictEqual([...r.storages], ['128G']);
    assert.strictEqual(r.sources.size, 0);
});

// ========== groupStorageByModel ==========
s('groupStorageByModel — 机型→容量映射');
t('正常分组去重', () => {
    const rows = [
        { model: 'A', storage: '128G' },
        { model: 'A', storage: '256G' },
        { model: 'B', storage: '128G' },
        { model: 'A', storage: '128G' },
    ];
    const m = groupStorageByModel(rows);
    assert.deepStrictEqual([...m.A].sort(), ['128G', '256G']);
    assert.deepStrictEqual([...m.B], ['128G']);
});
t('空数组', () => assert.strictEqual(Object.keys(groupStorageByModel([])).length, 0));
t('无 model 字段跳过', () => {
    const m = groupStorageByModel([{ storage: '128G' }, null, undefined]);
    assert.strictEqual(Object.keys(m).length, 0);
});

// ========== buildSelectInnerHTML ==========
s('buildSelectInnerHTML — select 选项 HTML');
t('Set 输入 + 首项占位 + 排序', () => {
    const html = buildSelectInnerHTML(new Set(['B', 'A']), '全部');
    assert.ok(html.includes('<option value="">全部</option>'));
    assert.ok(html.indexOf('>A<') < html.indexOf('>B<'));
});
t('XSS 防护', () => {
    const html = buildSelectInnerHTML(new Set(['<script>']), '');
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
});
t('空输入', () => {
    const html = buildSelectInnerHTML([], '全部');
    assert.ok(html.includes('<option value="">全部</option>'));
    // 空输入应只有占位首项，没有值选项
    const optCount = (html.match(/<option/g) || []).length;
    assert.strictEqual(optCount, 1);
});

// ========== 总结 ==========
console.log('\n========================================================');
console.log(`共 ${pass + fail} 项测试 · 通过 ${pass} · 失败 ${fail}`);
if (fail > 0) {
    console.log('❌ 有 ' + fail + ' 项失败');
    process.exit(1);
} else {
    console.log('✅ ALL PASS');
}
