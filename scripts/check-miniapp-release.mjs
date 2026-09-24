import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), 'VITE_')
const base = String(env.VITE_API_BASE_URL || '').trim()

if (!base) {
  console.error('微信小程序构建已停止：请在忽略提交的 .env.local 中设置 VITE_API_BASE_URL 为线上 HTTPS 接口域名。')
  process.exit(1)
}

let url
try {
  url = new URL(base)
} catch {
  console.error('微信小程序构建已停止：VITE_API_BASE_URL 不是有效网址。')
  process.exit(1)
}

const host = url.hostname.toLowerCase()
const placeholder = host === 'localhost' || host.endsWith('.localhost') || host === 'example.com' || host.endsWith('.example.com') || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || placeholder) {
  console.error('微信小程序构建已停止：接口必须是有效的公开 HTTPS 域名，不能使用本机、IP 或示例域名。')
  process.exit(1)
}

console.log('微信小程序线上接口地址已配置；上传前仍需在微信公众平台设置 request 合法域名并验证真机登录。')
