'use strict';

/**
 * /config → 链上识别 + 防冒充管理员
 * 写：POST /tg/stats/group/save
 * 读：优先 GET /tg/stats/group/get，失败再退回 list
 */

const { Markup } = require('telegraf');
const {
  postTgStatsGroupSave,
  getTgStatsGroupGet,
  parseGroupSecurityFields,
} = require('./apis');
const { ensureTgUserToken } = require('./tgUserTokenCache');
const { buildTelegramLoginOptsFromCtx } = require('./datainfoPoints');
const { escapeHtml } = require('./telegramHtml');
const { fetchOwnerGroupsFromApi } = require('./predictScheduleFlow');
const { invalidateGroupModerationConfigCache } = require('./joinVerifyConfig');
const { withTypingWhileAwaiting } = require('./telegramTypingPulse');
const { dropUnreachableDuplicateTitles, syncGroupStatsForChatId } = require('./tgGroupStats');

function scSettingsLog(event, payload) {
  const on = !/^0|false|no$/i.test(String(process.env.GROUP_SECURITY_SETTINGS_LOG ?? '1').trim());
  if (!on) return;
  let body = '';
  try {
    body = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
  } catch {
    body = ` ${String(payload)}`;
  }
  console.log(`[GROUP_SECURITY_SETTINGS] ${new Date().toISOString()} ${event}${body}`);
}

function isSaveBusinessOk(saveRes) {
  if (!saveRes?.ok) return false;
  const json = saveRes.json;
  if (!json || typeof json !== 'object') return true;
  if (json.success === false || json.success === 0) return false;
  if (json.success === true || json.success === 1) return true;
  if (json.code == null) return true;
  const code = Number(json.code);
  return code === 0 || code === 200;
}

function normalizeGroupSecurityGroups(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const groupId = Number(item.groupId);
      if (!Number.isFinite(groupId)) return null;
      if (item.status != null && Number(item.status) === 0) return null;
      const sec = parseGroupSecurityFields(item);
      return {
        groupId,
        groupTitle: String(item.groupTitle || item.title || '').trim() || `群 ${groupId}`,
        status: item.status == null ? null : Number(item.status),
        memberCount: item.memberCount ?? null,
        updatedAtMs: item.updatedAtMs ?? null,
        createdAtMs: item.createdAtMs ?? null,
        ...sec,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => String(a.groupTitle).localeCompare(String(b.groupTitle)) || a.groupId - b.groupId,
    );
}

function displayTitleForGroup(g, groups) {
  const base = String(g.groupTitle || g.groupId);
  const sameNameCount = (groups || []).filter(
    (x) => String(x.groupTitle || '') === String(g.groupTitle || ''),
  ).length;
  if (sameNameCount <= 1) return base.slice(0, 22);
  const idHint = String(Math.abs(Number(g.groupId))).slice(-6);
  return `${base.slice(0, 14)}·${idHint}`;
}

function buildGroupSecurityListText(texts, groups) {
  if (!groups.length) {
    return `${texts.groupSecuritySettingsIntro}\n\n${texts.predictScheduleEmpty}`;
  }
  const lines = groups.map((g) =>
    texts.groupSecuritySettingsGroupLine(
      escapeHtml(displayTitleForGroup(g, groups)),
      g.onchainDetectEnabled === 1,
      g.impersonateAdminEnabled === 1,
    ),
  );
  return `${texts.groupSecuritySettingsIntro}\n\n${lines.join('\n')}`;
}

function buildGroupSecurityListKeyboard(texts, groups) {
  const rows = groups.map((g) => {
    const label = displayTitleForGroup(g, groups);
    return [Markup.button.callback(label.slice(0, 40), `sc:g:${g.groupId}`)];
  });
  rows.push([
    Markup.button.callback(texts.predictScheduleRefreshBtn, 'sc:r'),
    Markup.button.callback(texts.groupSettingsBackBtn, 'gs:home'),
  ]);
  return Markup.inlineKeyboard(rows);
}

