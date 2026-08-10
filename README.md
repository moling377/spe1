# Dating MVP (Flask)

最小可运行的约会网站 MVP，后端使用 Flask + SQLite，示例包含 1000 名由 Faker 生成的用户，功能：浏览用户、点赞、匹配、客服工单申请联系方式、管理员审批后展示联系方式。

运行方法（本地 Windows）：
1. 创建虚拟环境：
   python -m venv venv
2. 激活：
   venv\Scripts\activate.bat
3. 安装依赖：
   pip install -r requirements.txt
4. 启动：
   python app.py

默认管理员访问方式：
- 在 /login 页面选择 SiteAdmin（通常是第一个用户），或直接访问 /admin?pw=adminpw

注意：这是示例项目，登录方式仅用于演示（通过用户 ID 登录），真实产品需使用注册/密码或 OAuth 并加强安全与隐私保护。
