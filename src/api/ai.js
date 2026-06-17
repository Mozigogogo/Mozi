/**
 * AI / Agent 相关 API
 */
import { request } from '../utils/request';
import { Interface } from '../utils/constants';

/**
 * 获取 AI 会话列表（主栈）
 * GET /ai/chat/conversations
 * @returns {Promise}
 */
export const getChatConversations = () =>
  request({
    url: Interface.AI_CHAT_CONVERSATIONS,
    method: 'GET',
  });

/**
 * 获取 Agent 会话列表
 * GET /ai/agent/conversations
 * @returns {Promise}
 */
export const getAgentConversations = () =>
  request({
    url: Interface.AI_AGENT_CONVERSATIONS,
    method: 'GET',
  });