function buildGroupSecurityDetailText(texts, g) {
  const onchainOn =
    g.onchainDetectEnabled === 1 ? texts.joinVerifySettingsOn : texts.joinVerifySettingsOff;
  const impersonateOn =
    g.impersonateAdminEnabled === 1 ? texts.joinVerifySettingsOn : texts.joinVerifySettingsOff;
  const memberCount =
    g.memberCount != null && Number.isFinite(Number(g.memberCount))
      ? String(Math.floor(Number(g.memberCount)))
      : '—';
  return texts.groupSecuritySettingsDetailHtml(
    escapeHtml(String(g.groupTitle || g.groupId)),
    onchainOn,
    impersonateOn,
    memberCount,
    String(g.groupId),
  );
}

function buildGroupSecurityDetailKeyboard(texts, g) {
  const gid = g.groupId;
  const label = (t) => Markup.button.callback(`— ${t} —`, 'sc:noop');

  return Markup.inlineKeyboard([
    [label(texts.groupSecurityOnchainSection)],
    [
      Markup.button.callback(texts.groupSecurityOnchainEnableBtn, `sc:od:${gid}:1`),
      Markup.button.callback(texts.groupSecurityOnchainDisableBtn, `sc:od:${gid}:0`),
    ],
    [label(texts.groupSecurityImpersonateSection)],
    [
      Markup.button.callback(texts.groupSecurityImpersonateEnableBtn, `sc:ia:${gid}:1`),
      Markup.button.callback(texts.groupSecurityImpersonateDisableBtn, `sc:ia:${gid}:0`),
    ],
    [
      Markup.button.callback(texts.groupSecurityQueryBtn, `sc:q:${gid}`),
      Markup.button.callback(texts.groupSecurityListBtn, 'sc:list'),
      Markup.button.callback(texts.groupSecuritySaveBtn, `sc:sv:${gid}`),
    ],
    [Markup.button.callback(texts.groupSettingsBackBtn, 'gs:home')],
  ]);
}

async function resolveOwnerAuth(ctx, config) {
  const uid = ctx.from?.id;
  if (uid == null) return { ok: false, auth: '', authMissing: true };
  const loginOpts = buildTelegramLoginOptsFromCtx(ctx);
  const token = await ensureTgUserToken(config, String(uid), loginOpts).catch(() => '');
  const auth = token || config.MOZI_DETAIL_AUTH || '';
  if (!auth) return { ok: false, auth: '', authMissing: true };
  return { ok: true, auth, authMissing: false };
}

async function saveGroupSecurityPatch(ctx, config, auth, patch) {
  scSettingsLog('save.request', { groupId: patch.groupId, patch });
  const saveRes = await postTgStatsGroupSave({
    apiBaseUrl: config.API_BASE_URL,
    auth,
    appUrl: config.APP_URL,
    path: config.TG_GROUP_SAVE_PATH,
    groups: [patch],
  });
  scSettingsLog('save.response', {
    groupId: patch.groupId,
    httpOk: saveRes.ok,
    httpStatus: saveRes.status,
    businessOk: isSaveBusinessOk(saveRes),
    apiCode: saveRes.json?.code ?? null,
  });
  if (saveRes.ok && patch.groupId != null) {
    invalidateGroupModerationConfigCache(patch.groupId);
  }
  return saveRes;
}

async function loadGroupSecurityGroup(ctx, config, groupId) {
  const authRes = await resolveOwnerAuth(ctx, config);
  const auth = authRes.auth || config.MOZI_DETAIL_AUTH || '';

  if (auth) {
    try {
      const getRes = await getTgStatsGroupGet({
        apiBaseUrl: config.API_BASE_URL,
        appUrl: config.APP_URL,
        auth,
        groupId,
        path: config.TG_GROUP_GET_PATH || 'tg/stats/group/get',
      });
      if (getRes.ok && getRes.group) {
        const sec = parseGroupSecurityFields(getRes.group);
        const memberCountRaw = getRes.group.memberCount ?? getRes.group.member_count;
        const memberCount =
          memberCountRaw == null || !Number.isFinite(Number(memberCountRaw))
            ? null
            : Math.floor(Number(memberCountRaw));
        return {
          groupId: Number(getRes.group.groupId ?? groupId),
          groupTitle:
            String(getRes.group.groupTitle || getRes.group.title || '').trim() ||
            `群 ${groupId}`,
          memberCount,
          ...sec,
          _source: 'get',
        };
      }
    } catch (err) {
      scSettingsLog('load.get_error', {
        groupId: String(groupId),
        message: err?.message || String(err),
      });
    }
  }

  const remote = await fetchOwnerGroupsFromApi(ctx, config);
  const groups = normalizeGroupSecurityGroups(remote.items || []);
  const g = groups.find((x) => String(x.groupId) === String(groupId)) || null;
  return g ? { ...g, _source: 'list' } : null;
}

