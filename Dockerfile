# 使用官方 Deno 镜像作为基础镜像
FROM denoland/deno:alpine

# 设置工作目录
WORKDIR /app

# 优先复制依赖较少的文件，利用 Docker 缓存层
COPY main.ts ./
COPY public ./public

# 非 root 用户运行更安全
USER deno

# 暴露服务端口
EXPOSE 8080

# 启动反向代理服务
CMD ["run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]
