import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Load the project's ESM service files without changing the uni-app package type.
async function moduleUrl(path) {
	let source = await readFile(path, 'utf8')
	for (const match of [...source.matchAll(/from '(\.\/[^']+)'/g)]) source = source.replace(match[0], `from '${await moduleUrl(new URL(match[1], path))}'`)
	return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}
const config = await import(await moduleUrl(new URL('../services/store-config.js', import.meta.url)))
const app = await import(await moduleUrl(new URL('../services/app-state.js', import.meta.url)))
const manager = { role: 'manager', name: '江店长', active: true }
const employee = { role: 'employee', name: '林澈', active: true }
let saved
globalThis.uni = { getStorageSync: () => saved, setStorageSync: (key, value) => { saved = value } }
let checks = 0
function check(label, run) { run(); checks++; console.log(`PASS ${label}`) }
let state = app.createInitialAppState()

check('12 exact initial themes', () => {
 assert.deepEqual(state.themes.map(item => item.name), ['开学悸', '港诡实录', '旅店惊魂', '医怨', '夜嫁', '雨夜屠夫', '忌屋', '捉妖', '我帮太爷打鬼砸', '通灵鬼校', '玩惧屋', '诡画2'])
 assert.equal(state.repairs.length, 0)
})
check('legacy storage migrates without losing orders or custom task scores', () => {
 const legacy = app.createInitialAppState(); delete legacy.themes; delete legacy.repairs
 legacy.tasks[0].points = 19
 saved = { version: 2, data: legacy, updatedAt: Date.now() }
 state = app.loadAppState()
 assert.equal(state.themes.length, 12); assert.equal(state.tasks[0].points, 19)
 assert.deepEqual(state.orders, legacy.orders)
})
check('only manager can edit task points or themes', () => {
 assert.throws(() => config.savePresetTask(state, employee, { id: 1, title: 'X', points: 2 }), /仅店长/)
 assert.throws(() => config.saveTheme(state, employee, { name: '测试' }), /仅店长/)
 assert.throws(() => config.deleteTheme(state, employee, state.themes[0].id), /仅店长/)
})
check('task title and points change without changing historical scores or pending audit', () => {
 const before = JSON.stringify([state.pendingAudits, state.pointLedger, state.ranking, state.employeePoints])
 const cleaning = state.tasks.find(task => task.audit)
 config.savePresetTask(state, manager, { id: cleaning.id, title: '打扫《开学悸》并通过检查', points: '27' })
 assert.equal(cleaning.points, 27); assert.equal(cleaning.audit, true)
 assert.equal(before, JSON.stringify([state.pendingAudits, state.pointLedger, state.ranking, state.employeePoints]))
})
check('manager can add a new points task with category and audit rule', () => {
	const before = state.tasks.length
	const task = config.savePresetTask(state, manager, { title: '主动检查消防通道', points: '6', category: '维护', audit: true })
	assert.equal(state.tasks.length, before + 1)
	assert.equal(task.category, '维护'); assert.equal(task.audit, true); assert.equal(task.count, 0)
	assert.throws(() => config.savePresetTask(state, manager, { title: task.title, points: 2, category: '服务' }), /已存在/)
})
check('invalid task scores and blank titles rejected, zero supported', () => {
 for (const points of ['', '-1', '1.5', 'abc', '1000001']) assert.throws(() => config.savePresetTask(state, manager, { id: state.tasks[0].id, title: '任务', points }))
 assert.throws(() => config.savePresetTask(state, manager, { id: state.tasks[0].id, title: ' ', points: 2 }))
 config.savePresetTask(state, manager, { id: state.tasks[0].id, title: '主动接客', points: '0' }); assert.equal(state.tasks[0].points, 0)
})
check('repair requires active actor, selected theme and nonblank problem', () => {
 for (const input of [{ themeId: '', problem: '气泵损坏' }, { themeId: state.themes[0].id, problem: '  ' }, { themeId: state.themes[0].id, problem: '字'.repeat(501) }]) assert.throws(() => config.createRepair(state, employee, input))
 assert.throws(() => config.createRepair(state, { ...employee, active: false }, { themeId: state.themes[0].id, problem: '气泵损坏' }))
 assert.equal(state.repairs.length, 0)
})
check('employee registers repair; manager completes with full audit timestamps', () => {
 const repair = config.createRepair(state, employee, { themeId: state.themes[0].id, problem: ' 气泵不启动 ' })
 assert.equal(repair.status, 'pending'); assert.equal(repair.problem, '气泵不启动'); assert.equal(repair.createdBy, '林澈')
 assert.ok(!Number.isNaN(Date.parse(repair.createdAt)))
 config.completeRepair(state, manager, repair.id)
 assert.equal(repair.status, 'completed'); assert.equal(repair.completedBy, '江店长'); assert.ok(!Number.isNaN(Date.parse(repair.completedAt)))
 assert.throws(() => config.completeRepair(state, employee, repair.id), /已经完成/)
})
check('manager registers; employee completes even after theme rename and deletion', () => {
 const theme = state.themes[1]; const oldName = theme.name
 const repair = config.createRepair(state, manager, { themeId: theme.id, problem: '机关需要检修' })
 config.saveTheme(state, manager, { id: theme.id, name: '港诡实录新版' }); assert.equal(repair.theme, oldName)
 config.deleteTheme(state, manager, theme.id); assert.equal(theme.deleted, true)
 assert.throws(() => config.createRepair(state, employee, { themeId: theme.id, problem: '不可新建' }))
 config.completeRepair(state, employee, repair.id); assert.equal(repair.completedBy, '林澈')
})
check('theme add/edit validation and historical orders unchanged', () => {
 const before = JSON.stringify(state.orders)
 assert.throws(() => config.saveTheme(state, manager, { name: '开学悸' }), /已存在/)
 assert.throws(() => config.saveTheme(state, manager, { name: '  ' }), /请填写/)
 const theme = config.saveTheme(state, manager, { name: ' 新主题 ' }); assert.equal(theme.name, '新主题')
 config.saveTheme(state, manager, { id: theme.id, name: '新主题二' }); config.deleteTheme(state, manager, theme.id)
 assert.equal(JSON.stringify(state.orders), before)
})
check('configuration, repairs and deleted themes survive reload', () => {
 assert.equal(app.saveAppState(state), true); const reloaded = app.loadAppState()
 assert.deepEqual(reloaded.themes, state.themes); assert.deepEqual(reloaded.repairs, state.repairs); assert.deepEqual(reloaded.tasks, state.tasks)
	assert.equal(saved.version, 5)
})
check('empty theme list stays empty on reload (no unexpected reseeding)', () => {
 state.themes = []; state.repairs = []; app.saveAppState(state)
 assert.equal(app.loadAppState().themes.length, 0); assert.equal(app.loadAppState().repairs.length, 0)
})
console.log(`${checks} configuration and repair checks passed`)