async function renderGroupSecurityListPanel(ctx, config, getTexts, opts = {}) {
  const uid = ctx.from?.id;
  if (uid == null) return;
  const texts = getTexts(ctx.from?.language_code || 'en');

  let loadingMsg = null;
  if (!opts.skipLoading && !opts.edit) {
    loadingMsg = await ctx.reply(texts.predictScheduleLoading, { parse_mode: 'HTML' }).catch(() => null);
  }

  const remote = await fetchOwnerGroupsFromApi(ctx, config);
  if (remote.authMissing) {
    if (loadingMsg?.message_id) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
    }
    await ctx.reply(texts.predictScheduleNeedLogin, { parse_mode: 'HTML' }).catch(() => {});
    return;
  }
  if (!remote.ok && !remote.items.length) {
    if (loadingMsg?.message_id) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
    }
    await ctx.reply(texts.predictScheduleFetchFailed, { parse_mode: 'HTML' }).catch(() => {});
    return;
  }

  const groups = await dropUnreachableDuplicateTitles(
    ctx.telegram,
    normalizeGroupSecurityGroups(remote.items),
    config,
    scSettingsLog,
  );
  const text = buildGroupSecurityListText(texts, groups);
  const keyboard = buildGroupSecurityListKeyboard(texts, groups);
  const extra = { parse_mode: 'HTML', ...keyboard };

  if (opts.edit && ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch {
      /* fall through */
    }
  }

  if (loadingMsg?.message_id) {
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
  }
  await ctx.reply(text, extra).catch(() => {});
}

async function renderGroupSecurityDetailPanel(ctx, config, getTexts, groupId, opts = {}) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  let g = await loadGroupSecurityGroup(ctx, config, groupId);

  if (!g) {
    await ctx
      .answerCbQuery(texts.joinVerifySettingsGroupNotFound, { show_alert: true })
      .catch(() => {});
    await renderGroupSecurityListPanel(ctx, config, getTexts, { edit: true, skipLoading: true });
    return;
  }

  if (opts.overlay && typeof opts.overlay === 'object') {
    const merged = { ...g, ...opts.overlay };
    g = { ...merged, ...parseGroupSecurityFields(merged) };
  }

  const text = buildGroupSecurityDetailText(texts, g);
  const keyboard = buildGroupSecurityDetailKeyboard(texts, g);
  const extra = { parse_mode: 'HTML', ...keyboard };

  if (opts.edit !== false && ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(text, extra).catch(() => {});
}

async function handleGroupSecurityOpenList(ctx, config, getTexts) {
  await withTypingWhileAwaiting(ctx, (async () => {
    await renderGroupSecurityListPanel(ctx, config, getTexts, { edit: true, skipLoading: true });
  })());
  await ctx.answerCbQuery().catch(() => {});
}

async function handleGroupSecurityOpenDetail(ctx, config, getTexts, groupId) {
  await withTypingWhileAwaiting(ctx, (async () => {
    await renderGroupSecurityDetailPanel(ctx, config, getTexts, groupId, { edit: true });
  })());
  await ctx.answerCbQuery().catch(() => {});
}

async function handleGroupSecurityPatch(ctx, config, getTexts, groupId, patch, toastKey) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const authRes = await resolveOwnerAuth(ctx, config);
  if (!authRes.ok) {
    await ctx.answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true }).catch(() => {});
    return;
  }

  try {
    await withTypingWhileAwaiting(ctx, (async () => {
      const saveRes = await saveGroupSecurityPatch(ctx, config, authRes.auth, {
        groupId: Number(groupId),
        ...patch,
      });
      if (!isSaveBusinessOk(saveRes)) {
        await ctx
          .answerCbQuery(
            `保存失败 HTTP ${saveRes.status}${saveRes.json?.code != null ? ` code=${saveRes.json.code}` : ''}`,
            { show_alert: true },
          )
          .catch(() => {});
        return;
      }
      await ctx.answerCbQuery(texts[toastKey] || texts.groupSecuritySettingsSavedToast).catch(() => {});
      await renderGroupSecurityDetailPanel(ctx, config, getTexts, groupId, {
        edit: true,
        overlay: patch,
      });
    })());
  } catch (err) {
    scSettingsLog('patch_error', { groupId: String(groupId), message: err?.message || String(err) });
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
  }
}

