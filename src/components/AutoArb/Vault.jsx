'use client';

import { useEffect, useState } from 'react';
import { EXCHANGES, VAULT_SERVER_IPS } from './data';

/**
 * @param {{
 *   onNavigate: (view: string) => void;
 *   onToast: (msg: string) => void;
 * }} props
 */
export default function Vault({ onNavigate, onToast }) {
  const [step, setStep] = useState(1);
  const [exchange, setExchange] = useState('Hyperliquid');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [note, setNote] = useState('');
  const [validationDone, setValidationDone] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!validating || validationDone) return undefined;
    const t = setTimeout(() => {
      setValidationDone(true);
      setValidating(false);
    }, 3000);
    return () => clearTimeout(t);
  }, [validating, validationDone]);

  const startValidation = () => {
    setValidationDone(false);
    setValidating(true);
    setStep(3);
  };

  const copyIp = async (ip) => {
    try {
      await navigator.clipboard.writeText(ip);
      onToast(`✅ IP 已复制：${ip}`);
    } catch {
      onToast(`IP：${ip}`);
    }
  };

  const steps = ['选择交易所', '输入密钥', '权限验证', 'IP 白名单'];

  return (
    <div className="view">
      <div className="vault-wrap">
        <div className="vault-title">🔐 API 密钥管理</div>
        <div className="vault-sub">
          你的 API 密钥经过 AES-256 加密存储，Mozi 服务器
          <strong>只能执行交易操作</strong>
          ，无法转移资产。建议创建仅限交易权限（无提币）的专用密钥。
        </div>
        <div className="vault-steps">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`vs-item${step === i + 1 ? ' on' : ''}`}
              onClick={() => setStep(i + 1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setStep(i + 1);
              }}
              role="button"
              tabIndex={0}
            >
              {i + 1}. {s}
            </div>
          ))}
        </div>
        <div className="vault-card">
          {step === 1 && (
            <>
              <div className="wz-title">选择交易所</div>
              <div className="wz-sub">
                选择你要连接的交易所。你可以随时添加更多，每个交易所独立管理。
              </div>
              <div className="ex-select-grid">
                {EXCHANGES.map((e) => (
                  <div
                    key={e.name}
                    className={`ex-sel-item${exchange === e.name ? ' selected' : ''}`}
                    onClick={() => setExchange(e.name)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') setExchange(e.name);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div style={{ fontSize: 24 }}>{e.ico}</div>
                    <div className="ex-sel-name">{e.name}</div>
                    <div className="ex-sel-type">{e.type}</div>
                    {e.note ? (
                      <div
                        style={{
                          fontSize: 9,
                          color: 'var(--gold)',
                          marginTop: 3,
                        }}
                      >
                        {e.note}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--surface)',
                  borderRadius: 'var(--rs)',
                  border: '1px solid var(--border)',
                  fontSize: 11,
                  color: 'var(--t2)',
                  lineHeight: 1.65,
                  marginBottom: 16,
                }}
              >
                📋{' '}
                <strong style={{ color: 'var(--t1)' }}>{exchange}</strong>{' '}
                创建 API 步骤：进入账户设置 → API 管理 → 创建新密钥 → 勾选「合约交易」和「现货交易」→{' '}
                <strong style={{ color: 'var(--danger)' }}>取消勾选提币权限</strong> →
                保存密钥
              </div>
              <div className="vault-footer">
                <button
                  type="button"
                  className="btn-full btn-gold"
                  onClick={() => setStep(2)}
                >
                  下一步：输入密钥 →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="wz-title">输入 {exchange} API 密钥</div>
              <div className="warning-box">
                <div className="wb-t">⚠ 安全提示</div>
                <div className="wb-li">
                  请确认 API 密钥<strong>未开启提币权限</strong>
                  ，这是最重要的安全措施
                </div>
                <div className="wb-li">
                  密钥提交后经 AES-256 加密，不可逆，即使 Mozi 员工也无法查看
                </div>
                <div className="wb-li">
                  建议同时在 {exchange} 设置 IP 白名单（下一步会提供 Mozi 服务器 IP）
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">
                  API Key{' '}
                  <span className="tag tag-pos" style={{ fontSize: 9 }}>
                    必填
                  </span>
                </div>
                <input
                  className="form-input"
                  type="text"
                  placeholder="粘贴你的 API Key（约 40 个字符）"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="form-group">
                <div className="form-label">
                  API Secret{' '}
                  <span className="tag tag-pos" style={{ fontSize: 9 }}>
                    必填
                  </span>
                </div>
                <input
                  className="form-input"
                  type="password"
                  placeholder="粘贴你的 API Secret（约 64 个字符）"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                />
              </div>
              <div className="form-group">
                <div className="form-label">
                  备注名称{' '}
                  <span
                    className="tag"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--t3)',
                      fontSize: 9,
                    }}
                  >
                    可选
                  </span>
                </div>
                <input
                  className="form-input"
                  type="text"
                  placeholder="例如：Mozi-AutoArb-专用"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="perm-grid">
                <div className="perm-item perm-need">
                  <div className="perm-ico">✅</div>
                  <div>
                    <div className="perm-t">合约交易权限</div>
                    <div className="perm-d">执行 Funding 套利必需</div>
                  </div>
                </div>
                <div className="perm-item perm-need">
                  <div className="perm-ico">✅</div>
                  <div>
                    <div className="perm-t">现货交易权限</div>
                    <div className="perm-d">Cash & Carry 现货端必需</div>
                  </div>
                </div>
                <div className="perm-item perm-forbid">
                  <div className="perm-ico">🚫</div>
                  <div>
                    <div className="perm-t">提币权限（必须关闭）</div>
                    <div className="perm-d">我们永远不需要此权限</div>
                  </div>
                </div>
                <div className="perm-item perm-forbid">
                  <div className="perm-ico">🚫</div>
                  <div>
                    <div className="perm-t">子账户管理权限</div>
                    <div className="perm-d">超出所需，建议不开启</div>
                  </div>
                </div>
              </div>
              <div className="vault-footer">
                <button
                  type="button"
                  className="btn-full btn-ghost"
                  onClick={() => setStep(1)}
                >
                  ← 返回
                </button>
                <button
                  type="button"
                  className="btn-full btn-gold"
                  onClick={startValidation}
                >
                  验证密钥 →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <VaultStep3
              done={validationDone}
              exchange={exchange}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              onForceDone={() => {
                setValidationDone(true);
                setValidating(false);
              }}
            />
          )}

          {step === 4 && (
            <>
              <div className="wz-title">🌐 设置 IP 白名单（强烈推荐）</div>
              <div className="wz-sub">
                在 {exchange} 中将以下 IP 添加到白名单，其他 IP 的 API
                请求将被直接拒绝，即使密钥泄露也无法被利用。
              </div>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--rs)',
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.07em',
                    marginBottom: 8,
                  }}
                >
                  Mozi 服务器 IP（点击复制）
                </div>
                {VAULT_SERVER_IPS.map((ip) => (
                  <div
                    key={ip}
                    onClick={() => copyIp(ip)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') copyIp(ip);
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 13,
                      padding: '6px 10px',
                      background: 'var(--card)',
                      borderRadius: 'var(--rs)',
                      marginBottom: 6,
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{ip}</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)' }}>点击复制</span>
                  </div>
                ))}
              </div>
              <div className="info-box">
                <div className="info-t">如何在 {exchange} 设置 IP 白名单</div>
                <div className="info-li">
                  登录 {exchange} → API 管理 → 找到刚才创建的密钥
                </div>
                <div className="info-li">点击「编辑」→ 在 IP 白名单中填入上方所有 IP</div>
                <div className="info-li">保存后等待约 2 分钟生效</div>
                <div className="info-li">如跳过此步骤，API 可从任意 IP 访问，风险较高</div>
              </div>
              <div className="vault-footer">
                <button
                  type="button"
                  className="btn-full btn-ghost"
                  onClick={() => setStep(3)}
                >
                  ← 返回
                </button>
                <button
                  type="button"
                  className="btn-full btn-gold"
                  onClick={() => {
                    onToast(`🎉 ${exchange} 已成功接入！现在去创建策略吧`);
                    onNavigate('wizard');
                  }}
                >
                  完成接入，创建策略 →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function VaultStep3({ done, exchange, onBack, onNext, onForceDone }) {
  const items = [
    { ico: done ? '✅' : '⏳', text: '连接交易所 API 端点' },
    { ico: done ? '✅' : '⏳', text: '验证 API Key 格式正确' },
    { ico: done ? '✅' : '⏳', text: '确认账户余额可读（只读验证）' },
    { ico: done ? '✅' : '⏳', text: '检查交易权限是否已开启' },
    { ico: done ? '✅' : '🔍', text: '确认提币权限已关闭' },
    { ico: done ? '✅' : '⏳', text: 'AES-256 加密并安全存储' },
  ];

  return (
    <>
      <div className="wz-title">{done ? '✅ 验证成功' : '🔍 正在验证密钥...'}</div>
      <div className="wz-sub">
        {done
          ? 'API 密钥已安全保存，权限验证通过，可以开始配置策略了。'
          : `正在与 ${exchange} 建立连接并验证权限，请稍候...`}
      </div>
      <div className="validation-anim">
        {items.map((it, i) => (
          <div className="va-item" key={it.text}>
            <div className={`va-ico${!done && i >= 3 ? ' loading' : ''}`}>{it.ico}</div>
            <div style={{ fontSize: 12, color: done ? 'var(--pos)' : 'var(--t2)' }}>
              {' '}
              {it.text}
            </div>
          </div>
        ))}
      </div>
      {done ? (
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--pos-dim)',
            border: '1px solid rgba(16,185,129,.25)',
            borderRadius: 'var(--rs)',
            fontSize: 11,
            color: 'var(--t2)',
            marginBottom: 16,
          }}
        >
          ✅ <strong style={{ color: 'var(--pos)' }}>验证通过</strong> · {exchange}{' '}
          账户余额可读 · 合约+现货权限已开启 · 提币权限已关闭 · 密钥已加密存储
        </div>
      ) : null}
      <div className="vault-footer">
        {done ? (
          <>
            <button type="button" className="btn-full btn-ghost" onClick={onBack}>
              ← 重新输入
            </button>
            <button type="button" className="btn-full btn-gold" onClick={onNext}>
              设置 IP 白名单 →
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-full btn-ghost" onClick={onBack}>
              ← 返回
            </button>
            <button type="button" className="btn-full btn-gold" onClick={onForceDone}>
              模拟完成验证
            </button>
          </>
        )}
      </div>
    </>
  );
}
