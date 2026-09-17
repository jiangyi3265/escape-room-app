import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function moduleUrl(path) {
	let source = await readFile(path, 'utf8')
	for (const match of [...source.matchAll(/from '(\.\/[^']+)'/g)]) source = source.replace(match[0], `from '${await moduleUrl(new URL(match[1], path))}'`)
	return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}

const time = await import(await moduleUrl(new URL('../services/time-format.js', import.meta.url)))
const points = await import(await moduleUrl(new URL('../services/points-rules.js', import.meta.url)))
const staff = await import(await moduleUrl(new URL('../services/staff-rules.js', import.meta.url)))
const wechat = await import(await moduleUrl(new URL('../services/wechat-notifications.js', import.meta.url)))
const pageSource = await readFile(new URL('../pages/index/index.vue', import.meta.url), 'utf8')

let checks = 0
async function check(label, run) { await run(); checks++; console.log(`PASS ${label}`) }

await check('all activity times include a calendar date', () => {
	const reference = new Date(2026, 8, 11, 10, 30)
	assert.equal(time.formatDateTime('20:18', reference), '9月11日 20:18')
	assert.equal(time.formatDateTime('昨天 23:08', reference), '9月10日 23:08')
	assert.equal(time.formatDateTime('2026-09-05T08:09:00', reference), '9月5日 08:09')
})

await check('employee greeting and manager overview follow local daytime', () => {
	assert.equal(time.greetingForDate(new Date(2026, 8, 11, 8)), '早上好')
	assert.equal(time.greetingForDate(new Date(2026, 8, 11, 15)), '下午好')
	assert.equal(time.overviewForDate(new Date(2026, 8, 11, 9)), '门店早间概览')
	assert.equal(time.overviewForDate(new Date(2026, 8, 11, 20)), '门店晚间概览')
})

await check('points ledger keeps one calendar month and manager can revoke a credit', () => {
	const now = new Date(2026, 8, 11, 12)
	const ledger = points.prunePointLedger([
		{ id: 'old', employee: '林澈', title: '旧记录', points: 2, state: '已到账', occurredAt: new Date(2026, 7, 10, 12).toISOString() },
		{ id: 'current', employee: '林澈', title: '及时带场', points: 6, state: '已到账', occurredAt: new Date(2026, 8, 11, 9).toISOString() }
	], now)
	assert.deepEqual(ledger.map(entry => entry.id), ['current'])
	const state = { ranking: [{ id: 'lin', name: '林澈', points: 10 }], pointLedger: ledger, employeePoints: 10, todayPoints: 6 }
	const result = points.revokePointEntry(state, { role: 'manager', name: '江店长' }, 'current', now)
	assert.equal(result.removed, 6); assert.equal(state.ranking[0].points, 4); assert.equal(state.employeePoints, 4); assert.equal(state.todayPoints, 0)
	assert.equal(state.pointLedger.find(entry => entry.id === 'current').state, '已撤销')
	assert.equal(state.pointLedger[0].points, -6)
})

await check('deleting staff removes their score from ranking and cancels pending work', () => {
	const state = {
		ranking: [{ id: 'zhou', name: '周言', points: 214 }, { id: 'lin', name: '林澈', points: 186 }],
		pendingAudits: [{ id: 'audit', employee: '周言' }],
		pointLedger: [{ id: 'audit', employee: '周言', state: '待审核' }],
		jobs: [{ restricted: true, allowedEmployees: ['周言', '林澈'] }],
		employeePoints: 186,
		todayPoints: 16
	}
	const result = staff.deleteEmployeeAccount(state, { role: 'manager', name: '江店长' }, 'zhou', new Date(2026, 8, 11))
	assert.equal(result.removedPoints, 214)
	assert.deepEqual(state.ranking.map(person => person.name), ['林澈'])
	assert.equal(state.pendingAudits.length, 0)
	assert.equal(state.pointLedger[0].state, '账号删除已取消')
	assert.deepEqual(state.jobs[0].allowedEmployees, ['林澈'])
})

await check('wechat subscription adapter validates templates and registers accepted requests', async () => {
	assert.deepEqual(wechat.configuredTemplateIds(' a, b ,,a '), ['a', 'b', 'a'])
	const result = await wechat.requestWechatSubscription({ requestSubscribeMessage(options) { options.success({ a: 'accept' }) } }, ['a'])
	assert.equal(result.a, 'accept')
	await assert.rejects(() => wechat.requestWechatSubscription({}, ['a']), /微信小程序/)
	await assert.rejects(() => wechat.requestWechatSubscription({ requestSubscribeMessage() {} }, []), /模板 ID/)
})

await check('redline UI exposes six live orders and centered destructive controls', () => {
	assert.ok(pageSource.includes('orders.slice(0,6)'))
	assert.match(pageSource, /\.secondary-button\{[^}]*display:flex;align-items:center;justify-content:center/)
	assert.match(pageSource, /\.sheet-cancel\{[^}]*display:flex;align-items:center;justify-content:center/)
	assert.match(pageSource, /\.repair-count\{[^}]*min-width:20px[^}]*white-space:nowrap/)
	assert.ok(pageSource.includes('查看积分明细'))
	assert.ok(pageSource.includes('近 7 日收款记录'))
})

console.log(`${checks} redline requirement checks passed`)
