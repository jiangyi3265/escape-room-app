import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
async function moduleUrl(path) {
	let source = await readFile(path, 'utf8')
	for (const match of [...source.matchAll(/from '(\.\/[^']+)'/g)]) source = source.replace(match[0], `from '${await moduleUrl(new URL(match[1], path))}'`)
	return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}
const payment = await import(await moduleUrl(new URL('../services/payment-rules.js', import.meta.url)))
const rules = await import(await moduleUrl(new URL('../services/order-rules.js', import.meta.url)))
const app = await import(await moduleUrl(new URL('../services/app-state.js', import.meta.url)))
let saved
globalThis.uni = { getStorageSync: () => saved, setStorageSync: (key, value) => { saved = value } }
let checks = 0
function check(label, fn) { fn(); checks++; console.log(`PASS ${label}`) }
const employee = { role: 'employee', name: '林澈', active: true }
const order = { id: 'test-order', theme: '开学悸', records: { start: {}, openReset: {} } }
const state = { orders: [order], receipts: [] }
const today = new Date(2026, 8, 5, 23, 59, 59)
const tomorrow = new Date(2026, 8, 6, 0, 0, 1)
check('money uses exact cents and rejects invalid formats', () => {
	assert.equal(payment.amountToCents('0.10') + payment.amountToCents('0.20'), 30)
	assert.equal(payment.amountToCents('12.30'), 1230)
	for (const value of ['-1', '1.234', 'NaN', 'Infinity', '1e3', '1000001', 'abc']) assert.throws(() => payment.amountToCents(value))
	assert.throws(() => payment.parsePaymentAmounts({ wechat: '', alipay: '0', cash: '0.00' }))
})
check('payment cannot skip prerequisites or use disabled identity', () => {
	assert.throws(() => payment.recordOrderPayment(state, order, { ...employee, active: false }, { cash: '1' }))
	const early = { id: 'early', records: {} }; state.orders.push(early)
	assert.throws(() => payment.recordOrderPayment(state, early, employee, { cash: '1' }))
	assert.equal(state.receipts.length, 0)
})
check('mixed payment records all four channels and advances to host', () => {
	const result = payment.recordOrderPayment(state, order, employee, { wechat: '100.10', alipay: '50.20', cash: '20', online: '300' }, today)
	assert.deepEqual(result.amounts, { wechat: 10010, alipay: 5020, cash: 2000, online: 30000 })
	assert.equal(result.operator, '林澈'); assert.equal(result.date, '2026-09-05')
	assert.equal(rules.nextOrderStep(order).key, 'host')
})
check('daily totals exclude online and reset at local midnight', () => {
	assert.deepEqual(payment.todayPaymentTotals(state.receipts, payment.paymentDateKey(today)), { wechat: 10010, alipay: 5020, cash: 2000, total: 17030, count: 1 })
	assert.equal(payment.todayPaymentTotals(state.receipts, payment.paymentDateKey(tomorrow)).total, 0)
})
check('duplicate confirm does not double count', () => {
	assert.throws(() => payment.recordOrderPayment(state, order, employee, { cash: '10' }, today))
	assert.equal(state.receipts.length, 1)
})
check('rollback to payment edits the original amount without duplicating the receipt', () => {
	delete order.records.payment
	payment.recordOrderPayment(state, order, employee, { cash: '999' }, tomorrow)
	assert.equal(state.receipts.length, 1)
	assert.equal(state.receipts[0].date, '2026-09-05')
	assert.deepEqual(state.receipts[0].amounts, { wechat: 0, alipay: 0, cash: 99900, online: 0 })
	assert.deepEqual(state.receipts[0].revisions[0].amounts, { wechat: 10010, alipay: 5020, cash: 2000, online: 30000 })
	assert.equal(payment.todayPaymentTotals(state.receipts, '2026-09-05').total, 99900)
})
check('cancel or deletion reverses collected money and removes it from totals', () => {
	order.cancelled = true
	assert.throws(() => payment.recordOrderPayment(state, order, employee, { cash: '1' }))
	const reversed = payment.reverseOrderPayment(state, order, { role: 'manager', name: '江店长' }, '取消订单', tomorrow)
	assert.equal(reversed.status, 'reversed')
	state.orders = []
	assert.equal(payment.todayPaymentTotals(state.receipts, '2026-09-05').total, 0)
})
check('online-only receipt can complete payment but report remains zero', () => {
	const onlineOrder = { id: 'online', theme: '医怨', records: { start: {}, openReset: {} } }; state.orders.push(onlineOrder)
	payment.recordOrderPayment(state, onlineOrder, { role: 'manager', name: '江店长' }, { online: '500' }, tomorrow)
	assert.equal(rules.nextOrderStep(onlineOrder).key, 'host')
	assert.equal(payment.todayPaymentTotals(state.receipts, '2026-09-06').total, 0)
})
check('manager report returns exactly seven calendar days and excludes reversed receipts', () => {
	const history = payment.paymentTotalsByDay(state.receipts, 7, tomorrow)
	assert.equal(history.length, 7)
	assert.equal(history[0].date, '2026-09-06')
	assert.equal(history[1].date, '2026-09-05')
	assert.equal(history[1].total, 0)
})
check('exact 12 two-character labels and no-video completion', () => {
	const flow = { records: {} }
	assert.deepEqual(rules.compactOrderSteps(flow).map(step => step.label), ['创建', '开始', '开复', '收钱', '带场', '入场', '进行', '结束', '收复', '拍照', '视频', '完毕'])
	assert.equal(rules.compactOrderSteps(flow).filter(step => step.current)[0].key, 'start')
	for (const step of rules.ORDER_STEPS.slice(0, 10)) flow.records[step.key] = {}
	flow.records.video.choice = '不要视频'
	assert.equal(rules.compactOrderSteps(flow).at(-1).done, true)
	flow.records.video.choice = '要视频'
	assert.equal(rules.compactOrderSteps(flow).at(-1).current, true)
	flow.records.edit = {}; assert.equal(rules.compactOrderSteps(flow).at(-1).done, true)
	flow.cancelled = true; assert.ok(rules.compactOrderSteps(flow).every(step => !step.current))
})
check('server snapshot without receipts never invents amounts; cached ledger survives reload', () => {
	const normalised = app.normaliseSnapshotState({ orders: [order] })
	assert.deepEqual(normalised.receipts, [])
	const partial = app.normaliseSnapshotState({ receipts: [{ id: 'old', orderId: 'x', amounts: { cash: 100 } }] })
	assert.deepEqual(partial.receipts[0].amounts, { wechat: 0, alipay: 0, cash: 100, online: 0 })
	assert.equal(partial.receipts[0].status, 'active'); assert.deepEqual(partial.receipts[0].revisions, [])
	const snapshot = { version: '42:2026-09-06', me: { id: 1, name: '江店长', role: 'manager' }, state: { ...app.createEmptyAppState(), receipts: state.receipts } }
	assert.equal(app.saveCachedSnapshot(snapshot), true)
	assert.deepEqual(app.loadCachedSnapshot().state.receipts, state.receipts)
	assert.equal(saved.version, 6)
})
check('newer server data is never replaced by an older refresh', () => {
	assert.equal(app.isSameOrNewerVersion('12:2026-09-06', '11:2026-09-06'), true)
	assert.equal(app.isSameOrNewerVersion('11:2026-09-07', '11:2026-09-06'), true)
	assert.equal(app.isSameOrNewerVersion('10:2026-09-06', '11:2026-09-06'), false)
	assert.equal(app.isSameOrNewerVersion('10:2026-09-06', ''), true)
})
console.log(`${checks} payment and progress checks passed`)
