import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const source = await readFile(new URL('../services/navigation-layout.js', import.meta.url), 'utf8')
const pageSource = await readFile(new URL('../pages/index/index.vue', import.meta.url), 'utf8')
const workspaceSource = await readFile(new URL('../components/StoreWorkspace.vue', import.meta.url), 'utf8')
const { calculateNavigationLayout, navigationStyle, readWechatNavigationStyle } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
let checks = 0
function check(label, fn) { fn(); checks++; console.log(`PASS ${label}`) }
const profiles = [
	{ name: 'iPhone notch', statusBarHeight: 47, top: 51, bottom: 83 },
	{ name: 'iPhone dynamic island', statusBarHeight: 59, top: 63, bottom: 95 },
	{ name: 'Android', statusBarHeight: 24, top: 32, bottom: 64 },
	{ name: 'small screen', statusBarHeight: 20, top: 26, bottom: 58 },
	{ name: 'landscape', statusBarHeight: 0, top: 4, bottom: 36 }
]
for (const profile of profiles) check(`${profile.name}: all interactive headers below native capsule`, () => {
	const layout = calculateNavigationLayout(profile, profile)
	assert.equal(layout.reservedTop, profile.bottom + 8)
	// Main action is 44px tall; its badge extends 5px above it.
	assert.ok(layout.headerHeight - 12 - 44 - 5 > profile.bottom)
	assert.ok(layout.overlayHeight - 10 - 38 > profile.bottom)
	assert.ok(layout.paddingTop > profile.bottom)
	assert.ok(layout.headerHeight - layout.paddingTop - 12 >= 44)
	assert.ok(layout.overlayHeight - layout.paddingTop - 10 >= 38)
	assert.equal(navigationStyle(layout)['--app-header-height'], `${layout.headerHeight}px`)
})
check('zero/invalid capsule uses status bar fallback', () => {
	for (const capsule of [{}, { top: 0, bottom: 0 }, { top: NaN, bottom: 80 }, { top: 80, bottom: 70 }]) {
		const layout = calculateNavigationLayout({ statusBarHeight: 47 }, capsule)
		assert.equal(layout.reservedTop, 99)
	}
})
check('safe-area fallback and missing APIs do not crash', () => {
	assert.equal(calculateNavigationLayout({ safeArea: { top: 59 } }).reservedTop, 111)
	assert.equal(readWechatNavigationStyle({})['--app-header-height'], '148px')
	assert.equal(readWechatNavigationStyle({ getWindowInfo() { throw Error('unavailable') }, getSystemInfoSync() { return { statusBarHeight: 47 } }, getMenuButtonBoundingClientRect() { throw Error('unavailable') } })['--app-header-height'], '175px')
})
check('fresh layout reflects rotation/device changes', () => {
	let info = profiles[0]
	const api = { getWindowInfo: () => info, getMenuButtonBoundingClientRect: () => info }
	const portrait = readWechatNavigationStyle(api)
	info = profiles[4]
	const landscape = readWechatNavigationStyle(api)
	assert.notEqual(portrait['--app-header-height'], landscape['--app-header-height'])
})
check('page, overlays and workspace consume shared insets', () => {
	assert.ok(pageSource.includes('class="app-shell" :style="navigationStyle"'))
	assert.ok(pageSource.includes('.page-scroll{top:var(--app-header-height,106px)}'))
	assert.ok(pageSource.includes('.overlay-scroll{top:var(--app-overlay-height,'))
	assert.ok(pageSource.includes(':navigation-style="navigationStyle"'))
	assert.ok(workspaceSource.includes('class="workspace" :style="navigationStyle"'))
	assert.ok(workspaceSource.includes('.workspace-header{padding-top:var(--app-header-padding-top,'))
	assert.match(pageSource, /\/\/ #ifdef MP-WEIXIN\s+navigationStyle = readWechatNavigationStyle\(uni\)\s+\/\/ #endif/)
	assert.ok(pageSource.includes('onResize(){this.updateNavigationLayout()}'))
})
console.log(`${checks} native navigation checks passed`)
