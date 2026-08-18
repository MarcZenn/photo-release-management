import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import SignaturePadLib from 'signature_pad'

export interface SignaturePadHandle {
  clear: () => void
  isEmpty: () => boolean
  toDataUrl: () => string
}

interface SignaturePadProps {
  onStrokeEnd?: () => void
}

// Thin wrapper around signature_pad (canvas-based, touch-optimized out of
// the box). Sized once on mount to the container's rendered size, scaled
// for devicePixelRatio so strokes stay crisp on mobile screens.
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ onStrokeEnd }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const padRef = useRef<SignaturePadLib | null>(null)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)

      const pad = new SignaturePadLib(canvas)
      padRef.current = pad

      const handleEndStroke = () => onStrokeEnd?.()
      pad.addEventListener('endStroke', handleEndStroke)

      return () => {
        pad.removeEventListener('endStroke', handleEndStroke)
        padRef.current = null
      }
    }, [onStrokeEnd])

    useImperativeHandle(ref, () => ({
      clear: () => padRef.current?.clear(),
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      toDataUrl: () => padRef.current?.toDataURL('image/png') ?? '',
    }))

    return (
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '160px',
          touchAction: 'none',
          border: '1px solid #999',
          borderRadius: 4,
          backgroundColor: '#fff',
        }}
      />
    )
  },
)
