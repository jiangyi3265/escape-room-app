import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

// 接入门店系统时承诺「不改前端样式」：这里与仓库里接入前的版本（git 基线）逐项比对。
// 基线默认取最早的提交，可用 STYLE_BASELINE 指定其它提交。
const root = new URL('../', import.meta.url)
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
const baseline = process.env.STYLE_BASELINE || git('rev-list', '--max-parents=0', 'HEAD').trim().split(/\s+/)[0]
const normalise = text => text.replace(/\r\n/g, '\n')
const before = path => normalise(git('show', `${baseline}:${path}`))
const after = async path => normalise(await readFile(new URL(path, root), 'utf8'))

const styleBlocks = source => [...source.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(match => match[0])
const template = source => source.slice(source.indexOf('<template>'), source.lastIndexOf('</template>'))
const CLASS_NAME = /^[a-z][a-z0-9-]*$/
function classNames(markup) {
	const names = new Set()
	const add = text => text.split(/\s+/).filter(name => CLASS_NAME.test(name)).forEach(name => names.add(name))
	for (const match of markup.matchAll(/\sclass="([^"]*)"/g)) add(match[1])
	// :class 里的字符串字面量（比较用的姓名等不是样式类，按类名格式过滤）
	for (const match of markup.matchAll(/:class="([^"]*)"/g)) for (const literal of match[1].matchAll(/'([^']+)'/g)) add(literal[1])
	return names
}
const inlineStyles = markup => [...markup.matchAll(/\s:?style="([^"]*)"/g)].map(match => match[1]).sort()

let checks = 0
async function check(label, run) { await run(); checks++; console.log(`PASS ${label}`) }

const components = ['pages/index/index.vue', 'components/PaymentForm.vue', 'components/StoreWorkspace.vue', 'App.vue']

await check(`all <style> blocks are byte-identical to ${baseline.slice(0, 7)}`, async () => {
	for (const path of components) {
		assert.deepEqual(styleBlocks(await after(path)), styleBlocks(before(path)), `${path} 的样式被改动`)
	}
})

await check('global style variables, page setup and app manifest are unchanged', async () => {
	for (const path of ['uni.scss', 'pages.json', 'manifest.json', 'index.html']) {
		assert.equal(await after(path), before(path), `${path} 被改动`)
	}
})

await check('templates only reuse existing class names (no new visual elements)', async () => {
	for (const path of components) {
		const old = classNames(template(before(path)))
		const current = classNames(template(await after(path)))
		const added = [...current].filter(name => !old.has(name))
		assert.deepEqual(added, [], `${path} 出现了新的样式类：${added.join(', ')}`)
	}
})

await check('no inline styles were added to any template', async () => {
	for (const path of components) {
		assert.deepEqual(inlineStyles(template(await after(path))), inlineStyles(template(before(path))), `${path} 的行内样式有变化`)
	}
})

await check('every original screen and control is still present', async () => {
	const old = template(before('pages/index/index.vue'))
	const current = template(await after('pages/index/index.vue'))
	for (const name of classNames(old)) assert.ok(classNames(current).has(name), `页面缺少原有样式类 ${name}`)
	for (const text of ['抢单大厅', '订单进度', '今日收款', '近 7 日收款记录', '打扫审核', '发布临时任务', '流程节点', '修正流程节点', '员工积分排行', '消息通知', '微信页面提醒']) {
		assert.ok(current.includes(text), `页面缺少「${text}」`)
	}
})

console.log(`${checks} style preservation checks passed`)
