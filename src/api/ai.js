/**
 * AI / Agent 相关 API
 */
import { request } from '../utils/request';
import { Interface } from '../utils/constants';

/**
 * Agent 会话消息接口路径
 * GET /ai/agent/conversations/{conversationId}/messages
 */
export function getAgentConversationMessagesPath(conversationId) {
  const id = encodeURIComponent(String(conversationId || '').trim());
  return `${Interface.AI_AGENT_CONVERSATIONS}/${id}/messages`;
}

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

/**
 * 获取 Agent 会话下所有消息（按 sort_no 升序，从旧到新）
 * GET /ai/agent/conversations/{conversationId}/messages
 * @param {string} conversationId - Agent conversation_id
 * @returns {Promise}
 */
export const getAgentConversationMessages = (conversationId) =>
  request({
    url: getAgentConversationMessagesPath(conversationId),
    method: 'GET',
  });

/**
 * 删除 Agent 会话
 * DELETE /ai/agent/conversations/{conversationId}
 * @param {string} conversationId
 * @returns {Promise}
 */
export const deleteAgentConversation = (conversationId) =>
  request({
    url: `${Interface.AI_AGENT_CONVERSATIONS}/${encodeURIComponent(String(conversationId || '').trim())}`,
    method: 'DELETE',
  });

/**
 * 尝试把接口里的 JSON 字符串字段解析为对象
 */
function parseMaybeJson(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/**
 * 规范化历史消息里的 payload 字段
 */
function normalizeHistoryMessagePayload(item) {
  if (!item || typeof item !== 'object') return item;

  let payload = parseMaybeJson(item.payload);
  if (!payload || typeof payload !== 'object') {
    return item;
  }

  if (payload.card) {
    payload = {
      ...payload,
      card: parseMaybeJson(payload.card),
    };
  }

  if (Array.isArray(payload.cards)) {
    payload = {
      ...payload,
      cards: payload.cards.map((cardItem) => parseMaybeJson(cardItem)),
    };
  }

  return { ...item, payload };
}

/**
 * 判断是否为信号卡历史消息
 */
function isSignalCardHistoryMessage(item) {
  const messageType = item?.message_type ?? item?.messageType ?? '';
  const payloadType = item?.payload?.type ?? '';
  return (
    messageType === 'signal_card' ||
    payloadType === 'signal_card' ||
    !!(item?.payload?.card && typeof item.payload.card === 'object')
  );
}

/**
 * 将接口 payload 规范为 SignalCard 组件所需结构
 * @param {object} raw - 整条消息或 payload 对象
 * @returns {object|null}
 */
export function normalizeSignalCardPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;

  let payload = raw.payload ?? raw;

  if (payload && typeof payload === 'object' && !payload.card && !payload.display && payload.coin) {
    payload = {
      card: payload,
      math: payload.math,
      strategy: payload.strategy,
      display: payload.display || '',
    };
  }

  if (!payload?.card && !payload?.display) return null;

  const card = payload.card || {};
  const math = payload.math || {};
  const strategy = payload.strategy || {};

  let kellyPct = card.kelly_pct ?? card.kellyPct ?? payload.kellyPct;
  if (kellyPct == null && math.kelly != null) {
    const kelly = Number(math.kelly);
    if (!Number.isNaN(kelly)) {
      kellyPct = kelly <= 1 ? kelly * 100 : kelly;
    }
  }

  const normalizedCard =
    kellyPct != null && card.kelly_pct == null && card.kellyPct == null
      ? { ...card, kelly_pct: kellyPct }
      : card;

  return {
    card: normalizedCard,
    math,
    strategy,
    display: payload.display || '',
    tier: payload.tier,
    kline_periods: payload.kline_periods ?? payload.klinePeriods,
    price_source: payload.price_source ?? payload.priceSource,
  };
}

function shouldDropSignalCardTextContent(item, content, displayText) {
  const messageType = item?.message_type ?? item?.messageType ?? '';
  const trimmedContent = String(content || '').trim();
  const trimmedDisplay = String(displayText || '').trim();

  if (messageType === 'signal_card') return true;
  if (!trimmedContent) return false;
  if (trimmedDisplay && trimmedContent === trimmedDisplay) return true;
  if (trimmedContent.includes('交易信号卡') || trimmedContent.includes('SignalGrade')) return true;
  return false;
}

