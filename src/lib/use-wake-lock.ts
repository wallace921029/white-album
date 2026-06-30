import { useEffect } from "react"
import NoSleep from "nosleep.js"

// 防止屏幕休眠/黑屏。优先使用原生 Screen Wake Lock,老设备(老 iOS / 安卓)
// 自动回退到 nosleep.js 的隐藏视频循环方案;切后台再回前台时 nosleep 内部会
// 自动重新获取。部分浏览器(尤其老 iOS 的视频回退)要求用户手势才能启用,
// 因此除进入页面时尝试一次外,还在首次用户交互时兜底再试一次。
export function useWakeLock() {
  useEffect(() => {
    const noSleep = new NoSleep()

    // enable() 可能因缺少用户手势被拒绝,静默忽略,等首次交互再试。
    const enable = () => {
      noSleep.enable().catch(() => {})
    }

    enable()

    const events = ["touchstart", "mousedown", "keydown"]
    const onFirstInteraction = () => {
      enable()
      events.forEach(e => document.removeEventListener(e, onFirstInteraction))
    }
    events.forEach(e => document.addEventListener(e, onFirstInteraction))

    return () => {
      events.forEach(e => document.removeEventListener(e, onFirstInteraction))
      noSleep.disable()
    }
  }, [])
}
