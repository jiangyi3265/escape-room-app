# 微信胶囊重叠修复

## 原因和改动

项目使用自定义导航，原来的主标题固定为 106px，未避开微信系统胶囊。改为使用 `getWindowInfo` 与 `getMenuButtonBoundingClientRect` 计算胶囊下方的顶部空间。胶囊接口正是用于获取右上角菜单的位置以避免遮挡，见 [uni-app 官方文档](https://uniapp.dcloud.io/api/ui/menuButton.html)。

- 微信端首次渲染即设置间距，在 onReady / onShow / onResize 重新读取。
- 主标题、滚动区域、订单详情、创建/编辑订单、通知、员工管理共用计算结果。
- 维修、积分设置、主题管理通过组件属性接收同一套间距。
- 胶囊接口暂不可用时，使用状态栏高度加导航区域高度的回退值；H5 不启用该逻辑。

## 验证

- `npm run test:navigation`：9 组断言，覆盖刘海屏、灵动岛、安卓、小屏、横屏、零值/异常回退和共享样式接入。
- `npm run test:order-visibility`：原有 9 组可见性回归通过。
- H5 和微信小程序编译通过，微信构建产物包含胶囊测量调用及样式变量。
- Playwright 独立浏览器内应用实际计算结果，并叠加模拟胶囊；390px 和 360px 宽度下，头像、消息角标、通知操作、订单更多、员工添加、维修返回均低于模拟胶囊，无横向溢出或页面脚本错误。
- 主内容起点与主标题底部一致，弹层内容起点与弹层标题底部一致；H5 未设置变量时仍为原来的 106px 主标题。
- 已点击消息/全部已读、维修/返回、订单/更多/编辑、切换店长、员工管理、主题管理，确认入口可用。

截图文件 `24-capsule-home-simulated.png`、`25-capsule-repair-simulated.png`、`26-capsule-manager-360-simulated.png` 均为浏览器模拟，**不是微信开发者工具或真机截图**。

## 查看修改

### 顶部标题比例微调（2026-09-09）

- 门店名由 11px 放大到 13px，主导航标题由 24px 放大到 32px，时间保持 11px；仅左侧文字块上移 8px。
- 390px 刘海屏模拟中，左侧文字块顶部从 104px 变为 81.5px，上方留白减少 22.5px；右侧按钮仍从 111px 开始，内容仍从 167px 开始。
- 浏览器分别模拟 390px 刘海屏、360px 灵动岛屏、320px 小屏的胶囊位置，检查标题、时间和操作按钮不相交，通知角标仍低于胶囊，主内容起点未改变，无横向溢出。
- 点击维修并返回、打开通知并返回、员工/店长完整往返，逐一切换两端共 10 个主导航标签，标题和时钟无换行、截断或入口遮挡。另检查了无胶囊 H5 的 320px 窄屏，未发现页面脚本错误。
- `npm run test:navigation` 的 9 组检查通过；`npm run build:mp-weixin`、`npm run build:h5` 均通过。
- 新截图：`27-header-enlarged-home-simulated.png`、`28-header-enlarged-manager-360-simulated.png`、`29-header-enlarged-home-320-simulated.png`、`30-header-enlarged-h5-320.png`，位于 `visual-regression/`。前三张为浏览器胶囊模拟，最后一张为 H5，均非真机截图。

### 重新生成运行产物

从 HBuilderX 重新运行到微信开发者工具以重新生成 `unpackage` 产物，或运行 `npm run build:mp-weixin` 后导入 `dist/build/mp-weixin`。不要只在旧构建目录中点击“编译”。此次尚未直接连接微信开发者工具或真机复核。
