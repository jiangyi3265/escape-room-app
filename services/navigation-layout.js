// The native WeChat capsule overlays the top of the webview. Keep our entire
// interactive header below it, including notification badges and overlay actions.
export function calculateNavigationLayout(windowInfo = {}, capsule = {}) {
	const positive = value => Number.isFinite(value) && value >= 0
	const statusTop = positive(windowInfo.statusBarHeight) ? windowInfo.statusBarHeight
		: positive(windowInfo.safeArea?.top) ? windowInfo.safeArea.top : 20
	const capsuleValid = positive(capsule.top) && positive(capsule.bottom)
		&& capsule.top >= statusTop && capsule.bottom > capsule.top
	const reservedTop = Math.ceil((capsuleValid ? capsule.bottom : statusTop + 44) + 8)
	return { reservedTop, headerHeight: reservedTop + 76, overlayHeight: reservedTop + 68, paddingTop: reservedTop + 12 }
}

export function navigationStyle(layout) {
	return {
		'--app-header-height': `${layout.headerHeight}px`,
		'--app-overlay-height': `${layout.overlayHeight}px`,
		'--app-header-padding-top': `${layout.paddingTop}px`
	}
}

export function readWechatNavigationStyle(api) {
	let windowInfo = {}, capsule = {}
	try { windowInfo = api.getWindowInfo?.() || {} } catch { /* Fall back on older base libraries. */ }
	if (!Number.isFinite(windowInfo.statusBarHeight) && !Number.isFinite(windowInfo.safeArea?.top)) {
		try { windowInfo = api.getSystemInfoSync?.() || windowInfo } catch { /* Use the safe default below. */ }
	}
	try { capsule = api.getMenuButtonBoundingClientRect?.() || {} } catch { /* Devtools can temporarily return no rect. */ }
	return navigationStyle(calculateNavigationLayout(windowInfo, capsule))
}
