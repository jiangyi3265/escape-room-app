import { apiBaseUrl } from './api-config.js'

// 门店后端接口。登录凭证只放在请求头里，不拼到网址上。
const TOKEN_KEY = 'escape-room-store-token'
const TIMEOUT = 15000

export class ApiError extends Error {
	constructor(message, status = 0) {
		super(message)
		this.status = status
	}
}

let unauthorizedHandler = null

export function onUnauthorized(handler) {
	unauthorizedHandler = handler
}

export function getToken() {
	try { return uni.getStorageSync(TOKEN_KEY) || '' } catch { return '' }
}

export function setToken(token) {
	try {
		if (token) uni.setStorageSync(TOKEN_KEY, token)
		else uni.removeStorageSync(TOKEN_KEY)
	} catch { /* 存储不可用时本次会话仍可使用 */ }
}

export function newRequestId() {
	return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

function failureMessage(statusCode) {
	if (statusCode >= 500) return '门店系统暂时无法处理，请稍后重试'
	if (statusCode === 404) return '要处理的记录已不存在，请刷新后再看'
	return '操作没有成功，请稍后重试'
}

export function request(method, url, data, { auth = true } = {}) {
	const token = auth ? getToken() : ''
	return new Promise((resolve, reject) => {
		uni.request({
			url: apiBaseUrl() + url,
			method,
			data: data === undefined ? undefined : data,
			timeout: TIMEOUT,
			header: { 'Content-Type': 'application/json', ...(token ? { 'X-Store-Token': token } : {}) },
			success: res => {
				const body = res.data && typeof res.data === 'object' ? res.data : {}
				if (res.statusCode === 401 || body.code === 401) {
					const message = body.msg || '登录已失效，请重新登录'
					if (auth && token) {
						setToken('')
						if (unauthorizedHandler) unauthorizedHandler(message)
					}
					reject(new ApiError(message, 401))
					return
				}
				if (res.statusCode >= 200 && res.statusCode < 300 && body.code === 200) {
					resolve(body.data)
					return
				}
				reject(new ApiError(body.msg || failureMessage(res.statusCode), body.code || res.statusCode))
			},
			fail: () => reject(new ApiError('网络连接失败，请检查网络后重试', 0))
		})
	})
}

export const storeApi = {
	login: (phone, password) => request('POST', '/app/auth/login', { phone, password }, { auth: false }),
	logout: () => request('POST', '/app/auth/logout'),
	changePassword: (oldPassword, newPassword) => request('POST', '/app/auth/password', { oldPassword, newPassword }),
	sync: () => request('GET', '/app/sync'),
	version: () => request('GET', '/app/sync/version'),
	readNotice: id => request('POST', `/app/notices/${id}/read`),
	readAllNotices: () => request('POST', '/app/notices/read-all'),
	setWechatSubscription: enabled => request('POST', '/app/wechat/subscription', { enabled }),

	completeTask: (taskId, requestId) => request('POST', '/app/points/complete', { taskId, requestId }),
	grabJob: id => request('POST', `/app/jobs/${id}/grab`),

	createOrder: form => request('POST', '/app/orders', form),
	updateOrder: (id, form) => request('PUT', `/app/orders/${id}`, form),
	completeStep: (id, key, choice) => request('POST', `/app/orders/${id}/steps/${key}`, choice ? { choice } : {}),
	recordPayment: (id, amounts) => request('POST', `/app/orders/${id}/payment`, amounts),
	createRepair: (themeId, problem, requestId) => request('POST', '/app/repairs', { themeId, problem, requestId }),
	completeRepair: id => request('POST', `/app/repairs/${id}/complete`),

	approveAudit: id => request('POST', `/app/audits/${id}/approve`),
	rejectAudit: (id, reason) => request('POST', `/app/audits/${id}/reject`, { reason }),
	staffLedger: id => request('GET', `/app/staff/${id}/ledger`),
	revokePoint: id => request('POST', `/app/points/${id}/revoke`),
	addStaff: (name, phone) => request('POST', '/app/staff', { name, phone }),
	adjustStaff: (id, points) => request('POST', `/app/staff/${id}/adjust`, { points }),
	setStaffStatus: (id, status) => request('POST', `/app/staff/${id}/status`, { status }),
	removeStaff: id => request('DELETE', `/app/staff/${id}`),
	resetStaffPassword: id => request('POST', `/app/staff/${id}/reset-password`),
	publishJob: form => request('POST', '/app/jobs', form),
	cancelJob: id => request('POST', `/app/jobs/${id}/cancel`),
	correctOrder: (id, target, reason) => request('POST', `/app/orders/${id}/correct`, { target, reason }),
	cancelOrder: (id, reason) => request('POST', `/app/orders/${id}/cancel`, { reason }),
	deleteOrder: id => request('DELETE', `/app/orders/${id}`),
	addTheme: name => request('POST', '/app/themes', { name }),
	renameTheme: (id, name) => request('PUT', `/app/themes/${id}`, { name }),
	deleteTheme: id => request('DELETE', `/app/themes/${id}`),
	addTask: task => request('POST', '/app/tasks', task),
	updateTask: (id, task) => request('PUT', `/app/tasks/${id}`, task)
}
