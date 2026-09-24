import { readFile, writeFile } from 'node:fs/promises'

const buildRoot = new URL('../dist/build/mp-weixin/', import.meta.url)
const app = new URL('app.json', buildRoot)
const configFile = new URL('project.config.json', buildRoot)

await readFile(app)
const config = JSON.parse(await readFile(configFile, 'utf8'))

// The source project's root points into dist; the generated project is its own root.
config.miniprogramRoot = ''
delete config.cloudfunctionRoot

await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`)
console.log('微信小程序构建目录可直接导入开发者工具。')
