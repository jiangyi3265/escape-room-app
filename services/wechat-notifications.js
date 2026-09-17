const rawTemplateIds = import.meta.env?.VITE_WECHAT_SUBSCRIBE_TEMPLATE_IDS || ''

export function configuredTemplateIds(value = rawTemplateIds) {
	return String(value || '').split(',').map(item => item.trim()).filter(Boolean)
}

function cloudApi(api) {
	if (api?.cloud?.callFunction) return api.cloud
	if (typeof wx !== 'undefined' && wx.cloud?.callFunction) return wx.cloud
	return null
}

export function requestWechatSubscription(api, templateIds = configuredTemplateIds()) {
	if (!templateIds.length) return Promise.reject(new Error('尚未配置微信订阅消息模板 ID'))
	if (!api?.requestSubscribeMessage) return Promise.reject(new Error('请在微信小程序中开启微信提醒'))
	return new Promise((resolve, reject) => api.requestSubscribeMessage({ tmplIds: templateIds, success: resolve, fail: reject }))
}

export async function registerWechatSubscriber(api, profile, templateIds = configuredTemplateIds()) {
	const cloud = cloudApi(api)
	if (!cloud) throw new Error('微信云开发尚未初始化')
	return cloud.callFunction({ name: 'sendStoreNotification', data: { action: 'subscribe', profile, templateIds } })
}

export async function publishWechatNotification(api, payload) {
	const cloud = cloudApi(api)
	if (!cloud) return { delivered: false, reason: 'cloud-unavailable' }
	try {
		return await cloud.callFunction({ name: 'sendStoreNotification', data: { action: 'publish', notification: payload } })
	} catch (error) {
		console.warn('[wechat-notification] 微信提醒发送失败，站内消息已保留', error)
		return { delivered: false, reason: error?.message || 'send-failed' }
	}
}
