const pad = value => String(value).padStart(2, '0')

export function nowTimestamp(date = new Date()) {
	return date.toISOString()
}

export function localDateKey(date = new Date()) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseActivityTime(value, reference = new Date()) {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value)
	if (typeof value === 'number') {
		const parsed = new Date(value)
		return Number.isNaN(parsed.getTime()) ? null : parsed
	}
	const text = String(value || '').trim()
	if (!text) return null
	const relative = text.match(/^(今天|昨天)(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
	if (relative) {
		const parsed = new Date(reference)
		parsed.setHours(Number(relative[2] || 0), Number(relative[3] || 0), Number(relative[4] || 0), 0)
		if (relative[1] === '昨天') parsed.setDate(parsed.getDate() - 1)
		return parsed
	}
	const clock = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
	if (clock) {
		const parsed = new Date(reference)
		parsed.setHours(Number(clock[1]), Number(clock[2]), Number(clock[3] || 0), 0)
		return parsed
	}
	const chinese = text.match(/^(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
	if (chinese) {
		const parsed = new Date(reference)
		parsed.setFullYear(Number(chinese[1] || reference.getFullYear()), Number(chinese[2]) - 1, Number(chinese[3]))
		parsed.setHours(Number(chinese[4] || 0), Number(chinese[5] || 0), Number(chinese[6] || 0), 0)
		return parsed
	}
	const normalized = /^\d{4}-\d{2}-\d{2}\s/.test(text) ? text.replace(' ', 'T') : text
	const parsed = new Date(normalized)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatDateTime(value, reference = new Date(), withSeconds = false) {
	const date = parseActivityTime(value, reference)
	if (!date) return String(value || '时间待补充')
	const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}${withSeconds ? `:${pad(date.getSeconds())}` : ''}`
	return `${date.getMonth() + 1}月${date.getDate()}日 ${clock}`
}

export function formatDateLabel(value, reference = new Date()) {
	const date = parseActivityTime(value, reference)
	return date ? `${date.getMonth() + 1}月${date.getDate()}日` : String(value || '')
}

export function timestampFromLegacyParts(day, clock, reference = new Date()) {
	return nowTimestamp(parseActivityTime(`${day || '今天'} ${clock || '00:00'}`, reference) || reference)
}

export function greetingForDate(value = new Date()) {
	const date = value instanceof Date ? value : new Date(value)
	const hour = date.getHours()
	if (hour < 5) return '夜深了'
	if (hour < 11) return '早上好'
	if (hour < 14) return '中午好'
	if (hour < 18) return '下午好'
	return '晚上好'
}

export function overviewForDate(value = new Date()) {
	const date = value instanceof Date ? value : new Date(value)
	const hour = date.getHours()
	if (hour < 5) return '门店凌晨概览'
	if (hour < 11) return '门店早间概览'
	if (hour < 14) return '门店午间概览'
	if (hour < 18) return '门店下午概览'
	return '门店晚间概览'
}
