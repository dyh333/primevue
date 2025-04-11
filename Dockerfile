FROM nexus.cmss.com:8090/paas-docker/node:18.20-alpine3.20

WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 复制构建后的文件
COPY .output/ ./.output/

# 安装生产环境依赖
RUN cd .output/server && npm install --production


# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", ".output/server/index.mjs"]