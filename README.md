# 我们的纪念册

一个可以部署到 GitHub Pages 的纯静态情侣纪念页。页面展示愿望、项目、纪念日和时间线，后台通过 Supabase 保存数据。

## 功能

- 首页展示相恋计时、愿望、项目、纪念日和时间线
- 管理页支持邮箱登录后新增、编辑、删除记录
- 数据保存在 Supabase，GitHub Pages 只负责静态托管
- 无构建步骤，可以直接发布仓库根目录

## 本地预览

直接打开 `index.html` 可以查看示例数据。推荐用本地静态服务器预览：

```bash
python3 -m http.server 4321
```

然后访问：

- `http://localhost:4321/index.html`
- `http://localhost:4321/admin.html`

## Supabase 设置

1. 在 Supabase 创建新项目。
2. 打开 SQL Editor，执行 `supabase.sql`。
3. 把 `supabase.sql` 最后一段里的邮箱换成你和对方的邮箱。
4. Authentication -> Providers，开启 Email 登录。
5. Authentication -> URL Configuration：
   - Site URL 填你的 GitHub Pages 地址，例如 `https://yourname.github.io/love-memory`
   - Redirect URLs 添加本地地址，例如 `http://localhost:4321/admin.html`
6. Project Settings -> API，复制 Project URL 和 anon key。
7. 修改 `src/config.js`：

```js
export const SUPABASE_CONFIG = {
  url: "https://你的项目.supabase.co",
  anonKey: "你的-anon-key",
};
```

不要把 Supabase 的 `service_role` key 写进前端代码。

## GitHub Pages 部署

1. 把代码推送到 GitHub 仓库。
2. 仓库 Settings -> Pages。
3. Source 选择 `Deploy from a branch`。
4. Branch 选择 `main`，目录选择 `/root`。
5. 保存后等待部署完成。

页面地址通常是：

```text
https://你的用户名.github.io/仓库名/
```

管理页是：

```text
https://你的用户名.github.io/仓库名/admin.html
```

## 个性化

在 `src/config.js` 修改标题、文案和相恋开始日期：

```js
export const SITE_CONFIG = {
  coupleName: "我们的纪念册",
  heroTitle: "把日子过成可以回看的光",
  heroSubtitle: "愿望、计划、纪念日和小小瞬间，都在这里慢慢长成我们的故事。",
  startDate: "2020-01-01",
};
```

在 `src/styles.css` 修改颜色和布局。

## 添加照片轮播

把图片放进：

```text
assets/photos/
```

然后编辑：

```text
assets/photos/photos.json
```

写入文件名：

```json
[
  "photo-1.jpg",
  "photo-2.jpg"
]
```

也可以写图片说明：

```json
[
  {
    "src": "photo-1.jpg",
    "alt": "一起去看海的照片"
  }
]
```

提交到 GitHub 后，首页会自动循环展示这些图片。

## 自定义周期日历

在 `src/config.js` 修改：

```js
export const PERIOD_TRACKER = {
  enabled: true,
  cycleLength: 28,
  periodLength: 5,
  visibleMonthsAhead: 3,
  ranges: [
    {
      start: "2026-05-01",
      end: "2026-05-05",
    },
  ],
};
```

- `cycleLength`：周期长度，常见为 28 天
- `periodLength`：预测经期持续天数
- `visibleMonthsAhead`：往后预测几个月
- `ranges`：已经记录的真实日期范围

真实记录会显示为红色，预测日期会显示为浅红色。

如果要让周期记录在多台设备同步，请先在 Supabase SQL Editor 运行 `supabase-patch.sql`。运行后页面会使用 `period_ranges` 表读写记录；未建表时会退回当前浏览器本地保存。
