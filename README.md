# Static Dating Demo — 改进版

更新内容：
- 游客可直接浏览首页，无需登录
- 每个用户卡片带有头像（使用 randomuser 的头像），显示真实感更强的名字、年龄、职业和简介
- 点击“联系客服”或卡片内的联系客服按钮会直接打开 WhatsApp 聊天（+1 832-541-1560），并带上简短说明
- 保持地点显示为 "USA"（不显示具体城市）
- 点击卡片可查看大图及详情，详情中也有喜欢和联系客服按钮

部署与测试：
- 在仓库检出 add-dating-mvp 分支，或将分支合并到 main 后启用 GitHub Pages
- 本地测试：在仓库目录直接打开 index.html，或运行临时静态服务：
  python -m http.server 8000
  然后访问 http://localhost:8000
