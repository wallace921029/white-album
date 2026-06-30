#!/usr/bin/env bash
# 同时启动前端 + 后端两个 dev 服务,日志汇到同一终端,Ctrl+C 一起停。
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 退出时(含 Ctrl+C)杀掉本进程组的全部子进程,连同 npm 派生的 node 一起清掉。
trap 'kill 0' EXIT

(cd "$ROOT_DIR" && npm run dev) &
(cd "$ROOT_DIR/backend" && npm run dev) &
wait
