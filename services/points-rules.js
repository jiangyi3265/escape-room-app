import { localDateKey, nowTimestamp, parseActivityTime, timestampFromLegacyParts } from './time-format.js'

export { localDateKey }

export const POINT_RETENTION_MONTHS = 1

export function normalizePointEntry(entry, reference = new Date()) {
	const occurredAt = entry.occurredAt || timestampFromLegacyParts(entry.day, entry.clock, reference)
	return { employee: '林澈', source: 'task', ...entry, occurredAt }
}

export function pointRetentionCutoff(reference = new Date()) {
	const cutoff = new Date(reference)
	cutoff.setMonth(cutoff.getMonth() - POINT_RETENTION_MONTHS)
	return cutoff
}

export function prunePointLedger(entries, reference = new Date()) {
	const cutoff = pointRetentionCutoff(reference)
	return entries.map(entry => normalizePointEntry(entry, reference)).filter(entry => {
		const occurredAt = parseActivityTime(entry.occurredAt, reference)
		return !occurredAt || occurredAt >= cutoff
	}).sort((a, b) => {
		const left = parseActivityTime(a.occurredAt, reference)?.getTime() || 0
		const right = parseActivityTime(b.occurredAt, reference)?.getTime() || 0
		return right - left
	})
}

export function employeePointEntries(entries, employee, reference = new Date()) {
	return prunePointLedger(entries, reference).filter(entry => entry.employee === employee)
}

export function addPointEntry(state, input, now = new Date()) {
	const entry = {
		...input,
		id: input.id || `point-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		employee: input.employee,
		title: input.title,
		points: Number(input.points || 0),
		state: input.state || '已到账',
		source: input.source || 'task',
		occurredAt: input.occurredAt || nowTimestamp(now)
	}
	state.pointLedger.unshift(entry)
	state.pointLedger = prunePointLedger(state.pointLedger, now)
	return entry
}

export function canRevokePointEntry(entry) {
	return Boolean(entry) && Number(entry.points) > 0 && entry.state === '已到账' && !entry.revokedAt && entry.source !== 'reversal'
}

export function revokePointEntry(state, context, entryId, now = new Date()) {
	if (context?.role !== 'manager' || !context.name) throw new Error('仅店长可以撤销员工积分')
	const entry = state.pointLedger.find(item => item.id === entryId)
	if (!canRevokePointEntry(entry)) throw new Error('该笔积分不能撤销或已经撤销')
	const staff = state.ranking.find(person => person.name === entry.employee)
	if (!staff) throw new Error('员工账号不存在，无法撤销积分')
	const before = Math.max(0, Number(staff.points || 0))
	const removed = Math.min(before, Number(entry.points))
	staff.points = before - removed
	const occurredAt = nowTimestamp(now)
	Object.assign(entry, { state: '已撤销', revokedAt: occurredAt, revokedBy: context.name })
	const reversal = addPointEntry(state, {
		id: `reversal-${entry.id}-${Date.now()}`,
		employee: entry.employee,
		title: `撤销：${entry.title}`,
		points: -removed,
		state: '已撤销',
		source: 'reversal',
		relatedEntryId: entry.id,
		occurredAt
	}, now)
	if (entry.employee === '林澈') {
		state.employeePoints = staff.points
		if (localDateKey(parseActivityTime(entry.occurredAt, now) || now) === localDateKey(now)) state.todayPoints = Math.max(0, Number(state.todayPoints || 0) - removed)
	}
	return { entry, reversal, removed, balance: staff.points }
}

export function rolloverDailyPointState(state, today = localDateKey()) {
	if (!state.lastPointDate) {
		state.lastPointDate = today
		return false
	}
	if (state.lastPointDate === today) return false

	state.todayPoints = 0
	state.tasks.forEach(task => {
		task.count = 0
	})
	state.lastPointDate = today
	return true
}
