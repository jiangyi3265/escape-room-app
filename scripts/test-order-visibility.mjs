import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// 用页面真实的脚本做检查；门店系统接口换成可控的假实现（不需要启动后端）。
const fakeApi = `
const calls = globalThis.__apiCalls
export class ApiError extends Error { constructor(message, status = 0) { super(message); this.status = status } }
export function onUnauthorized(handler) { globalThis.__unauthorized = handler }
export function getToken() { return globalThis.__token || '' }
export function setToken(token) { globalThis.__token = token }
export function newRequestId() { return 'req-' + calls.length }
export const storeApi = new Proxy({}, { get: (_, name) => (...args) => {
	calls.push({ name, args })
	const handler = globalThis.__apiHandlers[name]
	if (!handler) return Promise.reject(new ApiError('测试未准备接口 ' + String(name), 500))
	try { return Promise.resolve(handler(...args)) } catch (error) { return Promise.reject(error) }
} })
`
async function moduleUrl(path) {
	if (path.pathname.endsWith('/services/store-api.js')) return `data:text/javascript;base64,${Buffer.from(fakeApi).toString('base64')}`
	let source = await readFile(path, 'utf8')
	if (path.pathname.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/import (\w+) from '[^']+\.vue'/g, 'const $1 = {}')
	for (const match of [...source.matchAll(/from '(\.\.?\/[^']+)'/g)]) source = source.replace(match[0], `from '${await moduleUrl(new URL(match[1], path))}'`)
	return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}

globalThis.__apiCalls = []
globalThis.__apiHandlers = {}
const calls = globalThis.__apiCalls
const handlers = globalThis.__apiHandlers
let storage = {}
let toasts = []
let modalInput = ''
globalThis.uni = {
	getStorageSync: key => storage[key],
	setStorageSync: (key, value) => { storage[key] = value },
	removeStorageSync: key => { delete storage[key] },
	showToast: options => toasts.push(options.title),
	showModal: options => options.success({ confirm: true, content: modalInput })
}

const rules = await import(await moduleUrl(new URL('../services/order-rules.js', import.meta.url)))
const app = await import(await moduleUrl(new URL('../services/app-state.js', import.meta.url)))
const api = await import(await moduleUrl(new URL('../services/store-api.js', import.meta.url)))
const page = (await import(await moduleUrl(new URL('../pages/index/index.vue', import.meta.url)))).default

const clone = value => JSON.parse(JSON.stringify(value))
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const EMPLOYEE = { id: 102, name: '林澈', role: 'employee', status: 'active', phone: '138****0002', grabCount: 1, stepCount: 17, unread: 0 }
const MANAGER = { id: 100, name: '江店长', role: 'manager', status: 'active', phone: '138****0000', grabCount: 0, stepCount: 0, unread: 0 }
let revision = 0
function snapshot(me, state = {}) {
	revision++
	return { version: `${revision}:2026-09-11`, serverTime: '2026-09-11T12:00:00+08:00', store: { name: '零零谷 · 九汇城店', code: 'jiuhuicheng', date: '2026-09-11', utcOffsetMinutes: 480 }, me, state: { ...app.createEmptyAppState(), ...clone(state) } }
}
function fixture(id, count = 0, video = '要视频') {
	const records = {}
	for (const step of rules.ORDER_STEPS.slice(0, count)) records[step.key] = { operator: '林澈', time: '2026-09-11T10:00:00+08:00', ...(step.key === 'video' ? { choice: video } : {}) }
	return { id, theme: `测试${id}`, time: '12:00', people: 4, contact: '', note: '', records, cancelled: false }
}
const initial = [fixture('new'), fixture('active', 4), fixture('editing', 10), fixture('no-video', 10, '不要视频'), fixture('edited', 11), { ...fixture('cancelled', 5), cancelled: true }]
function view(me = EMPLOYEE, orders = clone(initial), extra = {}) {
	const vm = { ...page.data() }
	for (const [key, method] of Object.entries(page.methods)) vm[key] = method.bind(vm)
	for (const [key, computed] of Object.entries(page.computed)) Object.defineProperty(vm, key, { get: () => computed.call(vm), configurable: true })
	vm.applySnapshot(snapshot(me, { orders, ...extra }))
	return vm
}
function reset() { calls.length = 0; toasts = []; modalInput = ''; for (const key of Object.keys(handlers)) delete handlers[key] }
let count = 0
async function check(label, fn) { reset(); await fn(); count++; console.log(`PASS ${label}`) }

await check('employee filters never expose completed orders; pending editing remains visible', () => {
	const vm = view()
	assert.deepEqual(vm.filteredOrders.map(order => order.id), ['new', 'active', 'editing', 'cancelled'])
	vm.orderFilter = 'active'; assert.deepEqual(vm.filteredOrders.map(order => order.id), ['new', 'active'])
	vm.orderFilter = 'editing'; assert.deepEqual(vm.filteredOrders.map(order => order.id), ['editing'])
	vm.orderFilter = 'done'; assert.deepEqual(vm.filteredOrders, [])
	assert.ok(!vm.orderFilters.some(filter => filter.id === 'done'))
})
await check('manager retains completed filter and full history without mutating data', () => {
	const vm = view(MANAGER); const before = JSON.stringify(vm.orders)
	assert.equal(vm.filteredOrders.length, initial.length)
	vm.orderFilter = 'done'; assert.deepEqual(vm.filteredOrders.map(order => order.id), ['no-video', 'edited'])
	assert.ok(vm.orderFilters.some(filter => filter.id === 'done'))
	assert.equal(JSON.stringify(vm.orders), before)
})
await check('employee cannot open, quick-open or edit an already completed order', () => {
	const vm = view(); const order = vm.orders.find(order => order.id === 'edited')
	assert.equal(vm.openOrder(order), false); vm.quickAdvance(order); vm.showOrderForm('edit', order)
	assert.equal(vm.selectedOrder, null); assert.equal(vm.orderFormVisible, false)
	const manager = view(MANAGER); const same = manager.orders.find(order => order.id === 'edited')
	assert.equal(manager.openOrder(same), true); manager.showOrderForm('edit', same); assert.equal(manager.orderFormVisible, true)
})
await check('no-video completion closes employee detail; the order stays in the manager history', async () => {
	const order = fixture('finish', 9); const vm = view(EMPLOYEE, [order])
	handlers.completeStep = () => ({ orderId: 'finish', snapshot: snapshot(EMPLOYEE, { orders: [] }) })
	vm.openOrder(vm.orders[0]); vm.chooseBranch(vm.orders[0], 'video', '不要视频'); await flush()
	assert.deepEqual(calls.map(call => [call.name, ...call.args]), [['completeStep', 'finish', 'video', '不要视频']])
	assert.equal(vm.selectedOrder, null); assert.equal(vm.activeTab, 'orders'); assert.equal(vm.filteredOrders.length, 0)
	assert.equal(toasts.at(-1), '订单已完成，已从员工端隐藏')
	const done = { ...order, records: { ...order.records, video: { operator: '林澈', time: '2026-09-11T10:05:00+08:00', choice: '不要视频' } } }
	const manager = view(MANAGER, [done]); manager.orderFilter = 'done'
	assert.deepEqual(manager.filteredOrders.map(item => item.id), ['finish'])
})
await check('requesting video stays visible until editing is completed', async () => {
	const order = fixture('video', 9); const vm = view(EMPLOYEE, [order])
	const wanted = { ...order, records: { ...order.records, video: { operator: '林澈', time: '2026-09-11T10:05:00+08:00', choice: '要视频' } } }
	handlers.completeStep = (id, key) => key === 'video'
		? { snapshot: snapshot(EMPLOYEE, { orders: [wanted], editingTasks: [{ id: 1, orderId: 'video', status: 'pending' }] }) }
		: { snapshot: snapshot(EMPLOYEE, { orders: [], editingTasks: [] }) }
	vm.openOrder(vm.orders[0]); vm.chooseBranch(vm.orders[0], 'video', '要视频'); await flush()
	assert.equal(vm.selectedOrder.id, 'video'); assert.equal(vm.filteredOrders.length, 1)
	assert.equal(vm.editingTasks[0].status, 'pending')
	vm.completeOrderStep(vm.selectedOrder, rules.ORDER_STEPS.find(step => step.key === 'edit')); await flush()
	assert.deepEqual(calls.map(call => call.args[1]), ['video', 'edit'])
	assert.equal(vm.selectedOrder, null); assert.equal(vm.filteredOrders.length, 0)
})
await check('role switch clears manager completed filter and open completed detail', () => {
	const vm = view(MANAGER); vm.orderFilter = 'done'; vm.openOrder(vm.filteredOrders[0])
	vm.applySnapshot(snapshot(EMPLOYEE, { orders: clone(initial) }))
	page.watch.role.call(vm)
	assert.equal(vm.role, 'employee'); assert.equal(vm.orderFilter, 'all'); assert.equal(vm.selectedOrder, null)
	assert.equal(vm.activeTab, 'orders')
})
await check('stale edit form is closed and cannot save a newly completed order', () => {
	const order = fixture('edit-race', 10); const vm = view(EMPLOYEE, [order])
	vm.showOrderForm('edit', vm.orders[0]); vm.orderForm.note = 'should not save'
	const finished = { ...order, records: { ...order.records, edit: { operator: '江店长', time: '2026-09-11T10:10:00+08:00' } } }
	vm.applySnapshot(snapshot(EMPLOYEE, { orders: [finished] })); page.watch.orders.handler.call(vm)
	assert.equal(vm.orderFormVisible, false)
	vm.saveOrder(); assert.equal(calls.length, 0)
})
await check('home count and card update, manager rollback makes pending order visible again', () => {
	const order = fixture('rollback', 11); const vm = view(EMPLOYEE, [order])
	assert.equal(vm.activeOrder, undefined); assert.equal(vm.activeOrdersCount, 0)
	const reopened = clone(order); delete reopened.records.edit
	vm.applySnapshot(snapshot(EMPLOYEE, { orders: [reopened] }))
	assert.equal(vm.filteredOrders.length, 1); assert.equal(vm.activeOrder.id, 'rollback'); assert.equal(vm.activeOrdersCount, 1)
})
await check('manager can roll back to payment and replace the original amount', async () => {
	const order = fixture('payment-edit', 4)
	const receipt = { id: 9, orderId: order.id, theme: order.theme, operator: '林澈', receivedAt: '2026-09-11T10:00:00+08:00', date: '2026-09-11', status: 'active', revisions: [], amounts: { wechat: 10000, alipay: 0, cash: 0, online: 0 } }
	const vm = view(MANAGER, [order], { receipts: [receipt] })
	const rolledBack = clone(order); delete rolledBack.records.payment; delete rolledBack.records.host
	handlers.correctOrder = () => ({ snapshot: snapshot(MANAGER, { orders: [rolledBack], receipts: [receipt] }) })
	vm.openCorrection(vm.orders[0]); vm.correctionTarget = 'payment'; vm.correctionReason = '收款金额录入错误'; vm.applyCorrection(); await flush()
	assert.deepEqual(calls[0].args, ['payment-edit', 'payment', '收款金额录入错误'])
	assert.equal(rules.nextOrderStep(vm.orders[0]).key, 'payment'); assert.equal(vm.correctionVisible, false)
	const revised = { ...receipt, amounts: { wechat: 8850, alipay: 0, cash: 0, online: 0 }, revisions: [{ amounts: receipt.amounts, adjustedBy: '江店长' }] }
	handlers.recordPayment = () => ({ revised: true, snapshot: snapshot(MANAGER, { orders: [{ ...rolledBack, records: { ...rolledBack.records, payment: { operator: '江店长', time: '2026-09-11T11:00:00+08:00', receiptId: 9 } } }], receipts: [revised] }) })
	vm.saveOrderPayment(vm.orders[0], { wechat: '88.50', alipay: '', cash: '', online: '' }); await flush()
	assert.deepEqual(calls[1].args, ['payment-edit', { wechat: '88.50', alipay: '', cash: '', online: '' }])
	assert.equal(vm.receipts.length, 1); assert.equal(vm.receipts[0].amounts.wechat, 8850); assert.equal(vm.receipts[0].revisions.length, 1)
	assert.equal(toasts.at(-1), '收款金额已修改')
})
await check('manager cancellation reverses the linked receipt', async () => {
	const order = fixture('payment-cancel', 3)
	const receipt = { id: 10, orderId: order.id, date: '2026-09-11', status: 'active', revisions: [], amounts: { wechat: 0, alipay: 0, cash: 5000, online: 0 } }
	const report = total => ({ date: '2026-09-11', label: '9月11日', today: { date: '2026-09-11', wechat: 0, alipay: 0, cash: total, total, count: total ? 1 : 0 }, days: [] })
	const vm = view(MANAGER, [order], { receipts: [receipt], receiptReport: report(5000) })
	assert.equal(vm.dailyReceipts.total, 5000)
	modalInput = '玩家临时取消'
	handlers.cancelOrder = () => ({ reversed: true, snapshot: snapshot(MANAGER, { orders: [{ ...order, cancelled: true, cancelReason: '玩家临时取消' }], receipts: [{ ...receipt, status: 'reversed' }], receiptReport: report(0) }) })
	vm.cancelOrder(vm.orders[0]); await flush()
	assert.deepEqual(calls[0].args, ['payment-cancel', '玩家临时取消'])
	assert.equal(vm.orders[0].cancelled, true); assert.equal(vm.receipts[0].status, 'reversed'); assert.equal(vm.dailyReceipts.total, 0)
	assert.equal(toasts.at(-1), '订单已取消，收款已冲正')
})
await check('reload shows the cached data at once, then refreshes from the store system', async () => {
	storage = {}
	const cached = view(EMPLOYEE, clone(initial), { pointLedger: [{ id: 1, employeeId: 102, employee: '林澈', title: '及时带场', points: 2, state: '已到账', occurredAt: new Date().toISOString() }] })
	assert.ok(storage['escape-room-store-cache'], '整包数据已缓存')
	api.setToken('token-1')
	handlers.sync = () => snapshot(EMPLOYEE, { orders: clone(initial).slice(0, 2) })
	const vm = { ...page.data() }
	for (const [key, method] of Object.entries(page.methods)) vm[key] = method.bind(vm)
	for (const [key, computed] of Object.entries(page.computed)) Object.defineProperty(vm, key, { get: () => computed.call(vm), configurable: true })
	const pending = vm.restoreSession()
	assert.equal(vm.me.name, '林澈', '先显示缓存')
	assert.equal(rules.filterOrdersForRole(vm.orders, 'employee').length, 4)
	assert.equal(vm.employeePointLedger.length, 1)
	await pending
	assert.equal(vm.orders.length, 2, '再换成门店系统的最新数据'); assert.equal(vm.sessionChecked, true)
	vm.stopPolling(); api.setToken(''); void cached
})
await check('an older refresh never overwrites a newer result', () => {
	const vm = view(EMPLOYEE, [fixture('a')])
	const newer = snapshot(EMPLOYEE, { orders: [fixture('b')] })
	const older = { ...snapshot(EMPLOYEE, { orders: [fixture('stale')] }), version: '1:2026-09-11' }
	assert.equal(vm.applySnapshot(newer), true); assert.equal(vm.applySnapshot(older), false)
	assert.deepEqual(vm.orders.map(order => order.id), ['b'])
})
await check('login stores the token and opens the right side for the account', async () => {
	storage = {}
	const vm = { ...page.data() }
	for (const [key, method] of Object.entries(page.methods)) vm[key] = method.bind(vm)
	for (const [key, computed] of Object.entries(page.computed)) Object.defineProperty(vm, key, { get: () => computed.call(vm), configurable: true })
	vm.loginForm = { phone: '138 0000 0000', password: 'secret' }
	handlers.login = () => ({ token: 'manager-token', me: MANAGER })
	handlers.sync = () => snapshot(MANAGER, { orders: clone(initial) })
	// 没勾选协议时不登录（微信要求收集手机号前先取得同意）
	await vm.login()
	assert.equal(calls.length, 0, '未同意协议时不应该调用登录接口')
	assert.equal(toasts.at(-1), '请先阅读并同意协议')
	vm.agreed = true
	await vm.login()
	assert.deepEqual(calls[0].args, ['13800000000', 'secret'])
	assert.equal(api.getToken(), 'manager-token')
	assert.equal(vm.role, 'manager'); assert.equal(vm.activeTab, 'dashboard'); assert.equal(vm.myName, '江店长')
	assert.equal(vm.loginForm.password, '', '登录后清空密码')
	assert.equal(vm.orders.length, initial.length)
	vm.stopPolling()
	vm.loginForm = { phone: '123', password: 'x' }; await vm.login(); assert.equal(toasts.at(-1), '请填写11位手机号')
})
await check('expired login clears the store data and shows the login form', () => {
	const vm = view(MANAGER); vm.openOrder(vm.orders[0]); vm.notificationsVisible = true
	api.setToken('old'); vm.handleSessionExpired('登录已失效，请重新登录')
	assert.equal(vm.me, null); assert.equal(vm.orders.length, 0); assert.equal(vm.selectedOrder, null); assert.equal(vm.notificationsVisible, false)
	assert.equal(api.getToken(), ''); assert.equal(storage['escape-room-store-cache'], undefined)
	assert.equal(toasts.at(-1), '登录已失效，请重新登录')
})
await check('employee and manager actions send the right requests', async () => {
	const employee = view(EMPLOYEE, [], { tasks: [{ id: 5, title: '及时带场', points: 2, category: '接待', audit: false }], jobs: [{ id: 3, title: '补充饮用水', status: 'open', restricted: false, allowedEmployees: [], allowedEmployeeIds: [] }], themes: [{ id: 1, name: '开学悸' }] })
	handlers.completeTask = () => ({ audit: false, points: 2, snapshot: snapshot(EMPLOYEE, { employeePoints: 188 }) })
	employee.tapPointTask(employee.tasks[0]); await flush()
	assert.equal(calls[0].name, 'completeTask'); assert.equal(calls[0].args[0], 5); assert.match(calls[0].args[1], /^req-/)
	assert.equal(employee.employeePoints, 188); assert.equal(toasts.at(-1), '+2 积分')
	handlers.grabJob = () => ({ snapshot: snapshot(EMPLOYEE, { themes: [{ id: 1, name: '开学悸' }] }) })
	employee.applySnapshot(snapshot(EMPLOYEE, { jobs: [{ id: 3, title: '补充饮用水', status: 'open', restricted: false, allowedEmployees: [], allowedEmployeeIds: [] }], themes: [{ id: 1, name: '开学悸' }] }))
	employee.grabJob(employee.jobs[0]); await flush()
	assert.deepEqual(calls[1], { name: 'grabJob', args: [3] })
	handlers.createOrder = () => ({ orderId: 7, snapshot: snapshot(EMPLOYEE, { themes: [{ id: 1, name: '开学悸' }] }) })
	employee.showOrderForm('create'); Object.assign(employee.orderForm, { time: '20:00', people: 5, contact: '陈女士', note: '怕黑' })
	employee.saveOrder(); await flush()
	assert.equal(calls[2].name, 'createOrder')
	assert.deepEqual({ ...calls[2].args[0], requestId: undefined }, { theme: '开学悸', time: '20:00', people: '5', contact: '陈女士', note: '怕黑', requestId: undefined })
	assert.equal(employee.orderFormVisible, false)

	const manager = view(MANAGER, [], { ranking: [{ id: 101, name: '周言', points: 214, tasks: 38, status: 'active' }, { id: 102, name: '林澈', points: 186, tasks: 32, status: 'active' }] })
	handlers.publishJob = form => ({ snapshot: snapshot(MANAGER, { ranking: manager.ranking }), form })
	Object.assign(manager.jobForm, { title: '检查消防通道', description: '确认通道畅通', restricted: true, allowedEmployees: ['林澈'] })
	manager.publishJob(); await flush()
	const form = calls[3].args[0]
	assert.deepEqual([form.title, form.restricted, form.allowedStaffIds], ['检查消防通道', true, [102]])
	assert.equal(manager.jobForm.title, '', '发布成功后清空表单')
})
await check('a failed submission keeps the form open and shows the store message', async () => {
	const vm = view(EMPLOYEE, [], { themes: [{ id: 1, name: '开学悸' }] })
	handlers.createOrder = () => { throw new api.ApiError('主题已变更，请重新选择', 400) }
	vm.showOrderForm('create'); Object.assign(vm.orderForm, { time: '20:00', people: '3' })
	vm.saveOrder(); await flush()
	assert.equal(vm.orderFormVisible, true)
	assert.equal(toasts.at(-1), '主题已变更，请重新选择')
	assert.equal(vm.busy, false)
})
await check('double taps are ignored while a submission is in flight', async () => {
	const vm = view(EMPLOYEE, [], { tasks: [{ id: 5, title: '及时带场', points: 2, category: '接待', audit: false }] })
	let release
	handlers.completeTask = () => new Promise(resolve => { release = resolve })
	vm.tapPointTask(vm.tasks[0]); vm.tapPointTask(vm.tasks[0]); await flush()
	assert.equal(calls.filter(call => call.name === 'completeTask').length, 1)
	assert.equal(toasts.at(-1), '正在处理上一步，请稍候')
	release({ audit: true, points: 4, snapshot: snapshot(EMPLOYEE, {}) }); await flush()
	assert.equal(vm.busy, false); assert.equal(toasts.at(-1), '已提交店长审核')
})
console.log(`${count} order visibility checks passed`)
