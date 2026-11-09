import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../lib/i18n.jsx'
import { useLite } from '../../lib/lite.jsx'
import { SectionLabel } from '../../components/ui/Primitives.jsx'
import { Button } from '../../components/ui/Button.jsx'

const FAQ = [
  {
    q: 'Do I need to know which department handles my problem?',
    a: 'No. Describe the problem in your own words. The AI reads it, picks the category and department, and routes it. If it is unsure, a person checks it before it goes out.',
  },
  {
    q: 'Can I complain without signing in?',
    a: 'Yes. You can lodge and track a complaint with just your ID. Signing in lets you see all your complaints in one place, confirm fixes and receive notifications.',
  },
  {
    q: 'Which languages are supported?',
    a: 'English, हिंदी and मराठी across the interface, and voice input in all three. You can also write Hinglish — the officer sees an English reading.',
  },
  {
    q: 'What if the same problem has already been reported?',
    a: 'We check nearby open complaints of the same type. If there is a match you can add your voice to the existing issue instead of filing a duplicate. The pin on the map then shows how many citizens reported it.',
  },
  {
    q: 'Why is my complaint not closed yet?',
    a: 'A complaint closes only when the officer uploads an after-photo and a note of what was done, and you confirm the fix. If it is not fixed you can reopen it.',
  },
  {
    q: 'How does priority work?',
    a: 'Every complaint gets a 0–100 score from severity, safety risk, how many people reported it, how overdue it is, whether it was reopened, and whether it is near a school or hospital. Officers see the score and the reasons.',
  },
  {
    q: 'What happens if the department misses the deadline?',
    a: 'Deadlines are set per department. When one is crossed the complaint escalates automatically — first to the department head, then to the commissioner.',
  },
]

export default function Help() {
  const { t } = useI18n()
  const { lite, toggle } = useLite()
  const [open, setOpen] = useState(0)

  return (
    <div className="frame py-10">
      <SectionLabel index={9}>{t('help.title')}</SectionLabel>
      <h1 className="max-w-2xl font-display text-4xl tracking-tight">{t('help.sub')}</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
            {FAQ.map((item, i) => (
              <div key={item.q}>
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={open === i}
                >
                  <span className="font-display text-[16px] tracking-tight">{item.q}</span>
                  <span className={`mono shrink-0 text-ink-faint transition-transform ${open === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {open === i && <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-ink-soft">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="card p-6">
            <SectionLabel>Quick links</SectionLabel>
            <div className="flex flex-col gap-2">
              <Button to="/lodge" variant="saffron" block>{t('nav.lodge')}</Button>
              <Button to="/track" variant="ghost" block>{t('nav.track')}</Button>
              <Button to="/chat" variant="ghost" block>{t('nav.chat')}</Button>
            </div>
          </div>

          <div className="card mt-6 p-6">
            <SectionLabel>Low-data mode</SectionLabel>
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Turn off animations and heavy effects for slow connections and cheaper phones.
            </p>
            <button
              onClick={toggle}
              className={`pill mt-4 border ${lite ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft'}`}
            >
              {lite ? 'Lite mode: ON' : 'Lite mode: OFF'}
            </button>
          </div>

          <div className="card mt-6 p-6">
            <SectionLabel>Privacy</SectionLabel>
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Phone numbers, Aadhaar-like numbers and emails are masked before any text is sent to an AI
              provider. The public map never shows personal details.
            </p>
            <Link to="/departments" className="link-sweep label mt-3 inline-block text-ink">See departments →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
