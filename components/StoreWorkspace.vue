<template>
	<view class="workspace" :style="navigationStyle">
		<view class="workspace-header">
			<button class="back" aria-label="返回" @click="$emit('close')">‹</button>
			<view class="heading"><text class="title">{{ title }}</text><text class="caption">{{ context.name }} · {{ context.role === 'manager' ? '店长' : '员工' }}</text></view>
			<view class="header-spacer"></view>
		</view>
		<view v-if="context.role === 'manager'" class="tabs">
			<button v-for="tab in tabs" :key="tab.id" :class="['tab', mode === tab.id && 'selected']" @click="changeMode(tab.id)">{{ tab.label }}</button>
		</view>
		<scroll-view :key="mode" scroll-y class="workspace-scroll">
			<view class="content">
				<template v-if="mode === 'repairs'">
					<view class="section-head"><view><text class="section-title">主题维修</text><text class="caption">登记问题，修好后确认完成</text></view><button class="primary" @click="openRepairForm">＋ 需要修理</button></view>
					<view v-if="repairFormOpen" class="editor">
						<text class="label">选择主题</text>
						<view class="theme-choices"><button v-for="theme in activeThemes" :key="theme.id" :class="['theme-choice', repairForm.themeId === theme.id && 'chosen']" @click="repairForm.themeId = theme.id">{{ theme.name }}</button></view>
						<text v-if="!activeThemes.length" class="hint">暂无可用主题，请店长在「主题管理」中添加。</text>
						<text class="label spaced">问题备注（必填）</text>
						<textarea v-model="repairForm.problem" maxlength="500" placeholder="例如：港诡实录第二间房气泵不启动，请检查供电和气管。" placeholder-class="field-placeholder" />
						<text class="counter">{{ repairForm.problem.length }}/500</text>
						<text v-if="error" class="error">{{ error }}</text>
						<view class="actions"><button class="secondary" @click="repairFormOpen = false; error = ''">取消</button><button class="primary" :disabled="!activeThemes.length" @click="submitRepair">登记需要修理</button></view>
					</view>
					<view class="filters"><button :class="['filter', repairFilter === 'pending' && 'chosen']" @click="repairFilter = 'pending'">待维修 {{ pendingCount }}</button><button :class="['filter', repairFilter === 'completed' && 'chosen']" @click="repairFilter = 'completed'">已完成 {{ state.repairs.length - pendingCount }}</button></view>
					<view v-if="!visibleRepairs.length" class="empty"><text class="section-title">{{ repairFilter === 'pending' ? '暂无待维修问题' : '还没有完成记录' }}</text><text class="hint">{{ repairFilter === 'pending' ? '发现问题时，点击上方「需要修理」登记。' : '修理完成后点击「已完成」，记录会保留在这里。' }}</text></view>
					<view v-for="repair in visibleRepairs" :key="repair.id" class="repair-row">
						<view class="row-head"><text class="section-title">{{ repair.theme }}</text><text :class="['status', repair.status]">{{ repair.status === 'pending' ? '待维修' : '已完成' }}</text></view>
						<text class="problem">{{ repair.problem }}</text>
						<text class="caption">登记：{{ repair.createdBy }} · {{ formatTime(repair.createdAt) }}</text>
						<text v-if="repair.status === 'completed'" class="caption completed-by">修理完成：{{ repair.completedBy }} · {{ formatTime(repair.completedAt) }}</text>
						<button v-else class="secondary complete-button" @click="finishRepair(repair)">已完成</button>
					</view>
				</template>
				<template v-else-if="mode === 'points' && context.role === 'manager'">
					<view class="section-head"><view><text class="section-title">预设积分任务</text><text class="caption">{{ state.tasks.length }} 项可用任务</text></view><button class="primary" @click="openTaskForm">＋ 新增任务</button></view>
					<text class="hint intro">店长可以新增或修改任务。新规则用于之后的提交，已到账积分和待审核记录不变。</text>
					<view v-if="taskDraft && !taskDraft.id" class="editor">
						<text class="label">任务名称</text><input v-model="taskDraft.title" maxlength="100" placeholder="例如：主动补充前台物资" placeholder-class="field-placeholder" />
						<text class="label spaced">每次奖励积分（非负整数）</text><input v-model="taskDraft.points" type="number" maxlength="7" placeholder="例如：4" placeholder-class="field-placeholder" />
						<text class="label spaced">任务分类</text><view class="task-categories"><button v-for="category in taskCategories" :key="category" :class="['task-category', taskDraft.category === category && 'chosen']" @click="taskDraft.category = category">{{ category }}</button></view>
						<view class="audit-toggle"><view><text class="task-name">完成后需要店长审核</text><text class="caption">开启后，积分在审核通过后到账</text></view><switch :checked="taskDraft.audit" color="#e9aa3a" @change="taskDraft.audit = $event.detail.value" /></view>
						<text v-if="error" class="error">{{ error }}</text><view class="actions"><button class="secondary" @click="taskDraft = {}; error = ''">取消</button><button class="primary" @click="submitTask">保存新增任务</button></view>
					</view>
					<view v-for="task in state.tasks" :key="task.id" class="config-row">
						<view class="row-head"><view class="grow"><text class="task-name">{{ task.title }}</text><text class="caption">{{ task.category }} · {{ task.audit ? '店长审核后到账' : '点击即到账' }}</text></view><text class="score">{{ task.points }} 分</text><button class="text-button" @click="editTask(task)">修改</button></view>
						<view v-if="taskDraft.id === task.id" class="inline-editor">
							<text class="label">任务名称</text><input v-model="taskDraft.title" maxlength="100" placeholder="任务名称" placeholder-class="field-placeholder" />
							<text class="label spaced">每次奖励积分（非负整数）</text><input v-model="taskDraft.points" type="number" maxlength="7" placeholder="例如：4" placeholder-class="field-placeholder" />
							<text class="label spaced">任务分类</text><view class="task-categories"><button v-for="category in taskCategories" :key="category" :class="['task-category', taskDraft.category === category && 'chosen']" @click="taskDraft.category = category">{{ category }}</button></view>
							<view class="audit-toggle"><view><text class="task-name">完成后需要店长审核</text><text class="caption">开启后，积分在审核通过后到账</text></view><switch :checked="taskDraft.audit" color="#e9aa3a" @change="taskDraft.audit = $event.detail.value" /></view>
							<text v-if="error" class="error">{{ error }}</text><view class="actions"><button class="secondary" @click="taskDraft = {}; error = ''">取消</button><button class="primary" @click="submitTask">保存积分任务</button></view>
						</view>
					</view>
				</template>
				<template v-else-if="mode === 'themes' && context.role === 'manager'">
					<view class="section-head"><view><text class="section-title">主题管理</text><text class="caption">{{ activeThemes.length }} 个可用主题</text></view><button class="primary" @click="editTheme()">＋ 新增主题</button></view>
					<text class="hint intro">改名或删除影响新订单和新维修的主题选项，不改动历史记录。打扫任务名称可在「积分设置」中单独修改。</text>
					<view v-if="themeDraft && !themeDraft.id" class="editor"><text class="label">新增主题名称</text><input v-model="themeDraft.name" maxlength="30" placeholder="请输入主题名称" placeholder-class="field-placeholder" /><text v-if="error" class="error">{{ error }}</text><view class="actions"><button class="secondary" @click="themeDraft = null; error = ''">取消</button><button class="primary" @click="submitTheme">保存主题</button></view></view>
					<view v-if="!activeThemes.length" class="empty"><text class="section-title">暂无可用主题</text><text class="hint">添加一个主题后，员工即可创建订单和登记维修。</text></view>
					<view v-for="theme in activeThemes" :key="theme.id" class="config-row">
						<view class="row-head"><text class="task-name grow">{{ theme.name }}</text><button class="text-button" @click="editTheme(theme)">修改</button><button class="text-button danger" @click="removeTheme(theme)">删除</button></view>
						<view v-if="themeDraft && themeDraft.id === theme.id" class="inline-editor"><text class="label">主题名称</text><input v-model="themeDraft.name" maxlength="30" placeholder="请输入主题名称" placeholder-class="field-placeholder" /><text v-if="error" class="error">{{ error }}</text><view class="actions"><button class="secondary" @click="themeDraft = null; error = ''">取消</button><button class="primary" @click="submitTheme">保存主题</button></view></view>
					</view>
				</template>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { saveTheme, deleteTheme, savePresetTask, createRepair, completeRepair } from '../services/store-config.js'
