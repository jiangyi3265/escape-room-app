import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Test the actual page methods as well as rules, without changing the uni-app package type.
async function moduleUrl(path) {
	let source = await readFile(path, 'utf8')
	if (path.pathname.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/import (\w+) from '[^']+\.vue'/g, 'const $1 = {}')
	for (const match of [...source.matchAll(/from '(\.\.?\/[^']+)'/g)]) source = source.replace(match[0], `from '${await moduleUrl(new URL(match[1], path))}'`)
	return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}
const rules = await import(await moduleUrl(new URL('../services/order-rules.js', import.meta.url)))
const app = await import(await moduleUrl(new URL('../services/app-state.js', import.meta.url)))
const page = (await import(await moduleUrl(new URL('../pages/index/index.vue', import.meta.url)))).default
let storage
globalThis.uni = { getStorageSync: () => storage, setStorageSync: (key, value) => { storage = value }, showToast: () => {}, showModal: options => options.success({ confirm: true }) }
const clone = value => JSON.parse(JSON.stringify(value))
function fixture(id, count = 0, video = '要视频') {
	const records = {}
	for (const step of rules.ORDER_STEPS.slice(0, count)) records[step.key] = { operator: '林澈', time: '10:00', ...(step.key === 'video' ? { choice: video } : {}) }
	return { id, theme: `测试${id}`, time: '12:00', people: 4, records, cancelled: false }
}
const initial = [fixture('new'), fixture('active', 4), fixture('editing', 10), fixture('no-video', 10, '不要视频'), fixture('edited', 11), { ...fixture('cancelled', 5), cancelled: true }]
function view(role = 'employee', orders = clone(initial)) {
	const vm = { ...page.data(), role, orders }
	for (const [key, method] of Object.entries(page.methods)) vm[key] = method.bind(vm)
	for (const [key, computed] of Object.entries(page.computed)) Object.defineProperty(vm, key, { get: () => computed.call(vm) })
	vm.queuePersist = () => {}
	return vm
}
let count = 0
function check(label, fn) { fn(); count++; console.log(`PASS ${label}`) }
check('employee filters never expose completed orders; pending editing remains visible', () => {
	const vm = view()
	assert.deepEqual(vm.filteredOrders.map(order => order.id), ['new', 'active', 'editing', 'cancelled'])
	vm.orderFilter = 'active'; assert.deepEqual(vm.filteredOrders.map(order => order.id), ['new', 'active'])
	vm.orderFilter = 'editing'; assert.deepEqual(vm.filteredOrders.map(order => order.id), ['editing'])
	vm.orderFilter = 'done'; assert.deepEqual(vm.filteredOrders, [])
	assert.ok(!vm.orderFilters.some(filter => filter.id === 'done'))
})
check('manager retains completed filter and full history without mutating data', () => {
	const vm = view('manager'); const before = JSON.stringify(vm.orders)
	assert.equal(vm.filteredOrders.length, initial.length)
	vm.orderFilter = 'done'; assert.deepEqual(vm.filteredOrders.map(order => order.id), ['no-video', 'edited'])
	assert.ok(vm.orderFilters.some(filter => filter.id === 'done'))
	assert.equal(JSON.stringify(vm.orders), before)
})
check('employee cannot open, quick-open or edit an already completed order', () => {
	const vm = view(); const order = vm.orders.find(order => order.id === 'edited')
	assert.equal(vm.openOrder(order), false); vm.quickAdvance(order); vm.showOrderForm('edit', order)
	assert.equal(vm.selectedOrder, null); assert.equal(vm.orderFormVisible, false)
	vm.role = 'manager'; assert.equal(vm.openOrder(order), true); vm.showOrderForm('edit', order); assert.equal(vm.orderFormVisible, true)
})
check('no-video completion closes employee detail and keeps stored order', () => {
	const order = fixture('finish', 9); const vm = view('employee', [order])
	vm.openOrder(order); vm.chooseBranch(order, 'video', '不要视频'); page.watch.orders.handler.call(vm)
	assert.equal(vm.selectedOrder, null); assert.equal(vm.activeTab, 'orders'); assert.equal(vm.filteredOrders.length, 0)
	assert.equal(vm.orders.length, 1); assert.equal(app.loadAppState().orders.length, 1)
})
check('requesting video stays visible until editing is completed', () => {
	const order = fixture('video', 9); const vm = view('employee', [order])
	vm.openOrder(order); vm.chooseBranch(order, 'video', '要视频'); page.watch.orders.handler.call(vm)
	assert.equal(vm.selectedOrder, order); assert.equal(vm.filteredOrders.length, 1)
	vm.completeOrderStep(order, rules.ORDER_STEPS.find(step => step.key === 'edit')); page.watch.orders.handler.call(vm)
	assert.equal(vm.selectedOrder, null); assert.equal(vm.filteredOrders.length, 0); assert.equal(vm.editingTasks.find(task => task.orderId === order.id).status, 'completed')
})
check('role switch clears manager completed filter and open completed detail', () => {
	const vm = view('manager'); vm.orderFilter = 'done'; vm.openOrder(vm.filteredOrders[0]); vm.role = 'employee'
	page.watch.role.call(vm); assert.equal(vm.orderFilter, 'all'); assert.equal(vm.selectedOrder, null)
})
check('stale edit form is closed and cannot save a newly completed order', () => {
	const order = fixture('edit-race', 10); const vm = view('employee', [order])
	vm.showOrderForm('edit', order); vm.orderForm.note = 'should not save'; order.records.edit = { operator: '店长', time: '10:00' }
	vm.saveOrder(); assert.equal(vm.orderFormVisible, false); assert.equal(order.note, undefined)
})
check('home count and card update, manager rollback makes pending order visible again', () => {
	const order = fixture('rollback', 11); const vm = view('employee', [order])
	assert.equal(vm.activeOrder, undefined); assert.equal(vm.activeOrdersCount, 0)
	delete order.records.edit; assert.equal(vm.filteredOrders.length, 1); assert.equal(vm.activeOrder, order); assert.equal(vm.activeOrdersCount, 1)
})
check('manager can roll back to payment and replace the original amount', () => {
	const order = fixture('payment-edit', 4)
	const vm = view('manager', [order])
	vm.receipts = [{ id: 'receipt-edit', orderId: order.id, theme: order.theme, operator: '林澈', receivedAt: new Date().toISOString(), date: vm.receiptDate, status: 'active', revisions: [], amounts: { wechat: 10000, alipay: 0, cash: 0, online: 0 } }]
	vm.openCorrection(order); vm.correctionTarget = 'payment'; vm.correctionReason = '收款金额录入错误'; vm.applyCorrection()
	assert.equal(rules.nextOrderStep(order).key, 'payment')
	assert.equal(order.records.payment, undefined); assert.equal(order.records.host, undefined)
	vm.saveOrderPayment(order, { wechat: '88.50', alipay: '', cash: '', online: '' })
	assert.equal(vm.receipts.length, 1); assert.equal(vm.receipts[0].amounts.wechat, 8850); assert.equal(vm.receipts[0].revisions.length, 1)
})
check('manager cancellation reverses the linked receipt', () => {
	const order = fixture('payment-cancel', 3)
	const vm = view('manager', [order])
	vm.receipts = [{ id: 'receipt-cancel', orderId: order.id, theme: order.theme, operator: '林澈', receivedAt: new Date().toISOString(), date: vm.receiptDate, status: 'active', revisions: [], amounts: { wechat: 0, alipay: 0, cash: 5000, online: 0 } }]
	vm.cancelOrder(order)
	assert.equal(order.cancelled, true); assert.equal(vm.receipts[0].status, 'reversed'); assert.equal(vm.dailyReceipts.total, 0)
})
check('reload hides existing completions without losing points or receipts', () => {
	const state = app.createInitialAppState(); state.orders = clone(initial); state.receipts = [{ id: 'receipt', orderId: 'edited', amounts: { cash: 100 } }]
	app.saveAppState(state); const loaded = app.loadAppState()
	assert.equal(rules.filterOrdersForRole(loaded.orders, 'employee').length, 4)
	assert.equal(rules.filterOrdersForRole(loaded.orders, 'manager').length, initial.length)
	assert.equal(loaded.receipts[0].status, 'active'); assert.deepEqual(loaded.receipts[0].amounts, state.receipts[0].amounts)
	assert.deepEqual(new Set(loaded.pointLedger.map(entry => entry.id)), new Set(state.pointLedger.map(entry => entry.id)))
})
console.log(`${count} order visibility checks passed`)
