# 重力场势能可视化 - 工程化部署指南

## 📋 目录

1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [本地开发](#本地开发)
4. [Docker部署](#docker部署)
5. [生产环境优化](#生产环境优化)
6. [性能监控](#性能监控)

---

## 项目概述

### 已实现的工程化特性

| 特性 | 说明 |
|------|------|
| ✅ Docker多阶段构建 | 分离构建与运行环境，镜像体积优化 |
| ✅ 前端骨架屏 | 首屏加载优化，提升用户体验 |
| ✅ Web Worker | 计算与渲染分离，主线程永不阻塞 |
| ✅ 健康检查 | Docker容器健康状态监控 |
| ✅ .dockerignore | 优化构建上下文，减少镜像体积 |
| ✅ 非root用户运行 | 容器安全最佳实践 |

---

## 技术架构

### 前端架构

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器环境                              │
│  ┌──────────────┐   ┌──────────────────┐  ┌───────────┐ │
│  │  骨架屏 (2s) │ → │ 平滑过渡到主界面 │ →│ Canvas渲染│ │
│  └──────────────┘   └──────────────────┘  └───────────┘ │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Web Worker 线程                                   │  │
│  │  引力场计算 · 等势线追踪 · 粒子受力分析          │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 后端架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Node.js (Express)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 静态文件服务 │  │ 配置API接口  │  │  JSON文件存储   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        Docker容器                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Node 18 Alpine (80MB)  →  仅生产依赖  →  非root运行  │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 本地开发

### 环境要求

- Node.js 18+
- npm 9+

### 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 访问应用
open http://localhost:3002
```

### 可用脚本

```bash
npm run dev       # 开发模式启动
npm start         # 生产模式启动
```

---

## Docker部署

### 1. 架构说明

本项目采用**多阶段构建**策略：

```
┌─────────────────────────────────────────────────────┐
│  Stage 1: builder (node:18-alpine)                  │
│  - npm ci --only=production (仅安装生产依赖)        │
└──────────────────────────┬──────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│  Stage 2: runner (node:18-alpine)                   │
│  - 仅复制必要的生产文件                              │
│  - 创建非root用户运行                                │
│  - 配置健康检查                                      │
└─────────────────────────────────────────────────────┘
```

**优势**:
- 镜像体积显著减小（约80MB vs 300MB+）
- 减少攻击面（仅包含生产环境所需文件）
- 构建缓存优化

### 2. 快速部署

#### 使用Docker Compose（推荐）

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps

# 停止服务
docker-compose down
```

#### 手动构建运行

```bash
# 构建镜像
docker build -t gravity-visualizer .

# 运行容器
docker run -d \
  --name gravity-visualizer \
  -p 3002:3002 \
  --restart unless-stopped \
  gravity-visualizer

# 查看日志
docker logs -f gravity-visualizer

# 健康检查
docker inspect --format='{{.State.Health.Status}}' gravity-visualizer
```

### 3. 验证部署

```bash
# 1. 检查容器是否运行
docker ps | grep gravity

# 2. 测试HTTP响应
curl -I http://localhost:3002

# 3. 检查健康状态
# 预期输出: healthy
docker inspect --format='{{.State.Health.Status}}' gravity-visualizer
```

### 4. 开发模式挂载调试

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  gravity-visualizer:
    volumes:
      - ./server.js:/app/server.js:ro
      - ./public:/app/public:ro
    environment:
      - NODE_ENV=development
```

---

## 生产环境优化

### 1. Nginx反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/json application/xml;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. 环境变量配置

创建 `.env` 文件：

```env
NODE_ENV=production
PORT=3002
```

### 3. 资源限制配置

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  gravity-visualizer:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
    restart: always
```

---

## 性能监控

### 1. 前端性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 首屏加载 | < 2s | 骨架屏2秒后展示主界面 |
| LCP | < 2.5s | 最大内容绘制 |
| FID | < 100ms | 首次输入延迟 |
| CLS | < 0.1 | 累积布局偏移 |

### 2. 容器监控

```bash
# 查看容器资源使用
docker stats gravity-visualizer

# 查看容器详细信息
docker inspect gravity-visualizer

# 实时日志
docker logs -f gravity-visualizer --tail 100
```

### 3. 健康检查详解

当前配置：
```
间隔: 30秒
超时: 10秒
重试: 3次
启动宽限期: 10秒
```

健康状态说明：
- `starting`: 容器启动中
- `healthy`: 服务正常运行
- `unhealthy`: 连续3次检查失败
- `none`: 未配置健康检查

---

## 骨架屏设计说明

### 设计亮点

1. **品牌一致性**
   - 与主界面相同的渐变背景
   - 天体主题的加载动画
   - 一致的配色方案

2. **流畅过渡**
   - 0.5秒的平滑淡出过渡
   - 进度条动画同步加载进度
   - 骨架屏移除后DOM完全清理

3. **视觉反馈**
   - 三个行星轨道动画（对应三个天体）
   - 渐变进度条（0% → 70% → 100%）
   - 引力线动画暗示应用功能

### 性能优化

- 骨架屏CSS内联，避免外部资源请求阻塞
- 骨架屏DOM结构轻量，无外部图片
- 使用CSS3硬件加速动画（transform）

---

## 常见问题

### Q: Docker构建很慢怎么办？

```bash
# 使用.dockerignore排除不必要文件（已配置）
# 利用构建缓存，避免每次都npm install
docker build --cache-from gravity-visualizer -t gravity-visualizer .
```

### Q: 容器启动后无法访问？

```bash
# 1. 检查端口映射
docker port gravity-visualizer

# 2. 查看容器日志
docker logs gravity-visualizer

# 3. 检查防火墙
sudo ufw allow 3002
```

### Q: 如何更新部署？

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build --force-recreate
```

---

## 部署检查清单

- [ ] Docker镜像构建成功
- [ ] 容器健康检查状态为healthy
- [ ] 3002端口可访问
- [ ] 前端骨架屏正常显示
- [ ] Web Worker加载无错误
- [ ] 天体拖拽功能正常
- [ ] 保存/重置按钮工作正常
- [ ] 等势线实时更新流畅
- [ ] 内存使用稳定 (< 200MB)
- [ ] CPU使用率正常 (< 50%)

---

## 版本信息

| 组件 | 版本 |
|------|------|
| Node.js | 18 Alpine |
| Express | 4.x |
| Docker Compose | 3.8 |
| 项目版本 | 1.0.0 |
