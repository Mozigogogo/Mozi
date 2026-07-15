import { TG_ROOT_REDIRECT_SCRIPT } from '@/utils/tgRootRedirectScript';

/** layout <head> 内联脚本：TG 环境禁止在 `/` 停留 */
export default function TgRootRedirectScript() {
  return (
    <script
      id="mozi-tg-root-redirect"
      dangerouslySetInnerHTML={{ __html: TG_ROOT_REDIRECT_SCRIPT }}
    />
  );
}
