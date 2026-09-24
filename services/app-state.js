import { localDateKey } from './time-format.js'
import { normalizePointEntry, prunePointLedger } from './points-rules.js'

// 门店数据以后端为准。这里负责两件事：
// 1. 把后端返回的整包数据整理成页面使用的结构（字段与原单机版一致）；
// 2. 在本机缓存最近一次的数据，打开小程序时先显示，再静默刷新（弱网时不白屏）。
const CACHE_KEY = 'escape-room-store-cache'
const SCHEMA_VERSION = 6

export const STATE_KEYS = [
	'receipts',
	'themes',
	'repairs',
	'employeePoints',
	'todayPoints',
	'lastPointDate',
	'tasks',
	'pointLedger',
	'ranking',
	'jobs',
	'orders',
	'editingTasks',
	'pendingAudits',
	'auditHistory',
	'notifications',
	'wechatSubscriptionEnabled',
	'receiptReport'
]

const list = value => (Array.isArray(value) ? value : [])

export function createEmptyAppState() {
	return {
		receipts: [],
		themes: [],
		repairs: [],
		employeePoints: 0,
		todayPoints: 0,
		lastPointDate: localDateKey(),
		tasks: [],
		pointLedger: [],
		ranking: [],
		jobs: [],
		orders: [],
		editingTasks: [],
		pendingAudits: [],
		auditHistory: [],
		notifications: [],
		wechatSubscriptionEnabled: false,
		receiptReport: null
	}
}

/** 把后端整包里的 state 整理成页面结构，缺失的字段给出安全的默认值 */
export function normaliseSnapshotState(source, reference = new Date()) {
	const saved = source || {}
	const result = createEmptyAppState()
	for (const key of STATE_KEYS) {
		if (saved[key] !== undefined && saved[key] !== null) result[key] = saved[key]
	}
	result.receipts = list(result.receipts).map(receipt => ({
		status: 'active',
		...receipt,
		amounts: { wechat: 0, alipay: 0, cash: 0, online: 0, ...(receipt.amounts || {}) },
		revisions: list(receipt.revisions)
	}))
	result.themes = list(result.themes).map(theme => ({ deleted: false, ...theme }))
	result.repairs = list(result.repairs)
	result.tasks = list(result.tasks).map(task => ({ count: 0, audit: false, ...task }))
	result.pointLedger = prunePointLedger(list(result.pointLedger).map(entry => normalizePointEntry(entry, reference)), reference)
	result.ranking = list(result.ranking).map(person => ({ status: 'active', points: 0, tasks: 0, ...person }))
	result.jobs = list(result.jobs).map(job => ({
		restricted: false,
		claimedBy: '',
		...job,
		allowedEmployees: list(job.allowedEmployees),
		allowedEmployeeIds: list(job.allowedEmployeeIds)
	}))
	result.orders = list(result.orders).map(order => ({ cancelled: false, contact: '', note: '', ...order, records: order.records || {} }))
	result.editingTasks = list(result.editingTasks)
	result.pendingAudits = list(result.pendingAudits)
	result.auditHistory = list(result.auditHistory)
	result.notifications = list(result.notifications)
	result.employeePoints = Number(result.employeePoints) || 0
	result.todayPoints = Number(result.todayPoints) || 0
	result.wechatSubscriptionEnabled = result.wechatSubscriptionEnabled === true
	if (!result.lastPointDate) result.lastPointDate = localDateKey(reference)
	return result
}

/** 数据版本「修订号:门店日期」，修订号只增不减 */
export function parseVersion(version) {
	const [revision, date] = String(version || '').split(':')
	const number = Number(revision)
	return { revision: Number.isFinite(number) ? number : 0, date: date || '' }
}

/** 新数据是否不比当前的旧（防止较早发出的刷新覆盖刚操作完的结果） */
export function isSameOrNewerVersion(next, current) {
	if (!current) return true
	return parseVersion(next).revision >= parseVersion(current).revision
}

export function loadCachedSnapshot() {
	try {
		const payload = uni.getStorageSync(CACHE_KEY)
		if (!payload || payload.version !== SCHEMA_VERSION || !payload.snapshot?.state || !payload.snapshot?.me) return null
		return payload.snapshot
	} catch (error) {
		console.warn('[app-state] 读取本机缓存失败，将从门店系统重新获取', error)
		return null
	}
}

export function saveCachedSnapshot(snapshot) {
	if (!snapshot?.state || !snapshot?.me) return false
	try {
		uni.setStorageSync(CACHE_KEY, { version: SCHEMA_VERSION, savedAt: Date.now(), snapshot })
		return true
	} catch (error) {
		console.warn('[app-state] 保存本机缓存失败', error)
		return false
	}
}

export function clearCachedSnapshot() {
	try { uni.removeStorageSync(CACHE_KEY) } catch { /* 忽略 */ }
}
