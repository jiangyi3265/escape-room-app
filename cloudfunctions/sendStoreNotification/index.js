const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const subscribers = db.collection('notification_subscribers')

const clean = (value, max = 20) => String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max) || '门店消息'
const two = value => String(value).padStart(2, '0')
const messageTime = value => {
	const date = new Date(value || Date.now())
	return `${date.getFullYear()}年${two(date.getMonth() + 1)}月${two(date.getDate())}日 ${two(date.getHours())}:${two(date.getMinutes())}`
}

async function subscribe(event, openid) {
	const profile = event.profile || {}
	const templateIds = Array.isArray(event.templateIds) ? event.templateIds.filter(Boolean) : []
	if (!templateIds.length) throw new Error('缺少订阅消息模板 ID')
	await subscribers.doc(openid).set({
		data: {
			openid,
			storeId: clean(profile.storeId, 40),
			storeName: clean(profile.storeName, 40),
			name: clean(profile.name, 20),
			role: clean(profile.role, 20),
			templateIds,
			updatedAt: db.serverDate()
		}
	})
	return { subscribed: true }
}

async function publish(event) {
	const notification = event.notification || {}
	const storeId = clean(notification.storeId, 40)
	const { data } = await subscribers.where({ storeId }).limit(100).get()
	const results = await Promise.allSettled(data.map(subscriber => {
		const templateId = subscriber.templateIds?.[0]
		if (!templateId) throw new Error('订阅人没有可用模板')
		return cloud.openapi.subscribeMessage.send({
			touser: subscriber.openid,
			page: 'pages/index/index',
			templateId,
			miniprogramState: 'formal',
			lang: 'zh_CN',
			data: {
				thing1: { value: clean(notification.title, 20) },
				thing2: { value: clean(notification.detail, 20) },
				time3: { value: messageTime(notification.time) }
			}
		})
	}))
	return { subscribers: data.length, delivered: results.filter(result => result.status === 'fulfilled').length }
}

exports.main = async event => {
	const { OPENID } = cloud.getWXContext()
	if (event.action === 'subscribe') return subscribe(event, OPENID)
	if (event.action === 'publish') return publish(event)
	throw new Error('不支持的通知操作')
}
