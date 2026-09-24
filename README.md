# escape-room-app

面向密室逃脱门店员工与店长的任务、积分、订单进度和收款登记应用，支持 H5 与微信小程序。

## 项目简介

以“零零谷 · 九汇城店”为场景，员工完成积分任务、抢临时任务、创建并推进订单；店长审核打扫任务、发布任务、
维护员工与主题、修改积分规则并查看经营概览。数据保存在门店后端，员工手机、店长手机和运营后台三端实时互通。

- 员工和店长各用自己的手机号账号登录，身份由账号决定；停用或删除的账号会立即退出。
- 订单使用创建、开始、开复、收钱、带场、入场、进行、结束、收复、拍照、视频、完毕等节点，由门店系统校验顺序；
  员工视图只展示未完成订单，店长可查看历史并修正、取消、删除。
- 收钱节点登记微信、支付宝、现金、线上四渠道金额，回退后修改原收款并保留修改记录；取消或删除订单自动冲正。
  店长概览的今日与近 7 日收款由门店系统按门店日期统计（线上不计入三项合计）。只登记金额，不发起支付或退款。
- 积分任务、打扫审核、积分撤销与调整、限定员工的临时任务、主题与维修管理均与运营后台同步。
- 页面每 8 秒比对一次数据版本，有变化才刷新；打开时先显示本机缓存，再静默更新。
- 接入门店系统时**没有改动任何界面样式**：新增的登录页、修改密码页和账号相关按钮全部复用原有样式，
  `npm run test:style` 会与接入前的版本逐项比对样式代码和使用的样式类。
- 微信订阅提醒通过独立云函数发送（只推送全店可见的消息）。

## 技术栈

- uni-app 3、Vue 3、JavaScript、Vite 5、Vue I18n
- 门店后端：[escape-room-backend](https://github.com/jiangyi3265/escape-room-backend)（`/app/**` 接口，请求头 `X-Store-Token`）
- 微信小程序订阅消息、微信云开发、Node.js 云函数（wx-server-sdk）
- Node.js 规则与页面脚本测试、Playwright 浏览器联调；可选 Python / Pillow 视觉对比脚本

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| escape-room-backend | 后端服务 | [escape-room-backend](https://github.com/jiangyi3265/escape-room-backend) |
| escape-room-admin | Web 运营后台 | [escape-room-admin](https://github.com/jiangyi3265/escape-room-admin) |
| escape-room-app | 门店员工与店长端（本仓库） | [escape-room-app](https://github.com/jiangyi3265/escape-room-app) |

## 快速启动

先按后端仓库说明启动门店后端（本机默认 `http://127.0.0.1:8087`）。使用 Node.js 20+ 与 npm：

```bash
npm install
npm run dev:h5
```

H5 开发服务默认端口 5260，`/store-api` 自动转发到后端。需要改端口或后端地址时，复制 `.env.example` 为 `.env.local` 修改
`VITE_DEV_PORT`、`VITE_DEV_API_TARGET`。演示账号（后端载入演示数据后）：店长 `13800000000`，员工 `13800000001`～`13800000006`。

构建：

```bash
npm run build:h5
npm run dev:mp-weixin
npm run build:mp-weixin
```

- **H5 部署**：把 `dist/build/h5` 放到网站目录，并让反向代理把 `/store-api/` 转发到后端（去掉 `/store-api` 前缀）。
- **微信小程序**：在 `.env.local` 填写 `VITE_API_BASE_URL`（可公网访问的 https 后端地址，并加入小程序「request 合法域名」）后重新构建；
  生产构建会检查该地址。未配置时会停止构建，避免上传只能连接本机的审核包；`dev:mp-weixin` 仍可在开发者工具中连接本机调试。
  生产构建输出 `dist/build/mp-weixin`，把 `manifest.json` 与 `project.config.json` 的 AppID 改成自己的小程序账号。

启用订阅通知时，在 `.env.local` 填写公开的订阅模板 ID `VITE_WECHAT_SUBSCRIBE_TEMPLATE_IDS`（逗号分隔），模板字段为
`thing1`、`thing2`、`time3`。在微信云开发中创建 `notification_subscribers` 集合，部署 `cloudfunctions/sendStoreNotification`
并在云端安装依赖，重新构建后由用户主动授权订阅。H5 不支持微信订阅发送；未配置模板时会提示缺少配置。

## 测试

```bash
npm test                 # 离线：导航布局、订单可见性与页面操作、收款、配置、需求红线、样式未改动
npm run test:live        # 页面脚本 + 真实后端：员工与店长两台手机互相看到对方的操作
npm run test:h5          # 浏览器联调：登录、积分、订单、审核、发布、维修，后台发通知后门店端收到
```

`test:live` / `test:h5` 需要后端（和 H5 开发服务）已启动；可用 `STORE_API_BASE` 指定后端地址，`STORE_RESET=1` 在开始前重置演示数据，
`test:h5` 截图保存在 `visual-regression/live/`。可选视觉回归：安装 `Pillow` 后执行 `npm run visual:check`，设计基线在 `design-previews/`。

## 项目结构

```text
pages/index/index.vue       员工/店长主界面与交互（含登录、修改密码）
components/                收款表单、主题/积分配置与维修工作区
services/store-api.js      门店后端接口与登录凭证
services/api-config.js     后端地址（H5 走代理，小程序读 VITE_API_BASE_URL）
services/app-state.js      门店数据整理、版本比较、本机缓存
services/*-rules.js        订单、收款、积分、员工规则（显示与提交前即时校验）
services/store-config.js   主题与任务配置、维修规则
services/wechat-notifications.js  微信授权与云函数调用
cloudfunctions/            订阅登记与消息发送云函数
scripts/                   规则、页面、联调、样式与视觉回归脚本
static/                    应用静态资源
design-previews/           界面设计基线
docs/usage.md              原单机版的详细功能说明
```

## 简历描述示例

基于 uni-app 与 Vue 3 开发密室门店员工和店长工作台，并在不改动任何界面样式的前提下接入自建后端：账号登录与身份切换、
订单多节点流转、四渠道收款登记及冲正、积分审核与抢单；用版本号增量同步实现员工端、店长端、运营后台三端实时互通，
并编写页面脚本测试、真实后端联调测试和样式不变性校验。
