// API 基址。默认指向「加载本页面的同一主机」的 3000 端口:无论用 localhost
// 还是局域网 IP(平板/手机)打开前端,请求都会落到同一台机器的后端,无需写死 IP。
// 部署到不同主机/端口时,用 VITE_API_BASE 覆盖(见 .env)。
export const API_BASE =
  import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:3000`
