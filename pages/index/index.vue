<template>
	<view class="app-shell" :style="navigationStyle">
		<view class="ambient ambient-one"></view>
		<view class="ambient ambient-two"></view>

		<view class="topbar">
			<view class="topbar-brand">
				<text class="eyebrow">{{ storeName }}</text>
				<view class="topbar-title-row">
					<text class="topbar-title">{{ currentTitle }}</text>
					<text class="live-time">{{ liveTime }}</text>
				</view>
			</view>
			<view class="top-actions">
				<button class="repair-entry" @click="openWorkspace('repairs')">维修<text v-if="pendingRepairCount" class="repair-count">{{ pendingRepairBadge }}</text></button>
				<view class="icon-button" @click="openNotifications">
					<text class="icon-glyph">◌</text>
					<text v-if="unreadCount" class="notification-dot">{{ unreadCount }}</text>
				</view>
				<view class="avatar" @click="openMyPage"><text>{{ role === 'employee' ? myInitial : '店' }}</text></view>
			</view>
		</view>

		<scroll-view v-if="role === 'employee' && activeTab === 'home'" scroll-y class="page-scroll">
			<view class="page-content home-page">
				<view class="greeting-block">
					<view><text class="greeting">{{ greetingText }}，{{ myName }}</text><text class="subtle">当前还有 {{ activeOrdersCount }} 个订单待完成</text></view>
					<view class="status-chip"><text class="pulse"></text>在岗中</view>
				</view>
				<view class="score-band" @click="activeTab = 'points'">
					<view><text class="band-kicker">我的积分</text><view class="score-number-row"><text class="score-number">{{ employeePoints }}</text><text class="score-unit">分</text></view></view>
					<view class="score-meta"><text class="positive">今日 +{{ todayPoints }}</text><text>门店第 {{ myRank }} 名 〉</text></view>
				</view>
				<view class="section-heading">
					<view><text class="section-title">正在进行</text><text class="section-caption">按顺序推进当前订单</text></view>
					<text class="text-link" @click="activeTab = 'orders'">全部订单</text>
				</view>
				<view v-if="activeOrder" class="active-order" @click="openOrder(activeOrder)">
					<view class="order-topline">
						<view class="theme-mark">{{ activeOrder.theme.slice(0, 1) }}</view>
						<view class="grow"><text class="order-theme">{{ activeOrder.theme }}</text><text class="order-meta">{{ activeOrder.time }} · {{ activeOrder.people }}人</text></view>
						<view class="state-label warning">{{ orderStatus(activeOrder) }}</view>
					</view>
					<view class="progress-track"><view class="progress-fill" :style="{ width: orderProgress(activeOrder) + '%' }"></view></view>
					<view class="next-action-row">
						<view><text class="next-label">下一步</text><text class="next-title">{{ nextStep(activeOrder).label }}</text></view>
						<button class="compact-primary" @click.stop="quickAdvance(activeOrder)">立即处理</button>
					</view>
				</view>
				<view v-if="!activeOrder" class="helper-strip"><text>当前没有待处理订单，已完成订单由店长查看。</text></view>
				<view class="quick-grid">
					<view class="quick-action primary-quick" @click="activeTab = 'points'"><text class="quick-symbol">＋</text><text class="quick-title">完成积分任务</text><text class="quick-caption">{{ tasks.length }} 项可选</text></view>
					<view class="quick-action" @click="showOrderForm('create')"><text class="quick-symbol">⌁</text><text class="quick-title">创建订单</text><text class="quick-caption">录入预约信息</text></view>
					<view class="quick-action" @click="activeTab = 'grab'"><text class="quick-symbol">⚡</text><text class="quick-title">抢临时任务</text><text class="quick-caption">{{ openJobs.length }} 个待抢</text></view>
				</view>
				<view class="section-heading compact-heading"><view><text class="section-title">门店动态</text></view><text class="text-link" @click="openNotifications">查看全部</text></view>
				<view class="activity-list">
					<view v-for="item in notifications.slice(0, 3)" :key="item.id" class="activity-row">
						<view class="activity-icon" :class="item.type">{{ item.icon }}</view>
						<view class="grow"><text class="activity-title">{{ item.title }}</text><text class="activity-detail">{{ item.detail }}</text></view>
						<text class="activity-time">{{ formatTime(item.time) }}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<scroll-view v-if="role === 'employee' && activeTab === 'points'" scroll-y class="page-scroll">
			<view class="page-content">
				<view class="points-header">
					<view><text class="points-total">{{ employeePoints }}</text><text class="points-unit">总积分</text></view>
					<view class="rank-block"><text class="rank-value">#{{ myRank }}</text><text class="rank-label">本月排名</text></view>
					<view class="rank-block"><text class="rank-value">+{{ todayPoints }}</text><text class="rank-label">今日获得</text></view>
				</view>
				<view class="segmented">
					<view :class="['segment', pointView === 'tasks' && 'active']" @click="pointView = 'tasks'">任务</view>
					<view :class="['segment', pointView === 'ledger' && 'active']" @click="pointView = 'ledger'">明细</view>
					<view :class="['segment', pointView === 'rank' && 'active']" @click="pointView = 'rank'">排行</view>
				</view>
				<template v-if="pointView === 'tasks'">
					<scroll-view scroll-x class="filter-scroll" :show-scrollbar="false"><view class="filter-row"><view v-for="filter in taskFilters" :key="filter.id" :class="['filter-chip', taskFilter === filter.id && 'active']" @click="taskFilter = filter.id">{{ filter.label }}</view></view></scroll-view>
					<view class="helper-strip"><text class="helper-icon">i</text><text>普通任务立即到账，打扫类需店长审核</text></view>
					<view class="task-list">
						<view v-for="task in filteredTasks" :key="task.id" class="task-row" @click="tapPointTask(task)">
							<view :class="['task-point', task.audit && 'audit']"><text>+{{ task.points }}</text><text class="tiny">分</text></view>
							<view class="grow task-copy"><text class="task-title">{{ task.title }}</text><view class="task-meta-row"><text>{{ task.category }}</text><text v-if="task.audit" class="audit-badge">需审核</text><text v-if="task.count">今日 {{ task.count }} 次</text></view></view>
							<text class="row-arrow">＋</text>
						</view>
					</view>
				</template>
				<view v-else-if="pointView === 'ledger'" class="ledger-list">
					<view v-for="entry in employeePointLedger" :key="entry.id" class="ledger-row"><view class="ledger-date full-date">{{ formatTime(entry.occurredAt) }}</view><view class="grow"><text class="task-title">{{ entry.title }}</text><text class="task-meta-row">{{ entry.state }}</text></view><text :class="['ledger-points', entry.points > 0 ? 'positive' : 'negative']">{{ entry.points > 0 ? '+' : '' }}{{ entry.points }}</text></view>
					<view v-if="!employeePointLedger.length" class="empty-state compact-empty"><text class="empty-title">近一个月暂无积分明细</text><text class="subtle">新记录会在这里保留一个月</text></view>
				</view>
				<view v-else class="ranking-list">
					<view v-for="(person, index) in rankedStaff" :key="person.id" :class="['ranking-row', person.id === myId && 'me']"><text class="ranking-index">{{ index + 1 }}</text><view class="small-avatar">{{ person.name.slice(0, 1) }}</view><view class="grow"><text class="task-title">{{ person.name }}<text v-if="person.id === myId" class="me-label">我</text></text><text class="task-meta-row">本月完成 {{ person.tasks }} 项</text></view><text class="rank-points">{{ person.points }}</text></view>
				</view>
			</view>
		</scroll-view>

		<scroll-view v-if="role === 'employee' && activeTab === 'grab'" scroll-y class="page-scroll">
			<view class="page-content">
				<view class="job-overview"><view><text class="large-title">抢单大厅</text><text class="subtle">先到先得，抢到即结束</text></view><view class="job-count"><text>{{ openJobs.length }}</text><text>待抢</text></view></view>
				<view class="segmented two"><view :class="['segment', jobView === 'open' && 'active']" @click="jobView = 'open'">待抢任务</view><view :class="['segment', jobView === 'mine' && 'active']" @click="jobView = 'mine'">我的记录</view></view>
				<view class="job-list">
					<view v-for="job in visibleJobs" :key="job.id" class="job-item">
						<view class="job-head"><text :class="['urgency', job.urgency]">{{ urgencyText(job.urgency) }}</text><text class="job-time">发布 {{ formatTime(job.publishedAt) }}</text></view>
						<text class="job-title">{{ job.title }}</text><text class="job-desc">{{ job.description }}</text>
						<view class="job-footer"><view><text class="publisher">店长发布</text><text v-if="job.deadline" class="deadline">截止 {{ job.deadline }}</text></view><button v-if="job.status === 'open'" class="grab-button" @click="grabJob(job)">立即抢单</button><view v-else class="claimed-state"><text>✓</text>{{ job.claimedBy }} · {{ formatTime(job.claimedAt) }} 抢到</view></view>
					</view>
					<view v-if="!visibleJobs.length" class="empty-state"><text class="empty-symbol">⌁</text><text class="empty-title">暂时没有任务</text><text class="subtle">新任务发布后会第一时间显示</text></view>
				</view>
			</view>
		</scroll-view>

		<scroll-view v-if="activeTab === 'orders'" scroll-y class="page-scroll">
			<view class="page-content">
				<view class="list-heading-row"><view><text class="large-title">订单进度</text><text class="subtle">{{ activeOrdersCount }} 个进行中</text></view><button class="add-button" @click="showOrderForm('create')">＋ 创建</button></view>
				<scroll-view scroll-x class="filter-scroll" :show-scrollbar="false"><view class="filter-row"><view v-for="filter in orderFilters" :key="filter.id" :class="['filter-chip', orderFilter === filter.id && 'active']" @click="orderFilter = filter.id">{{ filter.label }}</view></view></scroll-view>
				<view class="order-list">
					<view v-for="order in filteredOrders" :key="order.id" class="order-list-item" @click="openOrder(order)">
						<view class="order-list-head"><view class="theme-mark small">{{ order.theme.slice(0, 1) }}</view><view class="grow"><text class="order-theme">{{ order.theme }}</text><text class="order-meta">{{ order.time }} · {{ order.people }}人</text></view><text :class="['state-label', statusTone(order)]">{{ orderStatus(order) }}</text></view>
						<view class="word-progress"><text v-for="step in compactSteps(order)" :key="step.key" :class="['word-node', step.done && 'done', step.current && 'current', order.cancelled && 'cancelled']" :aria-label="step.label + (step.done ? '已完成' : step.current ? '当前节点' : '未开始')">{{ step.label }}</text></view>
						<view class="order-list-foot"><text>下一步：{{ nextStep(order).label }}</text><text>{{ lastOperator(order) }}</text></view>
					</view>
					<view v-if="!filteredOrders.length" class="empty-state"><text class="empty-title">{{ orderFilter === 'editing' ? '暂无待剪辑订单' : '暂无符合条件的订单' }}</text><text class="subtle">{{ role === 'employee' ? '已完成订单已隐藏，可创建新订单或切换筛选。' : '可创建新订单或切换筛选查看。' }}</text></view>
				</view>
			</view>
		</scroll-view>

		<scroll-view v-if="role === 'employee' && activeTab === 'me'" scroll-y class="page-scroll">
			<view class="page-content profile-page">
				<view class="profile-hero"><view class="profile-avatar">{{ myInitial }}</view><view><text class="profile-name">{{ myName }}</text><text class="subtle">员工 · {{ storeName }}</text></view><view class="status-chip"><text class="pulse"></text>在岗</view></view>
				<view class="profile-stats"><view><text>{{ employeePoints }}</text><text>积分</text></view><view><text>{{ myCompletedJobs }}</text><text>抢单</text></view><view><text>{{ myStepCount }}</text><text>订单节点</text></view></view>
				<view class="settings-list">
					<view class="setting-row" @click="openNotifications"><text class="setting-symbol">◌</text><text class="grow">消息通知</text><text class="setting-value">{{ unreadCount }} 条未读</text><text>›</text></view>
					<view class="setting-row" @click="pointView = 'ledger'; activeTab = 'points'"><text class="setting-symbol">◇</text><text class="grow">积分明细</text><text>›</text></view>
					<view class="setting-row" @click="jobView = 'mine'; activeTab = 'grab'"><text class="setting-symbol">⚡</text><text class="grow">我的抢单</text><text>›</text></view>
					<view class="setting-row" @click="openPasswordForm"><text class="setting-symbol">◈</text><text class="grow">修改登录密码</text><text class="setting-value">{{ myPhone }}</text><text>›</text></view>
					<view class="setting-row" @click="openAgreement('terms')"><text class="setting-symbol">§</text><text class="grow">用户服务协议</text><text>›</text></view><view class="setting-row" @click="openAgreement('privacy')"><text class="setting-symbol">◎</text><text class="grow">隐私政策</text><text>›</text></view><view class="setting-row" @click="confirmLogout"><text class="setting-symbol">⇄</text><text class="grow">退出登录</text><text class="setting-value">切换账号</text><text>›</text></view>
				</view>
				<text class="version">暗格门店 · 1.1.0</text>
			</view>
		</scroll-view>

		<scroll-view v-if="role === 'manager' && activeTab === 'dashboard'" scroll-y class="page-scroll">
			<view class="page-content">
				<view class="manager-intro"><view><text class="greeting">{{ managerOverviewTitle }}</text><text class="subtle">店长不在店，也能掌握每一步</text></view><view class="remote-chip">远程在线</view></view>
				<view class="daily-receipts">
					<view class="receipt-heading"><text class="section-title">今日收款</text><text class="section-caption">{{ formatDate(receiptDate) }}</text></view>
					<view class="receipt-channels"><view><text>微信</text><text>¥{{ money(dailyReceipts.wechat) }}</text></view><view><text>支付宝</text><text>¥{{ money(dailyReceipts.alipay) }}</text></view><view><text>现金</text><text>¥{{ money(dailyReceipts.cash) }}</text></view></view>
					<view class="receipt-total"><text>三项合计</text><text>¥{{ money(dailyReceipts.total) }}</text></view>
					<text class="receipt-note">按收款日期统计，线上不计入合计。取消或删除订单会自动冲正对应收款。</text>
					<view class="receipt-history-title"><text>近 7 日收款记录</text><text>每日三渠道合计</text></view>
					<view class="receipt-history"><view v-for="day in sevenDayReceipts" :key="day.date" class="receipt-history-row"><text>{{ day.label }}</text><text>微 {{ money(day.wechat) }} · 支 {{ money(day.alipay) }} · 现 {{ money(day.cash) }}</text><text>¥{{ money(day.total) }}</text></view></view>
				</view>
				<view class="metric-strip"><view><text class="metric-value">{{ activeOrdersCount }}</text><text class="metric-label">进行中订单</text></view><view><text class="metric-value">{{ pendingAudits.length }}</text><text class="metric-label">待审核任务</text></view><view><text class="metric-value">{{ openJobs.length }}</text><text class="metric-label">待抢任务</text></view></view>
				<view v-if="pendingAudits.length" class="attention-band" @click="activeTab = 'review'"><view class="attention-symbol">!</view><view class="grow"><text class="attention-title">{{ pendingAudits.length }} 条打扫任务待审核</text><text class="attention-copy">最早提交于 {{ formatTime(pendingAudits[0].submittedAt) }}</text></view><text>›</text></view>
				<view class="section-heading"><view><text class="section-title">订单现场</text><text class="section-caption">最近更新优先</text></view><text class="text-link" @click="activeTab = 'orders'">全部</text></view>
				<view class="manager-order-list"><view v-for="order in orders.slice(0,6)" :key="order.id" class="manager-order-row" @click="openOrder(order)"><view class="theme-mark small">{{ order.theme.slice(0,1) }}</view><view class="grow"><text class="task-title">{{ order.theme }}</text><text class="task-meta-row">{{ order.time }} · {{ orderStatus(order) }}</text></view><view class="manager-progress"><text>{{ completedCount(order) }}/{{ totalSteps(order) }}</text><view class="tiny-track"><view :style="{width: orderProgress(order)+'%'}"></view></view></view></view></view>
				<view class="section-heading compact-heading"><view><text class="section-title">今日员工</text></view><text class="text-link" @click="openStaffManagement('ranking')">积分排行</text></view>
				<view class="staff-line"><view v-for="person in rankedStaff.slice(0,4)" :key="person.id" class="staff-item" @click="openStaffActions(person)"><view class="small-avatar">{{ person.name.slice(0,1) }}</view><text>{{ person.name }}</text><text class="staff-score">{{ person.points }}</text></view></view>
			</view>
		</scroll-view>

		<scroll-view v-if="role === 'manager' && activeTab === 'review'" scroll-y class="page-scroll">
			<view class="page-content">
				<view class="list-heading-row"><view><text class="large-title">打扫审核</text><text class="subtle">通过后积分才到账</text></view><view class="review-count">{{ pendingAudits.length }}</view></view>
				<view class="segmented two"><view :class="['segment', reviewView === 'pending' && 'active']" @click="reviewView='pending'">待审核</view><view :class="['segment', reviewView === 'history' && 'active']" @click="reviewView='history'">审核记录</view></view>
				<view v-if="reviewView === 'pending'" class="audit-list">
					<view v-for="audit in pendingAudits" :key="audit.id" class="audit-item"><view class="audit-top"><view class="small-avatar">{{ audit.employee.slice(0,1) }}</view><view class="grow"><text class="task-title">{{ audit.employee }}</text><text class="task-meta-row">提交于 {{ formatTime(audit.submittedAt) }}</text></view><text class="audit-points">+{{ audit.points }}</text></view><text class="audit-task-title">{{ audit.title }}</text><view class="audit-actions"><button class="secondary-button danger-text" @click="rejectAudit(audit)">驳回</button><button class="primary-button" @click="approveAudit(audit)">通过并发放积分</button></view></view>
					<view v-if="!pendingAudits.length" class="empty-state"><text class="empty-symbol">✓</text><text class="empty-title">全部审核完成</text><text class="subtle">新的打扫任务会出现在这里</text></view>
				</view>
				<view v-else class="ledger-list"><view v-for="record in auditHistory" :key="record.id" class="ledger-row"><view :class="['result-icon', record.result]">{{ record.result === 'approved' ? '✓' : '×' }}</view><view class="grow"><text class="task-title">{{ record.title }}</text><text class="task-meta-row">{{ record.employee }} · {{ formatTime(record.time) }}</text></view><text :class="['review-result', record.result]">{{ record.result === 'approved' ? '已通过' : '已驳回' }}</text></view></view>
			</view>
		</scroll-view>

		<scroll-view v-if="role === 'manager' && activeTab === 'publish'" scroll-y class="page-scroll">
			<view class="page-content">
				<view><text class="large-title">发布临时任务</text><text class="subtle">员工抢到后任务立即结束</text></view>
				<view class="publish-form">
					<view class="field"><text class="field-label">任务标题</text><input v-model="jobForm.title" maxlength="30" placeholder="例如：补充前台饮用水" placeholder-class="placeholder" /></view>
					<view class="field"><text class="field-label">任务说明</text><textarea v-model="jobForm.description" maxlength="120" placeholder="说明要做什么，以及完成标准" placeholder-class="placeholder" /></view>
					<view class="field"><text class="field-label">截止时间（可选）</text><input v-model="jobForm.deadline" placeholder="例如：今晚 22:00" placeholder-class="placeholder" /></view>
					<view class="field"><text class="field-label">紧急程度</text><view class="choice-row"><view v-for="level in urgencyOptions" :key="level.id" :class="['choice-chip', jobForm.urgency === level.id && 'active']" @click="jobForm.urgency = level.id">{{ level.label }}</view></view></view>
					<view class="field"><view class="toggle-row"><view><text class="field-label inline">限制可抢员工</text><text class="field-help">关闭时全店员工可见</text></view><switch :checked="jobForm.restricted" color="#e9aa3a" @change="toggleJobRestriction" /></view></view>
					<view v-if="jobForm.restricted" class="restricted-picker"><text class="field-label">选择可抢员工</text><view class="staff-choice-grid"><view v-for="person in activeStaff" :key="person.id" :class="['staff-choice', jobForm.allowedEmployees.includes(person.name) && 'active']" @click="toggleAllowedEmployee(person.name)"><view class="small-avatar">{{ person.name.slice(0,1) }}</view><text>{{ person.name }}</text><text class="choice-mark">{{ jobForm.allowedEmployees.includes(person.name) ? '✓' : '＋' }}</text></view></view><text class="field-help">已选择 {{ jobForm.allowedEmployees.length }} 人，只有这些员工能看到并抢到任务。</text></view>
					<button class="primary-button full" @click="publishJob">发布任务</button>
				</view>
				<view class="section-heading compact-heading"><view><text class="section-title">最近发布</text></view><text class="section-caption">共 {{ jobs.length }} 条</text></view>
				<view class="published-list"><view v-for="job in jobs.slice(0,4)" :key="job.id" class="published-row"><view><text :class="['urgency-dot', job.urgency]"></text></view><view class="grow"><text class="task-title">{{ job.title }}</text><text class="task-meta-row">发布 {{ formatTime(job.publishedAt) }}{{ job.status === 'open' ? (job.restricted ? ' · 限 ' + job.allowedEmployees.join('、') + ' 可抢' : ' · 全店等待抢单') : ' · ' + job.claimedBy + ' 于 ' + formatTime(job.claimedAt) + ' 抢到' }}</text></view><button v-if="job.status === 'open'" class="text-button danger-text" @click="cancelJob(job)">取消</button><text v-else class="done-mark">已结束</text></view></view>
			</view>
		</scroll-view>

		<scroll-view v-if="role === 'manager' && activeTab === 'managerMe'" scroll-y class="page-scroll">
			<view class="page-content profile-page">
				<view class="profile-hero"><view class="profile-avatar manager">店</view><view><text class="profile-name">{{ myName }}</text><text class="subtle">店长 · {{ storeName }}</text></view><view class="remote-chip">远程在线</view></view>
				<view class="settings-list config-entries"><view class="setting-row" @click="openWorkspace('points')"><text class="setting-symbol">◇</text><text class="grow">积分任务设置</text><text class="setting-value">名称与奖励积分</text><text>›</text></view><view class="setting-row" @click="openWorkspace('themes')"><text class="setting-symbol">⌂</text><text class="grow">主题管理</text><text class="setting-value">{{ themeOptions.length }} 个主题</text><text>›</text></view></view>
				<view class="settings-list"><view class="setting-row" @click="openNotifications"><text class="setting-symbol">◌</text><text class="grow">门店通知</text><text class="setting-value">{{ unreadCount }} 条未读</text><text>›</text></view><view class="setting-row" @click="activeTab='review'"><text class="setting-symbol">✓</text><text class="grow">审核记录</text><text>›</text></view><view class="setting-row" @click="openStaffManagement('manage')"><text class="setting-symbol">♙</text><text class="grow">员工管理</text><text class="setting-value">{{ activeStaff.length }} 人在职</text><text>›</text></view><view class="setting-row" @click="openPasswordForm"><text class="setting-symbol">◈</text><text class="grow">修改登录密码</text><text class="setting-value">{{ myPhone }}</text><text>›</text></view><view class="setting-row" @click="openAgreement('terms')"><text class="setting-symbol">§</text><text class="grow">用户服务协议</text><text>›</text></view><view class="setting-row" @click="openAgreement('privacy')"><text class="setting-symbol">◎</text><text class="grow">隐私政策</text><text>›</text></view><view class="setting-row" @click="confirmLogout"><text class="setting-symbol">⇄</text><text class="grow">退出登录</text><text class="setting-value">切换账号</text><text>›</text></view></view>
			</view>
		</scroll-view>

		<view class="tabbar"><view v-for="tab in currentTabs" :key="tab.id" :class="['tab-item', activeTab === tab.id && 'active']" @click="activeTab = tab.id"><text class="tab-icon">{{ tab.icon }}</text><text>{{ tab.label }}</text><text v-if="tab.badge" class="tab-badge">{{ tab.badge }}</text></view></view>

		<view v-if="selectedOrder && canViewOrder(selectedOrder)" class="overlay-page">
			<view class="overlay-header"><view class="back-button" @click="selectedOrder = null">‹</view><view class="overlay-heading"><text>{{ selectedOrder.theme }}</text><text>{{ selectedOrder.time }} · {{ selectedOrder.people }}人</text></view><view class="more-button" @click="toggleOrderMenu">•••</view></view>
			<scroll-view scroll-y class="overlay-scroll"><view class="order-detail-content">
				<view class="detail-status-panel"><view><text class="band-kicker">当前状态</text><text class="detail-status">{{ orderStatus(selectedOrder) }}</text></view><view class="detail-percent">{{ orderProgress(selectedOrder) }}%</view><view class="progress-track wide"><view class="progress-fill" :style="{width: orderProgress(selectedOrder)+'%'}"></view></view><text class="detail-next">下一步：{{ nextStep(selectedOrder).label }}</text></view>
				<view class="detail-info-line"><view><text class="info-label">客户</text><text>{{ selectedOrder.contact || '未填写' }}</text></view><view><text class="info-label">创建人</text><text>{{ selectedOrder.creator }}</text></view><view><text class="info-label">备注</text><text>{{ selectedOrder.note || '无' }}</text></view></view>
				<view class="timeline-heading"><text class="section-title">流程节点</text><text class="section-caption">已完成节点为灰色，待处理节点高亮</text></view>
				<view class="timeline">
					<view v-for="(step, index) in visibleSteps(selectedOrder)" :key="step.key" :class="['timeline-step', stepState(selectedOrder, step, index)]">
						<view class="timeline-rail"><view class="timeline-node">{{ stepDone(selectedOrder, step.key) ? '✓' : index + 1 }}</view><view v-if="index < visibleSteps(selectedOrder).length-1" class="timeline-line"></view></view>
						<view class="timeline-content"><view class="timeline-title-row"><text class="timeline-title">{{ stepDisplayLabel(selectedOrder, step) }}</text><text v-if="stepDone(selectedOrder, step.key)" class="timeline-time">{{ formatTime(stepRecord(selectedOrder, step.key).time) }}</text></view><text v-if="stepDone(selectedOrder, step.key)" class="timeline-operator">{{ stepRecord(selectedOrder, step.key).operator }} 完成</text><text v-else-if="isCurrentStep(selectedOrder, step.key)" class="timeline-hint">现在需要完成此节点</text><text v-else class="timeline-hint">等待前置节点完成</text>
							<view v-if="step.key === 'payment' && stepDone(selectedOrder, 'payment')" class="payment-record"><text>{{ receiptFor(selectedOrder) ? receiptSummary(receiptFor(selectedOrder)) : '历史收款未登记金额，不计入合计' }}</text><text v-if="receiptFor(selectedOrder)">{{ formatTime(receiptFor(selectedOrder).receivedAt || receiptFor(selectedOrder).date) }} 收款</text><text v-if="receiptFor(selectedOrder)?.status === 'reversed'" class="danger-text">已于 {{ formatTime(receiptFor(selectedOrder).reversedAt) }} 冲正</text></view>
							<PaymentForm v-if="isCurrentStep(selectedOrder, step.key) && step.key === 'payment'" :key="selectedOrder.id" :existing="receiptFor(selectedOrder)" @submit="saveOrderPayment(selectedOrder, $event)" />
							<view v-else-if="isCurrentStep(selectedOrder, step.key) && step.key === 'photo'" class="branch-actions"><button class="branch-button" @click="chooseBranch(selectedOrder, 'photo', '要拍照')">要拍照</button><button class="branch-button secondary" @click="chooseBranch(selectedOrder, 'photo', '不要拍照')">不要拍照</button></view>
							<view v-else-if="isCurrentStep(selectedOrder, step.key) && step.key === 'video'" class="branch-actions"><button class="branch-button" @click="chooseBranch(selectedOrder, 'video', '要视频')">要视频</button><button class="branch-button secondary" @click="chooseBranch(selectedOrder, 'video', '不要视频')">不要视频</button></view>
							<button v-else-if="isCurrentStep(selectedOrder, step.key)" class="step-action" @click="completeOrderStep(selectedOrder, step)">{{ step.key === 'start' ? '点击《' + selectedOrder.theme + '》开始' : step.key === 'edit' ? '确认剪辑完毕' : '确认完成此节点' }}</button>
						</view>
					</view>
				</view><view class="detail-spacer"></view>
			</view></scroll-view>
		</view>

		<view v-if="showOrderMenu && selectedOrder" class="sheet-mask" @click="showOrderMenu=false"><view class="bottom-sheet" @click.stop><view class="sheet-handle"></view><text class="sheet-title">订单操作</text><view class="sheet-action" @click="showOrderForm('edit', selectedOrder)"><text>编辑订单内容</text><text>›</text></view><view v-if="role === 'manager'" class="sheet-action" @click="openCorrection(selectedOrder)"><text>修正流程节点</text><text>›</text></view><view v-if="role === 'manager'" class="sheet-action danger-text" @click="cancelOrder(selectedOrder)"><text>取消订单</text><text>›</text></view><view v-if="role === 'manager'" class="sheet-action danger-text" @click="deleteOrder(selectedOrder)"><text>删除订单</text><text>›</text></view><button class="sheet-cancel" @click="showOrderMenu=false">关闭</button></view></view>

		<view v-if="orderFormVisible" class="overlay-page form-overlay">
			<view class="overlay-header"><view class="back-button" @click="orderFormVisible=false">‹</view><view class="overlay-heading"><text>{{ orderFormMode === 'create' ? '创建订单' : '编辑订单' }}</text><text>员工可创建和修改订单内容</text></view><view></view></view>
			<scroll-view scroll-y class="overlay-scroll"><view class="form-content">
				<view class="field"><text class="field-label">密室主题</text><view class="theme-selector"><view v-for="theme in orderThemeOptions" :key="theme" :class="['theme-option', orderForm.theme === theme && 'active']" @click="orderForm.theme = theme">{{ theme }}</view></view><text v-if="!orderThemeOptions.length" class="field-help">暂无主题，请店长先在「我的 → 主题管理」中添加。</text></view>
				<view class="field two-fields"><view><text class="field-label">预约时间</text><input v-model="orderForm.time" placeholder="例如：21:30" placeholder-class="placeholder" /></view><view><text class="field-label">游戏人数</text><input v-model="orderForm.people" type="number" placeholder="人数" placeholder-class="placeholder" /></view></view>
				<view class="field"><text class="field-label">客户姓名或联系方式</text><input v-model="orderForm.contact" placeholder="用于门店内部识别" placeholder-class="placeholder" /></view>
				<view class="field"><text class="field-label">订单备注</text><textarea v-model="orderForm.note" maxlength="100" placeholder="生日场、迟到、特殊要求等" placeholder-class="placeholder" /></view>
				<view class="form-note"><text class="helper-icon">i</text><text>员工可以修改订单内容，但只有店长能取消或删除订单。</text></view><button class="primary-button full sticky-submit" @click="saveOrder">{{ orderFormMode === 'create' ? '创建订单' : '保存修改' }}</button>
			</view></scroll-view>
		</view>

		<view v-if="correctionVisible" class="sheet-mask" @click="correctionVisible=false"><view class="bottom-sheet tall" @click.stop><view class="sheet-handle"></view><text class="sheet-title">修正流程节点</text><text class="sheet-subtitle">选择需要重新处理的节点；退回“收钱”后可以修改原收款金额</text><scroll-view scroll-x class="correction-scroll"><view class="correction-options"><view v-for="step in coreSteps" :key="step.key" :class="['correction-chip', correctionTarget === step.key && 'active']" @click="correctionTarget = step.key">{{ step.label }}</view></view></scroll-view><view class="field"><text class="field-label">修正原因（必填）</text><textarea v-model="correctionReason" placeholder="说明为什么需要回退节点" placeholder-class="placeholder" /></view><button class="primary-button full" @click="applyCorrection">确认回退并保留日志</button><button class="sheet-cancel" @click="correctionVisible=false">取消</button></view></view>

		<view v-if="staffManagementVisible" class="overlay-page staff-overlay">
			<view class="overlay-header"><view class="back-button" @click="closeStaffManagement">‹</view><view class="overlay-heading"><text>{{ staffView === 'ranking' ? '员工积分排行' : '员工管理' }}</text><text>{{ activeStaff.length }} 人在职 · {{ inactiveStaff.length }} 人停用</text></view><view class="header-add" @click="addStaff">＋</view></view>
			<scroll-view scroll-y class="overlay-scroll"><view class="staff-content">
				<view class="staff-summary"><view><text class="summary-value">{{ activeStaff.length }}</text><text class="summary-label">在职员工</text></view><view><text class="summary-value">{{ totalStaffPoints }}</text><text class="summary-label">团队总积分</text></view><view><text class="summary-value">{{ totalStaffTasks }}</text><text class="summary-label">完成任务</text></view></view>
				<view class="segmented two"><view :class="['segment', staffView === 'ranking' && 'active']" @click="staffView='ranking'">积分排行</view><view :class="['segment', staffView === 'manage' && 'active']" @click="staffView='manage'">员工管理</view></view>
				<view v-if="staffView === 'ranking'" class="ranking-list"><view v-for="(person,index) in rankedStaff" :key="person.id" class="ranking-row" @click="openStaffActions(person)"><text class="ranking-index">{{ index+1 }}</text><view class="small-avatar">{{ person.name.slice(0,1) }}</view><view class="grow"><text class="task-title">{{ person.name }}</text><text class="task-meta-row">完成 {{ person.tasks }} 项 · 在职</text></view><text class="rank-points">{{ person.points }}</text></view></view>
				<view v-else class="staff-management-list"><view v-for="person in staffByStatus" :key="person.id" class="staff-manage-row" @click="openStaffActions(person)"><view :class="['small-avatar', person.status === 'inactive' && 'inactive']">{{ person.name.slice(0,1) }}</view><view class="grow"><view class="staff-name-line"><text class="task-title">{{ person.name }}</text><text :class="['employment-state', person.status]">{{ person.status === 'active' ? '在职' : '已停用' }}</text></view><text class="task-meta-row">{{ person.points }} 积分 · 完成 {{ person.tasks }} 项</text></view><text class="row-arrow">›</text></view><button class="primary-button full add-staff-button" @click="addStaff">＋ 添加员工</button></view>
			</view></scroll-view>
		</view>

		<view v-if="staffActionVisible && selectedStaff" class="sheet-mask" @click="closeStaffActions"><view class="bottom-sheet" @click.stop><view class="sheet-handle"></view><view class="staff-sheet-head"><view class="profile-avatar compact">{{ selectedStaff.name.slice(0,1) }}</view><view><text class="sheet-title">{{ selectedStaff.name }}</text><text class="sheet-subtitle">{{ selectedStaff.points }} 积分 · 完成 {{ selectedStaff.tasks }} 项</text></view></view><view class="sheet-action" @click="openStaffLedger(selectedStaff)"><text>查看积分明细</text><text>近一个月 ›</text></view><view class="sheet-action" @click="adjustStaffPoints(selectedStaff)"><text>调整员工积分</text><text>›</text></view><view class="sheet-action" @click="resetStaffPassword(selectedStaff)"><text>重置登录密码</text><text>›</text></view><view :class="['sheet-action', selectedStaff.status === 'active' && 'danger-text']" @click="toggleStaffStatus(selectedStaff)"><text>{{ selectedStaff.status === 'active' ? '停用员工账号' : '恢复员工账号' }}</text><text>›</text></view><view class="sheet-action danger-text" @click="removeStaffAccount(selectedStaff)"><text>删除员工账号</text><text>›</text></view><button class="sheet-cancel" @click="closeStaffActions">关闭</button></view></view>

		<view v-if="staffLedgerVisible && ledgerStaff" class="overlay-page staff-ledger-overlay"><view class="overlay-header"><view class="back-button" @click="closeStaffLedger">‹</view><view class="overlay-heading"><text>{{ ledgerStaff.name }}的积分明细</text><text>近一个月 · 当前 {{ ledgerStaff.points }} 分</text></view><view></view></view><scroll-view scroll-y class="overlay-scroll"><view class="staff-ledger-content"><view class="helper-strip"><text class="helper-icon">i</text><text>记录保留一个月。店长可撤销已到账的单笔正积分，撤销后总积分同步扣减。</text></view><view class="ledger-list"><view v-for="entry in staffLedgerEntries" :key="entry.id" class="ledger-row staff-ledger-row"><view class="ledger-date full-date">{{ formatTime(entry.occurredAt) }}</view><view class="grow"><text class="task-title">{{ entry.title }}</text><text class="task-meta-row">{{ entry.state }}</text></view><view class="ledger-action"><text :class="['ledger-points', entry.points > 0 ? 'positive' : 'negative']">{{ entry.points > 0 ? '+' : '' }}{{ entry.points }}</text><button v-if="canRevokePoint(entry)" class="revoke-button" @click="revokeStaffPoint(entry)">撤销</button></view></view><view v-if="!staffLedgerEntries.length" class="empty-state compact-empty"><text class="empty-title">近一个月暂无积分明细</text></view></view></view></scroll-view></view>

		<view v-if="notificationsVisible" class="overlay-page"><view class="overlay-header"><view class="back-button" @click="notificationsVisible=false">‹</view><view class="overlay-heading"><text>消息通知</text><text>门店关键操作实时同步</text></view><text class="text-link" @click="markAllRead">全部已读</text></view><scroll-view scroll-y class="overlay-scroll"><view class="notification-list"><view class="wechat-reminder"><view class="grow"><text class="task-title">微信页面提醒</text><text class="activity-detail">订阅后，离开小程序也能收到门店关键消息</text></view><button class="reminder-button" @click="enableWechatReminders">{{ wechatSubscriptionEnabled ? '再次订阅' : '开启提醒' }}</button></view><view v-for="item in notifications" :key="item.id" :class="['notification-row', !item.read && 'unread']" @click="readNotification(item)"><view class="activity-icon" :class="item.type">{{ item.icon }}</view><view class="grow"><view class="notification-title-row"><text class="activity-title">{{ item.title }}</text><text class="activity-time">{{ formatTime(item.time) }}</text></view><text class="activity-detail">{{ item.detail }}</text></view></view></view></scroll-view></view>
		<StoreWorkspace v-if="workspaceVisible" :state="workspaceState" :context="workspaceContext" :actions="workspaceActions" :initial-mode="workspaceMode" :navigation-style="navigationStyle" @close="workspaceVisible=false" @changed="saveWorkspaceChange" />

		<view v-if="passwordVisible" class="overlay-page form-overlay">
			<view class="overlay-header"><view class="back-button" @click="passwordVisible=false">‹</view><view class="overlay-heading"><text>修改登录密码</text><text>{{ myName }} · {{ myPhone }}</text></view><view></view></view>
			<scroll-view scroll-y class="overlay-scroll"><view class="form-content">
				<view class="field"><text class="field-label">原密码</text><input v-model="passwordForm.oldPassword" password maxlength="32" placeholder="当前使用的密码" placeholder-class="placeholder" /></view>
				<view class="field"><text class="field-label">新密码</text><input v-model="passwordForm.newPassword" password maxlength="32" placeholder="至少 6 位" placeholder-class="placeholder" /></view>
				<view class="field"><text class="field-label">再次输入新密码</text><input v-model="passwordForm.confirmPassword" password maxlength="32" placeholder="与上面保持一致" placeholder-class="placeholder" /></view>
				<view class="form-note"><text class="helper-icon">i</text><text>修改后，其它手机上的登录会自动退出。</text></view><button class="primary-button full sticky-submit" @click="submitPassword">保存新密码</button>
			</view></scroll-view>
		</view>

		<view v-if="sessionChecked && !me" class="overlay-page form-overlay">
			<view class="overlay-header"><view></view><view class="overlay-heading"><text>登录门店账号</text><text>{{ storeName }}</text></view><view></view></view>
			<scroll-view scroll-y class="overlay-scroll"><view class="form-content">
				<view class="field"><text class="field-label">手机号</text><input v-model="loginForm.phone" type="number" maxlength="11" placeholder="店长开通账号时登记的手机号" placeholder-class="placeholder" /></view>
				<view class="field"><text class="field-label">密码</text><input v-model="loginForm.password" password maxlength="32" placeholder="初始密码由店长告知" placeholder-class="placeholder" @confirm="login" /></view>
				<view class="form-note"><text class="helper-icon">i</text><text>手机号仅用于门店账号登录与权限管理；密码用于身份核验。忘记密码请联系店长重置。</text></view>
				<view class="form-note" @click="agreed = !agreed"><text class="setting-symbol">{{ agreed ? '✓' : '○' }}</text><text>我已阅读并同意<text class="text-link" @click.stop="openAgreement('terms')">《用户服务协议》</text>与<text class="text-link" @click.stop="openAgreement('privacy')">《隐私政策》</text></text></view>
				<button class="primary-button full sticky-submit" @click="login">{{ loginPending ? '正在登录…' : '登录' }}</button>
			</view></scroll-view>
		</view>

		<view v-if="agreementPage" class="overlay-page form-overlay">
			<view class="overlay-header"><view class="back-button" @click="agreementPage=''">‹</view><view class="overlay-heading"><text>{{ agreementDoc.title }}</text><text>{{ agreementDoc.updated }}</text></view><view></view></view>
			<scroll-view scroll-y class="overlay-scroll"><view class="form-content">
				<view v-for="(section, index) in agreementDoc.sections" :key="index" class="field"><text class="field-label">{{ section.heading }}</text><text v-for="(line, i) in section.body" :key="i" class="job-desc">{{ line }}</text></view>
			</view></scroll-view>
		</view>
	</view>
