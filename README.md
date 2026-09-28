# Nova Admin · 商业级中后台基础框架

> NestJS 11 + TypeORM + MySQL × **React 19 + shadcn/ui (Tailwind CSS v4 + Radix UI) + recharts**
> 开箱即用的企业级 RBAC 权限管理底座，含完整认证、审计、字典、配置中心与极简高级的仪表盘。

> 前端 v2 为 **shadcn/ui 原生技术栈**（React + Radix 原语 + zinc 主题），旧 Vue + Element 版本保留在 `web-vue-legacy/` 供参考。

---

## ✨ 特性一览

### 前端（web/ · React + shadcn/ui）
| 能力 | 说明 |
| --- | --- |
| **shadcn/ui 组件体系** | 官方 zinc 色板 / Radix 原语 / CVA 变体 / data-slot 源码级组件（button·dialog·table·select 等 15 个，位于 `src/ui/`） |
| **Tailwind CSS v4** | CSS-first 主题令牌（`@theme inline` + oklch），明暗双主题一键切换 |
| **动态菜单** | 后端菜单驱动侧边栏，`<Can perm>` 权限组件隐藏无权按钮 |
| **仪表盘** | recharts 单色系图表（面积趋势/灰阶环形/径向占比），数字滚动计数 |
| **交互布局** | 侧边栏折叠、多标签页（持久化）、通知铃铛、全屏、用户下拉 |
| **8 大管理页** | 用户(部门树+授权)/角色(菜单勾选授权+数据范围)/菜单/部门/字典(主从)/参数/通知/日志×2 + 个人中心 |

### 后端（server/ · NestJS）
| 能力 | 说明 |
| --- | --- |
| **JWT 双令牌** | accessToken(2h) + refreshToken(7d)，401 静默刷新重放 |
| **接口级 RBAC** | `@RequirePermission()` 注解鉴权 + 角色数据范围（全部/本部门/及以下/仅本人） |
| **登录防护** | 图形验证码 + 连续 5 次失败锁定 10 分钟 + 滑动窗口限流 |
| **审计** | `@OperationLog()` 注解全量落库写操作；登录成败/IP/终端留痕 |
| **工程化** | Swagger(/api/docs)、helmet、全局异常/响应包装、空参数清洗中间件 |

---

## 🚀 快速开始

```bash
# 1. 初始化数据库（MySQL ≥ 5.7）
mysql -uroot -p < sql/init.sql

# 2. 后端（端口 3200）
cd server && npm install && npm run start:dev

# 3. 前端（端口 5173）
cd web && npm install && npm run dev
```

- 前端：http://localhost:5173
- API 文档：http://localhost:3200/api/docs

### 登录账号
| 账号 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `Admin@123` | 超级管理员（全部权限） |
| `tangxin` | `Admin@123` | 运营专员（本部门及以下数据） |
| `audit01` | `Admin@123` | 只读访客（仅本人数据） |

---

## 📁 目录结构

```
nova-admin/
├── sql/init.sql              # 建库建表 + 种子数据
├── server/                   # NestJS 后端（11 模块 60+ 接口）
│   └── src/{common,entities,modules}
├── web/                      # React + shadcn/ui 前端
│   └── src/
│       ├── ui/               # shadcn 组件源码（button/dialog/table/select…）
│       ├── api/              # axios 封装(401 自动刷新) + 全部接口
│       ├── stores/           # zustand(auth 持久化 / ui 主题)
│       ├── components/       # 布局/守卫/共享件
│       ├── pages/            # login/dashboard/system×8/profile/404
│       ├── router.tsx        # 路由 + 菜单守卫
│       └── index.css         # shadcn zinc 主题（Tailwind v4）
└── web-vue-legacy/           # 旧 Vue3 + Element Plus 版（参考）
```

---

## 🔐 安全设计

1. bcrypt 密码；2. 双令牌轮换；3. 验证码+锁定+限流三层防爆破；4. 全局参数校验白名单；5. 接口级 perms + 数据范围双重越权防护；6. 全量操作/登录审计。

> 生产建议：验证码与限流迁移 Redis、上传接 OSS、Nginx 反代 + HTTPS。

---

## ✅ 已验证

