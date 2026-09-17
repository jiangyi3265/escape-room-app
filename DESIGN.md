---
name: 暗格门店
description: 面向昏暗门店环境的密室逃脱任务与订单协作工具
colors:
  night-canvas: "oklch(20.5% 0.005 110)"
  coal-surface: "oklch(24.7% 0.006 110)"
  lifted-surface: "oklch(29.5% 0.007 105)"
  control-surface: "oklch(34% 0.009 105)"
  warm-paper: "oklch(95.4% 0.012 88)"
  quiet-stone: "oklch(72% 0.012 90)"
  dim-stone: "oklch(57% 0.012 110)"
  worklight-amber: "oklch(76.5% 0.14 78)"
  ready-green: "oklch(76% 0.12 158)"
  alert-coral: "oklch(66% 0.15 28)"
  remote-blue: "oklch(72% 0.1 250)"
typography:
  app-header:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "32px"
    fontWeight: 760
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "24px"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "17px"
    fontWeight: 720
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.2
rounded:
  control: "12px"
  container: "18px"
  feature: "20px"
  sheet: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.worklight-amber}"
    textColor: "{colors.night-canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.warm-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "44px"
  field:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.warm-paper}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "46px"
---

# Design System: 暗格门店

## Overview

**Creative North Star: "夜间值守台"**

界面像门店里一盏稳定的工作灯：周围安静、低眩光，当前需要完成的动作被暖光准确照亮。视觉氛围有密室感，但不制造恐惧，也不让装饰抢走操作注意力。

系统使用熟悉的小程序导航、表单和列表结构。员工端把下一步推到视线中心，店长端把异常和待办集中呈现。动效只用于状态反馈，控制在 150 至 220 毫秒。

**Key Characteristics:**

- 暖黑低眩光背景，适合昏暗门店。
- 琥珀色只标记当前动作、选中状态和关键积分。
- 44px 以上触控区域，支持走动中单手操作。
- 操作人、时间、状态成组出现。
- 完成节点变灰，未开始和当前节点保持可见高亮。

## Colors

配色来自夜间值守环境中的煤黑表面、纸张白和工作灯琥珀色，所有语义颜色同时配合文字或图标。

### Primary

- **工作灯琥珀色**：用于主按钮、当前节点、选中筛选和积分强调。它是操作信号，不是装饰。

### Secondary

- **就绪绿色**：只用于到账、完成和在线状态。
- **远程蓝色**：只用于店长远程在线、待审核和信息状态。
- **警示珊瑚色**：只用于驳回、取消、删除和超时。

### Neutral

- **夜幕底色**：页面底层，降低昏暗环境中的屏幕眩光。
- **煤灰表面**：列表、订单容器和底部导航。
- **控制表面**：输入框、分段控制和次级按钮。
- **暖纸白**：主要文字，不使用纯白。
- **静石灰**：说明、时间和元数据。

**The Worklight Rule.** 除积分总览带外，琥珀色在单屏面积中保持克制。一个区域只能有一个最强操作信号。

## Typography

**Display Font:** 系统无衬线字体

**Body Font:** 系统无衬线字体

**Character:** 字体遵循微信和系统原生阅读习惯，紧凑、稳定、无需加载外部字库。数字使用接近表格数字的节奏，方便快速比较积分和时间。

### Hierarchy

- **App Header**（760，32px，1.25）：主导航页面标题；门店名为 13px，时间为 11px。左侧文字块上移 8px，右侧操作按钮保留微信胶囊安全间距。
- **Headline**（720，24px，1.2）：内容区标题和关键问候。
- **Title**（720，17px，1.3）：模块标题、订单主题和任务标题。
- **Body**（400，13px，1.5）：任务说明、提示和表单内容。
- **Label**（650，11px，1.2）：按钮、字段名、状态和元数据。

**The Working Distance Rule.** 任何关键状态都必须在一臂距离下清晰辨认，不使用细字重承载关键操作。

## Elevation

系统以色调分层为主，阴影为辅。页面、煤灰容器和控制表面构成三个稳定层级；阴影只用于当前订单和底部操作单，不用来装饰每个容器。

### Shadow Vocabulary

- **当前任务阴影**（`0 16px 36px rgba(5,5,4,0.18)`）：只用于员工首页正在进行的订单。
- **底部操作遮罩**（`rgba(5,5,4,0.72)`）：用于高风险操作和节点修正，确保焦点集中。

**The Flat By Default Rule.** 列表和普通容器保持平面；若每个元素都浮起，层级就失去意义。

## Components

### Buttons

- **Shape:** 稳定圆角矩形（12px），最小高度 44px。
- **Primary:** 工作灯琥珀色背景，深色文字；一个操作区只放一个主按钮。
- **Hover / Focus:** H5 使用轻微亮度变化和清晰轮廓；小程序依靠按下态和反馈提示。
- **Secondary:** 控制表面背景，用于取消、并列选择和次级操作。

### Chips

- **Style:** 胶囊形筛选只用于类别和状态，未选中使用煤灰表面。
- **State:** 选中后使用琥珀色背景和深色文字，不能只改变边框。

### Cards / Containers

- **Corner Style:** 普通容器 18px，重点容器 20px。
- **Background:** 煤灰表面承载订单、任务和审核记录。
- **Shadow Strategy:** 默认无阴影，以 10% 暖白分隔线区分层级。
- **Internal Padding:** 列表行 13 至 16px，重点容器 16 至 20px。

### Inputs / Fields

- **Style:** 控制表面背景、12px 圆角、46px 高度。
- **Focus:** 使用工作灯琥珀色焦点状态，不改变布局尺寸。
- **Error / Disabled:** 错误用珊瑚色文字和说明；禁用状态降低对比度，同时保留文字原因。

### Navigation

底部五项导航固定在安全区上方，活动项用琥珀色图标与文字同时标记。角标只显示需要处理的数量。

### Order Timeline

订单时间线是签名组件。已完成节点变为中性灰，当前节点使用琥珀色数字、说明和主按钮，未来节点保留可读但降低权重。拍照和视频分支使用两个等宽明确选项。

## Do's and Don'ts

### Do:

- **Do** 让当前动作在首屏或当前滚动位置中可见。
- **Do** 保证按钮和交互区域至少 44px。
- **Do** 用文字、图标和颜色共同表达状态。
- **Do** 在确认页面显示操作人和不可回退说明。
- **Do** 为 360px 宽度保留安全边距，禁止横向滚动。

### Don't:

- **Don't** 使用夸张恐怖风或血腥元素。
- **Don't** 使用满屏霓虹赛博朋克或过度游戏化积分界面。
- **Don't** 使用层层嵌套卡片、装饰性玻璃拟态或通用企业后台模板。
- **Don't** 依赖低对比度细线或只靠颜色表达状态。
- **Don't** 使用小于 44px 的关键触控区域。
- **Don't** 使用彩色粗侧边框、渐变文字或纯黑纯白。
