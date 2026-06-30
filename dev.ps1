# 同时启动前端 + 后端两个 dev 服务,日志汇到同一控制台,Ctrl+C 一起停。
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$frontend = Start-Process cmd.exe -ArgumentList '/c', 'npm run dev' -WorkingDirectory $root -NoNewWindow -PassThru
$backend  = Start-Process cmd.exe -ArgumentList '/c', 'npm run dev' -WorkingDirectory (Join-Path $root 'backend') -NoNewWindow -PassThru

try {
  Wait-Process -Id $frontend.Id, $backend.Id
}
finally {
  # 收尾:连同子进程整棵树一起杀掉,避免 vite/tsx/fastify 变成孤儿继续占端口。
  taskkill /F /T /PID $frontend.Id 2>$null | Out-Null
  taskkill /F /T /PID $backend.Id 2>$null | Out-Null
}