- 后端 60+ 接口冒烟、RBAC 403 拦截、数据权限、双 Token、审计落库
- React 前端：验证码登录 → 仪表盘 → 11 个页面 → 暗色模式 全部浏览器实测通过
- 明暗主题均使用 shadcn 官方 zinc 色板；TS 零错误；生产构建通过

© 2026 Nova Admin · MIT


---

## 🚀 快速开始

### 1. 环境要求
- Node.js ≥ 18（开发机为 22）
- MySQL ≥ 5.7（本框架在 5.7.26 上开发验证）

### 2. 初始化数据库
```bash
mysql -uroot -p < sql/init.sql
```
> 脚本会创建 `nova_admin` 库、12 张表与全部种子数据（部门树/8用户/3角色/35菜单/字典/参数/通知/演示日志）。

### 3. 启动后端（端口 3200）
```bash
cd server
npm install
# 按需修改 .env 中的数据库账号密码
npm run start:dev      # 开发模式(热重载)
# 或 npm run build && npm run start:prod
```
- API 文档：http://localhost:3200/api/docs

### 4. 启动前端（端口 5173）
```bash
cd web
npm install
npm run dev
```
- 访问：http://localhost:5173

### 5. 登录账号
| 账号 | 密码 | 角色 | 权限范围 |
| --- | --- | --- | --- |
| `admin` | `Admin@123` | 超级管理员 | 全部 |
| `tangxin` | `Admin@123` | 运营专员 | 仪表盘/用户查看/通知维护（数据范围：本部门及以下） |
| `audit01` | `Admin@123` | 只读访客 | 各列表仅查看（数据范围：仅本人） |

> 建议分别用三个账号登录，体验侧边栏菜单差异、按钮权限隐藏（v-permission）与接口 403 拦截。

---

## 📁 目录结构

```
nova-admin/
├── sql/init.sql                  # 建库建表 + 种子数据（可重复执行）
├── server/                       # NestJS 后端
│   └── src/
│       ├── main.ts               # bootstrap：helmet/CORS/Swagger/全局管道守卫
│       ├── app.module.ts
│       ├── entities/             # 12 个 TypeORM 实体
│       ├── common/
│       │   ├── decorators/       # @Public @RequirePermission @OperationLog @CurrentUser
│       │   ├── guards/           # JWT 认证 / RBAC 授权 / 限流
│       │   ├── filters/          # 全局异常 → 统一响应结构
│       │   ├── interceptors/     # 响应包装 / 操作审计落库
│       │   └── utils/            # 树构建 / UA 解析
│       └── modules/
│           ├── auth/             # 登录/双Token/验证码/锁定/个人资料
│           ├── rbac/             # 全局权限服务(缓存/菜单/数据范围)
│           ├── user/ role/ menu/ dept/
│           ├── dict/ config/ notice/
│           ├── log/              # 登录/操作日志查询与清空
│           ├── upload/           # 图片上传
│           └── dashboard/        # 仪表盘聚合统计
└── web/                          # Vue3 前端
    └── src/
        ├── api/                  # axios 封装(401自动刷新) + 全部接口定义
        ├── router/               # 静态路由 + 后端菜单动态注册 + 守卫
        ├── stores/               # user(持久化) / app(主题) / tagsView
        ├── styles/               # 设计系统：CSS变量/动画/明暗主题
        ├── layouts/              # 侧边栏/顶栏/标签页/设置抽屉
        ├── components/           # CountTo 数字滚动 / VChart 图表
        ├── directives/           # v-permission
        └── views/
            ├── login/            # 极光玻璃拟态登录页
            ├── dashboard/        # 仪表盘
            ├── system/           # user/role/menu/dept/dict/config/notice/log×2
            ├── profile/          # 个人中心
            └── error/404.vue
```

---

## 🔐 安全设计速览

1. **密码**：bcrypt(cost 10) 存储，登录查询显式 `addSelect`，接口永不回传 hash；
2. **令牌**：access/refresh 分密钥签发，refresh 单独接口轮换；
3. **防爆破**：验证码 + 失败锁定 + 滑动窗口限流（`@Throttle(10,60)`）三层叠加；
4. **参数安全**：全局 ValidationPipe 白名单剥离未知字段；空参数中间件统一清洗；
5. **越权防护**：接口级 perms 校验 + 数据范围过滤，前端 `v-permission` 仅做体验优化，以后端为准；
6. **审计**：全部写操作注解留痕，登录成败全量留痕。

