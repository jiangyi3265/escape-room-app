import { initialThemes } from './store-config.js'
import { timestampFromLegacyParts } from './time-format.js'
import { normalizePointEntry, prunePointLedger } from './points-rules.js'

const STORAGE_KEY = 'escape-room-store-state'
const SCHEMA_VERSION = 5

const TASK_SEED = [
	['主动接客户预约或跟老板联系过', 2, '接待', false],
	['主动接客户没有预约或联系过的，不玩', 2, '接待', false],
	['主动接客户没有预约或联系过的，玩', 4, '接待', false],
	['收钱并备注', 3, '接待', false],
	['及时带场', 2, '接待', false],
	['远距离接送玩家', 2, '服务', false],
	['主动建群，及时帮玩家拿到储藏物品', 2, '服务', false],
	['及时关闭主题机关/空调（间隔3小时以内不用关空调）', 2, '维护', false],
	['主动充对讲机、电棍', 2, '维护', false],
	['游戏结束整理场内物品，发现垃圾及时清理', 3, '整理', false],
	['发现损坏及时反馈问题（仅反馈）', 2, '维护', false],
	['发现损坏及时反馈，并自己修好或在老板指导下修好', 6, '维护', false],
	['主动补充损坏的线索、道具', 4, '维护', false],
	['打扫1个玩家储藏柜', 4, '打扫', true],
	['打扫《夜半歌声》并通过检查', 14, '打扫', true],
	['打扫《纸人回魂》并通过检查', 11, '打扫', true],
	['打扫《雾都来信》并通过检查', 11, '打扫', true],
	['打扫《七号病房》并通过检查', 11, '打扫', true],
	['打扫《旧校舍》并通过检查', 8, '打扫', true],
	['打扫《失落航班》并通过检查', 8, '打扫', true],
	['打扫《镜中人》并通过检查', 8, '打扫', true],
	['打扫《诡宅》并通过检查', 5, '打扫', true],
	['打扫《无人生还》并通过检查', 5, '打扫', true],
	['整理前台及场控室', 2, '整理', false],
	['拍摄短视频投稿（拍摄者）', 4, '视频', false],
	['拍摄短视频投稿（入镜者）', 12, '视频', false],
	['剪辑拼接视频一个', 2, '视频', false],
	['当天视频当天全部剪辑完', 3, '视频', false],
	['值日生及时收拾好玩家桌面', 2, '整理', false],
	['工作中得到玩家认可', 8, '服务', false],
	['反馈玩家的意见建议', 4, '服务', false],
	['提早到店', 2, '出勤', false]
]

const PERSISTED_KEYS = [
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
	'wechatSubscriptionEnabled'
]

function clone(value) {
	return JSON.parse(JSON.stringify(value))
}

