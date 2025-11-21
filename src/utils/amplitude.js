/**
 * Amplitude 埋点工具
 * 用于初始化和追踪用户行为
 */

// Amplitude API Key
const AMPLITUDE_API_KEY = '262796006c5ab5404c5974f95aa77991';

// Amplitude SDK URLs
const AMPLITUDE_CORE_URL = 'https://cdn.amplitude.com/libs/analytics-browser-2.11.1-min.js.gz';
const SESSION_REPLAY_URL = 'https://cdn.amplitude.com/libs/plugin-session-replay-browser-1.23.2-min.js.gz';

/**
 * 初始化 Amplitude
 * @param {Object} options - 配置选项
 * @param {number} options.sampleRate - Session Replay 采样率 (0-1)
 * @param {boolean} options.autocapture - 是否启用自动捕获
 */
export const initAmplitude = (options = {}) => {
  const {
    sampleRate = 1,
    autocapture = true
  } = options;

  return new Promise((resolve, reject) => {
    // 检查是否已经初始化
    if (window.amplitude && window.amplitude.isInitialized) {
      resolve(window.amplitude);
      return;
    }

    // 加载 Amplitude 核心库
    const amplitudeScript = document.createElement('script');
    amplitudeScript.src = AMPLITUDE_CORE_URL;
    amplitudeScript.async = true;

    // 加载 Session Replay 插件
    const sessionReplayScript = document.createElement('script');
    sessionReplayScript.src = SESSION_REPLAY_URL;
    sessionReplayScript.async = true;

    // 初始化 Amplitude
    const initScript = document.createElement('script');
    initScript.innerHTML = `
      window.amplitude.add(window.sessionReplay.plugin({sampleRate: ${sampleRate}}));
      window.amplitude.init('${AMPLITUDE_API_KEY}', {
        "autocapture": {
          "elementInteractions": ${autocapture}
        }
      });
      window.amplitude.isInitialized = true;
    `;

    // 按顺序加载脚本
    amplitudeScript.onload = () => {
      document.head.appendChild(sessionReplayScript);
      sessionReplayScript.onload = () => {
        document.head.appendChild(initScript);
        setTimeout(() => {
          resolve(window.amplitude);
        }, 100);
      };
    };

    amplitudeScript.onerror = () => {
      reject(new Error('Failed to load Amplitude core library'));
    };

    document.head.appendChild(amplitudeScript);
  });
};

/**
 * 追踪事件
 * @param {string} eventName - 事件名称
 * @param {Object} eventProperties - 事件属性
 */
export const trackEvent = (eventName, eventProperties = {}) => {
  if (!window.amplitude) {
    console.warn('Amplitude not initialized');
    return;
  }

  const defaultProperties = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    referrer: document.referrer,
    url: window.location.href
  };

  window.amplitude.track(eventName, {
    ...defaultProperties,
    ...eventProperties
  });
};

/**
 * 追踪页面浏览
 * @param {string} pageName - 页面名称
 * @param {Object} properties - 附加属性
 */
export const trackPageView = (pageName, properties = {}) => {
  trackEvent(`${pageName}_Page_Viewed`, properties);
};

/**
 * 追踪按钮点击
 * @param {string} buttonName - 按钮名称
 * @param {Object} properties - 附加属性
 */
export const trackButtonClick = (buttonName, properties = {}) => {
  trackEvent(`${buttonName}_Clicked`, properties);
};

/**
 * 设置用户属性
 * @param {Object} userProperties - 用户属性
 */
export const setUserProperties = (userProperties) => {
  if (!window.amplitude) {
    console.warn('Amplitude not initialized');
    return;
  }

  window.amplitude.setUserId(userProperties.userId);
  window.amplitude.setUserProperties(userProperties);
};

/**
 * 首页事件
 */
export const HomeEvents = {
  PAGE_VIEWED: 'Home_Page_Viewed',
  COIN_CLICKED: 'Home_Coin_Clicked',
  RANK_TAB_SWITCHED: 'Home_Rank_Tab_Switched',
  SEARCH_CLICKED: 'Home_Search_Clicked',
  BANNER_CLICKED: 'Home_Banner_Clicked',
  REFRESH_TRIGGERED: 'Home_Refresh_Triggered',
  AI_CLICKED: 'Home_AI_Clicked'
};

/**
 * 发现页事件
 */
export const FindEvents = {
  PAGE_VIEWED: 'Find_Page_Viewed',
  CATEGORY_CLICKED: 'Find_Category_Clicked',
  TOOL_CLICKED: 'Find_Tool_Clicked',
  RANK_CLICKED: 'Find_Rank_Clicked',
  SEARCH_CLICKED: 'Find_Search_Clicked'
};

/**
 * 社区事件
 */
export const CommunityEvents = {
  PAGE_VIEWED: 'Community_Page_Viewed',
  TAB_SWITCHED: 'Community_Tab_Switched',
  POST_VIEWED: 'Community_Post_Viewed',
  POST_LIKED: 'Community_Post_Liked',
  POST_UNLIKED: 'Community_Post_Unliked',
  POST_SHARED: 'Community_Post_Shared',
  POST_CREATED: 'Community_Post_Created',
  COMMENT_CLICKED: 'Community_Comment_Clicked',
  TOPIC_VIEWED: 'Community_Topic_Viewed',
  TOPIC_CREATED: 'Community_Topic_Created',
  TOPIC_SEARCHED: 'Community_Topic_Searched',
  COIN_SELECTED: 'Community_Coin_Selected',
  COIN_SEARCHED: 'Community_Coin_Searched',
  VOTE_CAST: 'Community_Vote_Cast'
};

/**
 * 我的页面事件
 */
export const ProfileEvents = {
  PAGE_VIEWED: 'Profile_Page_Viewed',
  SETTINGS_CLICKED: 'Profile_Settings_Clicked',
  MY_POSTS_CLICKED: 'Profile_My_Posts_Clicked',
  MY_LIKES_CLICKED: 'Profile_My_Likes_Clicked',
  MY_COMMENTS_CLICKED: 'Profile_My_Comments_Clicked',
  MY_ALERTS_CLICKED: 'Profile_My_Alerts_Clicked',
  POINTS_CLICKED: 'Profile_Points_Clicked',
  LANGUAGE_SWITCHED: 'Profile_Language_Switched',
  LOGOUT_CLICKED: 'Profile_Logout_Clicked'
};

/**
 * AI 助手事件
 */
export const AIEvents = {
  PAGE_VIEWED: 'AI_Page_Viewed',
  QUESTION_SENT: 'AI_Question_Sent',
  RESPONSE_RECEIVED: 'AI_Response_Received',
  BACK_CLICKED: 'AI_Back_Clicked',
  INPUT_FOCUSED: 'AI_Input_Focused'
};

export default {
  initAmplitude,
  trackEvent,
  trackPageView,
  trackButtonClick,
  setUserProperties,
  HomeEvents,
  FindEvents,
  CommunityEvents,
  ProfileEvents,
  AIEvents
};