</template>

<script>
import { STATE_KEYS, createEmptyAppState, normaliseSnapshotState, isSameOrNewerVersion, loadCachedSnapshot, saveCachedSnapshot, clearCachedSnapshot } from '../../services/app-state.js'
import { storeApi, getToken, setToken, onUnauthorized, newRequestId } from '../../services/store-api.js'
import { readWechatNavigationStyle } from '../../services/navigation-layout.js'
import { LEGAL_DOCS } from '../../services/legal-docs.js'
import StoreWorkspace from '../../components/StoreWorkspace.vue'
import PaymentForm from '../../components/PaymentForm.vue'
import { compactOrderSteps, canViewOrder as roleCanViewOrder, filterOrdersForRole } from '../../services/order-rules.js'
import { formatMoney, paymentSummary, parsePaymentAmounts, todayPaymentTotals, paymentTotalsByDay } from '../../services/payment-rules.js'
import { localDateKey, employeePointEntries, prunePointLedger, canRevokePointEntry } from '../../services/points-rules.js'
import { formatDateTime, formatDateLabel, greetingForDate, nowTimestamp, overviewForDate } from '../../services/time-format.js'
import { configuredTemplateIds, requestWechatSubscription, registerWechatSubscriber, publishWechatNotification } from '../../services/wechat-notifications.js'
import {
	ORDER_STEPS as STEP_DEFINITIONS,
	visibleOrderSteps,
	nextOrderStep,
	orderIsEditing,
	orderIsDone,
	orderProgress as calculateOrderProgress,
	orderStatus as calculateOrderStatus,
	canCompleteStep
} from '../../services/order-rules.js'

