# syntax=docker/dockerfile:1
# ---------- 1) 安装全部依赖并编译 ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---------- 2) 只保留生产依赖 ----------
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- 3) 运行时镜像 ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3200 \
    TZ=Asia/Shanghai
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY scripts ./scripts

# 上传目录(挂载卷)：以非 root 身份运行，需提前授权
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node

EXPOSE 3200
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3200)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
