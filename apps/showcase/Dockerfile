FROM node:18-alpine

# 设置工作目录
WORKDIR /home/frontend/primevue

# 复制整个 .output 目录
COPY .output/ ./.output/

# 安装依赖
RUN cd .output/server && \
    npm init -y && \
    npm install devalue && \
    npm install --production

# 设置环境变量
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", ".output/server/index.mjs"] 