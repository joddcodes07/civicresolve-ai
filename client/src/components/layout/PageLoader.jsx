import { LogoMark } from './Logo.jsx'
import { useI18n } from '../../lib/i18n.jsx'

export function PageLoader({ fullScreen = false }) {
  const { t } = useI18n()

  return (
    <div className={`grid place-items-center ${fullScreen ? 'min-h-dvh' : 'min-h-[60vh]'}`} role="status">
      <div className="flex flex-col items-center gap-4">
        <span className="page-loader-mark grid size-[4.5rem] place-items-center rounded-3xl border border-blue/20 bg-blue-soft">
          <LogoMark size={42} />
        </span>
        <span className="text-sm font-medium text-ink-soft">{t('common.loading')}</span>
      </div>
    </div>
  )
}
