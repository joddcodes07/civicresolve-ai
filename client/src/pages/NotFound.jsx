import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button.jsx'

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <div className="label">Error 404</div>
        <h1 className="mt-4 font-display text-6xl tracking-tight">Lost? </h1>
        <p className="mx-auto mt-4 max-w-sm text-[14px] text-ink-soft">
          That page does not exist. Try lodging a complaint, or track one you already filed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button to="/" variant="solid">Go home</Button>
          <Button to="/lodge" variant="saffron">Lodge a complaint</Button>
        </div>
        <Link to="/track" className="link-sweep label mt-6 inline-block text-ink-soft">
          Track by ID →
        </Link>
      </div>
    </div>
  )
}
