export const THEME_NAMES = ['开学悸', '港诡实录', '旅店惊魂', '医怨', '夜嫁', '雨夜屠夫', '忌屋', '捉妖', '我帮太爷打鬼砸', '通灵鬼校', '玩惧屋', '诡画2']

export function initialThemes() {
	return THEME_NAMES.map((name, index) => ({ id: `theme-${index + 1}`, name, deleted: false }))
}

const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

function requireActor(context, managerOnly = false) {
	if (managerOnly && context.role !== 'manager') throw new Error('仅店长可以修改门店配置')
	if (!['employee', 'manager'].includes(context.role) || !context.name || (context.role === 'employee' && !context.active)) throw new Error('当前账号不能执行此操作')
}

function requiredText(value, label, max) {
	const text = String(value || '').trim()
	if (!text) throw new Error(`请填写${label}`)
	if (text.length > max) throw new Error(`${label}不能超过${max}字`)
	return text
}

export function saveTheme(state, context, input) {
	requireActor(context, true)
	const name = requiredText(input.name, '主题名称', 30)
	if (state.themes.some(theme => !theme.deleted && theme.id !== input.id && theme.name === name)) throw new Error('主题名称已存在')
	if (input.id) {
		const theme = state.themes.find(item => item.id === input.id && !item.deleted)
		if (!theme) throw new Error('主题已删除，请刷新列表')
		theme.name = name
		theme.updatedAt = new Date().toISOString()
		return theme
	}
	const theme = { id: uid('theme'), name, deleted: false }
	state.themes.push(theme)
	return theme
}

export function deleteTheme(state, context, id) {
	requireActor(context, true)
	const theme = state.themes.find(item => item.id === id && !item.deleted)
	if (!theme) throw new Error('主题已删除')
	// Keep snapshots in orders, repairs and score submissions unchanged.
	theme.deleted = true
	theme.deletedAt = new Date().toISOString()
}

export function savePresetTask(state, context, input) {
	requireActor(context, true)
	const title = requiredText(input.title, '任务名称', 100)
	const rawPoints = String(input.points ?? '').trim()
	if (!/^\d+$/.test(rawPoints) || !Number.isSafeInteger(Number(rawPoints)) || Number(rawPoints) > 1000000) throw new Error('积分请填写 0 到 1000000 的整数')
	const categories = ['接待', '服务', '维护', '打扫', '整理', '视频', '出勤']
	if (input.id) {
		const task = state.tasks.find(item => item.id === input.id)
		if (!task) throw new Error('积分任务不存在')
		const category = input.category === undefined ? task.category : input.category
		if (!categories.includes(category)) throw new Error('请选择有效的任务分类')
		Object.assign(task, { title, points: Number(rawPoints), category, audit: input.audit === undefined ? task.audit : Boolean(input.audit), updatedAt: new Date().toISOString(), updatedBy: context.name })
		return task
	}
	const category = categories.includes(input.category) ? input.category : '服务'
	if (state.tasks.some(item => item.title === title)) throw new Error('积分任务名称已存在')
	const task = { id: uid('task'), title, points: Number(rawPoints), category, audit: Boolean(input.audit), count: 0, createdAt: new Date().toISOString(), createdBy: context.name }
	state.tasks.push(task)
	return task
}

export function createRepair(state, context, input) {
	requireActor(context)
	const theme = state.themes.find(item => item.id === input.themeId && !item.deleted)
	if (!theme) throw new Error('请选择可用主题')
	const problem = requiredText(input.problem, '问题备注', 500)
	const repair = { id: uid('repair'), themeId: theme.id, theme: theme.name, problem, status: 'pending', createdBy: context.name, createdAt: new Date().toISOString() }
	state.repairs.unshift(repair)
	return repair
}

export function completeRepair(state, context, id) {
	requireActor(context)
	const repair = state.repairs.find(item => item.id === id)
	if (!repair || repair.status !== 'pending') throw new Error('该维修已经完成或不存在')
	Object.assign(repair, { status: 'completed', completedBy: context.name, completedAt: new Date().toISOString() })
	return repair
}