const STORE_NAME = '零零谷 · 九汇城店'
const STORE_CODE = 'jiuhuicheng'
// 门店端轮询间隔：先比对版本号（很小的请求），有变化才取完整数据
const POLL_INTERVAL = 8000
const EMPLOYEE_TABS = ['home', 'points', 'grab', 'me']
const MANAGER_TABS = ['dashboard', 'review', 'publish', 'managerMe']
const pad = value => String(value).padStart(2, '0')

export default {
	components: { StoreWorkspace, PaymentForm },
	data() {
		let navigationStyle = {}
		// #ifdef MP-WEIXIN
		navigationStyle = readWechatNavigationStyle(uni)
		// #endif
		return {
			...createEmptyAppState(),
			navigationStyle,
			me: null, sessionChecked: false, syncVersion: '', syncing: false, syncQueued: false, busy: false, pollTimer: null,
			storeCode: STORE_CODE, storeDate: '', storeOffset: 480,
			loginForm: { phone: '', password: '' }, loginPending: false,
			agreed: false, agreementPage: '',
			passwordVisible: false, passwordForm: { oldPassword: '', newPassword: '', confirmPassword: '' },
			staffLedger: [],
			role: 'employee', activeTab: 'home', liveTime: '', currentMoment: Date.now(), timer: null, persistTimer: null, storeName: STORE_NAME,
			pointView: 'tasks', taskFilter: 'all', jobView: 'open', reviewView: 'pending', orderFilter: 'all',
			jobForm: { title:'', description:'', deadline:'', urgency:'normal', restricted:false, allowedEmployees:[] }, urgencyOptions: [{id:'low',label:'普通'},{id:'normal',label:'尽快'},{id:'urgent',label:'紧急'}],
			selectedOrder:null,showOrderMenu:false,orderFormVisible:false,orderFormMode:'create',editingOrderId:null,orderForm:{theme:'',time:'',people:'',contact:'',note:''},
			workspaceVisible:false,workspaceMode:'repairs',
			receiptDate:localDateKey(),
			correctionVisible:false,correctionOrder:null,correctionTarget:'',correctionReason:'',
			staffManagementVisible:false,staffView:'manage',staffActionVisible:false,selectedStaff:null,staffLedgerVisible:false,ledgerStaff:null,
			notificationsVisible:false
		}
	},
	computed: {
		agreementDoc(){return LEGAL_DOCS[this.agreementPage] || LEGAL_DOCS.terms},
		myId(){return this.me?this.me.id:null},
		myName(){return this.me?this.me.name:''},
		myInitial(){return this.myName?this.myName.slice(0,1):'我'},
		myPhone(){return this.me?.phone||''},
		myStepCount(){return Number(this.me?.stepCount||0)},
		storeReference(){const date=new Date(this.currentMoment+this.storeOffset*60000);return new Date(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),12)},
		dailyReceipts(){return this.receiptReport?.today||todayPaymentTotals(this.receipts,this.receiptDate)},
		sevenDayReceipts(){return this.receiptReport?.days||paymentTotalsByDay(this.receipts,7,this.storeReference)},
		greetingText(){return greetingForDate(new Date(this.currentMoment))},
		managerOverviewTitle(){return overviewForDate(new Date(this.currentMoment))},
		themeOptions(){return this.themes.filter(theme=>!theme.deleted).map(theme=>theme.name)},
		orderThemeOptions(){const old=this.orderFormMode==='edit'?this.orders.find(order=>order.id===this.editingOrderId)?.theme:null;return old&&!this.themeOptions.includes(old)?[old,...this.themeOptions]:this.themeOptions},
		pendingRepairCount(){return this.repairs.filter(repair=>repair.status==='pending').length},
		pendingRepairBadge(){return this.pendingRepairCount>99?'99+':String(this.pendingRepairCount||'')},
		workspaceState(){return{themes:this.themes,tasks:this.tasks,repairs:this.repairs}},
		workspaceContext(){return{role:this.role,name:this.actor(),active:this.role==='manager'||this.me?.status!=='inactive',storeId:this.storeCode}},
		workspaceActions(){return{
			createRepair:form=>storeApi.createRepair(form.themeId,form.problem,newRequestId()),
			completeRepair:id=>storeApi.completeRepair(id),
			saveTask:draft=>{const task={title:draft.title,points:String(draft.points??'').trim(),category:draft.category,audit:Boolean(draft.audit)};return draft.id?storeApi.updateTask(draft.id,task):storeApi.addTask(task)},
			saveTheme:draft=>draft.id?storeApi.renameTheme(draft.id,draft.name):storeApi.addTheme(draft.name),
			deleteTheme:id=>storeApi.deleteTheme(id)
		}},
		currentTabs(){return this.role==='employee'?[{id:'home',label:'首页',icon:'⌂'},{id:'points',label:'积分',icon:'◇'},{id:'grab',label:'抢单',icon:'⚡',badge:this.openJobs.length||''},{id:'orders',label:'订单',icon:'☷'},{id:'me',label:'我的',icon:'○'}]:[{id:'dashboard',label:'概览',icon:'⌂'},{id:'review',label:'审核',icon:'✓',badge:this.pendingAudits.length||''},{id:'publish',label:'发布',icon:'＋'},{id:'orders',label:'订单',icon:'☷'},{id:'managerMe',label:'我的',icon:'○'}]},
		currentTitle(){const found=this.currentTabs.find(t=>t.id===this.activeTab);return found?found.label:'暗格门店'},
		unreadCount(){return this.notifications.filter(i=>!i.read).length},
		activeStaff(){return this.ranking.filter(person=>person.status!=='inactive')},
		inactiveStaff(){return this.ranking.filter(person=>person.status==='inactive')},
		rankedStaff(){return[...this.activeStaff].sort((a,b)=>b.points-a.points)},
		staffByStatus(){return[...this.ranking].sort((a,b)=>{if(a.status!==b.status)return a.status==='active'?-1:1;return b.points-a.points})},
		myRank(){const index=this.rankedStaff.findIndex(person=>person.id===this.myId);return index<0?'—':index+1},
		employeePointLedger(){return prunePointLedger(this.pointLedger.filter(entry=>entry.employeeId===undefined?entry.employee===this.myName:entry.employeeId===this.myId),new Date(this.currentMoment))},
		staffLedgerEntries(){return this.ledgerStaff?employeePointEntries(this.staffLedger,this.ledgerStaff.name,new Date(this.currentMoment)):[]},
		totalStaffPoints(){return this.activeStaff.reduce((sum,person)=>sum+Number(person.points||0),0)},
		totalStaffTasks(){return this.activeStaff.reduce((sum,person)=>sum+Number(person.tasks||0),0)},
		openJobs(){return this.jobs.filter(job=>job.status==='open'&&(this.role==='manager'||this.canEmployeeSeeJob(job)))},
		visibleJobs(){return this.jobView==='open'?this.openJobs:this.jobs.filter(job=>this.isMyJob(job))},
		myCompletedJobs(){return this.me&&this.me.grabCount!==undefined?this.me.grabCount:this.jobs.filter(job=>this.isMyJob(job)).length},
		taskFilters(){return [{id:'all',label:'全部'},...['接待','服务','维护','打扫','整理','视频','出勤'].map(x=>({id:x,label:x}))]}, filteredTasks(){return this.taskFilter==='all'?this.tasks:this.tasks.filter(t=>t.category===this.taskFilter)},
		orderFilters(){const filters=[{id:'all',label:'全部'},{id:'active',label:'进行中'},{id:'editing',label:'待剪辑'}];return this.role==='manager'?[...filters,{id:'done',label:'已完成'}]:filters},
		roleOrders(){return filterOrdersForRole(this.orders,this.role)},
		filteredOrders(){return filterOrdersForRole(this.orders,this.role,this.orderFilter)},
		activeOrdersCount(){return this.roleOrders.filter(o=>!this.isOrderDone(o)&&!o.cancelled).length},
		activeOrder(){return this.roleOrders.find(o=>!this.isOrderDone(o)&&!o.cancelled)}, coreSteps(){return STEP_DEFINITIONS.slice(0,8)}
	},
	watch: {
		role(){this.ensureOrderVisibility()},
		orders:{handler(){this.ensureOrderVisibility()},deep:true}
	},
	onLoad(){this.updateNavigationLayout();this.updateClock();this.timer=setInterval(this.updateClock,1000);onUnauthorized(message=>this.handleSessionExpired(message));this.restoreSession()},
	onReady(){this.updateNavigationLayout()},
	onResize(){this.updateNavigationLayout()},
	onShow(){this.updateNavigationLayout();this.startPolling();this.rolloverDailyPoints();this.ensureOrderVisibility()},
	onHide(){this.stopPolling();this.persistNow()},
	onUnload(){clearInterval(this.timer);this.stopPolling()},
	methods: {
		openAgreement(kind){this.agreementPage=kind},
		updateNavigationLayout(){
			// #ifdef MP-WEIXIN
			this.navigationStyle = readWechatNavigationStyle(uni)
			// #endif
		},
		// ---------------------------------------------------------------- 登录与同步
		restoreSession(){
			if(!getToken()){this.sessionChecked=true;return Promise.resolve()}
			const cached=loadCachedSnapshot()
			if(cached)this.applySnapshot(cached)
			return this.refresh(true).finally(()=>{this.sessionChecked=true;this.startPolling()})
		},
		async login(){
			if(!this.agreed){uni.showToast({title:'请先阅读并同意协议',icon:'none'});return}
			const phone=String(this.loginForm.phone||'').replace(/\s+/g,''),password=this.loginForm.password||''
			if(!/^1\d{10}$/.test(phone)){uni.showToast({title:'请填写11位手机号',icon:'none'});return}
			if(!password){uni.showToast({title:'请填写密码',icon:'none'});return}
			if(this.loginPending)return
			this.loginPending=true
			try{
				const data=await storeApi.login(phone,password)
				this.resetSession()
				setToken(data.token)
				// 数据到了再关闭登录页，避免先看到一闪而过的空白首页
				if(!await this.refresh(true)){this.me=data.me;this.role=data.me.role==='manager'?'manager':'employee'}
				this.activeTab=this.role==='employee'?'home':'dashboard'
				this.loginForm={phone,password:''}
				this.startPolling()
				uni.showToast({title:'登录成功',icon:'success'})
			}catch(error){uni.showToast({title:error.message,icon:'none'})}
			finally{this.loginPending=false;this.sessionChecked=true}
		},
		confirmLogout(){uni.showModal({title:'退出登录',content:'退出后需要重新输入手机号和密码。',confirmText:'退出',confirmColor:'#e4615a',success:res=>{if(res.confirm)this.logout()}})},
		async logout(){
			try{await storeApi.logout()}catch{/* 已离线也允许退出 */}
			this.resetSession()
			uni.showToast({title:'已退出登录',icon:'none'})
		},
		handleSessionExpired(message){
			if(!this.me)return
			this.resetSession()
			uni.showToast({title:message||'登录已失效，请重新登录',icon:'none'})
		},
		resetSession(){
			setToken('');clearCachedSnapshot();this.stopPolling()
			Object.assign(this,createEmptyAppState())
			Object.assign(this,{me:null,syncVersion:'',storeDate:'',staffLedger:[],role:'employee',activeTab:'home',orderFilter:'all',pointView:'tasks',jobView:'open',reviewView:'pending'})
			this.closeOverlays()
		},
		closeOverlays(){
			Object.assign(this,{selectedOrder:null,showOrderMenu:false,orderFormVisible:false,editingOrderId:null,correctionVisible:false,correctionOrder:null,
				staffManagementVisible:false,staffActionVisible:false,selectedStaff:null,staffLedgerVisible:false,ledgerStaff:null,
				notificationsVisible:false,workspaceVisible:false,passwordVisible:false})
		},
		openMyPage(){if(!this.me)return;this.activeTab=this.role==='employee'?'me':'managerMe'},
		startPolling(){this.stopPolling();if(!getToken())return;this.pollTimer=setInterval(()=>this.refresh(false),POLL_INTERVAL)},
		stopPolling(){if(this.pollTimer)clearInterval(this.pollTimer);this.pollTimer=null},
		async refresh(force=false){
			if(!getToken())return false
			if(this.syncing){this.syncQueued=this.syncQueued||force;return false}
			this.syncing=true
			try{
				if(!force&&this.syncVersion){
					const {version}=await storeApi.version()
					if(version===this.syncVersion)return false
				}
				return this.applySnapshot(await storeApi.sync())
			}catch(error){
				if(force&&error.status!==401)uni.showToast({title:error.message,icon:'none'})
				return false
			}finally{
				this.syncing=false
				if(this.syncQueued){this.syncQueued=false;this.refresh(true)}
			}
		},
		applySnapshot(snapshot){
			if(!snapshot||!snapshot.state||!snapshot.me)return false
			const sameUser=this.me&&this.me.id===snapshot.me.id
			if(sameUser&&!isSameOrNewerVersion(snapshot.version,this.syncVersion))return false
			const previousOrders=this.orders
			const state=normaliseSnapshotState(snapshot.state,new Date(this.currentMoment))
			for(const key of STATE_KEYS)this[key]=state[key]
			this.me=snapshot.me
			const role=snapshot.me.role==='manager'?'manager':'employee'
			if(role!==this.role)this.role=role
			const store=snapshot.store||{}
			this.storeName=store.name||STORE_NAME
			this.storeCode=store.code||STORE_CODE
			this.storeDate=store.date||''
			if(Number.isFinite(store.utcOffsetMinutes))this.storeOffset=store.utcOffsetMinutes
			this.receiptDate=this.receiptReport?.date||this.storeDate||this.receiptDate
			this.syncVersion=snapshot.version||''
			this.ensureTabForRole()
			this.rebindSelections(previousOrders)
			saveCachedSnapshot(snapshot)
			return true
		},
		ensureTabForRole(){
			if(this.role==='employee'&&MANAGER_TABS.includes(this.activeTab))this.activeTab='home'
			if(this.role==='manager'&&EMPLOYEE_TABS.includes(this.activeTab))this.activeTab='dashboard'
		},
		// 整包数据替换后，把正在查看的订单、员工等指向新数据；已经不存在的就关掉
		rebindSelections(previousOrders=[]){
			if(this.selectedOrder){
				const next=this.orders.find(order=>order.id===this.selectedOrder.id)
				if(next)this.selectedOrder=next
				else{
					const before=previousOrders.find(order=>order.id===this.selectedOrder.id)||this.selectedOrder
					const finishing=['video','edit'].includes(nextOrderStep(before).key)
					this.hideOrderViews(this.role==='employee'&&finishing?'订单已完成，已从员工端隐藏':'该订单已被删除')
				}
			}
			if(this.orderFormVisible&&this.orderFormMode==='edit'&&!this.orders.some(order=>order.id===this.editingOrderId)){
				this.orderFormVisible=false;this.editingOrderId=null
			}
			if(this.correctionOrder){
				const next=this.orders.find(order=>order.id===this.correctionOrder.id)
				if(next)this.correctionOrder=next
				else{this.correctionVisible=false;this.correctionOrder=null}
			}
			if(this.selectedStaff){
				const next=this.ranking.find(person=>person.id===this.selectedStaff.id)
				if(next)this.selectedStaff=next
				else this.closeStaffActions()
			}
			if(this.ledgerStaff){
				const next=this.ranking.find(person=>person.id===this.ledgerStaff.id)
				if(next)this.ledgerStaff=next
				else this.closeStaffLedger()
			}
		},
		hideOrderViews(message){
			this.selectedOrder=null;this.showOrderMenu=false;this.orderFormVisible=false;this.editingOrderId=null
			if(this.role==='employee'){this.activeTab='orders';this.orderFilter='all'}
			if(message)uni.showToast({title:message,icon:'none'})
		},
		// 统一的写操作：防连点、提交、用返回的最新数据刷新页面、提示结果
		async runAction(task,{success,icon='success',after}={}){
			if(!this.me){uni.showToast({title:'请先登录',icon:'none'});return null}
			if(this.busy){uni.showToast({title:'正在处理上一步，请稍候',icon:'none'});return null}
			this.busy=true
			const known=new Set(this.notifications.map(item=>item.id))
			try{
				const data=await task()
				const title=typeof success==='function'?success(data):success
				if(title)uni.showToast({title,icon:typeof icon==='function'?icon(data):icon})
				// 先提示结果再换数据：订单完成后「已从员工端隐藏」的提示会接着出现
				if(data&&data.snapshot){this.applySnapshot(data.snapshot);this.forwardNewNotices(known)}
				if(after)after(data)
				return data||{}
			}catch(error){
				if(error.status!==401){
					uni.showToast({title:error.message,icon:'none'})
					if(error.status===404||error.status===409)this.refresh(true)
				}
				return null
			}finally{this.busy=false}
		},
		// 全店可见的消息同时推送微信提醒（未配置订阅时静默跳过）
		forwardNewNotices(known){
			for(const item of this.notifications){
				if(!known.has(item.id)&&item.audience==='all')this.deliverWechatReminder(item)
			}
		},
		canViewOrder(order){return roleCanViewOrder(order,this.role)},
		ensureOrderVisibility(){
			if(this.role!=='employee')return
			if(this.orderFilter==='done')this.orderFilter='all'
			const editing=this.orderFormVisible&&this.orderFormMode==='edit'?this.orders.find(order=>order.id===this.editingOrderId):null
			if(![this.selectedOrder,editing].some(order=>order&&!this.canViewOrder(order)))return
			this.hideOrderViews('订单已完成，已从员工端隐藏')
		},
		money:formatMoney,
		receiptSummary:paymentSummary,
		receiptFor(order){return this.receipts.find(receipt=>receipt.orderId===order.id)||null},
		saveOrderPayment(order,input){
			let amounts
			try{amounts=parsePaymentAmounts(input)}catch(error){uni.showToast({title:error.message,icon:'none'});return}
			uni.showModal({title:this.receiptFor(order)?'确认修改收款金额':'确认已收到款项',content:`${order.theme}\n${paymentSummary({amounts})}\n请核对实际收款，确认后将推进到带场节点。`,confirmText:'确认',success:result=>{
				if(!result.confirm)return
				this.runAction(()=>storeApi.recordPayment(order.id,{...input}),{success:data=>data.revised?'收款金额已修改':'收款已登记'})
			}})
		},
		openWorkspace(mode='repairs'){if(!this.me)return;if(mode!=='repairs'&&!this.requireRole('manager'))return;this.workspaceMode=mode;this.workspaceVisible=true},
		saveWorkspaceChange(message,data){if(data&&data.snapshot)this.applySnapshot(data.snapshot);uni.showToast({title:message,icon:'success'})},
		updateClock(){const d=new Date();this.currentMoment=d.getTime();this.liveTime=[d.getHours(),d.getMinutes(),d.getSeconds()].map(x=>String(x).padStart(2,'0')).join(':')},
		now(){return nowTimestamp()},
		formatTime(value){return formatDateTime(value,new Date(this.currentMoment))},
		formatDate(value){const key=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return key?`${Number(key[2])}月${Number(key[3])}日`:formatDateLabel(value,new Date(this.currentMoment))},
		dateKey(date=new Date()){return localDateKey(date)},
		currentStoreDate(){const d=new Date(this.currentMoment+this.storeOffset*60000);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`},
		// 跨天后「今日积分」「今日收款」由门店系统按门店日期重新计算，这里只负责及时刷新
		rolloverDailyPoints(){if(!this.me)return;this.refresh(Boolean(this.storeDate)&&this.currentStoreDate()!==this.storeDate)},
		prunePointHistory(){this.pointLedger=prunePointLedger(this.pointLedger,new Date(this.currentMoment))},
		actor(){return this.myName},
		queuePersist(){},
		persistNow(){
			if(!this.me)return false
			const state={}
			for(const key of STATE_KEYS)state[key]=this[key]
			return saveCachedSnapshot({version:this.syncVersion,store:{name:this.storeName,code:this.storeCode,date:this.storeDate,utcOffsetMinutes:this.storeOffset},me:this.me,state})
		},
		requireRole(expected){
			if(!this.me){uni.showToast({title:'请先登录',icon:'none'});return false}
			if(this.role!==expected){uni.showToast({title:expected==='manager'?'仅店长可以操作':'请使用员工账号操作',icon:'none'});return false}
			if(expected==='employee'&&this.me.status==='inactive'){uni.showToast({title:'员工账号已停用',icon:'none'});return false}
			return true
		},
		isMyJob(job){return job.claimedById!==undefined&&job.claimedById!==null?job.claimedById===this.myId:job.claimedBy===this.myName},
		openNotifications(){this.notificationsVisible=true},
		readNotification(item){if(item.read)return;item.read=true;storeApi.readNotice(item.id).catch(()=>{item.read=false})},
		markAllRead(){this.notifications.forEach(n=>n.read=true);uni.showToast({title:'已全部标记为已读',icon:'none'});storeApi.readAllNotices().then(data=>{if(data&&data.snapshot)this.applySnapshot(data.snapshot)}).catch(()=>this.refresh(true))},
		deliverWechatReminder(item){publishWechatNotification(typeof wx!=='undefined'?wx:uni,{...item,storeId:this.storeCode,storeName:this.storeName}).catch(()=>{})},
		enableWechatReminders(){const api=typeof wx!=='undefined'?wx:uni;const templateIds=configuredTemplateIds();requestWechatSubscription(api,templateIds).then(result=>{const acceptedIds=templateIds.filter(id=>result[id]==='accept');if(!acceptedIds.length)throw new Error('未允许微信订阅提醒');return registerWechatSubscriber(api,{storeId:this.storeCode,storeName:this.storeName,name:this.actor(),role:this.role},acceptedIds)}).then(()=>storeApi.setWechatSubscription(true)).then(data=>{if(data&&data.snapshot)this.applySnapshot(data.snapshot);this.wechatSubscriptionEnabled=true;uni.showToast({title:'微信提醒已开启',icon:'success'})}).catch(error=>{uni.showModal({title:'微信提醒未开启',content:error.message||'请稍后重试',showCancel:false})})},
		// ---------------------------------------------------------------- 修改密码
		openPasswordForm(){if(!this.me)return;this.passwordForm={oldPassword:'',newPassword:'',confirmPassword:''};this.passwordVisible=true},
		submitPassword(){
			const form=this.passwordForm
			if(!form.oldPassword){uni.showToast({title:'请填写原密码',icon:'none'});return}
			if(String(form.newPassword||'').length<6){uni.showToast({title:'新密码至少6位',icon:'none'});return}
			if(form.newPassword!==form.confirmPassword){uni.showToast({title:'两次输入的新密码不一致',icon:'none'});return}
			this.runAction(()=>storeApi.changePassword(form.oldPassword,form.newPassword),{success:'密码已修改',after:data=>{if(data.token)setToken(data.token);this.passwordVisible=false}})
		},
		// ---------------------------------------------------------------- 员工管理（店长）
		openStaffManagement(view='manage'){if(!this.requireRole('manager'))return;this.staffView=view;this.staffManagementVisible=true;this.staffActionVisible=false;this.selectedStaff=null},
		closeStaffManagement(){this.staffManagementVisible=false;this.staffActionVisible=false;this.selectedStaff=null},
		openStaffActions(person){if(!this.requireRole('manager'))return;this.selectedStaff=person;this.staffActionVisible=true},
		closeStaffActions(){this.staffActionVisible=false;this.selectedStaff=null},
		openStaffLedger(person){
			if(!this.requireRole('manager'))return
			this.ledgerStaff=person;this.staffLedger=[];this.staffLedgerVisible=true;this.staffActionVisible=false
			storeApi.staffLedger(person.id).then(list=>{if(this.ledgerStaff&&this.ledgerStaff.id===person.id)this.staffLedger=list}).catch(error=>uni.showToast({title:error.message,icon:'none'}))
		},
		closeStaffLedger(){this.staffLedgerVisible=false;this.ledgerStaff=null;this.staffLedger=[]},
		canRevokePoint(entry){return canRevokePointEntry(entry)},
		revokeStaffPoint(entry){if(!this.requireRole('manager'))return;uni.showModal({title:'撤销员工积分',content:`确认撤销 ${entry.employee} 的“${entry.title}” +${entry.points} 分？撤销后总积分会同步扣减。`,confirmText:'确认撤销',confirmColor:'#e4615a',success:res=>{if(!res.confirm)return;this.runAction(()=>storeApi.revokePoint(entry.id),{success:'积分已撤销',after:data=>{if(this.ledgerStaff&&data.staffId===this.ledgerStaff.id)this.staffLedger=data.ledger||[]}})}})},
		removeStaffAccount(person){if(!this.requireRole('manager'))return;uni.showModal({title:'删除员工账号',content:`确认删除 ${person.name}？该员工的 ${person.points} 分将从团队总积分中移除，待审核任务同时取消。此操作不能恢复。`,confirmText:'确认删除',confirmColor:'#e4615a',success:res=>{if(!res.confirm)return;this.runAction(()=>storeApi.removeStaff(person.id),{success:'员工账号已删除',icon:'none',after:()=>{this.staffActionVisible=false;this.selectedStaff=null}})}})},
		addStaff(){
			if(!this.requireRole('manager'))return
			uni.showModal({title:'添加员工',editable:true,placeholderText:'请输入员工姓名',confirmText:'下一步',success:res=>{
				if(!res.confirm)return
				const name=(res.content||'').trim()
				if(!name){uni.showToast({title:'请输入员工姓名',icon:'none'});return}
				if(this.ranking.some(person=>person.name===name)){uni.showToast({title:'该员工已存在',icon:'none'});return}
				setTimeout(()=>uni.showModal({title:`${name}的登录手机号`,editable:true,placeholderText:'请输入11位手机号',confirmText:'确认添加',success:second=>{
					if(!second.confirm)return
					const phone=String(second.content||'').replace(/\s+/g,'')
					if(!/^1\d{10}$/.test(phone)){uni.showToast({title:'请填写11位手机号',icon:'none'});return}
					this.runAction(()=>storeApi.addStaff(name,phone),{after:data=>{
						this.staffView='manage'
						uni.showModal({title:'员工添加成功',content:`${data.name} 的登录手机号：${data.phone}\n初始密码：${data.initialPassword}\n请当面告知员工，登录后可在「我的」中修改密码。`,showCancel:false,confirmText:'我已告知'})
					}})
				}}),300)
			}})
		},
		resetStaffPassword(person){
			if(!this.requireRole('manager'))return
			uni.showModal({title:'重置登录密码',content:`重置后 ${person.name} 需要用新密码重新登录，原来的登录会全部退出。`,confirmText:'确认重置',success:res=>{
				if(!res.confirm)return
				this.runAction(()=>storeApi.resetStaffPassword(person.id),{after:data=>{
					this.staffActionVisible=false;this.selectedStaff=null
					uni.showModal({title:'密码已重置',content:`${data.name} 的登录手机号：${data.phone}\n新密码：${data.password}\n请当面告知，登录后可自行修改。`,showCancel:false,confirmText:'我已告知'})
				}})
			}})
		},
		adjustStaffPoints(person){if(!this.requireRole('manager'))return;uni.showModal({title:`调整${person.name}的积分`,editable:true,placeholderText:'输入调整值，例如 10 或 -5',confirmText:'确认调整',success:res=>{if(!res.confirm)return;const requested=Number((res.content||'').trim());if(!Number.isFinite(requested)||!Number.isInteger(requested)||requested===0){uni.showToast({title:'请输入非零整数',icon:'none'});return}const before=Math.max(0,Number(person.points||0));if(Math.max(0,before+requested)===before){uni.showToast({title:'当前积分已为 0，无法继续扣减',icon:'none'});return}this.runAction(()=>storeApi.adjustStaff(person.id,requested),{success:'积分已更新',after:()=>{this.staffActionVisible=false;this.selectedStaff=null}})}})},
		toggleStaffStatus(person){if(!this.requireRole('manager'))return;const willDisable=person.status!=='inactive';uni.showModal({title:willDisable?'停用员工':'恢复员工',content:willDisable?`停用后，${person.name} 将立即退出登录，不能再登录、领取积分任务或抢单。`:`恢复后，${person.name} 可以重新登录并参与门店任务。`,confirmText:willDisable?'确认停用':'确认恢复',confirmColor:willDisable?'#e4615a':'#e9aa3a',success:res=>{if(!res.confirm)return;this.runAction(()=>storeApi.setStaffStatus(person.id,willDisable?'inactive':'active'),{success:willDisable?'员工已停用':'员工已恢复',icon:'none',after:()=>{this.staffActionVisible=false;this.selectedStaff=null}})}})},
		// ---------------------------------------------------------------- 积分任务（员工）
		tapPointTask(task){
			if(!this.requireRole('employee'))return
			const snapshot={id:task.id,title:task.title,points:task.points,audit:task.audit}
			const content=snapshot.audit?`提交“${snapshot.title}”后将等待店长审核，通过后获得 ${snapshot.points} 积分。`:`确认已完成“${snapshot.title}”？${snapshot.points} 积分将立即到账。`
			const requestId=newRequestId()
			uni.showModal({title:snapshot.audit?'提交审核':'确认完成',content,confirmText:snapshot.audit?'提交':'完成',success:res=>{
				if(!res.confirm||!this.requireRole('employee'))return
				this.runAction(()=>storeApi.completeTask(snapshot.id,requestId),{success:data=>data.audit?'已提交店长审核':`+${data.points} 积分`,icon:data=>data.audit?'none':'success'})
			}})
		},
		// ---------------------------------------------------------------- 临时任务
		urgencyText(level){return{low:'普通',normal:'尽快',urgent:'紧急'}[level]},
		canEmployeeSeeJob(job,employeeName=this.myName){if(!job.restricted)return true;if(job.allowedEmployeeIds&&job.allowedEmployeeIds.length&&this.myId!==null&&employeeName===this.myName)return job.allowedEmployeeIds.includes(this.myId);return job.allowedEmployees.includes(employeeName)},
		toggleJobRestriction(event){this.jobForm.restricted=event.detail.value;if(!this.jobForm.restricted)this.jobForm.allowedEmployees=[]},
		toggleAllowedEmployee(name){const index=this.jobForm.allowedEmployees.indexOf(name);if(index>=0)this.jobForm.allowedEmployees.splice(index,1);else this.jobForm.allowedEmployees.push(name)},
		grabJob(job){if(!this.requireRole('employee'))return;if(!this.canEmployeeSeeJob(job)){uni.showToast({title:'该任务未向你开放',icon:'none'});return}if(job.status!=='open'){uni.showToast({title:'任务已被其他员工抢到',icon:'none'});return}uni.showModal({title:'确认抢单',content:`抢到“${job.title}”后任务立即结束，不需要再次提交。`,confirmText:'立即抢单',success:res=>{if(!res.confirm)return;this.runAction(()=>storeApi.grabJob(job.id),{success:'抢单成功'})}})},
		publishJob(){
			if(!this.requireRole('manager'))return
			if(!this.jobForm.title.trim()||!this.jobForm.description.trim()){uni.showToast({title:'请填写任务标题和说明',icon:'none'});return}
			if(this.jobForm.restricted&&!this.jobForm.allowedEmployees.length){uni.showToast({title:'请选择至少一名可抢员工',icon:'none'});return}
			const allowedStaffIds=this.jobForm.restricted?this.activeStaff.filter(person=>this.jobForm.allowedEmployees.includes(person.name)).map(person=>person.id):[]
			const form={title:this.jobForm.title,description:this.jobForm.description,deadline:this.jobForm.deadline,urgency:this.jobForm.urgency,restricted:this.jobForm.restricted,allowedStaffIds,requestId:newRequestId()}
			this.runAction(()=>storeApi.publishJob(form),{success:'发布成功',after:()=>{this.jobForm={title:'',description:'',deadline:'',urgency:'normal',restricted:false,allowedEmployees:[]}}})
		},
		cancelJob(job){if(!this.requireRole('manager'))return;uni.showModal({title:'取消任务',content:`确认取消“${job.title}”？`,confirmColor:'#e4615a',success:res=>{if(res.confirm)this.runAction(()=>storeApi.cancelJob(job.id),{success:'任务已取消',icon:'none'})}})},
		// ---------------------------------------------------------------- 打扫审核（店长）
		approveAudit(audit){if(!this.requireRole('manager'))return;this.runAction(()=>storeApi.approveAudit(audit.id),{success:'审核通过'})},
		rejectAudit(audit){if(!this.requireRole('manager'))return;uni.showModal({title:'驳回任务',editable:true,placeholderText:'请输入驳回原因',confirmText:'确认驳回',confirmColor:'#e4615a',success:res=>{if(res.confirm)this.runAction(()=>storeApi.rejectAudit(audit.id,res.content||''),{success:'已驳回',icon:'none'})}})},
		// ---------------------------------------------------------------- 订单
		showOrderForm(mode,order=null){if(mode==='edit'&&!this.canViewOrder(order)){uni.showToast({title:'已完成订单仅店长可查看',icon:'none'});return}this.showOrderMenu=false;this.orderFormMode=mode;this.editingOrderId=order?order.id:null;this.orderForm=order?{theme:order.theme,time:order.time,people:String(order.people),contact:order.contact,note:order.note}:{theme:this.themeOptions[0]||'',time:'',people:'',contact:'',note:''};this.orderFormVisible=true},
		saveOrder(){
			const oldOrder=this.orders.find(o=>o.id===this.editingOrderId)
			if(this.orderFormMode==='edit'&&!this.canViewOrder(oldOrder)){this.ensureOrderVisibility();uni.showToast({title:oldOrder?'已完成订单仅店长可查看':'订单不存在',icon:'none'});return}
			if(!this.orderForm.theme||!this.orderForm.time||!this.orderForm.people){uni.showToast({title:'请填写主题、时间和人数',icon:'none'});return}
			if(!this.themeOptions.includes(this.orderForm.theme)&&!(this.orderFormMode==='edit'&&oldOrder?.theme===this.orderForm.theme)){uni.showToast({title:'主题已变更，请重新选择',icon:'none'});return}
			const form={theme:this.orderForm.theme,time:this.orderForm.time,people:String(this.orderForm.people),contact:this.orderForm.contact,note:this.orderForm.note}
			if(this.orderFormMode==='create'){
				form.requestId=newRequestId()
				this.runAction(()=>storeApi.createOrder(form),{success:'订单已创建',after:()=>{this.orderFormVisible=false}})
			}else{
				const id=oldOrder.id
				this.runAction(()=>storeApi.updateOrder(id,form),{success:'修改已保存',after:()=>{this.orderFormVisible=false;if(this.selectedOrder&&this.selectedOrder.id===id)this.selectedOrder=this.orders.find(order=>order.id===id)||null}})
			}
		},
		openOrder(order){if(!this.canViewOrder(order)){uni.showToast({title:'已完成订单仅店长可查看',icon:'none'});return false}this.selectedOrder=order;this.showOrderMenu=false;return true},
		toggleOrderMenu(){this.showOrderMenu=!this.showOrderMenu},
		visibleSteps(order){return visibleOrderSteps(order)},
		stepRecord(order,key){return order.records[key]||{}},
		stepDone(order,key){return!!order.records[key]},
		stepDisplayLabel(order,step){if(step.key==='start')return order.records.start?`《${order.records.start.theme||order.theme}》· 已开始`:`点击《${order.theme}》开始`;if(step.key==='photo'&&order.records.photo)return order.records.photo.choice;if(step.key==='video'&&order.records.video)return order.records.video.choice;if(step.note)return`${step.label}（${step.note}）`;return step.label},
		nextStep(order){return nextOrderStep(order)},
		isCurrentStep(order,key){return canCompleteStep(order,key)},
		stepState(order,step){if(this.stepDone(order,step.key))return'done';if(this.isCurrentStep(order,step.key))return'current';return'future'},
		completeOrderStep(order,step){if(!canCompleteStep(order,step.key)){uni.showToast({title:'请先完成上一节点',icon:'none'});return}if(step.key==='payment'){this.openOrder(order);return}uni.showModal({title:step.key==='start'?`开始《${order.theme}》`:`确认${step.label}`,content:`操作人：${this.actor()}。完成后员工不能自行回退。`,confirmText:'确认完成',success:res=>{if(!res.confirm||!canCompleteStep(order,step.key))return;this.runAction(()=>storeApi.completeStep(order.id,step.key),{success:step.status})}})},
		quickAdvance(order){if(!this.openOrder(order))return;const step=this.nextStep(order);if(step.branch||step.key==='done'||step.key==='cancelled')return;setTimeout(()=>this.completeOrderStep(order,step),250)},
		chooseBranch(order,type,choice){if(!canCompleteStep(order,type)){uni.showToast({title:'请先完成上一节点',icon:'none'});return}uni.showModal({title:`确认选择“${choice}”`,content:type==='video'&&choice==='要视频'?'系统会建立关联剪辑任务，但不会发送通知。':type==='video'?'选择后订单直接完成。':'选择后将进入视频选择。',confirmText:'确认',success:res=>{if(!res.confirm||!canCompleteStep(order,type))return;this.runAction(()=>storeApi.completeStep(order.id,type,choice),{success:choice})}})},
		completedCount(order){return this.visibleSteps(order).filter(s=>order.records[s.key]).length},
		totalSteps(order){return this.visibleSteps(order).length},
		orderProgress(order){return calculateOrderProgress(order)},
		isEditing(order){return orderIsEditing(order)},
		isOrderDone(order){return orderIsDone(order)},
		orderStatus(order){return calculateOrderStatus(order)},
		statusTone(order){if(order.cancelled)return'danger';if(this.isOrderDone(order))return'success';if(this.isEditing(order))return'info';return'warning'},
		compactSteps:compactOrderSteps,
		lastOperator(order){const keys=Object.keys(order.records);if(!keys.length)return'尚无操作';const record=order.records[keys[keys.length-1]];return`${record.operator} · ${this.formatTime(record.time)}`},
		openCorrection(order){if(!this.requireRole('manager'))return;this.showOrderMenu=false;this.correctionVisible=true;this.correctionOrder=order;const next=nextOrderStep(order),done=this.coreSteps.filter(step=>order.records[step.key]);this.correctionTarget=this.coreSteps.some(step=>step.key===next.key)&&!done.length?next.key:(done.length?done[done.length-1].key:'start');this.correctionReason=''},
		applyCorrection(){
			if(!this.requireRole('manager'))return
			if(!this.correctionReason.trim()){uni.showToast({title:'请填写修正原因',icon:'none'});return}
			const targetIndex=STEP_DEFINITIONS.findIndex(s=>s.key===this.correctionTarget)
			if(targetIndex<0){uni.showToast({title:'请选择要回退的节点',icon:'none'});return}
			const order=this.correctionOrder,target=this.correctionTarget,reason=this.correctionReason
			this.runAction(()=>storeApi.correctOrder(order.id,target,reason),{success:target==='payment'?'已退回收钱，可修改金额':'节点已回退',after:()=>{this.correctionVisible=false;this.correctionOrder=null}})
		},
		cancelOrder(order){if(!this.requireRole('manager'))return;this.showOrderMenu=false;const receipt=this.receiptFor(order);uni.showModal({title:'取消订单',editable:true,placeholderText:'请输入取消原因',content:receipt&&receipt.status!=='reversed'?'取消后会同步冲正该订单的已收款记录。':'',confirmText:'确认取消',confirmColor:'#e4615a',success:res=>{if(res.confirm)this.runAction(()=>storeApi.cancelOrder(order.id,res.content||''),{success:data=>data.reversed?'订单已取消，收款已冲正':'订单已取消',icon:'none'})}})},
		deleteOrder(order){if(!this.requireRole('manager'))return;this.showOrderMenu=false;const receipt=this.receiptFor(order);uni.showModal({title:'删除订单',content:`确认删除“${order.theme}”？删除操作会保留日志${receipt&&receipt.status!=='reversed'?'，已收款将同步冲正':''}。`,confirmText:'确认删除',confirmColor:'#e4615a',success:res=>{if(res.confirm){this.selectedOrder=null;this.runAction(()=>storeApi.deleteOrder(order.id),{success:data=>data.reversed?'订单已删除，收款已冲正':'订单已删除',icon:'none'})}}})}
	}
}
</script>

<style>
.word-progress{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px 5px;margin:16px 0 12px}.word-node{display:flex;align-items:center;justify-content:center;min-height:28px;font-size:11px;border-radius:6px;color:var(--accent);background:var(--accent-soft);border:1px solid transparent}.word-node.done{color:#989a91;background:var(--surface-soft)}.word-node.current{border-color:var(--accent);font-weight:750}.word-node.cancelled{color:var(--muted);background:var(--surface-soft)}.daily-receipts{margin:0 0 16px;padding:16px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.receipt-heading,.receipt-total{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.receipt-channels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}.receipt-channels text{display:block;font-size:11px;color:var(--muted)}.receipt-channels text:last-child{font-size:16px;font-weight:700;color:var(--text);margin-top:6px;overflow-wrap:anywhere}.receipt-total{border-top:1px solid var(--line);padding-top:14px;font-size:13px}.receipt-total text:last-child{font-size:19px;font-weight:750;color:var(--accent);overflow-wrap:anywhere}.receipt-note{display:block;font-size:10px;line-height:1.7;color:var(--muted);margin-top:12px}.receipt-history-title{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);margin-top:14px;padding-top:14px}.receipt-history-title text:first-child{font-size:12px;font-weight:700}.receipt-history-title text:last-child{font-size:9px;color:var(--faint)}.receipt-history{margin-top:8px}.receipt-history-row{display:grid;grid-template-columns:54px 1fr auto;align-items:center;gap:8px;min-height:34px;border-bottom:1px solid var(--line);font-size:9px;color:var(--muted)}.receipt-history-row:last-child{border-bottom:0}.receipt-history-row text:nth-child(2){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.receipt-history-row text:last-child{color:var(--text);font-size:11px;font-weight:700}.payment-record{font-size:11px;line-height:1.8;color:var(--muted);margin-top:8px;overflow-wrap:anywhere}.payment-record text{display:block}
.repair-entry{position:relative;margin:0;min-width:44px;min-height:44px;padding:0 8px;background:var(--surface);border:1px solid var(--line);border-radius:12px;color:var(--accent);font-size:12px;display:flex;align-items:center;justify-content:center;line-height:1;overflow:visible}.repair-count{position:absolute;right:-9px;top:-9px;box-sizing:border-box;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:var(--danger);color:var(--text);font-size:9px;line-height:20px;display:flex;align-items:center;justify-content:center;white-space:nowrap;border:2px solid var(--bg);z-index:2}.config-entries{margin-bottom:16px}
.app-shell{--bg:#171816;--bg:oklch(20.5% .005 110);--surface:#20211f;--surface:oklch(24.7% .006 110);--surface-raised:#292a27;--surface-raised:oklch(29.5% .007 105);--surface-soft:#31322e;--surface-soft:oklch(34% .009 105);--text:#f3f0e8;--text:oklch(95.4% .012 88);--muted:#aaa89f;--muted:oklch(72% .012 90);--faint:#777870;--faint:oklch(57% .012 110);--line:rgba(242,238,226,.1);--accent:#e9aa3a;--accent:oklch(76.5% .14 78);--accent-soft:rgba(233,170,58,.14);--success:#70c999;--success:oklch(76% .12 158);--danger:#e66a61;--danger:oklch(66% .15 28);--info:#77a9e8;--info:oklch(72% .1 250);min-height:100vh;max-width:430px;margin:0 auto;background:var(--bg);color:var(--text);position:relative;overflow:hidden}.ambient{position:fixed;pointer-events:none;border-radius:50%;filter:blur(80px);opacity:.12}.ambient-one{width:220px;height:220px;background:#d8972c;top:-120px;right:-80px}.ambient-two{width:180px;height:180px;background:#654f29;bottom:80px;left:-140px}
.topbar{height:106px;padding:calc(18px + env(safe-area-inset-top)) 20px 12px;display:flex;align-items:flex-end;justify-content:space-between;gap:12px;position:relative;z-index:5;background:linear-gradient(180deg,rgba(23,24,22,.98),rgba(23,24,22,.92))}
/* Fill the spare space on the left without moving actions into the native capsule. */
.topbar-brand{min-width:0;position:relative;top:-8px}
.eyebrow{display:block;color:var(--muted);font-size:13px;line-height:1.5;letter-spacing:.06em;margin-bottom:6px;white-space:nowrap}
.topbar-title-row{display:flex;align-items:baseline;gap:8px;white-space:nowrap}
.topbar-title{flex:none;font-size:32px;line-height:1.25;font-weight:760;letter-spacing:-.02em}
.live-time{flex:none;font-size:11px;line-height:1.5;color:var(--accent);font-variant-numeric:tabular-nums;letter-spacing:.04em}
.top-actions{display:flex;flex:none;gap:10px;align-items:center;overflow:visible;padding:4px 3px 0 0}.icon-button,.avatar{width:42px;height:42px;border-radius:14px;background:var(--surface);display:flex;align-items:center;justify-content:center;position:relative;border:1px solid var(--line)}.icon-glyph{font-size:24px;color:var(--muted);transform:rotate(-18deg)}.avatar{background:var(--accent);color:#282015;font-weight:800;border:none}.notification-dot{position:absolute;right:-4px;top:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:var(--danger);color:#fffaf2;font-size:10px;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg)}
.page-scroll{position:absolute;top:106px;bottom:76px;left:0;right:0}.page-scroll ::-webkit-scrollbar,.overlay-scroll ::-webkit-scrollbar{width:0;height:0}.page-content{padding:14px 18px 32px}.greeting-block,.manager-intro,.list-heading-row,.job-overview{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.greeting,.large-title{display:block;font-size:22px;font-weight:720;letter-spacing:-.02em}.subtle{display:block;color:var(--muted);font-size:13px;margin-top:5px;line-height:1.5}.status-chip,.remote-chip{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--success);background:rgba(112,201,153,.1);border:1px solid rgba(112,201,153,.22);padding:7px 10px;border-radius:999px}.remote-chip{color:var(--info);background:rgba(119,169,232,.1);border-color:rgba(119,169,232,.22)}.pulse{width:6px;height:6px;border-radius:50%;background:var(--success);box-shadow:0 0 0 4px rgba(112,201,153,.1)}
.score-band{min-height:128px;border-radius:20px;background:var(--accent);color:#2a2216;padding:20px;display:flex;justify-content:space-between;align-items:flex-end;position:relative;overflow:hidden;margin-bottom:26px}.score-band:after{content:"";position:absolute;width:150px;height:150px;border:32px solid rgba(42,34,22,.08);border-radius:50%;right:-70px;top:-72px}.band-kicker{display:block;font-size:12px;font-weight:650;opacity:.75}.score-number-row{display:flex;align-items:baseline;margin-top:5px}.score-number{font-size:48px;font-weight:820;line-height:1;letter-spacing:-.05em}.score-unit{font-size:13px;font-weight:700;margin-left:6px}.score-meta{display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-size:11px;font-weight:650;z-index:1}.score-meta .positive{color:#2a2216}
.section-heading{display:flex;justify-content:space-between;align-items:flex-end;margin:0 2px 12px}.compact-heading{margin-top:26px}.section-title{display:block;font-size:17px;font-weight:720}.section-caption{display:block;color:var(--faint);font-size:11px;margin-top:4px}.text-link{color:var(--accent);font-size:12px}.active-order{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:16px;margin-bottom:14px;box-shadow:0 16px 36px rgba(5,5,4,.18)}.order-topline,.order-list-head,.audit-top{display:flex;align-items:center;gap:12px}.theme-mark{width:46px;height:46px;border-radius:15px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;border:1px solid rgba(233,170,58,.2)}.theme-mark.small{width:40px;height:40px;border-radius:13px;font-size:16px}.grow{flex:1;min-width:0}.order-theme{display:block;font-size:16px;font-weight:720}.order-meta{display:block;color:var(--muted);font-size:11px;margin-top:5px}.state-label{flex:none;font-size:10px;padding:6px 8px;border-radius:999px}.state-label.warning{color:var(--accent);background:var(--accent-soft)}.state-label.success{color:var(--success);background:rgba(112,201,153,.1)}.state-label.info{color:var(--info);background:rgba(119,169,232,.1)}.state-label.danger{color:var(--danger);background:rgba(230,106,97,.1)}
.progress-track{height:5px;background:rgba(243,240,232,.08);border-radius:99px;overflow:hidden;margin:16px 0 13px}.progress-fill{height:100%;background:var(--accent);border-radius:inherit;transition:width .22s cubic-bezier(.25,.8,.25,1)}.next-action-row{display:flex;align-items:center;justify-content:space-between}.next-label{display:block;color:var(--faint);font-size:10px}.next-title{display:block;font-size:14px;font-weight:680;margin-top:2px}button{margin:0;box-sizing:border-box;line-height:1.2;text-align:center}button::after{border:none}.compact-primary,.grab-button,.step-action,.primary-button,.branch-button,.add-button{background:var(--accent);color:#2a2216;border:0;border-radius:12px;font-weight:750;font-size:12px;min-height:42px;display:flex;align-items:center;justify-content:center;padding:0 15px}
.quick-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:10px}.quick-action{min-height:112px;border-radius:18px;background:var(--surface);border:1px solid var(--line);padding:15px;display:flex;flex-direction:column;align-items:flex-start}.quick-action:nth-child(3){grid-column:1/-1;min-height:78px;display:grid;grid-template-columns:44px 1fr;grid-template-rows:1fr 1fr;align-items:center}.quick-action:nth-child(3) .quick-symbol{grid-row:1/3}.primary-quick{background:#27231a;border-color:rgba(233,170,58,.18)}.quick-symbol{width:34px;height:34px;border-radius:11px;background:var(--surface-soft);display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:19px;margin-bottom:14px}.primary-quick .quick-symbol{background:var(--accent);color:#2a2216}.quick-title{font-size:14px;font-weight:700}.quick-caption{color:var(--muted);font-size:10px;margin-top:4px}
.activity-list,.ledger-list,.ranking-list,.published-list,.manager-order-list,.settings-list{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}.activity-row,.ledger-row,.ranking-row,.published-row,.manager-order-row,.setting-row{display:flex;align-items:center;gap:11px;padding:14px;border-bottom:1px solid var(--line)}.activity-row:last-child,.ledger-row:last-child,.ranking-row:last-child,.published-row:last-child,.manager-order-row:last-child,.setting-row:last-child{border-bottom:0}.activity-icon{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:var(--surface-soft);color:var(--muted);font-weight:800;flex:none}.activity-icon.order,.activity-icon.job{background:var(--accent-soft);color:var(--accent)}.activity-icon.audit{background:rgba(230,106,97,.1);color:var(--danger)}.activity-icon.info{background:rgba(119,169,232,.1);color:var(--info)}.activity-icon.success{background:rgba(112,201,153,.1);color:var(--success)}.activity-title{display:block;font-size:13px;font-weight:680}.activity-detail{display:block;color:var(--muted);font-size:10px;line-height:1.45;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.activity-time{color:var(--faint);font-size:10px;flex:none;white-space:nowrap}
.points-header{display:flex;align-items:flex-end;gap:10px;padding:4px 2px 20px}.points-total{display:block;font-size:42px;font-weight:820;line-height:1;letter-spacing:-.04em}.points-unit,.rank-label{display:block;color:var(--muted);font-size:10px;margin-top:5px}.rank-block{margin-left:auto;text-align:right}.rank-value{display:block;font-size:18px;font-weight:750}.segmented{display:flex;background:var(--surface);padding:4px;border-radius:13px;margin-bottom:16px;border:1px solid var(--line)}.segment{flex:1;text-align:center;padding:9px 8px;border-radius:9px;color:var(--muted);font-size:12px;font-weight:650}.segment.active{background:var(--surface-soft);color:var(--text);box-shadow:0 3px 10px rgba(0,0,0,.18)}.filter-scroll{width:100%;white-space:nowrap;margin-bottom:14px}.filter-row{display:flex;gap:8px}.filter-chip,.choice-chip{display:inline-flex;align-items:center;justify-content:center;padding:8px 13px;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--muted);font-size:11px;flex:none}.filter-chip.active,.choice-chip.active{color:#2a2216;background:var(--accent);border-color:var(--accent);font-weight:750}
.helper-strip,.form-note{display:flex;gap:8px;align-items:center;color:var(--muted);font-size:10px;padding:10px 12px;border-radius:12px;background:var(--accent-soft);margin-bottom:12px;line-height:1.4}.helper-icon{width:17px;height:17px;border-radius:50%;background:var(--accent);color:#2a2216;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex:none}.task-list{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}.task-row{display:flex;align-items:center;gap:12px;padding:13px;border-bottom:1px solid var(--line)}.task-row:last-child{border-bottom:0}.task-point{width:42px;height:42px;border-radius:13px;background:var(--accent-soft);color:var(--accent);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex:none}.task-point.audit{color:var(--info);background:rgba(119,169,232,.1)}.tiny{font-size:8px;font-weight:600}.task-title{display:block;font-size:13px;font-weight:660;line-height:1.4}.task-meta-row{display:flex;gap:8px;align-items:center;color:var(--faint);font-size:9px;margin-top:5px;line-height:1.5}.audit-badge{color:var(--info);background:rgba(119,169,232,.1);padding:2px 5px;border-radius:5px}.row-arrow{color:var(--faint);font-size:20px}.ledger-date{width:45px;color:var(--muted);font-size:10px;display:flex;flex-direction:column;gap:3px}.ledger-date.full-date{width:58px;line-height:1.45}.ledger-points{font-size:15px;font-weight:750}.positive{color:var(--success)}.negative,.danger-text{color:var(--danger)!important}.ranking-index{width:18px;color:var(--faint);font-size:12px;text-align:center}.small-avatar{width:34px;height:34px;border-radius:11px;background:var(--surface-soft);display:flex;align-items:center;justify-content:center;font-weight:750;color:var(--muted);flex:none}.ranking-row.me{background:var(--accent-soft)}.me-label{margin-left:5px;font-size:8px;background:var(--accent);color:#2a2216;border-radius:4px;padding:2px 4px}.rank-points{font-weight:780;font-size:15px}.compact-empty{min-height:150px}
.job-count{min-width:62px;height:62px;border-radius:18px;background:var(--accent-soft);color:var(--accent);display:flex;flex-direction:column;align-items:center;justify-content:center}.job-count text:first-child{font-size:22px;font-weight:800}.job-count text:last-child{font-size:9px;margin-top:2px}.job-list{display:flex;flex-direction:column;gap:12px}.job-item{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px}.job-head,.job-footer{display:flex;justify-content:space-between;align-items:center;gap:10px}.urgency{font-size:9px;padding:4px 7px;border-radius:6px;background:var(--surface-soft);color:var(--muted)}.urgency.urgent{color:var(--danger);background:rgba(230,106,97,.1)}.urgency.normal{color:var(--accent);background:var(--accent-soft)}.job-time,.deadline,.publisher{font-size:9px;color:var(--faint)}.deadline{margin-left:8px;color:var(--muted)}.job-title{display:block;font-size:17px;font-weight:720;margin:14px 0 7px}.job-desc{display:block;color:var(--muted);font-size:12px;line-height:1.6;margin-bottom:18px}.claimed-state{color:var(--success);font-size:10px;line-height:1.4;background:rgba(112,201,153,.1);padding:8px 10px;border-radius:10px;text-align:right}.empty-state{min-height:230px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.empty-symbol{width:52px;height:52px;border-radius:18px;background:var(--surface);color:var(--faint);font-size:24px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}.empty-title{font-size:15px;font-weight:700}
.add-button{min-height:38px}.order-list{display:flex;flex-direction:column;gap:11px}.order-list-item{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:15px}.mini-progress{display:flex;gap:5px;margin:16px 0 11px}.mini-node{flex:1;height:5px;border-radius:4px;background:var(--accent);opacity:.35}.mini-node.done{background:#66675f;opacity:1}.mini-node.current{opacity:1;box-shadow:0 0 0 2px rgba(233,170,58,.15)}.order-list-foot{display:flex;justify-content:space-between;color:var(--muted);font-size:9px}
.profile-hero{display:flex;align-items:center;gap:13px;margin:16px 0 22px}.profile-avatar{width:58px;height:58px;border-radius:19px;background:var(--accent);color:#2a2216;font-size:20px;font-weight:820;display:flex;align-items:center;justify-content:center}.profile-avatar.manager{background:var(--info);color:#18202a}.profile-name{display:block;font-size:20px;font-weight:750}.profile-hero .status-chip,.profile-hero .remote-chip{margin-left:auto}.profile-stats{display:grid;grid-template-columns:repeat(3,1fr);background:var(--surface);border:1px solid var(--line);border-radius:18px;margin-bottom:16px}.profile-stats view{padding:17px;text-align:center;border-right:1px solid var(--line)}.profile-stats view:last-child{border:0}.profile-stats text:first-child{display:block;font-size:19px;font-weight:760}.profile-stats text:last-child{display:block;color:var(--muted);font-size:9px;margin-top:5px}.setting-symbol{width:30px;color:var(--accent);font-size:17px;text-align:center}.setting-row{font-size:13px;min-height:54px}.setting-value{color:var(--muted);font-size:10px}.version{display:block;text-align:center;color:var(--faint);font-size:10px;margin-top:24px}
.metric-strip{display:grid;grid-template-columns:repeat(3,1fr);background:var(--surface);border:1px solid var(--line);border-radius:18px;margin-bottom:12px}.metric-strip view{padding:16px 10px;border-right:1px solid var(--line)}.metric-strip view:last-child{border:0}.metric-value{display:block;font-size:24px;font-weight:800}.metric-label{display:block;color:var(--muted);font-size:9px;margin-top:5px}.attention-band{display:flex;align-items:center;gap:12px;background:rgba(230,106,97,.09);border:1px solid rgba(230,106,97,.18);padding:13px;border-radius:15px;color:var(--danger);margin-bottom:24px}.attention-symbol{width:30px;height:30px;border-radius:10px;background:rgba(230,106,97,.14);display:flex;align-items:center;justify-content:center;font-weight:800}.attention-title{display:block;font-size:12px;font-weight:700}.attention-copy{display:block;font-size:9px;opacity:.7;margin-top:3px}.manager-order-row{min-height:68px}.manager-progress{text-align:right;font-size:11px;font-weight:700}.tiny-track{width:52px;height:4px;background:var(--surface-soft);border-radius:4px;margin-top:6px;overflow:hidden}.tiny-track view{height:100%;background:var(--accent)}.staff-line{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.staff-item{background:var(--surface);border:1px solid var(--line);border-radius:15px;padding:10px 6px;text-align:center;display:flex;flex-direction:column;align-items:center;font-size:10px;gap:5px}.staff-score{color:var(--accent);font-weight:750}.staff-item .small-avatar{width:30px;height:30px}
.review-count{width:42px;height:42px;border-radius:14px;background:rgba(230,106,97,.1);color:var(--danger);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800}.audit-list{display:flex;flex-direction:column;gap:12px}.audit-item{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px}.audit-points{font-size:18px;font-weight:800;color:var(--accent)}.audit-task-title{display:block;font-size:15px;font-weight:700;margin:16px 0}.audit-actions{display:grid;grid-template-columns:.75fr 1.5fr;gap:9px}.secondary-button{background:var(--surface-soft);color:var(--text);border:0;border-radius:12px;font-size:11px;font-weight:700;min-height:44px;display:flex;align-items:center;justify-content:center;padding:0 12px;line-height:1.2}.primary-button{min-height:44px}.primary-button.full{width:100%;font-size:13px}.result-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center}.result-icon.approved{background:rgba(112,201,153,.1);color:var(--success)}.result-icon.rejected{background:rgba(230,106,97,.1);color:var(--danger)}.review-result{font-size:10px}.review-result.approved{color:var(--success)}.review-result.rejected{color:var(--danger)}
.publish-form{margin-top:18px;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:16px}.field{margin-bottom:17px}.field-label{display:block;color:var(--muted);font-size:11px;font-weight:650;margin-bottom:8px}.field-label.inline{color:var(--text);font-size:13px;margin:0}.field-help{display:block;color:var(--faint);font-size:9px;margin-top:4px}input,textarea{width:100%;background:var(--surface-soft);border:1px solid var(--line);border-radius:12px;color:var(--text);font-size:13px;padding:0 13px}input{height:46px}textarea{height:92px;padding-top:12px;line-height:1.5}.placeholder{color:#777870}.choice-row{display:flex;gap:8px}.choice-chip{flex:1}.toggle-row{display:flex;align-items:center;justify-content:space-between}.published-row{min-height:62px}.urgency-dot{display:block;width:8px;height:8px;border-radius:50%;background:var(--faint)}.urgency-dot.normal{background:var(--accent)}.urgency-dot.urgent{background:var(--danger)}.text-button{background:transparent;border:0;font-size:10px;padding:8px}.done-mark{color:var(--success);font-size:10px}
.restricted-picker{margin:-4px 0 18px;padding:13px;background:var(--surface-soft);border:1px solid var(--line);border-radius:14px}.staff-choice-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.staff-choice{min-height:46px;display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:11px;background:var(--surface);border:1px solid var(--line);color:var(--muted);font-size:11px}.staff-choice.active{border-color:rgba(233,170,58,.42);background:var(--accent-soft);color:var(--text)}.staff-choice .small-avatar{width:28px;height:28px;border-radius:9px;font-size:10px}.choice-mark{margin-left:auto;color:var(--accent);font-weight:800}.restricted-picker>.field-help{margin-top:10px;line-height:1.5}
.header-add{width:38px;height:38px;border-radius:12px;background:var(--accent);color:#2a2216;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:750}.staff-content{padding:18px 18px 38px}.staff-summary{display:grid;grid-template-columns:repeat(3,1fr);background:var(--surface);border:1px solid var(--line);border-radius:18px;margin-bottom:16px}.staff-summary>view{padding:16px 8px;text-align:center;border-right:1px solid var(--line)}.staff-summary>view:last-child{border-right:0}.summary-value{display:block;font-size:20px;font-weight:800}.summary-label{display:block;color:var(--muted);font-size:9px;margin-top:5px}.staff-management-list{background:var(--surface);border:1px solid var(--line);border-radius:18px}.staff-manage-row{min-height:66px;display:flex;align-items:center;gap:11px;padding:11px 13px;border-bottom:1px solid var(--line)}.staff-manage-row:last-of-type{border-bottom:0}.staff-name-line{display:flex;align-items:center;gap:7px}.employment-state{font-size:8px;padding:3px 6px;border-radius:5px}.employment-state.active{color:var(--success);background:rgba(112,201,153,.1)}.employment-state.inactive{color:var(--danger);background:rgba(230,106,97,.1)}.small-avatar.inactive{opacity:.5}.add-staff-button{margin:14px;width:calc(100% - 28px)!important}.staff-sheet-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}.profile-avatar.compact{width:46px;height:46px;border-radius:15px;font-size:16px}.staff-sheet-head .sheet-title,.staff-sheet-head .sheet-subtitle{margin-bottom:0}.staff-sheet-head .sheet-subtitle{margin-top:5px}
.tabbar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;height:calc(66px + env(safe-area-inset-bottom));padding:7px 10px env(safe-area-inset-bottom);background:rgba(30,31,29,.98);border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(5,1fr);z-index:20}.tab-item{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--faint);font-size:9px}.tab-icon{font-size:20px;line-height:1}.tab-item.active{color:var(--accent)}.tab-badge{position:absolute;top:0;right:16px;min-width:16px;height:16px;border-radius:8px;background:var(--danger);color:white;font-size:8px;display:flex;align-items:center;justify-content:center;padding:0 4px}
.overlay-page{position:fixed;z-index:40;top:0;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--bg)}.overlay-header{height:calc(82px + env(safe-area-inset-top));padding:calc(18px + env(safe-area-inset-top)) 16px 10px;display:flex;align-items:flex-end;justify-content:space-between;border-bottom:1px solid var(--line);background:rgba(23,24,22,.98)}.back-button,.more-button{width:38px;height:38px;border-radius:12px;background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:28px}.more-button{font-size:14px;letter-spacing:2px}.overlay-heading{text-align:center}.overlay-heading text:first-child{display:block;font-size:16px;font-weight:720}.overlay-heading text:last-child{display:block;color:var(--muted);font-size:9px;margin-top:4px}.overlay-scroll{position:absolute;top:calc(82px + env(safe-area-inset-top));bottom:0;left:0;right:0}.order-detail-content,.form-content{padding:16px 18px 36px}
.detail-status-panel{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:17px;display:grid;grid-template-columns:1fr auto;align-items:end}.detail-status{display:block;font-size:19px;font-weight:750;margin-top:5px}.detail-percent{font-size:25px;font-weight:820;color:var(--accent)}.progress-track.wide{grid-column:1/-1;margin:16px 0 10px}.detail-next{grid-column:1/-1;color:var(--muted);font-size:11px}.detail-info-line{display:grid;grid-template-columns:1.3fr .8fr 1fr;gap:10px;padding:18px 4px;border-bottom:1px solid var(--line);font-size:10px;line-height:1.45}.info-label{display:block;color:var(--faint);font-size:8px;margin-bottom:4px}.timeline-heading{margin:22px 3px 15px}.timeline-step{display:flex;gap:12px;min-height:78px}.timeline-rail{width:28px;display:flex;flex-direction:column;align-items:center;flex:none}.timeline-node{width:27px;height:27px;border-radius:9px;background:var(--accent);color:#2a2216;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;border:1px solid var(--accent)}.timeline-line{width:1px;flex:1;background:rgba(233,170,58,.28);margin:5px 0}.timeline-content{flex:1;padding:3px 0 18px}.timeline-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.timeline-title{font-size:13px;font-weight:700;line-height:1.4}.timeline-time{color:var(--faint);font-size:9px}.timeline-operator,.timeline-hint{display:block;color:var(--muted);font-size:9px;margin-top:4px}.timeline-step.done .timeline-node{background:#555750;color:#bfc0b8;border-color:#66685f}.timeline-step.done .timeline-line{background:#4b4c47}.timeline-step.done .timeline-title{color:#85867f}.timeline-step.done .timeline-operator{color:#666860}.timeline-step.current .timeline-node{box-shadow:0 0 0 5px rgba(233,170,58,.12)}.timeline-step.future{opacity:.62}.step-action{margin-top:10px;min-height:40px}.branch-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.branch-button.secondary{background:var(--surface-soft);color:var(--text);border:1px solid var(--line)}.detail-spacer{height:30px}
.sheet-mask{position:fixed;z-index:60;inset:0;background:rgba(5,5,4,.72);display:flex;align-items:flex-end;justify-content:center}.bottom-sheet{width:100%;max-width:430px;background:var(--surface);border-radius:24px 24px 0 0;padding:10px 18px calc(18px + env(safe-area-inset-bottom));border-top:1px solid var(--line)}.bottom-sheet.tall{padding-bottom:calc(14px + env(safe-area-inset-bottom))}.sheet-handle{width:38px;height:4px;border-radius:4px;background:#565750;margin:0 auto 14px}.sheet-title{display:block;font-size:17px;font-weight:750;margin-bottom:6px}.sheet-subtitle{display:block;color:var(--muted);font-size:10px;margin-bottom:14px}.sheet-action{display:flex;justify-content:space-between;align-items:center;min-height:52px;border-bottom:1px solid var(--line);font-size:13px}.sheet-cancel{width:100%;background:var(--surface-soft);color:var(--text);border:0;border-radius:13px;min-height:44px;font-size:12px;font-weight:700;margin-top:12px;display:flex;align-items:center;justify-content:center;padding:0 12px;line-height:1.2}
.form-content{padding-top:22px}.theme-selector{display:flex;flex-wrap:wrap;gap:8px}.theme-option{padding:10px 12px;border-radius:11px;background:var(--surface);border:1px solid var(--line);color:var(--muted);font-size:11px}.theme-option.active{background:var(--accent-soft);color:var(--accent);border-color:rgba(233,170,58,.34)}.two-fields{display:grid;grid-template-columns:1.2fr .8fr;gap:10px}.form-note{margin:8px 0 18px}.sticky-submit{margin-top:6px}.correction-scroll{width:100%;white-space:nowrap;margin:14px 0}.correction-options{display:flex;gap:8px}.correction-chip{display:inline-flex;padding:9px 12px;border-radius:10px;background:var(--surface-soft);border:1px solid var(--line);font-size:10px;color:var(--muted);flex:none}.correction-chip.active{background:var(--accent);color:#2a2216;border-color:var(--accent)}
.notification-list{padding:12px 16px 40px}.wechat-reminder{display:flex;align-items:center;gap:12px;margin-bottom:8px;padding:14px;background:var(--accent-soft);border:1px solid rgba(233,170,58,.2);border-radius:15px}.wechat-reminder .activity-detail{white-space:normal}.reminder-button{flex:none;min-height:40px;padding:0 12px;border:0;border-radius:11px;background:var(--accent);color:#2a2216;font-size:11px;font-weight:750;display:flex;align-items:center;justify-content:center}.notification-row{display:flex;gap:12px;padding:15px 2px;border-bottom:1px solid var(--line);position:relative}.notification-row.unread:after{content:"";position:absolute;right:0;top:18px;width:6px;height:6px;border-radius:50%;background:var(--accent)}.notification-title-row{display:flex;justify-content:space-between;gap:10px}.notification-row .activity-detail{white-space:normal;margin-top:5px;padding-right:12px}.staff-ledger-content{padding:16px 18px 40px}.staff-ledger-row{align-items:center}.ledger-action{display:flex;flex-direction:column;align-items:flex-end;gap:6px}.revoke-button{min-width:46px;min-height:32px;padding:0 9px;border:1px solid rgba(230,106,97,.28);border-radius:9px;background:rgba(230,106,97,.09);color:var(--danger);font-size:10px;display:flex;align-items:center;justify-content:center}
@media(min-width:700px){body{background:#0d0e0c}.app-shell,.overlay-page{box-shadow:0 0 0 1px rgba(255,255,255,.05),0 40px 100px rgba(0,0,0,.5)}}
/* Header and scrolling content share the same measured top inset. H5 retains
   the original dimensions through fallbacks; WeChat supplies capsule metrics. */
.topbar{height:var(--app-header-height,106px);padding-top:var(--app-header-padding-top,calc(18px + env(safe-area-inset-top)))}
.page-scroll{top:var(--app-header-height,106px)}
.overlay-header{height:var(--app-overlay-height,calc(82px + env(safe-area-inset-top)));padding-top:var(--app-header-padding-top,calc(18px + env(safe-area-inset-top)))}
.overlay-scroll{top:var(--app-overlay-height,calc(82px + env(safe-area-inset-top)))}
</style>