> 生产部署建议：验证码存储换 Redis、限流换 Redis 令牌桶、上传接 OSS/COS、Nginx 反代 + HTTPS。

---

## 🧭 接口约定

统一响应结构：
```json
{ "code": 0, "message": "ok", "data": { }, "timestamp": "..." }
```
| code | 含义 |
| --- | --- |
| 0 | 成功 |
| 400 | 参数/业务校验失败 |
| 401 | 未认证（前端自动尝试刷新令牌） |
| 403 | 无权限 |
| 500 | 服务器错误 |

核心端点（详见 /api/docs）：
```
POST /api/auth/login|refresh|logout     GET /api/auth/captcha|profile|routes
GET/POST/PUT/DELETE  /api/users|roles|menus|depts
GET /api/dict/types|datas|map           /api/configs /api/notices
GET /api/logs/login|operation           POST /api/logs/*/clear
GET /api/dashboard/stats|login-trend|dept-distribution|gender-ratio|recent-logins
POST /api/upload/image
```

---

## 🛠 常用配置

| 位置 | 项 |
| --- | --- |
| `server/.env` | 端口/数据库/JWT 密钥/CORS/Swagger 开关 |
| 系统参数（页面可改） | 初始密码、验证码开关、锁定阈值/时长、注册开关 |
| `web/src/styles/index.scss` | 设计令牌（渐变/圆角/阴影/动效时长） |

**验证码开关演示**：登录后台 → 参数设置 → `sys.login.captcha` 改为 `false` → 登录页即时免验证码（真实生效的商业参数化能力）。

---

## ✅ 已验证清单

- 后端 18+ 接口冒烟：登录/刷新/资料/菜单/用户/角色/菜单树/部门/字典/参数/通知/双日志/仪表盘全部 200
- RBAC：viewer 创建用户 → 403 `没有操作权限：system:user:create`
- 数据权限：viewer 用户列表 total=1（仅本人）
- 审计：写操作自动落库（模块/动作/操作人/耗时/参数）
- 防爆破：错误密码 401，验证码错误/过期提示，连续失败锁定
- 前端：登录→仪表盘→8 个管理页→个人中心→404 全页面浏览器实测渲染通过；明暗主题切换、新增对话框、部门树过滤、标签页、验证码图片均正常

---

© 2026 Nova Admin · MIT

---

## 👥 会员中心 & 移动端接口

C 端用户体系，与后台账号 `sys_user` **完全独立**（独立表 `app_user*`、独立令牌，互不通用）。

### 登录方式
| 方式 | 接口 | 说明 |
| --- | --- | --- |
| 手机号 + 验证码 | `POST /api/app/auth/login/phone` | 未注册自动注册 |
| 邮箱 + 验证码 | `POST /api/app/auth/login/email` | 未注册自动注册，邮箱统一小写 |
| 账号密码 | `POST /api/app/auth/login/password` | 手机号或邮箱；连续 5 次失败锁定 10 分钟 |
| 微信 | `POST /api/app/auth/login/wechat` | `platform`：`mp` 小程序 / `app` 移动应用 / `h5` 公众号；首次自动注册 |

其余：`GET /api/app/auth/config`（登录页配置）、`POST /api/app/auth/code/send`、`POST /api/app/auth/refresh`、`POST /api/app/auth/password/reset`、`POST /api/app/auth/logout`；
"我的" `GET|PUT /api/app/me`、`PUT /api/app/me/password`、`POST /api/app/me/avatar`、`POST /api/app/me/bind-phone|bind-email|bind-wechat`、`DELETE /api/app/me/identities/:provider`。
完整参数见 Swagger（`/api/docs` → "移动端"）。客户端请求头建议带 `X-Client: ios|android|mp|h5`，用于登录日志。

### 后台菜单
"会员中心"：**会员管理**（列表/详情/新增/编辑/重置密码/强制下线/删除/解绑微信）、**登录方式**（开关 + 通道接入状态）、**会员登录日志**。对应权限点 `member:*`，需要在"角色管理"里给非超管角色勾选。

### 启用
```bash
mysql -uroot -p < sql/migrate-member.sql   # 已初始化过的库执行；全新安装 init.sql 已包含
```
然后重启后端。`server/.env` 里的相关配置：

