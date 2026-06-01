'use client';

import { useEffect, useState } from 'react';
import { Form, Button, message, ConfigProvider } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import zhCN from 'antd/locale/zh_CN';
import { adminLogin, isAdminLoggedIn, parseAdminLoginData, setAdminSession } from '@/api/admin';

function AdminInput({ icon, type = 'text', value = '', onChange, placeholder, autoComplete }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="pc-admin-login__field">
      <span className="pc-admin-login__field-icon">{icon}</span>
      <input
        className="pc-admin-login__field-input"
        type={inputType}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {isPassword ? (
        <button
          type="button"
          className="pc-admin-login__field-toggle"
          tabIndex={-1}
          aria-label={showPassword ? '隐藏密码' : '显示密码'}
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
        </button>
      ) : null}
    </div>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (isAdminLoggedIn()) {
      router.replace('/admin');
    }
  }, [router]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await adminLogin(values.username, values.password);
      const { token, adminInfo } = parseAdminLoginData(res?.data);
      if (res?.code === 0 && token) {
        setAdminSession(token, adminInfo || { username: values.username });
        message.success('登录成功');
        router.replace('/admin');
        return;
      }
      message.error(res?.errorMsg || res?.message || '登录失败，请检查账号密码');
    } catch (err) {
      message.error(err?.response?.data?.errorMsg || err?.message || '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#11B787',
          borderRadius: 8,
          fontSize: 14,
          controlHeight: 44,
        },
      }}
    >
      <div className="pc-admin-login">
        <main className="pc-admin-login__main">
          <div className="pc-admin-login__card">
            <div className="pc-admin-login__header">
              <span className="pc-admin-login__logo">M</span>
              <h1 className="pc-admin-login__title">Mozi 后台</h1>
              <p className="pc-admin-login__subtitle">管理员登录</p>
            </div>

            <Form
              form={form}
              className="pc-admin-login__form"
              layout="vertical"
              requiredMark={false}
              onFinish={handleSubmit}
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: '请输入用户名或邮箱' }]}
              >
                <AdminInput
                  icon={<UserOutlined />}
                  placeholder="用户名 / 邮箱"
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <AdminInput
                  icon={<LockOutlined />}
                  type="password"
                  placeholder="密码"
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="pc-admin-login__submit"
                  block
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </div>
        </main>
      </div>
    </ConfigProvider>
  );
}
