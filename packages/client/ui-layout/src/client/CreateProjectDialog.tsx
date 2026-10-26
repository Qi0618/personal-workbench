/** Project creation form with an optional local-folder copy. */
import { useEffect, useRef, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import {
  Modal, Menu, Tooltip, IconFolderCloseRegular, IconPlusOutlineRegular,
  IconCloseOutlineRegular, IconChevronDownOutlineRegular, IconLightOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { siminPickSource } from './simin-api.ts'
import { siminZh, type SiminKey } from './simin-locales.ts'
import css from './CreateProjectDialog.module.css'

/** Input submitted only after a name is supplied and folder selection settles. */
export interface CreateProjectInput { name: string; sourcePath?: string }

/**
 * Render project creation using the shared modal and native folder picker.
 * @param props - creation outcome, callbacks, and localized copy.
 * @returns the creation dialog; unmounting cancels an unfinished folder chooser.
 */
export function CreateProjectDialog({ busy, error, onCreate, onClose, t }: {
  busy: boolean
  error: string
  onCreate: (input: CreateProjectInput) => void
  onClose: () => void
  t: PropsLocale<'simin'>['t']
}) {
  const [name, setName] = useState('')
  const [sourcePath, setSourcePath] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [pickerError, setPickerError] = useState('')
  const [memoryOpen, setMemoryOpen] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort() }, [])
  const sourceName = sourcePath?.split(/[\\/]/u).filter(Boolean).at(-1) ?? ''
  const chooseFolder = async (): Promise<void> => {
    if (busy || request.current !== null) return
    const controller = new AbortController()
    request.current = controller
    setPicking(true); setPickerError('')
    try {
      const path = await siminPickSource(controller.signal)
      if (controller.signal.aborted) return
      if (path !== null) {
        setSourcePath(path)
        setName(current => current.trim() ? current : path.split(/[\\/]/u).filter(Boolean).at(-1) ?? '')
      }
    } catch (reason: unknown) {
      if (!controller.signal.aborted) {
        const code = reason instanceof Error ? reason.message : ''
        setPickerError(t(code in siminZh ? code as SiminKey : 'io'))
      }
    } finally {
      if (!controller.signal.aborted) { request.current = null; setPicking(false) }
    }
  }
  const submit = (): void => {
    if (busy || picking || !name.trim()) return
    onCreate({ name: name.trim(), ...(sourcePath === null ? {} : { sourcePath }) })
  }
  return <Modal open headless title={t('createProject')} onClose={busy ? () => {} : onClose} className={css.dialog ?? ''}>
    <header className={css.header}>
      <h2>{t('createProject')}</h2>
      <button type="button" className={css.iconButton} aria-label={t('close')} disabled={busy} onClick={onClose}>
        <IconCloseOutlineRegular size={18} />
      </button>
    </header>
    <div className={css.body}>
      <label className={css.field}>
        <span>{t('projectName')}</span>
        <span className={css.nameInput}>
          <IconFolderCloseRegular size={21} />
          <input data-modal-autofocus value={name} placeholder={t('projectNameExample')} disabled={busy}
            onChange={(event) => { setName(event.target.value) }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); submit() }
            }} />
        </span>
      </label>
      <section className={css.field} aria-label={t('sourceFolder')}>
        <span>{t('sourceFolder')}</span>
        <div className={css.sourcePanel}>
          {sourcePath === null ? <>
            <p>{t('sourceOnComputer')}</p>
            <button type="button" className={css.addButton} disabled={busy || picking} onClick={() => { void chooseFolder() }}>
              <IconFolderCloseRegular size={18} /><IconPlusOutlineRegular size={12} />{t(picking ? 'choosingFolder' : 'addFolder')}
            </button>
          </> : <>
            <div className={css.sourceRow}>
              <IconFolderCloseRegular size={24} />
              <div><strong>{sourceName}</strong><span>{sourcePath}</span></div>
              <Tooltip label={t('removeSourceFolder')} portal>
                <button type="button" className={css.iconButton} aria-label={t('removeSourceFolder')} disabled={busy || picking}
                  onClick={() => { setSourcePath(null); setPickerError('') }}><IconCloseOutlineRegular size={16} /></button>
              </Tooltip>
            </div>
            <button type="button" className={css.addButton} disabled={busy || picking} onClick={() => { void chooseFolder() }}>
              {t(picking ? 'choosingFolder' : 'changeSourceFolder')}
            </button>
          </>}
        </div>
        <p className={css.copyHint}>{t('sourceCopyHint')}</p>
      </section>
      <aside className={css.notice}><IconLightOutlineRegular size={24} /><p>{t('projectPurpose')}</p></aside>
      {(error || pickerError) && <p className={css.error} role="alert">{error || pickerError}</p>}
    </div>
    <footer className={css.footer}>
      <Menu open={memoryOpen} onClose={() => { setMemoryOpen(false) }} portal side="top" autoFocus
        anchor={<button type="button" className={css.memoryButton} aria-haspopup="menu" aria-expanded={memoryOpen}
          onClick={() => { setMemoryOpen(!memoryOpen) }}>{t('defaultMemory')}<IconChevronDownOutlineRegular size={13} /></button>}
        selectedId="default" items={[{ id: 'default', label: <span className={css.memoryInfo}>
          <strong>{t('defaultMemory')}</strong><span>{t('defaultMemoryHint')}</span>
        </span> }]} onSelect={() => { setMemoryOpen(false) }} />
      <button type="button" className={css.createButton} disabled={busy || picking || !name.trim()} onClick={submit}>
        {t(busy ? 'creatingProject' : 'createProject')}
      </button>
    </footer>
  </Modal>
}
