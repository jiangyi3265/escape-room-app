import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// 门店端页面脚本 + 真实门店后端的联调检查：员工和店长两台「手机」同时在线，互相看到对方的操作。
// 需要先启动后端。环境变量：
//   STORE_API_BASE   后端地址（默认 http://127.0.0.1:8087）
//   STORE_RESET=1    开始前重置演示数据（调用 ../RuoYi-Vue/scripts/escape_db.py demo --dev，可配 DB_NAME / REDIS_DATABASE）
const BASE = (process.env.STORE_API_BASE || 'http://127.0.0.1:8087').replace(/\/+$/, '')
const backendScript = fileURLToPath(new URL('../../RuoYi-Vue/scripts/escape_db.py', import.meta.url))
if (process.env.STORE_RESET === '1') {
	if (!existsSync(backendScript)) throw new Error('找不到后端的演示数据脚本 ' + backendScript)
	execFileSync('python', [backendScript, 'demo', '--dev'], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, stdio: 'pipe' })
}

async function moduleUrl(path) {
	let source = await readFile(path, 'utf8')
	if (path.pathname.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/import (\w+) from '[^']+\.vue'/g, 'const $1 = {}')
	for (const match of [...source.matchAll(/from '(\.\.?\/[^']+)'/g)]) source = source.replace(match[0], `from '${await moduleUrl(new URL(match[1], path))}'`)
	return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}

// 每台「手机」有自己的本机存储；uni.request 用 fetch 实现，/store-api 前缀按 H5 代理规则转到后端
let device = null
const toasts = []
const modals = []
const modalInputs = []
globalThis.uni = {
	getStorageSync: key => device.storage[key],
	setStorageSync: (key, value) => { device.storage[key] = value },
	removeStorageSync: key => { delete device.storage[key] },
	showToast: options => toasts.push(options.title),
	showModal: options => { modals.push(options); options.success({ confirm: true, content: modalInputs.length ? modalInputs.shift() : '' }) },
	request: options => {
		const url = options.url.startsWith('/store-api') ? BASE + options.url.slice('/store-api'.length) : options.url
		const body = options.method === 'GET' || options.data === undefined ? undefined : JSON.stringify(options.data)
		fetch(url, { method: options.method, headers: options.header, body })
			.then(async response => options.success({ statusCode: response.status, data: await response.json().catch(() => ({})) }))
			.catch(error => options.fail(error))
	}
}

const page = (await import(await moduleUrl(new URL('../pages/index/index.vue', import.meta.url)))).default
const rules = await import(await moduleUrl(new URL('../services/order-rules.js', import.meta.url)))
const api = await import(await moduleUrl(new URL('../services/store-api.js', import.meta.url)))

const devices = []
function phone(label) {
	const vm = { ...page.data(), __storage: {} }
	const self = { label, storage: vm.__storage, vm }
	for (const [key, method] of Object.entries(page.methods)) vm[key] = (...args) => { device = self; return method.apply(vm, args) }
	for (const [key, computed] of Object.entries(page.computed)) Object.defineProperty(vm, key, { get: () => { device = self; return computed.call(vm) }, configurable: true })
	devices.push(self)
	return vm
}
const settle = async (ms = 80) => { for (let i = 0; i < 40; i++) { await new Promise(resolve => setTimeout(resolve, ms)); if (!devices.some(d => d.vm.busy || d.vm.syncing)) return } }
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || '123456' // 本机演示数据的默认密码
async function login(vm, phoneNumber, password = STAFF_PASSWORD) {
	vm.loginForm = { phone: phoneNumber, password }
	await vm.login()
	vm.stopPolling()
	assert.ok(vm.me, `${phoneNumber} 登录失败：${toasts.at(-1)}`)
}
async function refresh(vm) { await vm.refresh(true); await settle() }

let count = 0
async function check(label, fn) { await fn(); count++; console.log(`PASS ${label}`) }

const employee = phone('林澈的手机')
const manager = phone('店长的手机')

await check('两台手机分别登录：员工进首页、店长进概览', async () => {
	await login(employee, '13800000002')
	await login(manager, '13800000000')
	assert.equal(employee.role, 'employee'); assert.equal(employee.activeTab, 'home'); assert.equal(employee.myName, '林澈')
	assert.equal(manager.role, 'manager'); assert.equal(manager.activeTab, 'dashboard'); assert.equal(manager.myName, '江店长')
	assert.equal(employee.storeName, '零零谷 · 九汇城店')
	assert.equal(employee.tasks.length, 32)
	assert.ok(employee.activeOrdersCount >= 2)
	assert.equal(manager.sevenDayReceipts.length, 7)
})

await check('员工完成普通任务：店长手机上的排行同步更新', async () => {
	const before = manager.rankedStaff.find(person => person.id === employee.myId).points
	employee.tapPointTask(employee.tasks.find(task => task.title === '及时带场')); await settle()
	assert.equal(employee.employeePoints, before + 2)
	await refresh(manager)
	assert.equal(manager.rankedStaff.find(person => person.id === employee.myId).points, before + 2)
})

await check('员工提交打扫任务，店长审核通过后员工积分到账', async () => {
	const before = employee.employeePoints
	employee.tapPointTask(employee.tasks.find(task => task.title === '打扫1个玩家储藏柜')); await settle()
	await refresh(manager)
	const audit = manager.pendingAudits.at(-1)
	assert.equal(audit.employee, '林澈')
	manager.approveAudit(audit); await settle()
	assert.equal(manager.auditHistory[0].id, audit.id)
	await refresh(employee)
	assert.equal(employee.employeePoints, before + 4)
	assert.equal(employee.notifications[0].title, '打扫任务审核通过')
})

let orderId
await check('员工创建订单并推进到收钱，店长当日收款同步增加', async () => {
	const totalBefore = manager.dailyReceipts.total
	employee.showOrderForm('create'); Object.assign(employee.orderForm, { theme: '开学悸', time: '20:00', people: '5', contact: '陈女士', note: '联调测试' })
	employee.saveOrder(); await settle()
	const order = employee.orders.find(item => item.note === '联调测试')
	assert.ok(order, '员工端出现新订单'); orderId = order.id
	for (const key of ['start', 'openReset']) {
		employee.completeOrderStep(employee.orders.find(item => item.id === orderId), rules.ORDER_STEPS.find(step => step.key === key)); await settle()
	}
	const current = employee.orders.find(item => item.id === orderId)
	assert.equal(rules.nextOrderStep(current).key, 'payment')
	employee.openOrder(current)
	employee.saveOrderPayment(current, { wechat: '100.10', alipay: '50.20', cash: '20', online: '300' }); await settle()
	assert.equal(employee.selectedOrder.records.payment.operator, '林澈')
	assert.equal(employee.receiptFor(employee.selectedOrder).amounts.wechat, 10010)
	await refresh(manager)
	assert.equal(manager.dailyReceipts.total - totalBefore, 17030)
	assert.ok(manager.orders.some(item => item.id === orderId))
	assert.ok(manager.notifications.some(item => item.detail === '林澈 创建“开学悸” 20:00 场次'))
})

await check('店长回退到收钱，员工手机刷新后修改原金额，不产生重复收款', async () => {
	manager.openOrder(manager.orders.find(item => item.id === orderId))
	manager.openCorrection(manager.selectedOrder)
	manager.correctionTarget = 'payment'; manager.correctionReason = '金额录错'
	manager.applyCorrection(); await settle()
	await refresh(employee)
	const order = employee.selectedOrder
	assert.equal(order.id, orderId, '员工正在看的订单自动换成最新数据')
	assert.equal(rules.nextOrderStep(order).key, 'payment')
	employee.saveOrderPayment(order, { cash: '999' }); await settle()
	assert.equal(toasts.at(-1), '收款金额已修改')
	await refresh(manager)
	const receipts = manager.receipts.filter(item => item.orderId === orderId)
	assert.equal(receipts.length, 1); assert.equal(receipts[0].amounts.cash, 99900); assert.equal(receipts[0].revisions.length, 1)
})

await check('店长发布限定任务：只有被选中的员工手机上看得到，抢到后店长看到结果', async () => {
	Object.assign(manager.jobForm, { title: '联调任务', description: '检查三号房机关', restricted: true, allowedEmployees: ['林澈'] })
	manager.activeTab = 'publish'; manager.publishJob(); await settle()
	const zhou = phone('周言的手机'); await login(zhou, '13800000001')
	assert.ok(!zhou.openJobs.some(job => job.title === '联调任务'))
	await refresh(employee)
	const job = employee.openJobs.find(item => item.title === '联调任务')
	assert.ok(job)
	employee.grabJob(job); await settle()
	assert.equal(toasts.at(-1), '抢单成功')
	assert.ok(employee.visibleJobs.length >= 0)
	employee.jobView = 'mine'
	assert.ok(employee.visibleJobs.some(item => item.id === job.id))
	await refresh(manager)
	const published = manager.jobs.find(item => item.id === job.id)
	assert.equal(published.status, 'ended'); assert.equal(published.claimedBy, '林澈')
})

await check('店长取消订单：员工手机上的订单变为已取消，收款冲正', async () => {
	modalInputs.push('玩家临时取消')
	manager.cancelOrder(manager.orders.find(item => item.id === orderId)); await settle()
	assert.equal(toasts.at(-1), '订单已取消，收款已冲正')
	await refresh(employee)
	assert.equal(employee.orders.find(item => item.id === orderId).cancelled, true)
	assert.equal(employee.orderStatus(employee.orders.find(item => item.id === orderId)), '已取消')
})

await check('员工登记维修（维修面板），店长手机上待维修数同步', async () => {
	const before = manager.pendingRepairCount
	const result = await employee.workspaceActions.createRepair({ themeId: employee.themes[0].id, problem: '联调：门锁卡顿' })
	employee.saveWorkspaceChange('已登记待维修', result)
	assert.ok(employee.repairs.some(repair => repair.problem === '联调：门锁卡顿'))
	await refresh(manager)
	assert.equal(manager.pendingRepairCount, before + 1)
})

let newStaffPassword
await check('店长添加员工，新员工用初始密码登录并修改密码', async () => {
	const suffix = String(Date.now()).slice(-8)
	modalInputs.push(`联调${suffix.slice(-4)}`, `139${suffix}`)
	manager.addStaff(); await new Promise(resolve => setTimeout(resolve, 400)); await settle()
	const result = modals.at(-1)
	assert.equal(result.title, '员工添加成功')
	newStaffPassword = result.content.match(/初始密码：(\d{6})/)[1]
	const newbie = phone('新员工的手机')
	await login(newbie, `139${suffix}`, newStaffPassword)
	assert.equal(newbie.role, 'employee')
	newbie.openPasswordForm(); Object.assign(newbie.passwordForm, { oldPassword: newStaffPassword, newPassword: 'newbie-2026', confirmPassword: 'newbie-2026' })
	newbie.submitPassword(); await settle()
	assert.equal(toasts.at(-1), '密码已修改'); assert.equal(newbie.passwordVisible, false)
	await refresh(newbie)
	assert.ok(newbie.me, '修改密码后本机仍保持登录')
	const again = phone('新员工的另一台手机'); await login(again, `139${suffix}`, 'newbie-2026')
	// 店长停用后，员工手机下次同步即退出登录
	manager.openStaffManagement('manage')
	await refresh(manager)
	manager.toggleStaffStatus(manager.ranking.find(person => person.name === `联调${suffix.slice(-4)}`)); await settle()
	api.onUnauthorized(message => newbie.handleSessionExpired(message))
	await newbie.refresh(true); await settle()
	assert.equal(newbie.me, null, '停用后自动退出登录')
	assert.equal(toasts.at(-1), '登录已失效，请重新登录')
})

await check('退出登录清空本机数据', async () => {
	employee.confirmLogout()
	for (let i = 0; i < 40 && employee.me; i++) await new Promise(resolve => setTimeout(resolve, 50))
	assert.equal(employee.me, null)
	assert.equal(employee.orders.length, 0)
	assert.equal(employee.__storage['escape-room-store-token'], undefined)
	assert.equal(employee.__storage['escape-room-store-cache'], undefined)
})

console.log(`${count} live store checks passed against ${BASE}`)
