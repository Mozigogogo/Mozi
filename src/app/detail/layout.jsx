/** 详情页布局壳：移动端底色由 page.module.less 的 .container 负责 */
export default function DetailLayout({ children }) {
  return <div style={{ minHeight: '100vh' }}>{children}</div>;
}
