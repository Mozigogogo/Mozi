/** 详情页布局：整页刷新时先铺底色，减少白屏感 */
export default function DetailLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#efefef' }}>
      {children}
    </div>
  );
}
