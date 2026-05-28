import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import fontUrl from './fonts/PixelOperator8.ttf?url'

async function preloadFont() {
  try {
    const font = new FontFace('PixelOperator8', `url(${fontUrl})`)
    const loadedFont = await font.load()
    document.fonts.add(loadedFont)
    await document.fonts.load('16px PixelOperator8')
    await document.fonts.ready
  } catch {
    // render anyway if the font cannot be loaded
  }
}

void preloadFont().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
