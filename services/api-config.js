// 门店后端地址。
// H5 开发时走 vite 代理（/store-api → 后端），不需要配置；
// 微信小程序必须在 .env.local 里填写已备案的 https 地址（VITE_API_BASE_URL），并加入小程序「request 合法域名」。
const configured = String(import.meta.env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

export const H5_PROXY_PREFIX = '/store-api'

export function apiBaseUrl() {
	if (configured) return configured
	// #ifdef H5
	return H5_PROXY_PREFIX
	// #endif
	// #ifndef H5
	// 微信开发者工具里勾选「不校验合法域名」后可直连本机后端
	return 'http://127.0.0.1:8087'
	// #endif
}
