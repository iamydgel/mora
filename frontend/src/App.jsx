import { useEffect, useRef, useState } from 'react'
import gateLogo from './assets/logo/mora-gate-monochrome-encre.svg'

const apiUrl = import.meta.env.VITE_API_URL
const maxTextLength = 1000

function App() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const audioUrlRef = useRef('')

  useEffect(() => () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  const isGenerating = status === 'generating'
  const isTextValid = text.trim().length > 0 && text.length <= maxTextLength
  const agentState = isGenerating
    ? 'generating'
    : status === 'speaking'
      ? 'speaking'
      : status === 'error'
        ? 'error'
        : 'idle'

  async function handleGenerate(event) {
    event.preventDefault()
    if (!isTextValid || isGenerating) return

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = ''
    }
    setAudioUrl('')
    setErrorMessage('')
    setStatus('generating')

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 120_000)

    try {
      const response = await fetch(`${apiUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), voice: 'ff_siwis' }),
        signal: controller.signal,
      })

      if (response.status === 400) {
        const result = await response.json().catch(() => ({}))
        throw new Error(typeof result.detail === 'string'
          ? result.detail
          : 'Vérifiez votre texte puis réessayez.')
      }
      if (!response.ok) {
        throw new Error('La génération audio a échoué. Réessayez.')
      }

      const audioBlob = await response.blob()
      const nextAudioUrl = URL.createObjectURL(audioBlob)
      audioUrlRef.current = nextAudioUrl
      setAudioUrl(nextAudioUrl)
      setStatus('ready')
    } catch (error) {
      if (error.name === 'AbortError') {
        setErrorMessage('La génération a pris trop de temps.')
      } else if (error instanceof TypeError) {
        setErrorMessage('Impossible de joindre l’API. Vérifiez que le serveur tourne sur le port 8000.')
      } else {
        setErrorMessage(error.message || 'Une erreur est survenue. Réessayez.')
      }
      setStatus('error')
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  function handleTextChange(event) {
    const textarea = event.currentTarget
    setText(textarea.value)
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 360)}px`
    textarea.style.overflowY = textarea.scrollHeight > 360 ? 'auto' : 'hidden'
    if (status === 'error') {
      setStatus('idle')
      setErrorMessage('')
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#main" aria-label="MORA, accueil">
          <img className="brand-mark" src={gateLogo} alt="" />
          <span className="brand-name">MORA</span>
        </a>
        <p className="header-description">Transforme du texte en voix.</p>
      </header>

      <main className="main-content" id="main">
        <section className="studio" aria-labelledby="studio-title">
          <div className="studio-heading">
            <h1 className="mora-title" id="studio-title">Votre texte, à voix haute.</h1>
            <p>Écrivez quelques lignes, puis écoutez votre audio.</p>
          </div>

          <form className="generator-form" onSubmit={handleGenerate} aria-busy={isGenerating}>
            <div className="field-heading">
              <label htmlFor="text-input">Votre texte</label>
              <span
                className={`character-count${text.length > maxTextLength ? ' is-over-limit' : ''}`}
                id="text-count"
              >
                {text.length} / {maxTextLength}
              </span>
            </div>
            <textarea
              id="text-input"
              name="text"
              value={text}
              onChange={handleTextChange}
              placeholder="Écrivez ou collez votre texte…"
              rows="9"
              aria-describedby="text-count"
              spellCheck="true"
            />
            <div className="form-footer">
              <p className="voice-note">Voix française · Siwis</p>
              <button
                className="mora-btn mora-btn-accent generate-button"
                type="submit"
                disabled={!isTextValid || isGenerating}
              >
                {isGenerating && <span className="loading-spinner" aria-hidden="true" />}
                {isGenerating ? 'Génération en cours…' : 'Générer'}
              </button>
            </div>
          </form>

          <div className="mora-agent status-line" data-state={agentState} role="status" aria-live="polite" aria-atomic="true">
            <img className="status-mark" src={gateLogo} alt="" />
            <p>
              {isGenerating
                ? 'Génération en cours…'
                : status === 'speaking'
                  ? 'Lecture en cours'
                  : status === 'error'
                    ? 'La génération a rencontré un problème'
                    : audioUrl
                      ? 'Votre audio est prêt'
                      : 'Prêt à générer'}
            </p>
          </div>

          {errorMessage && (
            <p className="error-message" role="alert">{errorMessage}</p>
          )}

          {audioUrl && (
            <section className="audio-result" aria-labelledby="audio-title">
              <div className="result-heading">
                <div>
                  <h2 id="audio-title">Votre audio</h2>
                  <p>Fichier WAV · 24 kHz</p>
                </div>
                <a className="mora-btn mora-btn-primary download-button" href={audioUrl} download="mora.wav">
                  Télécharger le WAV
                </a>
              </div>
              <audio
                controls
                src={audioUrl}
                aria-label="Écouter l’audio généré par MORA"
                preload="metadata"
                onPlay={() => setStatus('speaking')}
                onPause={() => setStatus('ready')}
                onEnded={() => setStatus('ready')}
                onError={() => setErrorMessage('Impossible de lire cet audio. Téléchargez le WAV pour l’ouvrir dans un lecteur.')}
              >
                Votre navigateur ne peut pas lire ce fichier audio.
              </audio>
            </section>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <span>MORA</span>
        <span>Une voix, simplement.</span>
      </footer>
    </div>
  )
}

export default App
