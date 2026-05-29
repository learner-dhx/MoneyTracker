# MoneyTracker 💰

一款基于 Expo (React Native) 的 Android 个人记账应用，帮助你追踪收支、管理预算、控制花销。

## 功能特性

- **收支记录** — 支持支出（刚需 / 预计 / 其他）和收入分类记账，可选择任意日期
- **预算管理** — 设置月收入、刚需支出上限、攒钱目标
- **超支提醒** — 记账时自动检测超支并弹窗提醒，达到 80% 时预警
- **月度统计** — 首页展示总收入、总支出、可自由支配金额
- **预算进度** — 刚需支出和攒钱目标进度条可视化
- **历史记录** — 按月分组展示全部记录，支持删除
- **侧滑切换** — 标签页支持左右侧滑，切换时淡入动画

## 技术栈

| 技术 | 版本 |
|------|------|
| Expo SDK | 54 |
| React Native | 0.76+ |
| React Navigation | v7 |
| AsyncStorage | 持久化存储 |
| EAS Build | 打包构建 |

## 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 打包 APK
eas build -p android --profile preview

首页 · 记账 · 预算 · 历史
```markdown
# MoneyTracker 💰

一款基于 Expo (React Native) 的 Android 个人记账应用，帮助你追踪收支、管理预算、控制花销。

## 功能特性

- **收支记录** — 支持支出（刚需 / 预计 / 其他）和收入分类记账，可选择任意日期
- **预算管理** — 设置月收入、刚需支出上限、攒钱目标
- **超支提醒** — 记账时自动检测超支并弹窗提醒，达到 80% 时预警
- **月度统计** — 首页展示总收入、总支出、可自由支配金额
- **预算进度** — 刚需支出和攒钱目标进度条可视化
- **历史记录** — 按月分组展示全部记录，支持删除
- **侧滑切换** — 标签页支持左右侧滑，切换时淡入动画

## 技术栈

| 技术 | 版本 |
|------|------|
| Expo SDK | 54 |
| React Native | 0.76+ |
| React Navigation | v7 |
| AsyncStorage | 持久化存储 |
| EAS Build | 打包构建 |

## 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npx expo start
```

## 打包 APK

```bash
eas build -p android --profile preview
```

> 首页 · 记账 · 预算 · 历史

Powered by [Expo](https://expo.dev)