import { formatDateTime } from '../services/time-format.js'

export default {
	props: { state: { type: Object, required: true }, context: { type: Object, required: true }, initialMode: { type: String, default: 'repairs' }, navigationStyle: { type: Object, default: () => ({}) } },
	emits: ['close', 'changed'],
	data() { return { mode: this.context.role === 'manager' ? this.initialMode : 'repairs', tabs: [{ id: 'repairs', label: '维修' }, { id: 'points', label: '积分设置' }, { id: 'themes', label: '主题管理' }], taskCategories: ['接待', '服务', '维护', '打扫', '整理', '视频', '出勤'], repairFilter: 'pending', repairFormOpen: false, repairForm: { themeId: '', problem: '' }, taskDraft: {}, themeDraft: null, error: '' } },
	computed: {
		title() { return this.tabs.find(tab => tab.id === this.mode)?.label || '维修' },
		activeThemes() { return this.state.themes.filter(theme => !theme.deleted) },
		pendingCount() { return this.state.repairs.filter(repair => repair.status === 'pending').length },
		visibleRepairs() { return this.state.repairs.filter(repair => repair.status === this.repairFilter).slice().sort((a, b) => (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt)) }
	},
	methods: {
		changeMode(mode) { this.mode = mode; this.error = ''; this.taskDraft = {}; this.themeDraft = null; this.repairFormOpen = false },
		perform(action, message) { try { action(); this.error = ''; this.$emit('changed', message); return true } catch (error) { this.error = error.message; uni.showToast({ title: error.message, icon: 'none' }); return false } },
		openRepairForm() { this.repairFormOpen = true; this.error = '' },
		submitRepair() { if (this.perform(() => createRepair(this.state, this.context, this.repairForm), '已登记待维修')) { this.repairFormOpen = false; this.repairFilter = 'pending'; this.repairForm = { themeId: '', problem: '' } } },
		finishRepair(repair) { uni.showModal({ title: '确认已修理完成', content: `《${repair.theme}》：${repair.problem}\n完成后将记录修理人 ${this.context.name} 和完成时间。`, confirmText: '已完成', success: result => { if (result.confirm) this.perform(() => completeRepair(this.state, this.context, repair.id), '维修已完成') } }) },
		openTaskForm() { this.error = ''; this.taskDraft = { title: '', points: '', category: '服务', audit: false } },
		editTask(task) { this.error = ''; this.taskDraft = { id: task.id, title: task.title, points: String(task.points), category: task.category, audit: Boolean(task.audit) } },
		submitTask() { const adding = !this.taskDraft.id; if (this.perform(() => savePresetTask(this.state, this.context, this.taskDraft), adding ? '积分任务已新增' : '积分任务已保存')) this.taskDraft = {} },
		editTheme(theme) { this.error = ''; this.themeDraft = theme ? { id: theme.id, name: theme.name } : { name: '' } },
		submitTheme() { if (this.perform(() => saveTheme(this.state, this.context, this.themeDraft), '主题已保存')) this.themeDraft = null },
		removeTheme(theme) { uni.showModal({ title: '删除主题', content: `删除《${theme.name}》后，新订单和新维修不再提供此选项。历史订单、维修和积分记录保留，待维修仍可完成。`, confirmText: '确认删除', confirmColor: '#e66a61', success: result => { if (result.confirm && this.perform(() => deleteTheme(this.state, this.context, theme.id), '主题已删除')) this.themeDraft = null } }) },
		formatTime(value) { return formatDateTime(value, new Date(), true) }
	}
}
</script>

