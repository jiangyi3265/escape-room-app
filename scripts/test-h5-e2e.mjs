import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// H5 真实页面联调：登录、员工操作、店长操作、后台发通知后门店端收到。
// 需要：H5 开发服务（npm run dev:h5）+ 门店后端。环境变量：
//   H5_URL          默认 http://localhost:5260/
//   STORE_API_BASE  后端地址（后台发通知用），默认 http://127.0.0.1:8087
//   REDIS_DATABASE  后端使用的 Redis 库（读取后台登录验证码），默认 7
//   PLAYWRIGHT_MODULE  playwright 的位置，默认全局安装目录
const H5_URL = process.env.H5_URL || 'http://localhost:5260/'
const BASE = (process.env.STORE_API_BASE || 'http://127.0.0.1:8087').replace(/\/+$/, '')
const REDIS_DB = process.env.REDIS_DATABASE || '7'
const REDIS_CLI = process.env.REDIS_CLI || 'C:/Program Files/Redis/redis-cli.exe'
// 本机演示数据的默认密码（python scripts/escape_db.py demo --dev），其它环境用环境变量传入
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || '123456'
const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'file:///C:/Users/jiangyi/AppData/Roaming/npm/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightModule)
const shots = fileURLToPath(new URL('../visual-regression/live/', import.meta.url))
mkdirSync(shots, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' })
const page = await context.newPage()
const problems = []
const missing = []
page.on('console', message => { if (message.type() === 'error' && !/^Failed to load resource/.test(message.text())) problems.push(message.text()) })
page.on('pageerror', error => problems.push(error.message))
// 加载失败的资源单独按网址记录（浏览器控制台的这类报错不带网址）
page.on('response', response => { if (response.status() >= 400 && !/favicon\.ico/.test(response.url())) missing.push(`${response.status()} ${response.url()}`) })

let count = 0
async function check(label, fn) { await fn(); count++; console.log(`PASS ${label}`) }
const shot = name => page.screenshot({ path: `${shots}${name}.png` })
const visibleText = text => page.locator(`text=${text}`).first()
const tab = label => page.locator('.tabbar .tab-item', { hasText: label })
async function confirmModal(input) {
	const modal = page.locator('.uni-modal').last()
	await modal.waitFor({ state: 'visible' })
	if (input !== undefined) await modal.locator('input, textarea').first().fill(input)
	await modal.locator('.uni-modal__btn_primary').click()
	await modal.waitFor({ state: 'hidden' }).catch(() => {})
}
// 纯文字提示是 .uni-simple-toast__text，带图标的是 .uni-toast__content；等到出现期望的文字为止
async function expectToast(expected) {
	await page.waitForFunction(text => [...document.querySelectorAll('uni-toast .uni-simple-toast__text, uni-toast .uni-toast__content')]
		.some(node => node.offsetParent !== null && node.textContent.trim() === text), expected, { timeout: 8000 })
}
async function login(phone, password) {
	const form = page.locator('.overlay-page', { hasText: '登录门店账号' })
	await form.waitFor({ state: 'visible' })
	await form.locator('input').nth(0).fill(phone)
	await form.locator('input').nth(1).fill(password)
	const consent = form.locator('.form-note', { hasText: '我已阅读并同意' })
	if ((await consent.locator('.helper-icon').innerText()).trim() !== '✓') await consent.click()
	await form.locator('.primary-button', { hasText: '登录' }).click()
	await form.waitFor({ state: 'detached', timeout: 15000 })
}
async function adminToken() {
	const captcha = await (await fetch(`${BASE}/captchaImage`)).json()
	const code = captcha.captchaEnabled === false ? '' : execFileSync(REDIS_CLI, ['-n', REDIS_DB, 'get', `captcha_codes:${captcha.uuid}`], { encoding: 'utf8' }).trim().replace(/^"|"$/g, '')
	const response = await fetch(`${BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: ADMIN_PASSWORD, code, uuid: captcha.uuid }) })
	return (await response.json()).token
}

try {
	await check('未登录时显示登录页，且要先勾选同意协议才能登录', async () => {
		await page.goto(H5_URL)
		await visibleText('登录门店账号').waitFor()
		await shot('00-login')
		const submit = page.locator('.overlay-page .primary-button', { hasText: '登录' })
		await submit.click()
		await expectToast('请先阅读并同意协议')
		await page.locator('.overlay-page .form-note', { hasText: '我已阅读并同意' }).click()
		await submit.click()
		await expectToast('请填写11位手机号')
	})

	await check('登录页能打开《用户服务协议》与《隐私政策》', async () => {
		for (const [link, heading, name] of [['《用户服务协议》', '一、这是什么', '00b-terms'], ['《隐私政策》', '一、我们收集哪些信息', '00c-privacy']]) {
			await page.locator('.text-link', { hasText: link }).click()
			const doc = page.locator('.overlay-page', { hasText: heading })
			await doc.waitFor({ state: 'visible' })
			const text = await doc.innerText()
			assert.ok(text.includes('零零谷密室逃脱'), `${link} 里没有写运营主体`)
			assert.ok(!text.includes('待填写'), `${link} 里还有没填的占位文字`)
			await shot(name)
			await doc.locator('.back-button').click()
			await doc.waitFor({ state: 'detached' })
		}
	})

	await check('员工登录后进入首页：姓名、积分、正在进行的订单来自门店系统', async () => {
		await login('13800000002', STAFF_PASSWORD)
		await visibleText('，林澈').waitFor()
		assert.match(await page.locator('.score-number').textContent(), /^\d+$/)
		await page.locator('.active-order').waitFor()
		assert.match(await page.locator('.quick-caption').first().textContent(), /\d+ 项可选/)
		assert.equal((await page.locator('.avatar').textContent()).trim(), '林')
		await shot('01-员工首页')
	})

	await check('员工完成积分任务：确认后积分立即增加', async () => {
		const before = Number(await page.locator('.score-number').textContent())
		await tab('积分').click()
		await page.locator('.task-row', { hasText: '及时带场' }).click()
		await confirmModal()
		await page.waitForFunction(value => Number(document.querySelector('.points-total')?.textContent) === value, before + 2, { timeout: 10000 })
		await shot('02-积分任务')
		await page.locator('.segment', { hasText: '明细' }).click()
		await page.locator('.ledger-row', { hasText: '及时带场' }).first().waitFor()
	})

	await check('员工订单列表与详情：进度、节点、收款记录', async () => {
		await tab('订单').click()
		await page.locator('.order-list-item').first().waitFor()
		await shot('04-订单列表')
		await page.locator('.order-list-item', { hasText: '夜半歌声' }).click()
		await page.locator('.timeline-step.current').waitFor()
		assert.ok(await page.locator('.payment-record', { hasText: '微信 ¥588.00' }).count() > 0)
		await shot('05-订单进度详情')
		await page.locator('.timeline-step.current .step-action').click()
		await confirmModal()
		await page.locator('.timeline-step.done', { hasText: '开始入场' }).waitFor({ timeout: 10000 })
		await page.locator('.overlay-page .back-button').first().click()
	})

	await check('员工抢单大厅与我的页面', async () => {
		await tab('抢单').click()
		await page.locator('.job-item').first().waitFor()
		await shot('03-抢单大厅')
		await tab('我的').click()
		await visibleText('修改登录密码').waitFor()
		await shot('06-员工我的')
	})

	await check('后台发送门店通知，员工端几秒内收到', async () => {
		const token = await adminToken()
		const title = `联调通知${String(Date.now()).slice(-4)}`
		const response = await fetch(`${BASE}/escape/notice`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title, detail: '来自管理后台的消息', scope: 'all' }) })
		assert.equal((await response.json()).code, 200)
		await page.locator('.icon-button').click()
		await page.locator('.notification-row', { hasText: title }).waitFor({ timeout: 20000 })
		await shot('07-消息通知')
		await page.locator('.overlay-page .back-button').first().click()
	})

	await check('退出登录后回到登录页', async () => {
		await tab('我的').click()
		await page.locator('.setting-row', { hasText: '退出登录' }).click()
		await confirmModal()
		await visibleText('登录门店账号').waitFor()
		assert.equal(await page.evaluate(() => localStorage.getItem('escape-room-store-token')), null)
	})

	await check('店长登录后进入概览：今日收款、近 7 日、订单现场', async () => {
		await login('13800000000', STAFF_PASSWORD)
		await page.locator('.manager-order-row').first().waitFor()
		assert.match(await page.locator('.receipt-total').textContent(), /¥\d+\.\d{2}/)
		assert.equal(await page.locator('.receipt-history-row').count(), 7)
		assert.ok(await page.locator('.manager-order-row').count() > 0)
		assert.equal((await page.locator('.avatar').textContent()).trim(), '店')
		await shot('08-店长概览')
	})

	await check('店长审核打扫任务', async () => {
		await tab('审核').click()
		const first = page.locator('.audit-item').first()
		await first.waitFor()
		const before = await page.locator('.audit-item').count()
		await first.locator('.primary-button').click()
		await expectToast('审核通过')
		await page.waitForFunction(value => document.querySelectorAll('.audit-item').length === value - 1, before)
		await shot('09-打扫审核')
	})

	await check('店长发布临时任务', async () => {
		await tab('发布').click()
		const form = page.locator('.publish-form')
		await form.locator('input').first().fill('浏览器联调任务')
		await form.locator('textarea').first().fill('检查前台物资')
		await form.locator('.primary-button', { hasText: '发布任务' }).click()
		await expectToast('发布成功')
		await page.locator('.published-row', { hasText: '浏览器联调任务' }).waitFor()
		await shot('10-发布任务')
	})

	await check('店长订单管理含已完成筛选；员工管理可打开', async () => {
		await tab('订单').click()
		await page.locator('.filter-chip', { hasText: '已完成' }).click()
		await page.locator('.order-list-item').first().waitFor()
		await shot('11-店长订单管理')
		await tab('我的').click()
		await page.locator('.setting-row', { hasText: '员工管理' }).click()
		await page.locator('.staff-manage-row').first().waitFor()
		await shot('12-员工管理')
		await page.locator('.staff-manage-row', { hasText: '唐宁' }).click()
		await page.locator('.sheet-action', { hasText: '重置登录密码' }).waitFor()
		await page.locator('.sheet-cancel').click()
		await page.locator('.overlay-page .back-button').first().click()
	})

	await check('维修面板：店长登记维修', async () => {
		await page.locator('.repair-entry').click()
		await page.locator('.workspace .primary', { hasText: '需要修理' }).click()
		await page.locator('.workspace .theme-choice').first().click()
		await page.locator('.workspace textarea').fill('浏览器联调：灯光闪烁')
		await page.locator('.workspace .primary', { hasText: '登记需要修理' }).click()
		await page.locator('.workspace .repair-row', { hasText: '浏览器联调：灯光闪烁' }).waitFor()
		await shot('13-维修')
		await page.locator('.workspace .back').click()
	})

	await check('页面没有脚本错误，也没有加载失败的资源或接口', async () => {
		assert.deepEqual(problems.filter(text => !/DevTools/.test(text)), [])
		assert.deepEqual(missing, [])
	})
} finally {
	await browser.close()
}
console.log(`${count} H5 browser checks passed (${H5_URL})`)