function buildSignalCardHistoryMessage(base, item, signalCards, content) {
  const displayText = signalCards[0]?.display || item?.payload?.display || '';
  const finalContent = shouldDropSignalCardTextContent(item, content, displayText) ? '' : content;

  return {
    ...base,
    content: finalContent,
    agentType: base.agentType || 'signals',
    signalCards,
    signalCardsAfterText: !!finalContent,
  };
}

function normalizeAgentHistoryMessage(item, index, conversationId, data) {
  const normalizedItem = normalizeHistoryMessagePayload(item);
  const agentType = normalizedItem.agent_type ?? normalizedItem.agentType ?? '';
  const rawContent = normalizedItem.content ?? normalizedItem.text ?? normalizedItem.message ?? '';
  const content = rawContent == null ? '' : String(rawContent);

  const base = {
    id:
      normalizedItem.id ||
      normalizedItem.messageId ||
      normalizedItem.message_id ||
      normalizedItem.request_id ||
      normalizedItem.requestId ||
      `history-${normalizedItem.role}-${index}`,
    role: normalizedItem.role,
    content,
    time:
      normalizedItem.createdAt ||
      normalizedItem.created_at ||
      normalizedItem.time ||
      Date.now() - (index + 1) * 1000,
    conversationId:
      normalizedItem.conversationId ||
      normalizedItem.conversation_id ||
      data?.conversationId ||
      conversationId,
    sortNo: normalizedItem.sort_no ?? normalizedItem.sortNo,
    agentType: agentType || undefined,
    loading: false,
  };

  if (!isSignalCardHistoryMessage(normalizedItem)) {
    return base;
  }

  const payloadCards = normalizedItem.payload?.cards;
  if (Array.isArray(payloadCards) && payloadCards.length > 0) {
    const signalCards = payloadCards
      .map((cardItem) => normalizeSignalCardPayload({ payload: cardItem }))
      .filter(Boolean);

    if (signalCards.length > 0) {
      return buildSignalCardHistoryMessage(base, normalizedItem, signalCards, content);
    }
  }

  const signalCard = normalizeSignalCardPayload(normalizedItem);
  if (!signalCard) {
    const display = normalizedItem.payload?.display;
    if (display && !content) {
      return { ...base, content: String(display) };
    }
    return base;
  }

  return buildSignalCardHistoryMessage(base, normalizedItem, [signalCard], content);
}

/**
 * 解析 Agent 会话消息列表响应
 * @param {object} res - request() 返回值
 * @param {string} [conversationId]
 * @returns {Array<{ id: string, role: string, content: string, time: number, conversationId?: string, sortNo?: number, signalCard?: object, signalCards?: object[], agentType?: string }>}
 */
export function normalizeAgentConversationMessages(res, conversationId) {
  const data = res?.data;
  let rawMessages = [];

  if (Array.isArray(data)) {
    rawMessages = data;
  } else if (Array.isArray(data?.messages)) {
    rawMessages = data.messages;
  } else if (Array.isArray(data?.list)) {
    rawMessages = data.list;
  }

  return rawMessages
    .slice()
    .sort((a, b) => {
      const sortA = a?.sort_no ?? a?.sortNo ?? 0;
      const sortB = b?.sort_no ?? b?.sortNo ?? 0;
      return sortA - sortB;
    })
    .filter((item) => item?.role !== 'system')
    .map((item, index) => normalizeAgentHistoryMessage(item, index, conversationId, data));
}

/**
 * 从 Agent 会话消息响应中提取建议问题
 * @param {object} res
 * @returns {Array}
 */
export function extractSuggestedQuestionsFromAgentMessages(res) {
  const data = res?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  if (Array.isArray(data.suggestedQuestions)) return data.suggestedQuestions;
  if (Array.isArray(data.suggested_questions)) return data.suggested_questions;
  return [];
}