function localDateKey(date = new Date()) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function createInitialAppState() {
	const at = (day, clock) => timestampFromLegacyParts(day, clock)
	return {
		receipts: [],
		themes: initialThemes(),
		repairs: [],
		employeePoints: 186,
		todayPoints: 16,
		lastPointDate: localDateKey(),
		tasks: TASK_SEED.map((item, index) => ({
			id: index + 1,
			title: item[0],
			points: item[1],
			category: item[2],
			audit: item[3],
			count: index < 5 ? index % 3 : 0
		})),
		pointLedger: [
			{ id: 1, employee: '林澈', occurredAt: at('今天', '20:42'), title: '及时带场', points: 2, state: '已到账', source: 'task' },
			{ id: 2, employee: '林澈', occurredAt: at('今天', '19:16'), title: '收钱并备注', points: 3, state: '已到账', source: 'task' },
			{ id: 1002, employee: '林澈', occurredAt: at('今天', '18:35'), title: '打扫《夜半歌声》并通过检查', points: 14, state: '待审核', source: 'audit' },
			{ id: 4, employee: '林澈', occurredAt: at('昨天', '23:08'), title: '当天视频当天全部剪辑完', points: 3, state: '已到账', source: 'task' },
			{ id: 5, employee: '周言', occurredAt: at('今天', '18:20'), title: '打扫1个玩家储藏柜', points: 4, state: '已到账', source: 'audit' }
		],
		ranking: [
			{ id: 'staff-zhouyan', name: '周言', points: 214, tasks: 38, status: 'active' },
			{ id: 'staff-linche', name: '林澈', points: 186, tasks: 32, status: 'active' },
			{ id: 'staff-xuzhixia', name: '许知夏', points: 171, tasks: 29, status: 'active' },
			{ id: 'staff-chenmo', name: '陈默', points: 149, tasks: 26, status: 'active' },
			{ id: 'staff-gaoye', name: '高野', points: 122, tasks: 21, status: 'active' },
			{ id: 'staff-tangning', name: '唐宁', points: 103, tasks: 18, status: 'active' }
		],
		jobs: [
			{ id: 1, title: '补充前台饮用水', description: '仓库取两箱水放到前台储物区，今晚营业结束前完成。', urgency: 'normal', publishedAt: at('今天', '20:18'), deadline: '23:00', status: 'open', claimedBy: '', restricted: false, allowedEmployees: [] },
			{ id: 2, title: '检查《纸人回魂》3号机关', description: '玩家反馈触发偶尔延迟，先检查电源和感应器。', urgency: 'urgent', publishedAt: at('今天', '19:46'), deadline: '21:30', status: 'open', claimedBy: '', restricted: false, allowedEmployees: [] },
			{ id: 3, title: '整理昨日客户视频', description: '将三个订单的视频按主题放入对应文件夹。', urgency: 'low', publishedAt: at('昨天', '18:40'), deadline: '', status: 'ended', claimedBy: '林澈', claimedAt: at('昨天', '18:44'), restricted: false, allowedEmployees: [] }
		],
		orders: [
			{ id: 1, theme: '夜半歌声', time: '21:30', people: 6, contact: '王女士 138****2041', note: '生日场，结束后拍合照', creator: '林澈', createdAt: at('今天', '20:45'), cancelled: false, records: { start: { operator: '林澈', time: at('今天', '20:51') }, openReset: { operator: '周言', time: at('今天', '20:58') }, payment: { operator: '林澈', time: at('今天', '21:05') }, host: { operator: '许知夏', time: at('今天', '21:12') } } },
			{ id: 2, theme: '纸人回魂', time: '22:10', people: 4, contact: '赵先生 186****5170', note: '首次体验恐怖主题', creator: '许知夏', createdAt: at('今天', '21:18'), cancelled: false, records: { start: { operator: '许知夏', time: at('今天', '21:24') }, openReset: { operator: '陈默', time: at('今天', '21:31') }, payment: { operator: '许知夏', time: at('今天', '21:36') }, host: { operator: '陈默', time: at('今天', '21:42') }, entry: { operator: '陈默', time: at('今天', '21:48') }, gameStart: { operator: '许知夏', time: at('今天', '21:52') } } },
			{ id: 3, theme: '雾都来信', time: '19:00', people: 7, contact: '刘同学 151****6632', note: '', creator: '周言', createdAt: at('今天', '18:24'), cancelled: false, records: { start: { operator: '周言', time: at('今天', '18:30') }, openReset: { operator: '林澈', time: at('今天', '18:38') }, payment: { operator: '周言', time: at('今天', '18:46') }, host: { operator: '林澈', time: at('今天', '18:52') }, entry: { operator: '周言', time: at('今天', '18:58') }, gameStart: { operator: '周言', time: at('今天', '19:01') }, gameEnd: { operator: '周言', time: at('今天', '20:34') }, closeReset: { operator: '林澈', time: at('今天', '20:46') }, photo: { operator: '林澈', time: at('今天', '20:48'), choice: '要拍照' }, video: { operator: '林澈', time: at('今天', '20:49'), choice: '要视频' } } }
		],
		editingTasks: [
			{ id: 'edit-3', orderId: 3, theme: '雾都来信', createdAt: at('今天', '20:49'), status: 'pending' }
		],
		pendingAudits: [
			{ id: 1001, employee: '周言', title: '打扫《纸人回魂》并通过检查', points: 11, submittedAt: at('今天', '20:06') },
			{ id: 1002, employee: '林澈', title: '打扫《夜半歌声》并通过检查', points: 14, submittedAt: at('今天', '20:35') }
		],
		auditHistory: [
			{ id: 1, employee: '许知夏', title: '打扫1个玩家储藏柜', time: at('今天', '18:20'), result: 'approved' },
			{ id: 2, employee: '陈默', title: '打扫《旧校舍》并通过检查', time: at('昨天', '23:15'), result: 'rejected' }
		],
		notifications: [
			{ id: 1, title: '开始带场建群', detail: '许知夏开始处理「夜半歌声」带场和建群', time: at('今天', '21:12'), type: 'order', icon: '→', read: false },
			{ id: 2, title: '订单已创建', detail: '林澈创建「夜半歌声」21:30 场次', time: at('今天', '20:49'), type: 'info', icon: '＋', read: false },
			{ id: 3, title: '打扫任务待审核', detail: '周言提交「纸人回魂」打扫任务', time: at('今天', '20:06'), type: 'audit', icon: '✓', read: false },
			{ id: 4, title: '临时任务已被抢到', detail: '林澈抢到「整理昨日客户视频」', time: at('昨天', '18:44'), type: 'job', icon: '⚡', read: true }
		],
		wechatSubscriptionEnabled: false
	}
}

