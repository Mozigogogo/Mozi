'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input, TextArea, Button, Popup, Picker, Toast } from 'antd-mobile';
import { SearchOutline, CloseOutline } from 'antd-mobile-icons';
import { LeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import { completeTask } from '@/api/user';
import NavBar from '../../components/NavBar';
import PCLayout from '@/components/PCLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeBack } from '@/utils/navigation';
import styles from './page.module.less';

// 确保接口定义存在
if (!Interface.POSTS_UPDATE) {
  Interface.POSTS_UPDATE = '/posts/update';
}

// 图标资源
const CDN_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community';
const templateIcon = `${CDN_ICON}/template.png`;
const voteIcon = `${CDN_ICON}/vote.png`;
const currencyIcon = `${CDN_ICON}/currency.png`;
const topicIcon = `${CDN_ICON}/topic.png`;
const integralIcon = `${CDN_ICON}/integral.png`;
const plateIcon = `${CDN_ICON}/plate.png`;
const reasonIcon = `${CDN_ICON}/reason.png`;
const POST_PREFILL_IMAGES_KEY = 'mozi_post_prefill_images_v1';

export default function PostPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPC, setIsPC] = useState(false);
  const [title, setTitle] = useState('');
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [content, setContent] = useState('');
  const [isUpdate, setIsUpdate] = useState(false);
  const [postId, setPostId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('普通');
  const [showTemplates, setShowTemplates] = useState(false);
  const [formData, setFormData] = useState({
    coinName: '',
    reason: '',
  });
  const [showVote, setShowVote] = useState(false);
  const [voteTitle, setVoteTitle] = useState('');
  const [voteOptions, setVoteOptions] = useState([]);
  const [hasVote, setHasVote] = useState(false);
  const [voteId, setVoteId] = useState(null);

  // 币种相关状态
  const [showCoinSelect, setShowCoinSelect] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCoins, setSelectedCoins] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [coinList, setCoinList] = useState([]);
  const [sector, setSector] = useState(''); // 所属版块
  
  // 话题相关状态
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showTopicSelect, setShowTopicSelect] = useState(false);
  const [topicSearchKeyword, setTopicSearchKeyword] = useState('');
  const [topics, setTopics] = useState([]);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [hotTopicsPage, setHotTopicsPage] = useState(1);
  const [hotTopicsAllLoaded, setHotTopicsAllLoaded] = useState(false);
  
  // 其他状态
  const [userInfo, setUserInfo] = useState(null);
  const [showAskTips, setShowAskTips] = useState(false);
  const [showCommunityRules, setShowCommunityRules] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeButton, setActiveButton] = useState(''); // 当前激活的按钮
  const [images, setImages] = useState([]); // 已选择的图片
  const fileInputRef = useRef(null); // 文件选择input的引用

  // 模板配置
  const templates = [
    { key: "普通", label: t('post.templates.normal') },
    { key: "发现好币", label: t('post.templates.discovery') },
    { key: "不懂就问", label: t('post.templates.question') }
  ];

  useEffect(() => {
    initData();
    checkFirstVisitToday();
    loadHotTopics();
    loadCoinList();
    
    // 处理路由参数
    const topicId = searchParams.get('topicId');
    const topicTitleParam = searchParams.get('topicTitle');
    const id = searchParams.get('id');
    const postTitle = searchParams.get('title');
    const postContent = searchParams.get('content');
    const updateFlag = searchParams.get('isUpdate');
    const templateType = searchParams.get('templateType');
    const symbol = searchParams.get('symbol');
    
    // 处理话题参数
    if (topicId && topicTitleParam) {
      setSelectedTopic({
        id: Number(topicId),
        name: decodeURIComponent(topicTitleParam),
        description: ''
      });
    }
    
    // 处理更新帖子的参数
    if (id && updateFlag === 'true') {
      setIsUpdate(true);
      setPostId(Number(id));
      if (postTitle) {
        setTitle(decodeURIComponent(postTitle));
        setShowTitleInput(true);
      }
      if (postContent) setContent(decodeURIComponent(postContent));
    }
    
    // 根据传入的模板类型自动选择模板
    if (templateType) {
      const decodedTemplateType = decodeURIComponent(templateType);
      const templateExists = templates.some(template => template.key === decodedTemplateType);
      if (templateExists) {
        setSelectedTemplate(decodedTemplateType);
        
        // 如果选择了"不懂就问"模板，显示提示弹窗
        if (decodedTemplateType === '不懂就问') {
          setShowAskTips(true);
        }
      }
    }
    
    // 处理币种参数
    if (symbol) {
      console.log('收到symbol参数:', symbol);
      setSelectedCoins([{ symbol: symbol, name: symbol }]);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkIsPC = () => {
      if (typeof window === 'undefined') return;
      setIsPC(window.innerWidth >= 1024);
    };
    checkIsPC();
    window.addEventListener('resize', checkIsPC);
    return () => window.removeEventListener('resize', checkIsPC);
  }, []);

  useEffect(() => {
    if (title && title.trim()) setShowTitleInput(true);
  }, [title]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(POST_PREFILL_IMAGES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const nextImages = Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()) : [];
      if (nextImages.length > 0) {
        setImages((prev) => {
          const merged = [...nextImages, ...prev];
          return merged.slice(0, 9);
        });
      }
      window.sessionStorage.removeItem(POST_PREFILL_IMAGES_KEY);
    } catch (_) {
      // ignore invalid cache
    }
  }, []);

  // 监听币种选择弹出层状态变化
  useEffect(() => {
    if (showCoinSelect && coinList.length > 0) {
      // 当打开币种选择弹出层且有币种列表数据时，显示所有币种
      setSearchResults(coinList);
    }
  }, [showCoinSelect, coinList]);

  // 监听话题选择弹出层状态变化
  useEffect(() => {
    if (showTopicSelect && topics.length === 0) {
      // 当打开话题选择弹出层且没有话题数据时，加载热门话题
      loadHotTopics();
    }
  }, [showTopicSelect]);

  // 监听话题搜索关键词变化
  useEffect(() => {
    if (topicSearchKeyword.trim() === '') {
      // 如果话题搜索关键词为空，重新加载热门话题
      loadHotTopics();
    }
  }, [topicSearchKeyword]);

  const initData = async () => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        setUserInfo(JSON.parse(userInfo));
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  // 加载热门话题
  const loadHotTopics = async () => {
    if (hotTopicsAllLoaded) return;
    
    try {
      const response = await request({
        url: Interface.HOT_TOPICS_API,
        data: {
          page: hotTopicsPage,
          size: 10
        }
      });
      
      console.log('热门话题接口响应:', response);
      
      if (response?.data) {
        const { data, totalPages } = response.data;
        console.log('话题数据:', data);
        if (data && Array.isArray(data)) {
          setTopics(prev => hotTopicsPage === 1 ? data : [...prev, ...data]);
          setHotTopicsAllLoaded(hotTopicsPage >= totalPages);
          setHotTopicsPage(hotTopicsPage + 1);
        } else {
          setTopics([]);
        }
      }
    } catch (error) {
      console.error('加载热门话题失败:', error);
      setTopics([]);
    }
  };

  // 加载币种列表
  const loadCoinList = async () => {
    try {
      const response = await request({
        url: Interface.find_coin,
        data: {
          pageSize: 10,
          pageNo: 1
        }
      });
      
      if (response?.data?.list && Array.isArray(response.data?.list)) {
        setCoinList(response.data?.list);
        setSearchResults(response.data?.list);
      } else {
        setCoinList([]);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('加载币种列表失败:', error);
      setCoinList([]);
      setSearchResults([]);
    }
  };

  // 检查是否为今日首次进入
  const checkFirstVisitToday = () => {
    try {
      const today = new Date().toDateString();
      const lastVisitDate = localStorage.getItem('lastPostPageVisit');
      
      if (lastVisitDate !== today) {
        setShowCommunityRules(true);
        localStorage.setItem('lastPostPageVisit', today);
      }
    } catch (error) {
      console.error('检查首次访问失败:', error);
    }
  };

  // 发布或更新内容
  const publishPost = async () => {
    const token = localStorage.getItem('token');
    
    // 只检查 token，因为 API 调用只需要 token
    if (!token) {
      Toast.show({
        content: t('post.messages.pleaseLogin'),
        duration: 2000
      });
      return;
    }

    // 验证'发现好币'模板必须选择至少一个币种和填写推荐理由
    if (selectedTemplate === '发现好币') {
      if (selectedCoins.length === 0) {
        Toast.show({
          content: t('post.messages.selectCoin')
        });
        return;
      }
      if (!content || content.trim() === '') {
        Toast.show({
          content: t('post.messages.reasonRequired')
        });
        return;
      }
    }

    setPublishing(true);

    try {
      const postData = {
        title,
        content: content,
        category: selectedTemplate,
        topicIds: selectedTopic ? [selectedTopic.id] : [],
        tags: selectedCoins.length > 0 ? selectedCoins.map(coin => {
          return coin.symbol || (typeof coin === 'string' ? coin : '');
        }).filter(Boolean) : [],
        images // 添加图片数据
      };
      
      // 如果是发现好币模板，添加sector字段
      if (selectedTemplate === '发现好币' && sector) {
        postData.sector = sector;
      }
      
      // 如果有投票信息，添加到postData中
      if (hasVote) {
        postData.vote = {
          voteTitle: voteTitle,
          options: voteOptions.filter(opt => opt)
        };
      }
      
      // 如果是更新帖子，添加帖子ID
      if (isUpdate && postId) {
        postData.id = postId;
      }

      const response = await request({
        url: isUpdate ? Interface.POSTS_UPDATE : Interface.POST_NEW,
        method: 'POST',
        data: postData
      });

      const rawErrorMsg =
        response?.errorMsg || response?.errormsg || response?.msg || response?.message || '';
      const normalizedErrorMsg = String(rawErrorMsg).replace(/\s+/g, '');
      const isCannotGetUserInfo =
        normalizedErrorMsg.includes('创建内容失败:无法获取用户信息') ||
        normalizedErrorMsg.includes('创建内容失败：无法获取用户信息') ||
        normalizedErrorMsg.includes('无法获取用户信息');

      if (response?.code === 0) {
        // 发帖成功后，调用发帖任务完成接口（仅新帖子，不是更新）
        if (!isUpdate) {
          try {
            await completeTask('POST');
            console.log('🔍 [DEBUG] 发帖任务上报成功');

            // 检查内容长度是否超过50字，如果是，则上报首贴任务
            // 简单处理，去除 HTML 标签（如果有）计算长度
            const plainContent = content ? content.replace(/<[^>]+>/g, '').trim() : '';
            if (plainContent.length > 50) {
              await completeTask('FIRST_POST');
              console.log('🔍 [DEBUG] 首贴任务上报成功');
            }
          } catch (taskError) {
            console.error('发帖任务上报失败:', taskError);
          }
        }
        
        Toast.show({
          content: isUpdate ? t('post.messages.updateSuccess') : t('post.messages.publishSuccess'),
          duration: 1000,
          afterClose: () => {
            // 发布成功后跳转到社区页并标记需要刷新
            if (!isUpdate) {
              localStorage.setItem('needRefreshCommunity', 'true');
              router.push('/community');
            } else {
              safeBack(router, { fallback: '/' });
            }
          }
        });
      } else {
        Toast.show({
          content: isCannotGetUserInfo
            ? t('error.cannotGetUserInfoRelogin')
            : (isUpdate ? t('post.messages.updateFailed') : t('post.messages.publishFailed'))
        });
      }
    } catch (error) {
      console.error(isUpdate ? '更新失败:' : '发布失败:', error);
      const errMsg = String(error?.errorMsg || error?.errormsg || error?.message || '');
      const norm = errMsg.replace(/\s+/g, '');
      const isCannotGetUserInfo =
        norm.includes('创建内容失败:无法获取用户信息') ||
        norm.includes('创建内容失败：无法获取用户信息') ||
        norm.includes('无法获取用户信息');
      Toast.show({
        content: isCannotGetUserInfo
          ? t('error.cannotGetUserInfoRelogin')
          : (isUpdate ? t('post.messages.updateFailed') : t('post.messages.publishFailed'))
      });
    } finally {
      setPublishing(false);
    }
  };

  // 选择模板
  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setShowTemplates(false);
    setActiveButton(''); // 立即清除激活状态
    setShowAskTips(false);
    
    if (template === '不懂就问') {
      setShowAskTips(true);
    }
  };

  // 创建投票
  const createVote = () => {
    if (!voteTitle || voteOptions.some(opt => !opt)) {
      Toast.show({
        content: t('post.messages.fillVoteInfo')
      });
      return;
    }
    
    setHasVote(true);
    setShowVote(false);
    
    Toast.show({
      content: t('post.messages.voteAdded')
    });
  };

  // 添加投票选项
  const addVoteOption = () => {
    setVoteOptions([...voteOptions, '']);
  };

  // 更新投票选项
  const updateVoteOption = (index, value) => {
    const newOptions = [...voteOptions];
    newOptions[index] = value;
    setVoteOptions(newOptions);
  };

  // 删除投票选项
  const deleteVoteOption = (index) => {
    if (voteOptions.length <= 2) return;
    const newOptions = voteOptions.filter((_, i) => i !== index);
    setVoteOptions(newOptions);
  };

  // 搜索币种
  const searchCoin = async (keyword) => {
    if (!keyword.trim()) {
      setSearchResults(coinList);
      return;
    }
    
    try {
      const response = await request({
        url: Interface.COIN_INFO,
        data: {
          coin: keyword
        }
      });
      
      if (response?.data && response.data.length > 0) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
        Toast.show({
          content: t('post.messages.coinNotFound')
        });
      }
    } catch (error) {
      console.error('搜索币种失败:', error);
      Toast.show({
        content: t('post.messages.searchCoinFailed')
      });
    }
  };

  // 选择币种
  const selectCoin = (coin) => {
    // 如果是发现好币模板，只允许选择一个币种，直接替换
    if (selectedTemplate === '发现好币') {
      const newCoinSymbol = coin.symbol || coin.name || coin;
      const oldCoinSymbol = selectedCoins.length > 0 
        ? (selectedCoins[0].symbol || selectedCoins[0].name || selectedCoins[0])
        : '';
      
      setSelectedCoins([coin]);
      
      // 处理推荐理由
      if (!content || content.trim() === '') {
        // 如果推荐理由为空，自动填充
        const templates = t('post.recommendTemplates', { returnObjects: true });
        const randomIndex = Math.floor(Math.random() * templates.length);
        const template = templates[randomIndex];
        const filledContent = template.replace('{{symbol}}', newCoinSymbol);
        setContent(filledContent);
      } else if (oldCoinSymbol && content.includes(oldCoinSymbol)) {
        // 如果推荐理由中包含旧币种名称，替换为新币种
        const updatedContent = content.replace(new RegExp(oldCoinSymbol, 'g'), newCoinSymbol);
        setContent(updatedContent);
      }
      
      setShowCoinSelect(false);
      return;
    }
    
    // 其他模板允许选择多个币种
    const exists = selectedCoins.some(item => 
      (item.symbol && item.symbol === coin.symbol) || 
      (item.name && item.name === coin.name) ||
      item === coin.symbol || item === coin.name
    );
    
    if (!exists) {
      setSelectedCoins([...selectedCoins, coin]);
    }
    setShowCoinSelect(false);
  };
  
  // 移除已选择的币种
  const removeCoin = (index) => {
    const newCoins = [...selectedCoins];
    newCoins.splice(index, 1);
    setSelectedCoins(newCoins);
  };

  // 搜索话题
  const searchTopics = async (keyword) => {
    if (!keyword.trim()) {
      loadHotTopics();
      return;
    }
    
    try {
      const response = await request({
        url: Interface.TOPIC_SEARCH,
        data: { keyword }
      });
      
      console.log('搜索话题接口响应:', response);
      
      if (response?.data?.data && Array.isArray(response.data?.data)) {
        console.log('搜索到的话题:', response.data.data);
        setTopics(response?.data?.data);
        if (response?.data?.data.length === 0) {
          Toast.show({
            content: t('post.messages.topicNotFound')
          });
        }
      } else {
        setTopics([]);
        Toast.show({
          content: t('post.messages.topicNotFound')
        });
      }
    } catch (error) {
      console.error('搜索话题失败:', error);
      setTopics([]);
      Toast.show({
        content: t('post.messages.searchTopicFailed')
      });
    }
  };

  // 选择话题
  const selectTopic = (topic) => {
    setSelectedTopic(topic);
    setShowTopicSelect(false);
  };

  // 选择图片
  const handleChooseImage = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 检查图片数量限制
    if (images.length + files.length > 9) {
      Toast.show({
        content: '最多只能上传9张图片'
      });
      return;
    }

    // 显示加载提示
    Toast.show({
      icon: 'loading',
      content: t('post.messages.uploading'),
      duration: 0
    });

    try {
      // 上传所有选择的图片
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api${Interface.UPLOAD_FILE}`, {
            method: 'POST',
            headers: {
              'authentication': token || ''
            },
            body: formData
          });

          const data = await response.json();
          console.log('图片上传响应:', data);
          
          if (data.code === 0 && data.data) {
            console.log('图片上传成功，URL:', data.data);
            return data.data; // 返回上传后的图片URL
          } else {
            console.error('上传失败:', data.msg || data.errorMsg);
            // 如果是登录相关错误，抛出特殊错误
            if (data.msg && data.msg.includes('登录')) {
              throw new Error(data.msg);
            }
            return null;
          }
        } catch (error) {
          console.error('上传图片失败:', error);
          return null;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      // 过滤掉上传失败的图片
      const validUrls = uploadedUrls.filter(url => url !== null);

      Toast.clear();

      if (validUrls.length > 0) {
        const newImages = [...images, ...validUrls];
        console.log('更新图片列表:', newImages);
        setImages(newImages);
        Toast.show({
          content: t('post.messages.uploadSuccess', { count: validUrls.length }),
          duration: 2000
        });
      } else {
        Toast.show({
          content: t('post.messages.uploadFailed')
        });
      }
    } catch (error) {
      Toast.clear();
      console.error('选择图片失败', error);
      // 显示具体的错误消息
      Toast.show({
        content: error.message || '选择图片失败'
      });
    }

    // 清空input，以便可以再次选择相同的文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 删除图片
  const handleRemoveImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // 创建话题
  const handleCreateTopic = async () => {
    if (!topicTitle.trim()) {
      Toast.show({
        content: '请输入话题名称'
      });
      return;
    }
    
    try {
      const response = await request({
        url: Interface.CREATE_TOPIC,
        method: 'POST',
        data: {
          name: topicTitle.trim(),
          description: topicDesc.trim()
        }
      });
      
      if (response?.code === 0) {
        Toast.show({
          content: '创建成功'
        });
        
        setTopicTitle('');
        setTopicDesc('');
        setShowCreateTopic(false);
        
        // 刷新话题列表
        setHotTopicsPage(1);
        setHotTopicsAllLoaded(false);
        loadHotTopics();
      } else {
        Toast.show({
          content: response?.errorMsg || t('post.messages.createFailed')
        });
      }
    } catch (error) {
      console.error('创建话题失败:', error);
      Toast.show({
        content: t('post.messages.createFailed')
      });
    }
  };

  const pageContent = (
    <>
      {!isPC && (
        <NavBar
          title={isUpdate ? t('post.editPost') : t('post.title')}
          onBack={() => safeBack(router, { fallback: '/' })}
        />
      )}
      <div className={`${styles.postContainer} ${isPC ? styles.pcPostContainer : ''}`}>
        <div className={styles.contentWrapper}>
          {/* 顶部用户头像 */}
          <div className={styles.userInfo}>
            {userInfo?.avatar ? (
              <img 
                src={userInfo.avatar} 
                alt="avatar" 
                className={styles.userAvatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#BDBDBD"/>
                </svg>
              </div>
            )}

            <button
              type="button"
              className={`${styles.titleToggleTag} ${showTitleInput ? styles.titleToggleTagActive : ''}`}
              onClick={() => setShowTitleInput((v) => !v)}
            >
              {showTitleInput ? '隐藏标题' : '标题'}
            </button>
          </div>

        {/* 标题输入区 */}
        {showTitleInput && (
          <div className={styles.titleSection}>
            <Input
              className={styles.titleInput}
              value={title}
              onChange={(value) => value.length <= 20 && setTitle(value)}
              placeholder={selectedTemplate === '不懂就问' ? t('post.questionPlaceholder') : t('post.titlePlaceholder')}
              maxLength={20}
            />
            <span className={styles.wordCount}>{title.length}/20</span>
          </div>
        )}

        {/* 内容区域 */}
        <div className={styles.contentSection}>
          {(selectedTemplate === '普通' || selectedTemplate === '不懂就问') && (
            <>
              <TextArea
                className={styles.contentTextarea}
                placeholder={selectedTemplate === '普通' ? t('post.contentPlaceholder') : t('post.questionContentPlaceholder')}
                value={content}
                onChange={setContent}
                maxLength={300}
                rows={8}
              />
              
              {/* 图片上传区 - 普通和不懂就问模板 */}
              <div className={styles.imageUploader}>
                {/* 隐藏的文件输入框 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleChooseImage}
                />
                
                {/* 已上传的图片展示 */}
                {images.map((src, idx) => (
                  <div key={idx} className={styles.imageWrapper}>
                    <img className={styles.uploadedImg} src={src} alt="" />
                    <div 
                      className={styles.deleteIcon} 
                      onClick={() => handleRemoveImage(idx)}
                    >
                      ×
                    </div>
                  </div>
                ))}
                
                {/* 上传按钮 */}
                {images.length < 9 && (
                  <div 
                    className={styles.uploadTile}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span>+</span>
                  </div>
                )}
              </div>
            </>
          )}

          {selectedTemplate === '发现好币' && (
            <div className={styles.discoveryForm}>
              {/* 大输入框 - 显示三个字段的信息 */}
              <div className={styles.discoveryInfoBox}>
                {/* 1. 币种名称 - 必填 */}
                <div className={styles.coinInfoRow} onClick={() => setShowCoinSelect(true)}>
                  <img className={styles.coinInfoIconImg} src={integralIcon} alt="" />
                  <span className={styles.coinInfoLabel}>
                    {t('post.coinName')}
                    <span className={styles.required}>*</span>
                  </span>
                  <span className={selectedCoins.length > 0 ? styles.coinInfoValue : styles.coinInfoPlaceholder}>
                    {selectedCoins.length > 0 
                      ? (selectedCoins[0]?.symbol || selectedCoins[0]?.name || selectedCoins[0])
                      : t('post.coinSelectPlaceholder')}
                  </span>
                  <span className={styles.iconArrow}>›</span>
                </div>

                {/* 2. 所属版块 - 选填 */}
                <div className={styles.coinInfoRow}>
                  <img className={styles.coinInfoIconImg} src={plateIcon} alt="" />
                  <span className={styles.coinInfoLabel}>{t('community.coinInfo.sector')}</span>
                  <Input
                    value={sector}
                    onChange={setSector}
                    placeholder={t('post.sectorPlaceholder')}
                    className={styles.sectorInputInline}
                  />
                </div>

                {/* 3. 推荐理由 - 必填 */}
                <div className={styles.coinInfoRow}>
                  <img className={styles.coinInfoIconImg} src={reasonIcon} alt="" />
                  <span className={styles.coinInfoLabel}>
                    {t('post.recommendReason')}
                    <span className={styles.required}>*</span>
                  </span>
                  <TextArea
                    value={content}
                    onChange={setContent}
                    placeholder={t('post.recommendReasonPlaceholder')}
                    maxLength={300}
                    className={styles.reasonTextareaInline}
                    rows={2}
                  />
                </div>
              </div>

              {/* 4. 图片上传区 - 发现好币模板 */}
              <div className={styles.imageUploader}>
                {/* 隐藏的文件输入框 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleChooseImage}
                />
                
                {/* 已上传的图片展示 */}
                {images.map((src, idx) => (
                  <div key={idx} className={styles.imageWrapper}>
                    <img className={styles.uploadedImg} src={src} alt="" />
                    <div 
                      className={styles.deleteIcon} 
                      onClick={() => handleRemoveImage(idx)}
                    >
                      ×
                    </div>
                  </div>
                ))}
                
                {/* 上传按钮 */}
                {images.length < 9 && (
                  <div 
                    className={styles.uploadTile}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span>+</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 选中的币种和话题展示 */}
          {(selectedCoins.length > 0 || selectedTopic) && (
            <div className={styles.selectedTags}>
              {selectedCoins.map((coin, index) => (
                <span 
                  key={index} 
                  className={styles.coinTag}
                  onClick={() => removeCoin(index)}
                >
                  ${coin.name || coin.symbol || coin}$
                </span>
              ))}
              {selectedTopic && (
                <span className={styles.topicTag}>#{selectedTopic.name}</span>
              )}
            </div>
          )}
        </div>

        {/* 投票内容展示 */}
        {hasVote && (
          <div className={styles.voteDisplay}>
            <div className={styles.voteTitle}>{voteTitle}</div>
            <div className={styles.voteOptions}>
              {voteOptions.map((option, index) => (
                <div key={index} className={styles.voteOption}>{option}</div>
              ))}
            </div>
          </div>
        )}

        {/* 底部工具栏 */}
        <div className={styles.bottomToolbar}>
          <button 
            className={styles.templateBtn}
            onClick={() => {
              setActiveButton('template');
              setShowTemplates(true);
            }}
          >
            <div className={`${styles.templateBox} ${activeButton === 'template' ? styles.active : ''}`}>
              <img className={styles.buttonIcon} src={templateIcon} alt={t('post.buttons.template')} />
              {t('post.buttons.template')}
            </div>
          </button>
          <button 
            className={styles.templateBtn}
            onClick={() => {
              setActiveButton('vote');
              // 初始化默认投票选项
              if (voteOptions.length === 0) {
                setVoteOptions([t('post.vote.bullish'), t('post.vote.bearish')]);
              }
              setShowVote(true);
            }}
          >
            <div className={`${styles.templateBox} ${activeButton === 'vote' ? styles.active : ''}`}>
              <img className={styles.buttonIcon} src={voteIcon} alt={t('post.buttons.vote')} />
              {t('post.buttons.vote')}
            </div>
          </button>
          <button 
            className={styles.templateBtn}
            onClick={() => {
              setActiveButton('coin');
              setShowCoinSelect(true);
            }}
          >
            <div className={`${styles.templateBox} ${activeButton === 'coin' ? styles.active : ''}`}>
              <img className={styles.buttonIcon} src={currencyIcon} alt={t('post.buttons.coin')} />
              {t('post.buttons.coin')}
            </div>
          </button>
          <button 
            className={styles.templateBtn}
            onClick={() => {
              setActiveButton('topic');
              setShowTopicSelect(true);
            }}
          >
            <div className={`${styles.templateBox} ${activeButton === 'topic' ? styles.active : ''}`}>
              <img className={styles.buttonIcon} src={topicIcon} alt={t('post.buttons.topic')} />
              {t('post.buttons.topic')}
            </div>
          </button>
        </div>

        {/* 模板选择弹出层 */}
        {showTemplates && (
          <div className={styles.templatePopup}>
            <div 
              className={styles.popupMask} 
              onClick={() => {
                setShowTemplates(false);  
                setActiveButton('');
              }}
            />
            <div className={styles.popupContent}>
              <div className={styles.popupHeader}>
                <span>{t('post.selectTemplate')}</span>
                <span 
                  className={styles.closeBtn}
                  onClick={() => {
                    setShowTemplates(false);
                    setActiveButton('');
                  }}
                >
                  ×
                </span>
              </div>
              <div className={styles.templateList}>
                {templates.map((item, index) => (
                  <div
                    key={index}
                    className={`${styles.templateItem} ${selectedTemplate === item.key ? styles.active : ''}`}
                    onClick={() => selectTemplate(item.key)}
                  >
                    <span>{item.label}</span>
                    <div className={styles.demoArea}>
                      {/* 模板演示区域 */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 投票弹窗 */}
        {showVote && (
          <div className={styles.votePopup}>
            <div 
              className={styles.popupMask} 
              onClick={() => {
                setShowVote(false);
                setActiveButton('');
              }}
            />
            <div className={styles.popupContent}>
              <div className={styles.popupHeader}>
                <span>{t('post.vote.createVote')}</span>
                <div className={styles.headerBtns}>
                  <button className={styles.createBtn} onClick={createVote}>{t('post.vote.create')}</button>
                  <button 
                    className={styles.closeBtn}
                    onClick={() => {
                      setShowVote(false);
                      setActiveButton('');
                    }}
                  >
                    {t('post.vote.cancel')}
                  </button>
                </div>
              </div>
              <div className={styles.voteForm}>
                <div className={styles.voteTitleInput}>
                  <Input
                    value={voteTitle}
                    onChange={(value) => value.length <= 20 && setVoteTitle(value)}
                    placeholder={t('post.vote.voteTitlePlaceholder')}
                    maxLength={20}
                  />
                  <span className={styles.wordCount}>{voteTitle.length}/20</span>
                </div>
                <div className={styles.voteOptionsList}>
                  {voteOptions.map((option, index) => (
                    <div key={index} className={styles.optionItem}>
                      <Input
                        className={styles.optionInput}
                        value={option}
                        onChange={(value) => updateVoteOption(index, value)}
                        placeholder={`${t('post.vote.voteOptionPlaceholder')} ${index + 1}`}
                      />
                      {voteOptions.length > 2 && (
                        <span 
                          className={styles.deleteBtn}
                          onClick={() => deleteVoteOption(index)}
                        >
                          ×
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <Button className={styles.addOptionBtn} onClick={addVoteOption}>
                  {t('post.vote.addOption')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 币种选择弹窗 */}
        {showCoinSelect && (
          <div className={styles.coinPopup}>
            <div 
              className={styles.popupMask} 
              onClick={() => {
                setShowCoinSelect(false);
                setActiveButton('');
              }}
            />
            <div className={styles.popupContent}>
              <div className={styles.coinHeader}>
                <div className={styles.searchBox}>
                  <SearchOutline fontSize={16} />
                  <input
                    className={styles.searchInput}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder={t('post.coin.searchPlaceholder')}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        searchCoin(searchKeyword);
                      }
                    }}
                  />
                </div>
                <button 
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowCoinSelect(false);
                    setActiveButton('');
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
              {/* 搜索结果展示区域 */}
              <div className={styles.searchResults}>
                <div className={styles.resultsTitle}>{t('post.coin.coinList')}</div>
                <div className={styles.resultsList}>
                  {searchResults.length > 0 ? (
                    searchResults.map((coin, index) => (
                      <div
                        key={index}
                        className={styles.resultItem}
                        onClick={() => selectCoin(coin)}
                      >
                        <img className={styles.coinIcon} src={coin.url} alt="" />
                        <span className={styles.coinSymbol}>{coin.symbol}</span>
                        {coin.name && <span className={styles.coinName}>{coin.name}</span>}
                      </div>
                    ))
                  ) : (
                    <div className={styles.noResults}>
                      <span>{t('post.coin.noData')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 话题选择弹出层 */}
        {showTopicSelect && (
          <div className={styles.topicPopup}>
            <div 
              className={styles.popupMask} 
              onClick={() => {
                setShowTopicSelect(false);
                setActiveButton('');
              }}
            />
            <div className={styles.popupContent}>
              <div className={styles.popupHeader}>
                <div className={styles.searchWrapper}>
                  <Input
                    className={styles.searchInput}
                    value={topicSearchKeyword}
                    onChange={(value) => setTopicSearchKeyword(value)}
                    placeholder={t('post.topic.searchPlaceholder')}
                    onEnterPress={(e) => searchTopics(e.target.value)}
                  />
                </div>
                <button className={styles.createTopicBtn} onClick={() => setShowCreateTopic(true)}>
                  {t('post.topic.createTopic')}
                </button>
                <button 
                  className={styles.cancelBtn} 
                  onClick={() => {
                    setShowTopicSelect(false);
                    setActiveButton('');
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
              {/* 话题展示区域 */}
              <div className={styles.searchResults}>
                <div className={styles.resultsTitle}>{t('post.topic.topicList')}</div>
                <div className={styles.resultsList}>
                  {topics.length > 0 ? (
                    topics.map(topic => (
                      <div
                        key={topic.id}
                        className={styles.topicItem}
                        onClick={() => selectTopic(topic)}
                      >
                        <div className={styles.topicName}>#{topic.name}</div>
                        {topic.description && <div className={styles.topicDescription}>{topic.description}</div>}
                      </div>
                    ))
                  ) : (
                    <div className={styles.noResults}>
                      <span>{topicSearchKeyword ? t('post.topic.noResults') : t('common.loading')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 创建话题弹窗 */}
        {showCreateTopic && (
          <div className={styles.topicCreatorMask} onClick={() => setShowCreateTopic(false)}>
            <div className={styles.topicCreator} onClick={e => e.stopPropagation()}>
              <div className={styles.creatorHeader}>
                <span>{t('post.topic.createTopic')}</span>
                <span className={styles.closeIcon} onClick={() => setShowCreateTopic(false)}>×</span>
              </div>
              <div className={styles.creatorContent}>
                <div className={styles.inputGroup}>
                  <span className={styles.label}>{t('post.topic.topicName')}</span>
                  <Input
                    className={styles.titleInput}
                    value={topicTitle}
                    onChange={(value) => setTopicTitle(value)}
                    placeholder={t('post.topic.topicNamePlaceholder')}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.label}>{t('post.topic.topicDescription')}</span>
                  <TextArea
                    className={styles.descInput}
                    value={topicDesc}
                    onChange={(value) => value.length <= 60 && setTopicDesc(value)}
                    placeholder={t('post.topic.topicDescriptionPlaceholder')}
                    maxLength={60}
                    rows={3}
                  />
                  <span className={styles.wordCount}>{topicDesc.length}/60</span>
                </div>
              </div>
              <Button
                className={`${styles.createBtn} ${topicTitle ? styles.active : ''}`}
                onClick={handleCreateTopic}
                disabled={!topicTitle}
                block
              >
                {t('post.topic.createTopic')}
              </Button>
            </div>
          </div>
        )}

        {/* 不懂就问提示弹窗 */}
        {showAskTips && (
          <div className={styles.askTipsContainer}>
            <div className={styles.askTipsBox}>
              <div className={styles.askTipsHeader}>
                <span>{t('community.askTips.title')}</span>
                <span className={styles.closeIcon} onClick={() => setShowAskTips(false)}>×</span>
              </div>
              <div className={styles.askTipsContent}>
                <div className={styles.tipItem}>
                  <span className={styles.tipIcon}>📝</span>
                  <span className={styles.tipText}>{t('community.askTips.standardAccurate')}</span>
                </div>
                <div className={styles.tipItem}>
                  <span className={styles.tipIcon}>💡</span>
                  <span className={styles.tipText}>{t('community.askTips.discussionValue')}</span>
                </div>
                <div className={styles.tipItem}>
                  <span className={styles.tipIcon}>👀</span>
                  <span className={styles.tipText}>{t('community.askTips.objectiveTrue')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 社区公约弹窗 */}
        {showCommunityRules && (
          <div className={styles.communityRulesMask}>
            <div className={styles.communityRulesPopup}>
              <div className={styles.rulesHeader}>
                <span className={styles.rulesTitle}>{t('community.communityRules.title')}</span>
              </div>
              <div className={styles.rulesContent}>
                <div className={styles.rulesText}>
                  {t('community.communityRules.greeting')}
                  <br /><br />
                  {t('community.communityRules.welcome')}
                  <br /><br />
                  {t('community.communityRules.followRules')}
                  <br /><br />
                  {t('community.communityRules.respectOthers')}
                  <br /><br />
                  {t('community.communityRules.respectFacts')}
                  <br /><br />
                  {t('community.communityRules.respectPlatform')}
                  <br /><br />
                  {t('community.communityRules.closing')}
                </div>
              </div>
              <div className={styles.rulesFooter}>
                <Button 
                  className={styles.confirmBtn} 
                  onClick={() => setShowCommunityRules(false)}
                  block
                >
                  {t('community.communityRules.confirmButton')}
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* 底部发布按钮 */}
        <div className={styles.publishBtnWrapper}>
          <Button 
            className={styles.publishButton} 
            onClick={publishPost} 
            disabled={publishing}
            loading={publishing}
            block
          >
{isUpdate ? t('post.buttons.update') : t('post.buttons.publish')}
          </Button>
        </div>
      </div>
    </>
  );

  if (isPC) {
    return (
      <PCLayout>
        <div className={styles.pcPageWrap}>
          <header className={styles.pcHeader}>
            <div className={styles.pcHeaderLeft}>
              <button
                type="button"
                className={styles.pcBackBtn}
                onClick={() => safeBack(router, { fallback: '/community' })}
                aria-label={t('common.back', { defaultValue: '返回' })}
              >
                <LeftOutlined />
              </button>
              <h1 className={styles.pcTitle}>
                {isUpdate ? t('post.editPost') : t('post.title')}
              </h1>
            </div>
          </header>
          {pageContent}
        </div>
      </PCLayout>
    );
  }

  return pageContent;
}