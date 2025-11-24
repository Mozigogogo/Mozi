'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, Button, Input, Picker, Image as AntdImage } from 'antd-mobile';
import { LeftOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';
import './kyc-global.css';

export default function KycPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    realName: '',
    idNumber: '',
    country: '',
    phone: '',
    email: ''
  });
  const [idCardFront, setIdCardFront] = useState('');
  const [idCardBack, setIdCardBack] = useState('');
  const countries = [
    [{ label: t('kyc.countries.china'), value: 'china' }],
    [{ label: t('kyc.countries.usa'), value: 'usa' }],
    [{ label: t('kyc.countries.japan'), value: 'japan' }],
    [{ label: t('kyc.countries.korea'), value: 'korea' }],
    [{ label: t('kyc.countries.singapore'), value: 'singapore' }],
    [{ label: t('kyc.countries.other'), value: 'other' }]
  ];
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
      Toast.show({ content: t('kyc.messages.nameRequired'), position: 'center' });
      return;
    }
    if (!formData.idNumber) {
      Toast.show({ content: t('kyc.messages.idRequired'), position: 'center' });
      return;
    }
    if (!formData.country) {
      Toast.show({ content: t('kyc.messages.countryRequired'), position: 'center' });
      return;
    }
    if (!formData.phone) {
      Toast.show({ content: t('kyc.messages.phoneRequired'), position: 'center' });
      return;
    }
    if (!formData.email) {
      Toast.show({ content: t('kyc.messages.emailRequired'), position: 'center' });
      return;
    }
    if (!idCardFront || !idCardBack) {
      Toast.show({ content: t('kyc.messages.photoRequired'), position: 'center' });
      return;
    }

    // 提交认证
    Toast.show({ content: t('kyc.messages.submitting'), icon: 'loading', duration: 0 });
    
    // 模拟API调用
    setTimeout(() => {
      Toast.clear();
      Toast.show({
        content: t('kyc.messages.submitSuccess'),
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
        <div className={styles.navTitle}>{t('kyc.title')}</div>
      </div>

      <div className={styles.kycHeader}>
        <h1 className={styles.kycTitle}>{t('kyc.pageTitle')}</h1>
        <p className={styles.kycSubtitle}>{t('kyc.subtitle')}</p>
      </div>

      <div className={styles.kycBenefits}>
        <div className={styles.benefitItem}>
          <div className={styles.benefitIcon}>✓</div>
          <span className={styles.benefitText}>{t('kyc.benefits.security')}</span>
        </div>
        <div className={styles.benefitItem}>
          <div className={styles.benefitIcon}>✓</div>
          <span className={styles.benefitText}>{t('kyc.benefits.features')}</span>
        </div>
        <div className={styles.benefitItem}>
          <div className={styles.benefitIcon}>✓</div>
          <span className={styles.benefitText}>{t('kyc.benefits.rewards')}</span>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>{t('kyc.basicInfo')}</h3>
        
        <div className={styles.formItem}>
          <label className={styles.formLabel}>{t('kyc.form.realName')}</label>
          <Input
            className={styles.formInput}
            placeholder={t('kyc.form.realNamePlaceholder')}
            value={formData.realName}
            onChange={(value) => handleInputChange('realName', value)}
          />
        </div>

        <div className={styles.formItem}>
          <label className={styles.formLabel}>{t('kyc.form.idNumber')}</label>
          <Input
            className={styles.formInput}
            placeholder={t('kyc.form.idNumberPlaceholder')}
            value={formData.idNumber}
            onChange={(value) => handleInputChange('idNumber', value)}
          />
        </div>

        <div className={styles.formItem}>
          <label className={styles.formLabel}>{t('kyc.form.country')}</label>
          <div 
            className={styles.formPicker}
            onClick={() => setCountryPickerVisible(true)}
          >
            <span className={formData.country ? styles.pickerValue : styles.pickerPlaceholder}>
              {formData.country ? t(`kyc.countries.${formData.country}`) : t('kyc.form.countryPlaceholder')}
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
          <label className={styles.formLabel}>{t('kyc.form.phone')}</label>
          <Input
            className={styles.formInput}
            type='number'
            placeholder={t('kyc.form.phonePlaceholder')}
            value={formData.phone}
            onChange={(value) => handleInputChange('phone', value)}
          />
        </div>

        <div className={styles.formItem}>
          <label className={styles.formLabel}>{t('kyc.form.email')}</label>
          <Input
            className={styles.formInput}
            type='text'
            placeholder={t('kyc.form.emailPlaceholder')}
            value={formData.email}
            onChange={(value) => handleInputChange('email', value)}
          />
        </div>
      </div>

      <div className={styles.uploadSection}>
        <h3 className={styles.sectionTitle}>{t('kyc.documentPhotos')}</h3>
        <p className={styles.sectionDesc}>{t('kyc.documentPhotoDesc')}</p>

        <div className={styles.uploadGrid}>
          <div className={styles.uploadItem} onClick={() => handleImageUpload('front')}>
            {idCardFront ? (
              <img src={idCardFront} className={styles.uploadPreview} alt={t('kyc.form.frontAlt')} />
            ) : (
              <div className={styles.uploadPlaceholder}>
                <span className={styles.uploadIcon}>+</span>
                <span className={styles.uploadText}>{t('kyc.form.uploadFront')}</span>
              </div>
            )}
          </div>

          <div className={styles.uploadItem} onClick={() => handleImageUpload('back')}>
            {idCardBack ? (
              <img src={idCardBack} className={styles.uploadPreview} alt={t('kyc.form.backAlt')} />
            ) : (
              <div className={styles.uploadPlaceholder}>
                <span className={styles.uploadIcon}>+</span>
                <span className={styles.uploadText}>{t('kyc.form.uploadBack')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.tipsSection}>
        <h4 className={styles.tipsTitle}>{t('kyc.tips.title')}</h4>
        <p className={styles.tipsText}>{t('kyc.tips.clearPhoto')}</p>
        <p className={styles.tipsText}>{t('kyc.tips.privacy')}</p>
        <p className={styles.tipsText}>{t('kyc.tips.reward')}</p>
      </div>

      <div className={styles.submitSection}>
        <Button className={styles.submitBtn} onClick={handleSubmit} block>
          {t('kyc.buttons.submit')}
        </Button>
      </div>
    </div>
  );
}

