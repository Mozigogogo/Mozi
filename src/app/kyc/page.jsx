'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, Button, Input, Picker, Image as AntdImage } from 'antd-mobile';
import { LeftOutline } from 'antd-mobile-icons';
import styles from './page.module.less';
import './kyc-global.css';

export default function KycPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    realName: '',
    idNumber: '',
    country: '',
    phone: '',
    email: ''
  });
  const [idCardFront, setIdCardFront] = useState('');
  const [idCardBack, setIdCardBack] = useState('');
  const [countries] = useState([
    [{ label: '中国', value: '中国' }],
    [{ label: '美国', value: '美国' }],
    [{ label: '日本', value: '日本' }],
    [{ label: '韩国', value: '韩国' }],
    [{ label: '新加坡', value: '新加坡' }],
    [{ label: '其他', value: '其他' }]
  ]);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleCountryChange = (value) => {
    setFormData({
      ...formData,
      country: value[0]
    });
    setCountryPickerVisible(false);
  };

  const handleImageUpload = (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (type === 'front') {
            setIdCardFront(event.target.result);
          } else {
            setIdCardBack(event.target.result);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSubmit = () => {
    // 验证表单
    if (!formData.realName) {
      Toast.show({ content: '请输入真实姓名', position: 'center' });
      return;
    }
    if (!formData.idNumber) {
      Toast.show({ content: '请输入证件号码', position: 'center' });
      return;
    }
    if (!formData.country) {
      Toast.show({ content: '请选择国家/地区', position: 'center' });
      return;
    }
    if (!formData.phone) {
      Toast.show({ content: '请输入手机号码', position: 'center' });
      return;
    }
    if (!formData.email) {
      Toast.show({ content: '请输入邮箱地址', position: 'center' });
      return;
    }
    if (!idCardFront || !idCardBack) {
      Toast.show({ content: '请上传证件照片', position: 'center' });
      return;
    }

    // 提交认证
    Toast.show({ content: '提交中...', icon: 'loading', duration: 0 });
    
    // 模拟API调用
    setTimeout(() => {
      Toast.clear();
      Toast.show({
        content: '您的认证申请已提交，我们将在1-3个工作日内完成审核。',
        position: 'center',
        duration: 3000,
        afterClose: () => {
          router.back();
        }
      });
    }, 2000);
  };

  return (
    <div className={styles.kycContainer}>
      {/* 顶部导航 */}
      <div className={styles.topNav}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <LeftOutline />
        </button>
        <div className={styles.navTitle}>KYC认证</div>
      </div>

      <div className={styles.kycHeader}>
        <h1 className={styles.kycTitle}>实名认证</h1>
        <p className={styles.kycSubtitle}>完成认证后可享受更多权益</p>
      </div>

      <div className={styles.kycBenefits}>
        <div className={styles.benefitItem}>
          <div className={styles.benefitIcon}>✓</div>
          <span className={styles.benefitText}>提升账户安全性</span>
        </div>
        <div className={styles.benefitItem}>
          <div className={styles.benefitIcon}>✓</div>
          <span className={styles.benefitText}>解锁高级功能</span>
        </div>
        <div className={styles.benefitItem}>
          <div className={styles.benefitIcon}>✓</div>
          <span className={styles.benefitText}>获得额外积分奖励</span>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>基本信息</h3>
        
        <div className={styles.formItem}>
          <label className={styles.formLabel}>真实姓名</label>
          <Input
            className={styles.formInput}
            placeholder='请输入您的真实姓名'
            value={formData.realName}
            onChange={(value) => handleInputChange('realName', value)}
          />
        </div>

        <div className={styles.formItem}>
          <label className={styles.formLabel}>证件号码</label>
          <Input
            className={styles.formInput}
            placeholder='请输入身份证/护照号码'
            value={formData.idNumber}
            onChange={(value) => handleInputChange('idNumber', value)}
          />
        </div>

        <div className={styles.formItem}>
          <label className={styles.formLabel}>国家/地区</label>
          <div 
            className={styles.formPicker}
            onClick={() => setCountryPickerVisible(true)}
          >
            <span className={formData.country ? styles.pickerValue : styles.pickerPlaceholder}>
              {formData.country || '请选择国家/地区'}
            </span>
            <span className={styles.pickerArrow}>›</span>
          </div>
          <Picker
            columns={countries}
            visible={countryPickerVisible}
            onClose={() => setCountryPickerVisible(false)}
            onConfirm={handleCountryChange}
          />
        </div>

        <div className={styles.formItem}>
          <label className={styles.formLabel}>手机号码</label>
          <Input
            className={styles.formInput}
            type='number'
            placeholder='请输入手机号码'
            value={formData.phone}
            onChange={(value) => handleInputChange('phone', value)}
          />
        </div>

        <div className={styles.formItem}>
          <label className={styles.formLabel}>邮箱地址</label>
          <Input
            className={styles.formInput}
            type='text'
            placeholder='请输入邮箱地址'
            value={formData.email}
            onChange={(value) => handleInputChange('email', value)}
          />
        </div>
      </div>

      <div className={styles.uploadSection}>
        <h3 className={styles.sectionTitle}>证件照片</h3>
        <p className={styles.sectionDesc}>请上传清晰的证件照片，确保信息完整可见</p>

        <div className={styles.uploadGrid}>
          <div className={styles.uploadItem} onClick={() => handleImageUpload('front')}>
            {idCardFront ? (
              <img src={idCardFront} className={styles.uploadPreview} alt="证件正面" />
            ) : (
              <div className={styles.uploadPlaceholder}>
                <span className={styles.uploadIcon}>+</span>
                <span className={styles.uploadText}>上传证件正面</span>
              </div>
            )}
          </div>

          <div className={styles.uploadItem} onClick={() => handleImageUpload('back')}>
            {idCardBack ? (
              <img src={idCardBack} className={styles.uploadPreview} alt="证件反面" />
            ) : (
              <div className={styles.uploadPlaceholder}>
                <span className={styles.uploadIcon}>+</span>
                <span className={styles.uploadText}>上传证件反面</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.tipsSection}>
        <h4 className={styles.tipsTitle}>温馨提示</h4>
        <p className={styles.tipsText}>• 请确保上传的证件照片清晰完整</p>
        <p className={styles.tipsText}>• 您的个人信息将被严格保密</p>
        <p className={styles.tipsText}>• 审核通过后将获得 +200 积分奖励</p>
      </div>

      <div className={styles.submitSection}>
        <Button className={styles.submitBtn} onClick={handleSubmit} block>
          提交认证
        </Button>
      </div>
    </div>
  );
}

