export const ORDER_STEPS = Object.freeze([
	{ key: 'start', label: '点击主题名称', status: '已开始' },
	{ key: 'openReset', label: '开场复位', status: '开场复位已完成', note: '道具、机关、气泵、空调' },
	{ key: 'payment', label: '收钱', status: '已收款' },
	{ key: 'host', label: '开始带场建群', status: '已开始带场建群' },
	{ key: 'entry', label: '开始入场', status: '已开始入场' },
	{ key: 'gameStart', label: '开始游戏', status: '游戏进行中' },
	{ key: 'gameEnd', label: '游戏结束', status: '游戏已结束' },
	{ key: 'closeReset', label: '收场复位', status: '收场复位已完成', note: '道具、机关、气泵、空调' },
	{ key: 'photo', label: '拍照选择', status: '已记录拍照选择', branch: true },
	{ key: 'video', label: '视频选择', status: '已记录视频选择', branch: true },
	{ key: 'edit', label: '剪辑完毕', status: '订单已完成', conditional: true }
])

export const NON_SKIPPABLE_STEP_KEYS = Object.freeze([
	'openReset',
	'payment',
	'host',
	'entry',
	'gameStart',
	'gameEnd',
	'closeReset'
])

export function visibleOrderSteps(order) {
	if (!order?.records?.video || order.records.video.choice !== '要视频') {
		return ORDER_STEPS.filter(step => step.key !== 'edit')
	}
	return ORDER_STEPS
}

export function nextOrderStep(order) {
	if (order.cancelled) return { key: 'cancelled', label: '订单已取消' }
	for (const step of ORDER_STEPS) {
		if (step.key === 'edit' && order.records?.video?.choice !== '要视频') continue
		if (!order.records?.[step.key]) return step
	}
	return { key: 'done', label: '订单已完成' }
}

export function orderIsEditing(order) {
	return order.records?.video?.choice === '要视频' && !order.records?.edit
}

export function orderIsDone(order) {
	return order.records?.video?.choice === '不要视频' || Boolean(order.records?.edit)
}

export function canViewOrder(order, role) {
	return Boolean(order) && (role === 'manager' || (role === 'employee' && !orderIsDone(order)))
}

export function filterOrdersForRole(orders, role, filter = 'all') {
	// Visibility changes the view only; completed orders and their records remain stored.
	const visible = orders.filter(order => canViewOrder(order, role))
	if (filter === 'active') return visible.filter(order => !orderIsDone(order) && !orderIsEditing(order) && !order.cancelled)
	if (filter === 'editing') return visible.filter(order => orderIsEditing(order))
	if (filter === 'done') return visible.filter(order => orderIsDone(order))
	return visible
}

export function orderProgress(order) {
	const steps = visibleOrderSteps(order)
	if (!steps.length) return 0
	const done = steps.filter(step => order.records?.[step.key]).length
	return Math.round((done / steps.length) * 100)
}

export function orderStatus(order) {
	if (order.cancelled) return '已取消'
	if (orderIsDone(order)) return '已完成'
	if (orderIsEditing(order)) return '待剪辑'
	const next = nextOrderStep(order)
	return next.key === 'start' ? '待开始' : `待${next.label}`
}

export function canCompleteStep(order, stepKey) {
	return !order.cancelled && nextOrderStep(order).key === stepKey
}

export function compactOrderSteps(order) {
	const labels = ['开始', '开复', '收钱', '带场', '入场', '进行', '结束', '收复', '拍照', '视频']
	const next = nextOrderStep(order)
	return [
		{ key: 'created', label: '创建', done: true, current: false },
		...ORDER_STEPS.slice(0, 10).map((step, index) => ({ key: step.key, label: labels[index], done: Boolean(order.records?.[step.key]), current: next.key === step.key })),
		{ key: 'finish', label: '完毕', done: orderIsDone(order), current: next.key === 'edit' }
	]
}