function normaliseState(saved, updatedAt) {
	const defaults = createInitialAppState()
	const result = { ...defaults }
	for (const key of PERSISTED_KEYS) {
		if (saved && saved[key] !== undefined) result[key] = saved[key]
	}
	if (!Array.isArray(result.editingTasks)) result.editingTasks = []
	if (!Array.isArray(result.themes)) result.themes = initialThemes()
	if (!Array.isArray(result.repairs)) result.repairs = []
	if (!Array.isArray(result.receipts)) result.receipts = []
	result.receipts = result.receipts.map(receipt => ({ status: 'active', revisions: [], ...receipt, revisions: Array.isArray(receipt.revisions) ? receipt.revisions : [] }))
	result.pointLedger = prunePointLedger((Array.isArray(result.pointLedger) ? result.pointLedger : []).map(entry => normalizePointEntry(entry)))
	result.ranking = result.ranking.map((person, index) => ({
		id: person.id || `staff-${index + 1}-${person.name}`,
		status: person.status || 'active',
		...person
	}))
	result.jobs = result.jobs.map(job => ({
		restricted: false,
		allowedEmployees: [],
		...job,
		allowedEmployees: Array.isArray(job.allowedEmployees) ? job.allowedEmployees : []
	}))
	if (typeof result.wechatSubscriptionEnabled !== 'boolean') result.wechatSubscriptionEnabled = false
	if (!saved?.lastPointDate) {
		const lastSavedDate = updatedAt ? new Date(updatedAt) : new Date()
		result.lastPointDate = Number.isNaN(lastSavedDate.getTime()) ? localDateKey() : localDateKey(lastSavedDate)
	}
	return result
}

export function loadAppState() {
	try {
		const payload = uni.getStorageSync(STORAGE_KEY)
		if (!payload || !payload.data) {
			return createInitialAppState()
		}
		return normaliseState(payload.data, payload.updatedAt)
	} catch (error) {
		console.warn('[app-state] 读取本地数据失败，将使用初始数据', error)
		return createInitialAppState()
	}
}

export function saveAppState(source) {
	const data = {}
	for (const key of PERSISTED_KEYS) data[key] = clone(source[key])
	try {
		uni.setStorageSync(STORAGE_KEY, {
			version: SCHEMA_VERSION,
			updatedAt: Date.now(),
			data
		})
		return true
	} catch (error) {
		console.warn('[app-state] 保存本地数据失败', error)
		return false
	}
}

export function clearAppState() {
	uni.removeStorageSync(STORAGE_KEY)
}
