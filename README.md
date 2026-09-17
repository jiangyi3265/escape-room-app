# escape-room-app

面向密室逃脱门店员工与店长的任务、积分、订单进度和收款登记应用，支持 H5 与微信小程序。

## 项目简介

以“零零谷 · 九汇城店”为演示场景，员工可完成积分任务、领取临时任务、创建并推进订单，店长可审核打扫任务、维护员工与主题、修改积分规则并查看经营概览。

- 订单使用创建、开始、开复、收钱、带场、入场、进行、结束、收复、拍照、视频、完毕等节点；员工视图只展示待处理订单。
- 支持微信、支付宝、现金和线上四渠道金额登记，保留收款修订与冲正记录，统计当日和近 7 日线下三渠道合计；仅登记金额，不调用真实支付或退款。
- 包含积分明细与撤销、打扫审核、限制领取人的临时任务、员工停用/删除、主题维护和维修登记。
- 使用版本化本地存储保存业务状态；微信订阅通知通过独立云函数处理。

当前可在单台设备演示，尚未实现多设备业务同步或服务端店长权限验证。正式集成需补充身份绑定、订单/积分/收款接口、抢单并发控制和服务端审计；不能将本地演示台账直接用于正式财务对账。现有云函数还需补充服务端员工身份、门店归属及消息发布权限校验后再用于生产。

## 技术栈

- uni-app 3、Vue 3、JavaScript
- Vite 5、Vue I18n、uni-app 本地存储 API
- 微信小程序订阅消息、微信云开发、Node.js 云函数（wx-server-sdk）
- Node.js 业务规则回归脚本；可选 Python / Pillow 视觉对比脚本

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| escape-room-backend | 后端基础服务 | [escape-room-backend](https://github.com/jiangyi3265/escape-room-backend) |
| escape-room-admin | Web 管理后台 | [escape-room-admin](https://github.com/jiangyi3265/escape-room-admin) |
| escape-room-app | 门店员工与店长端 | [escape-room-app](https://github.com/jiangyi3265/escape-room-app) |

三个仓库属于密室逃脱门店项目。当前后台使用后端的系统管理 API；门店端的订单、积分与收款业务使用本地存储，尚未接入该 Java 后端，微信订阅通知另有云函数支持。

## 快速启动

使用 Node.js 20+ 与 npm。H5 本地演示不依赖 Java 后端或数据库。

```bash
npm install
npm run dev:h5
```

按终端显示的地址打开页面。构建命令均来自现有 `package.json`：

```bash
npm run build:h5
npm run dev:mp-weixin
npm run build:mp-weixin
```

微信生产构建输出为 `dist/build/mp-weixin`，开发构建为 `dist/dev/mp-weixin`。仅预览页面时将相应目录导入微信开发者工具；部署云函数时使用根目录 `project.config.json`（默认指向生产构建目录），并把 `manifest.json` 与 `project.config.json` 的 AppID 设置为自己的小程序账号。

启用订阅通知时，复制 `.env.example` 为 `.env.local`，填写公开的订阅模板 ID `VITE_WECHAT_SUBSCRIBE_TEMPLATE_IDS`（逗号分隔），模板字段为 `thing1`、`thing2`、`time3`。在微信云开发中创建 `notification_subscribers` 集合，部署 `cloudfunctions/sendStoreNotification` 并在云端安装依赖，重新构建后由用户主动授权订阅。H5 不支持微信订阅发送；未配置模板时会提示缺少配置。

业务回归脚本：

```bash
npm run test:navigation
npm run test:order-visibility
npm run test:payments
npm run test:store-config
npm run test:redlines
```

可选视觉回归：安装 `Pillow` 后，准备 `visual-regression/` 同尺寸截图并执行 `npm run visual:check`；设计基线在 `design-previews/`，运行截图不提交。

## 项目结构

```text
pages/index/index.vue       员工/店长主界面与交互
components/                收款表单、主题/积分配置与维修工作区
services/app-state.js      演示初始数据、版本化本地持久化
services/*-rules.js        订单、收款、积分、员工业务规则
services/store-config.js   主题与任务配置、维修规则
services/wechat-notifications.js  微信授权与云函数调用
cloudfunctions/            订阅登记与消息发送云函数
scripts/                   业务规则和视觉回归脚本
static/                    应用静态资源
design-previews/            界面设计基线
docs/usage.md              原有详细功能与使用说明
```

## 简历描述示例

基于 uni-app 与 Vue 3 开发密室门店员工和店长工作台，实现订单多节点流转、积分任务审核、四渠道收款登记及冲正、主题与维修管理，并编写业务规则回归脚本。通过版本化本地存储支持演示状态持久化，封装微信订阅授权与云函数消息调用，为后续服务端同步预留集成边界。
