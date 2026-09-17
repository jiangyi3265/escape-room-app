import { canCompleteStep } from './order-rules.js'
import { formatDateLabel, nowTimestamp } from './time-format.js'

export const PAYMENT_CHANNELS = Object.freeze([
	{ key: 'wechat', label: '微信' }, { key: 'alipay', label: '支付宝' },
	{ key: 'cash', label: '现金' }, { key: 'online', label: '线上' }
])

export function paymentDateKey(date = new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function amountToCents(value) {
	const text = String(value ?? '').trim()
	if (!text) return 0
	if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('金额须为非负数，最多两位小数')
	const [whole, fraction = ''] = text.split('.')
	const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
	if (!Number.isSafeInteger(cents) || cents > 100000000) throw new Error('单个渠道金额不能超过100万元')
	return cents
}

export function parsePaymentAmounts(input) {
	const amounts = {}
	for (const channel of PAYMENT_CHANNELS) {
		try { amounts[channel.key] = amountToCents(input[channel.key]) }
		catch (error) { throw new Error(`${channel.label}：${error.message}`) }
	}
	if (!Object.values(amounts).some(value => value > 0)) throw new Error('请至少填写一项大于0的收款金额')
	return amounts
}

export function formatMoney(cents = 0) { return (cents / 100).toFixed(2) }

export function paymentSummary(receipt) {
	return PAYMENT_CHANNELS.map(channel => `${channel.label} ¥${formatMoney(receipt.amounts[channel.key])}`).join(' · ')
}

export function recordOrderPayment(state, order, context, input, now = new Date()) {
	if (!['employee', 'manager'].includes(context.role) || !context.name || (context.role === 'employee' && !context.active)) throw new Error('当前账号不能登记收款')
	if (!state.orders.includes(order) || !canCompleteStep(order, 'payment')) throw new Error('请先完成前置节点，已收款或已取消订单不能重复登记')
	const amounts = parsePaymentAmounts(input)
	let receipt = state.receipts.find(item => item.orderId === order.id)
	if (!receipt) {
		receipt = { id: `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, orderId: order.id, theme: order.theme, amounts, operator: context.name, receivedAt: nowTimestamp(now), date: paymentDateKey(now), status: 'active', revisions: [] }
		state.receipts.unshift(receipt)
	} else {
		if (receipt.status === 'reversed') throw new Error('该订单收款已冲正，不能直接恢复')
		receipt.revisions = Array.isArray(receipt.revisions) ? receipt.revisions : []
		receipt.revisions.unshift({ amounts: { ...receipt.amounts }, adjustedAt: nowTimestamp(now), adjustedBy: context.name })
		Object.assign(receipt, { amounts, adjustedAt: nowTimestamp(now), adjustedBy: context.name, status: 'active', theme: order.theme })
	}
	order.records.payment = { receiptId: receipt.id, operator: context.name, time: nowTimestamp(now) }
	return receipt
}

export function reverseOrderPayment(state, order, context, reason, now = new Date()) {
	if (context?.role !== 'manager' || !context.name) throw new Error('仅店长可以冲正收款')
	const receipt = state.receipts.find(item => item.orderId === order.id && item.status !== 'reversed')
	if (!receipt) return null
	Object.assign(receipt, {
		status: 'reversed',
		reversedAt: nowTimestamp(now),
		reversedBy: context.name,
		reverseReason: String(reason || '订单取消或删除').trim()
	})
	return receipt
}

export function todayPaymentTotals(receipts, date = paymentDateKey()) {
	const totals = { wechat: 0, alipay: 0, cash: 0, total: 0, count: 0 }
	for (const receipt of receipts) {
		if (receipt.date !== date || receipt.status === 'reversed') continue
		totals.count++
		for (const key of ['wechat', 'alipay', 'cash']) totals[key] += receipt.amounts[key] || 0
	}
	// Online receipts are recorded but deliberately excluded from this report.
	totals.total = totals.wechat + totals.alipay + totals.cash
	return totals
}

export function paymentTotalsByDay(receipts, days = 7, reference = new Date()) {
	const result = []
	for (let offset = 0; offset < days; offset++) {
		const date = new Date(reference)
		date.setHours(12, 0, 0, 0)
		date.setDate(date.getDate() - offset)
		const key = paymentDateKey(date)
		result.push({ date: key, label: formatDateLabel(date), ...todayPaymentTotals(receipts, key) })
	}
	return result
}
