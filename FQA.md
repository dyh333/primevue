Q: 如何部署
A: 
1. 执行命令
`
build:showcase
`
2. 构建 Docker 镜像
# 在 showcase 目录下执行
`
docker build -t primevue-showcase .
`
3. 运行 Docker 容器
`
docker run -d -p 31030:3000 primevue-showcase
`