async function handleOnchainDetectToggle(ctx, config, getTexts, groupId, enabled) {
  await handleGroupSecurityPatch(
    ctx,
    config,
    getTexts,
    groupId,
    { onchainDetectEnabled: enabled ? 1 : 0 },
    enabled ? 'groupSecurityOnchainEnabledToast' : 'groupSecurityOnchainDisabledToast',
  );
}

async function handleImpersonateAdminToggle(ctx, config, getTexts, groupId, enabled) {
  await handleGroupSecurityPatch(
    ctx,
    config,
    getTexts,
    groupId,
    { impersonateAdminEnabled: enabled ? 1 : 0 },
    enabled ? 'groupSecurityImpersonateEnabledToast' : 'groupSecurityImpersonateDisabledToast',
  );
}

async function handleGroupSecurityQuery(ctx, config, getTexts, groupId) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  try {
    await withTypingWhileAwaiting(ctx, (async () => {
      invalidateGroupModerationConfigCache(groupId);
      const g = await loadGroupSecurityGroup(ctx, config, groupId);
      if (!g) {
        await ctx
          .answerCbQuery(texts.joinVerifySettingsGroupNotFound, { show_alert: true })
          .catch(() => {});
        return;
      }
      await ctx.answerCbQuery(texts.groupSecurityQueryToast).catch(() => {});
      await renderGroupSecurityDetailPanel(ctx, config, getTexts, groupId, { edit: true });
    })());
  } catch (err) {
    scSettingsLog('query_error', { groupId: String(groupId), message: err?.message || String(err) });
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
  }
}

async function handleGroupSecuritySaveGroup(ctx, config, getTexts, groupId) {
  const texts = getTexts(ctx.from?.language_code || 'en');
  const authRes = await resolveOwnerAuth(ctx, config);
  if (!authRes.ok) {
    await ctx.answerCbQuery(texts.predictScheduleNeedLogin, { show_alert: true }).catch(() => {});
    return;
  }

  try {
    await withTypingWhileAwaiting(ctx, (async () => {
      await syncGroupStatsForChatId(ctx.telegram, config, groupId, 'config_manual_save');
      const g = await loadGroupSecurityGroup(ctx, config, groupId);
      if (g) {
        const saveRes = await saveGroupSecurityPatch(ctx, config, authRes.auth, {
          groupId: Number(groupId),
          onchainDetectEnabled: g.onchainDetectEnabled,
          impersonateAdminEnabled: g.impersonateAdminEnabled,
        });
        if (!isSaveBusinessOk(saveRes)) {
          await ctx
            .answerCbQuery(
              `保存失败 HTTP ${saveRes.status}${saveRes.json?.code != null ? ` code=${saveRes.json.code}` : ''}`,
              { show_alert: true },
            )
            .catch(() => {});
          return;
        }
      }
      invalidateGroupModerationConfigCache(groupId);
      await ctx.answerCbQuery(texts.groupSecuritySaveToast).catch(() => {});
      await renderGroupSecurityDetailPanel(ctx, config, getTexts, groupId, { edit: true });
    })());
  } catch (err) {
    scSettingsLog('save_group_error', { groupId: String(groupId), message: err?.message || String(err) });
    await ctx.answerCbQuery(texts.predictScheduleFetchFailed, { show_alert: true }).catch(() => {});
  }
}

module.exports = {
  handleGroupSecurityOpenList,
  handleGroupSecurityOpenDetail,
  handleOnchainDetectToggle,
  handleImpersonateAdminToggle,
  handleGroupSecurityQuery,
  handleGroupSecuritySaveGroup,
  renderGroupSecurityListPanel,
  renderGroupSecurityDetailPanel,
};
