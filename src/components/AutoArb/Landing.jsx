'use client';

import { THREAT_MODEL, EDGE_CASES } from './data';

/**
 * @param {{ onNavigate: (view: string) => void; onToast: (msg: string) => void }} props
 */
export default function Landing({ onNavigate, onToast }) {
  return (
    <div className="view">
      <div className="hero">
        <div className="hero-bg" />
        <div className="hero-eyebrow">⚡ 全自动套利引擎</div>
        <h1 className="hero-h1">
          把套利机会
          <br />
          <span>交给算法</span>，你只管收益
        </h1>
        <p className="hero-sub">
          连接你的交易所 API，Mozi AutoArb 7×24 小时监控加密货币与美股代币套利机会，自动执行
          Cash & Carry、跨所价差和基差套利策略。
        </p>
        <div className="hero-actions">
          <button type="button" className="btn-primary" onClick={() => onNavigate('wizard')}>
            🚀 创建第一个策略
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate('dashboard')}
          >
            查看演示 Dashboard →
          </button>
        </div>
        <div className="hero-stats">
          <div className="hs-item">
            <div className="hs-val">$2.4M+</div>
            <div className="hs-lbl">累计套利成交额</div>
          </div>
          <div className="hs-sep" />
          <div className="hs-item">
            <div className="hs-val">12.8%</div>
            <div className="hs-lbl">平均年化净收益</div>
          </div>
          <div className="hs-sep" />
          <div className="hs-item">
            <div className="hs-val">99.7%</div>
            <div className="hs-lbl">订单执行成功率</div>
          </div>
          <div className="hs-sep" />
          <div className="hs-item">
            <div className="hs-val">0</div>
            <div className="hs-lbl">用户资金损失事件</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="sec-eyebrow">工作原理</div>
        <div className="sec-title">四步开始自动套利</div>
        <div className="sec-sub">从连接 API 到第一笔套利收益，全程不超过 15 分钟</div>
        <div className="steps-grid">
          {[
            [
              '1',
              '连接 API 密钥',
              '在交易所创建仅有交易权限（无提币）的 API key，通过加密通道提交。密钥经 AES-256 加密存储，服务器永远不接触明文。',
            ],
            [
              '2',
              '配置套利策略',
              '选择套利类型、目标资产、投入资金和风控参数。系统会根据历史数据预估收益区间，帮助你设置合理预期。',
            ],
            [
              '3',
              '模拟交易验证',
              '新策略强制经过 72 小时模拟交易期，验证信号逻辑和风控触发是否符合预期，0 风险上手。',
            ],
            [
              '4',
              '开启实盘运行',
              '模拟期通过后，以小额资金（默认不超过配置上限的 20%）开启实盘，收益表现稳定后系统自动逐步提升仓位。',
            ],
          ].map(([num, title, desc]) => (
            <div className="step-card" key={num}>
              <div className="step-num">{num}</div>
              <div className="step-title">{title}</div>
              <div className="step-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="sec-eyebrow">套利策略</div>
        <div className="sec-title">三种经过验证的套利策略</div>
        <div className="sec-sub">每种策略都有独立的风险模型和历史回测数据</div>
        <div className="strat-grid">
          <div className="strat-card funding">
            <div className="strat-icon">⚡</div>
            <div className="strat-name">Funding 套利（Cash & Carry）</div>
            <div className="strat-desc">
              同时持有现货多单 + 永续合约空单，方向中性，持续收取资金费率。Hyperliquid 每1小时结算，年化效果显著。
            </div>
            <div className="strat-stats">
              <div className="ss-item">
                <div className="ss-lbl">历史年化</div>
                <div className="ss-val" style={{ color: 'var(--accent)' }}>
                  8-30%
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">最大回撤</div>
                <div className="ss-val" style={{ color: 'var(--warn)' }}>
                  ≤3%
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">方向风险</div>
                <div className="ss-val" style={{ color: 'var(--pos)' }}>
                  近中性
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">最低资金</div>
                <div className="ss-val">$1,000</div>
              </div>
            </div>
            <div className="strat-assets">
              {['BTC', 'ETH', 'SOL', 'NVDA', 'TSLA', '+40'].map((a) => (
                <span className="asset-chip" key={a}>
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div className="strat-card spread">
            <div className="strat-icon">🔀</div>
            <div className="strat-name">跨所价差套利</div>
            <div className="strat-desc">
              监控同一资产在不同交易所的价差，低价所买入同时高价所卖出。执行窗口 1-30
              分钟，净价差扣除手续费后即为利润。
            </div>
            <div className="strat-stats">
              <div className="ss-item">
                <div className="ss-lbl">单次收益</div>
                <div className="ss-val" style={{ color: 'var(--blue)' }}>
                  0.3-1.5%
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">执行频率</div>
                <div className="ss-val">1-10次/天</div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">资金占用</div>
                <div className="ss-val" style={{ color: 'var(--pos)' }}>
                  短暂
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">最低资金</div>
                <div className="ss-val">$3,000</div>
              </div>
            </div>
            <div className="strat-assets">
              {['BTC', 'ETH', 'NVDA', 'COIN', '+20'].map((a) => (
                <span className="asset-chip" key={a}>
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div className="strat-card basis">
            <div className="strat-icon">📐</div>
            <div className="strat-name">基差套利</div>
            <div className="strat-desc">
              利用永续合约价格与现货价格的基差，做多现货 + 做空 perp，同时赚取基差收敛和 Funding
              的双重收益。
            </div>
            <div className="strat-stats">
              <div className="ss-item">
                <div className="ss-lbl">历史年化</div>
                <div className="ss-val" style={{ color: 'var(--purple)' }}>
                  10-25%
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">基差风险</div>
                <div className="ss-val" style={{ color: 'var(--warn)' }}>
                  中等
                </div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">持仓周期</div>
                <div className="ss-val">1-30天</div>
              </div>
              <div className="ss-item">
                <div className="ss-lbl">最低资金</div>
                <div className="ss-val">$2,000</div>
              </div>
            </div>
            <div className="strat-assets">
              {['ETH', 'SOL', 'AVAX', '+15'].map((a) => (
                <span className="asset-chip" key={a}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="sec-eyebrow">安全架构</div>
        <div className="sec-title">资金安全是第一优先级</div>
        <div className="sec-sub">我们无法提取你的资产，只能执行你授权的交易操作</div>
        <div className="security-layout">
          <div className="security-list">
            {[
              [
                'var(--pos-dim)',
                '🔐',
                'API 密钥仅限交易权限，禁止提币',
                '我们明确要求你在交易所关闭 API 的提币权限。即使密钥泄露，攻击者也无法转移资产，只能执行买卖操作。',
              ],
              [
                'var(--blue-dim)',
                '🔒',
                'AES-256 + HSM 密钥加密',
                '密钥在提交时用你的账户密码加密，存储前再经过 HSM（硬件安全模块）加密。服务器数据库中只有密文，无法还原明文。',
              ],
              [
                'var(--gold-dim)',
                '🌐',
                '固定 IP 白名单，拒绝未知调用',
                '我们的执行服务器只使用固定出口 IP。建议你在交易所设置 IP 白名单，其他 IP 的 API 调用将被直接拒绝。',
              ],
              [
                'var(--purple-dim)',
                '🛡️',
                '实时异常检测 + 自动熔断',
                '每笔交易前都会进行滑点、仓位、保证金率的三重检查。任何异常立即触发熔断，停止该策略并通知你。',
              ],
            ].map(([bg, ico, t, d]) => (
              <div className="sec-item" key={t}>
                <div className="sec-item-ico" style={{ background: bg }}>
                  {ico}
                </div>
                <div>
                  <div className="sec-item-t">{t}</div>
                  <div className="sec-item-d">{d}</div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="threat-model">
              <div className="tm-title">威胁模型与应对措施</div>
              {THREAT_MODEL.map(([t, d, s]) => (
                <div className="tm-row" key={t}>
                  <div className="tm-threat">
                    <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2 }}>{t}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{d}</div>
                  </div>
                  <span className={`tm-status ${s === 'solved' ? 'tm-solved' : 'tm-partial'}`}>
                    {s === 'solved' ? '已覆盖' : '部分'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="sec-eyebrow">定价方案</div>
        <div className="sec-title">按使用付费，收益对齐</div>
        <div className="sec-sub">所有方案包含 7 天全功能免费试用，无需绑卡</div>
        <div className="pricing-grid">
          <PlanCard
            name="观察者"
            price="免费"
            sub="信号监控 + 手动执行提示，不自动下单"
            btn="开始使用"
            onBtn={() => onToast('免费注册即可使用')}
            features={[
              '实时套利信号推送',
              'Telegram / 邮件提醒',
              '手动执行指引',
              '最多3个监控策略',
              '❌ 自动执行',
              '❌ 后台运行',
            ]}
          />
          <PlanCard
            name="自动版"
            price="$49"
            sub="自动执行，最高 $50,000 总仓位"
            btn="7天免费试用"
            featured
            onBtn={() => onNavigate('wizard')}
            features={[
              '最多 5 个策略并发',
              '最高 $50,000 总仓位',
              '全套风控工具',
              '实时 P&L 仪表盘',
              'API 密钥管理',
              '邮件 + TG 推送',
            ]}
          />
          <PlanCard
            name="专业版"
            price="$149"
            sub="无限策略，最高 $500,000 仓位"
            btn="联系升级"
            onBtn={() => onToast('联系我们升级专业版')}
            features={[
              '无限策略并发',
              '最高 $500,000 总仓位',
              '优先执行队列',
              '自定义策略参数',
              'API 访问权限',
              '专属客服支持',
            ]}
          />
          <PlanCard
            name="机构版"
            price="定制"
            sub="无上限仓位，白标接入，SLA 保障"
            btn="商务联系"
            onBtn={() => onToast('BD@mozi.fund')}
            features={[
              '无仓位上限',
              '专属执行节点',
              '链路数据 API',
              '合规报告导出',
              '私有化部署选项',
              '7×24 专属支持',
            ]}
          />
        </div>
        <div className="biz-note">
          <div className="biz-t">💡 盈利模式说明（对用户透明）</div>
          <div className="biz-li">
            订阅费：主要收入来源，SaaS 模式，与用户收益无关，激励我们持续优化基础设施
          </div>
          <div className="biz-li">
            无绩效分成：不从你的利润中抽成。你的收益 100% 归你，我们不会因为追求短期高收益而冒险
          </div>
          <div className="biz-li">
            数据服务：聚合的匿名市场数据以 API 形式向机构出售，不含任何个人信息
          </div>
          <div className="biz-li">
            未来：平台费（策略市场）、策略 NFT（允许用户分享/出售自定义策略模板）
          </div>
        </div>
      </div>

      <div className="section">
        <div className="sec-eyebrow">边界情况</div>
        <div className="sec-title">我们考虑了所有可能出错的情况</div>
        <div className="edge-grid">
          <EdgeCard cat="exec" label="执行风险" items={EDGE_CASES.exec} />
          <EdgeCard cat="risk" label="风险控制" items={EDGE_CASES.risk} />
          <EdgeCard cat="ops" label="运营稳定性" items={EDGE_CASES.ops} />
        </div>
      </div>
    </div>
  );
}

function PlanCard({ name, price, sub, btn, features, featured, onBtn }) {
  return (
    <div className={`plan-card${featured ? ' featured' : ''}`}>
      <div className="plan-name">{name}</div>
      <div className="plan-price">
        {price}
        <span>/月</span>
      </div>
      <div className="plan-sub">{sub}</div>
      <button type="button" className="plan-btn" onClick={onBtn}>
        {btn}
      </button>
      {features.map((f) =>
        f.startsWith('❌') ? (
          <div className="plan-feature" key={f}>
            <span className="pf-ico x">×</span>
            {f.slice(2)}
          </div>
        ) : (
          <div className="plan-feature" key={f}>
            <span className="pf-ico">✓</span>
            {f}
          </div>
        ),
      )}
    </div>
  );
}

function EdgeCard({ cat, label, items }) {
  return (
    <div className="edge-card">
      <div className={`edge-cat ${cat}`}>{label}</div>
      {items.map(([q, a]) => (
        <div className="edge-item" key={q}>
          <div>
            <div className="edge-q">{q}</div>
            <div className="edge-a">{a}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