<style scoped>
.workspace{position:fixed;z-index:55;top:0;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--bg,#171816);color:var(--text,#f2f0e8);display:flex;flex-direction:column;font-size:13px}
.workspace-header{display:flex;align-items:center;justify-content:space-between;padding:calc(20px + env(safe-area-inset-top)) 18px 14px;border-bottom:1px solid var(--line);flex:none}.heading{text-align:center}.title{display:block;font-size:18px;font-weight:720}.caption{display:block;font-size:11px;color:var(--muted,#b0b0a7);line-height:1.65;margin-top:4px}.back,.header-spacer{width:44px;flex:none}.back{font-size:28px;background:var(--surface);color:var(--text)}
.tabs{display:flex;gap:4px;padding:10px 18px 0;flex:none}.tab{flex:1;background:transparent;color:var(--muted);border-bottom:2px solid transparent!important;border-radius:0}.tab.selected{color:var(--accent);border-bottom-color:var(--accent)!important}.workspace-scroll{flex:1;height:0;min-height:0}.content{padding:22px 18px calc(32px + env(safe-area-inset-bottom))}.section-head,.row-head{display:flex;align-items:center;gap:10px;justify-content:space-between}.section-title{font-size:17px;line-height:1.4;font-weight:720}.section-head{margin-bottom:16px}.grow{flex:1;min-width:0}.task-name{display:block;font-size:13px;line-height:1.6;overflow-wrap:anywhere}.score{color:var(--accent);font-weight:700;font-size:12px;flex:none}.hint{display:block;color:var(--muted);font-size:12px;line-height:1.75;margin-top:8px}.intro{margin:10px 0 20px}.empty{padding:42px 8px;text-align:center}.editor{padding:16px;background:var(--surface);border:1px solid var(--line);border-radius:18px;margin-bottom:20px}.inline-editor{padding:12px 0 6px}.label{display:block;font-size:12px;color:var(--muted);margin-bottom:8px}.spaced{margin-top:16px}
button{margin:0;box-sizing:border-box;min-height:44px;display:flex;align-items:center;justify-content:center;padding:0 12px;border-radius:12px;font-size:12px;line-height:1.4;font-weight:650;border:0;flex-shrink:0}button::after{border:0}button:active{opacity:.78}button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}button[disabled]{opacity:.45}.primary{background:var(--accent);color:#2a2216}.secondary{background:var(--surface-soft);color:var(--text);border:1px solid var(--line)}.text-button{background:transparent;color:var(--accent);padding:0 8px}.danger{color:var(--danger)}.actions{display:flex;gap:10px;margin-top:16px}.actions button{flex:1}.filters{display:flex;gap:8px;margin:8px 0 16px}.filter,.theme-choice{background:var(--surface);color:var(--muted);border:1px solid var(--line);font-weight:400}.chosen{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}.theme-choices{display:flex;flex-wrap:wrap;gap:8px}.theme-choice{padding:8px 10px;max-width:100%}
.task-categories{display:flex;flex-wrap:wrap;gap:8px}.task-category{min-height:38px;background:var(--surface-soft);color:var(--muted);border:1px solid var(--line);font-weight:500}.task-category.chosen{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}.audit-toggle{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:18px;padding:12px;background:var(--surface-soft);border-radius:12px}.audit-toggle .caption{margin-top:3px}
input,textarea{box-sizing:border-box;width:100%;background:var(--surface-soft);border:1px solid var(--line);border-radius:12px;color:var(--text);font-size:13px;padding:12px;line-height:1.6}input{height:46px}textarea{height:124px}.field-placeholder{color:#97988f}input:focus-within,textarea:focus-within{border-color:var(--accent)}.counter{display:block;text-align:right;font-size:11px;color:var(--muted);margin-top:5px}.error{display:block;color:var(--danger);font-size:12px;line-height:1.6;margin-top:8px}.repair-row,.config-row{padding:16px 0;border-bottom:1px solid var(--line)}.repair-row:first-of-type{padding-top:0}.problem{display:block;font-size:14px;line-height:1.8;margin:12px 0;white-space:pre-wrap;overflow-wrap:anywhere}.status{font-size:11px;flex:none;padding:4px 8px;border-radius:6px;background:var(--accent-soft);color:var(--accent)}.status.completed{background:var(--surface-soft);color:var(--success)}.complete-button{margin-top:14px;width:100%}.completed-by{color:var(--success)}
.workspace-header{padding-top:var(--app-header-padding-top,calc(20px + env(safe-area-inset-top)))}
</style>
