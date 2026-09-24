import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  // H5 开发时，/store-api 转发到门店后端（与小程序共用同一套接口）
  const target = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8087'
  return {
    plugins: [uni()],
    server: {
      port: Number(env.VITE_DEV_PORT || 5260),
      proxy: {
        '/store-api': {
          target,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/store-api/, '')
        }
      }
    }
  }
})