| 配置 | 说明 |
| --- | --- |
| `SMS_PROVIDER` | `console`（默认，验证码只写服务端日志）或 `aliyun`（需 `ALIYUN_SMS_*`，**未经真实账号联调**） |
| `MAIL_HOST` 等 | 配置 SMTP 后邮件验证码才真实发送，否则只写日志 |
| `WECHAT_MP_* / WECHAT_APP_* / WECHAT_H5_*` | 对应平台的 AppID/Secret；未配置且 `WECHAT_MOCK=true` 时使用模拟登录（仅开发） |
| `APP_JWT_EXPIRES / APP_JWT_REFRESH_EXPIRES` | 会员令牌有效期，默认 2h / 30d |

> **生产必须设置 `NODE_ENV=production`**：这会强制关闭 `debugCode` 回传(`MEMBER_DEBUG_CODE`)和微信模拟登录(`WECHAT_MOCK`)；未配置短信/邮件通道时启动日志会给出警告。
> 验证码、登录失败计数、限流均为内存存储（单机）；多实例部署请迁移到 Redis。

---

## 🐳 Docker 部署

一条命令拉起整套服务：**MySQL 8 + 后端(NestJS) + 前端(Nginx 托管静态资源并反代 `/api`)**。只有前端对外暴露端口，数据库和后端仅在容器内网互通。

```
浏览器 ──▶ web(Nginx :80) ──/api──▶ server(:3200) ──▶ db(MySQL)
```

### 1. 准备配置
```bash
cp .env.example .env
```
编辑 `.env`，**必填四项**（不填 `docker compose` 会直接报错）：

| 变量 | 说明 |
| --- | --- |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 |
| `DB_PASS` | 应用连库的普通账号密码（不能是 `root`） |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | 令牌签名密钥，各 ≥16 位随机字符且互不相同。生成：`openssl rand -hex 32` |

其余（端口、短信/邮件/微信、CORS…）见 `.env.example` 内注释。

### 2. 启动
```bash
docker compose up -d --build
docker compose ps            # 三个服务都应为 healthy
```
访问 `http://服务器IP:80`（端口由 `WEB_PORT` 决定）。首次启动会自动执行 `sql/init.sql` 建表并写入种子数据。

### 3. ⚠️ 首次登录后立刻改默认密码
种子数据里的账号默认密码都是 `Admin@123`，**上线前必须修改**：
```bash
docker compose exec server node scripts/reset-admin-password.js admin '你的新密码'
# 演示账号(tangxin / audit01 / chenmo …)不需要就在"用户管理"里停用或删除
```
密码规则：8-32 位，须同时含字母和数字。

### 常用运维
```bash
docker compose logs -f server          # 查看后端日志
docker compose restart server          # 改了 .env 后重启后端
docker compose up -d --build           # 更新代码后重新构建并滚动重启
docker compose down                    # 停止(保留数据卷)
docker compose down -v                 # ⚠️ 停止并删除数据库与上传文件
```
数据都在两个命名卷里：`db_data`(数据库)、`uploads`(上传的头像等)。备份数据库：
```bash
docker compose exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" nova_admin' > backup.sql
```

### 生产注意事项
- **HTTPS**：容器内的 Nginx 只监听 80。请在它前面再放一层 HTTPS 终结（宿主机 Nginx / Caddy / 云负载均衡）反代到 `WEB_PORT`。此时如果外层代理会带上 `X-Forwarded-For`，需把 `web/nginx.conf` 里 `X-Forwarded-For` 改成 `$proxy_add_x_forwarded_for`，并把后端 `TRUST_PROXY` 改为代理层数(如 `2`)，否则限流和登录日志拿到的都是代理的 IP。
- **`NODE_ENV=production` 已由 compose 固定设置**：后端启动时会检查密钥，使用默认值/过短/相同的密钥会**拒绝启动**；同时关闭验证码回传(`debugCode`)与微信模拟登录。
- **短信/邮件/微信**不配置时，会员验证码只会写进后端日志，用户收不到。上线前请在 `.env` 中接入真实通道。
- 接口文档默认关闭；需要时设 `SWAGGER_ENABLED=true`，用完再关。
- 验证码、登录失败计数、限流是内存存储，只适合**单实例**部署；要水平扩展 `server` 请先迁移到 Redis。
- MySQL 端口默认不映射到宿主机；要用客户端连库，取消 `docker-compose.yml` 里 `ports` 的注释（仅绑定 `127.0.0.1`）。
