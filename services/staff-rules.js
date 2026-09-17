import { nowTimestamp } from './time-format.js'

function requireManager(context) {
	if (context?.role !== 'manager' || !context.name) throw new Error('仅店长可以删除员工账号')
}

export function deleteEmployeeAccount(state, context, staffId, now = new Date()) {
	requireManager(context)
	const index = state.ranking.findIndex(person => person.id === staffId)
	if (index < 0) throw new Error('员工账号不存在或已删除')
	const [person] = state.ranking.splice(index, 1)
	const occurredAt = nowTimestamp(now)
	let cancelledAudits = 0
	state.pendingAudits = state.pendingAudits.filter(audit => {
		if (audit.employee !== person.name) return true
		cancelledAudits++
		const ledger = state.pointLedger.find(entry => entry.id === audit.id)
		if (ledger) Object.assign(ledger, { state: '账号删除已取消', resolvedAt: occurredAt })
		return false
	})
	state.jobs.forEach(job => {
		if (Array.isArray(job.allowedEmployees)) job.allowedEmployees = job.allowedEmployees.filter(name => name !== person.name)
	})
	if (person.name === '林澈') {
		state.employeePoints = 0
		state.todayPoints = 0
	}
	return { person, removedPoints: Number(person.points || 0), cancelledAudits }
}
