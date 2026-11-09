import { useRef, useState } from 'react'
import { compressImage } from '../../lib/image.js'
import { IconCamera, IconClose } from '../ui/Icons.jsx'
import { Spinner } from '../ui/Primitives.jsx'

/** Photo picker that compresses images in the browser before upload. */
export function PhotoDrop({ files = [], onChange, max = 3, label = 'Add photo' }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  async function handleFiles(fileList) {
    const incoming = Array.from(fileList || []).slice(0, max - files.length)
    if (!incoming.length) return
    setBusy(true)
    const compressed = []
    for (const file of incoming) {
      compressed.push(await compressImage(file))
    }
    setBusy(false)
    onChange([...files, ...compressed].slice(0, max))
  }

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
        className="flex flex-wrap gap-3"
      >
        {files.map((file, i) => (
          <div key={i} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-line">
            <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(files.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-paper opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove photo"
            >
              <IconClose size={13} />
            </button>
          </div>
        ))}

        {files.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-24 w-24 place-items-center gap-1 rounded-xl border border-dashed border-line-strong text-ink-faint transition-colors hover:border-blue hover:text-blue"
          >
            {busy ? <Spinner /> : <IconCamera size={20} />}
            <span className="label text-[9px]">{label}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default PhotoDrop
