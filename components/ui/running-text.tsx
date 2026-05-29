'use client'

import { useEffect, useRef, useState } from 'react'

interface RunningTextProps {
  text: string
  className?: string
  gap?: number
  minDurationSeconds?: number
}

export function RunningText({
  text,
  className = '',
  gap = 32,
  minDurationSeconds = 8,
}: RunningTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [textWidth, setTextWidth] = useState(0)

  useEffect(() => {
    const updateOverflow = () => {
      const containerWidth = containerRef.current?.clientWidth ?? 0
      const nextTextWidth = textRef.current?.scrollWidth ?? 0

      setTextWidth(nextTextWidth > containerWidth ? nextTextWidth : 0)
    }

    updateOverflow()

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateOverflow)
      : null

    if (containerRef.current && resizeObserver) {
      resizeObserver.observe(containerRef.current)
    }

    if (textRef.current && resizeObserver) {
      resizeObserver.observe(textRef.current)
    }

    window.addEventListener('resize', updateOverflow)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateOverflow)
    }
  }, [text])

  const animationDuration = Math.max(minDurationSeconds, textWidth / 24)

  return (
    <div
      ref={containerRef}
      className={`min-w-0 overflow-hidden whitespace-nowrap ${className}`.trim()}
      title={text}
    >
      {textWidth ? (
        <>
          <div
            className="flex w-max items-center whitespace-nowrap will-change-transform"
            style={{
              animation: `running-text-loop ${animationDuration}s linear infinite`,
              ['--running-text-distance' as string]: `${textWidth + gap}px`,
            }}
          >
            <span ref={textRef} className="shrink-0" style={{ paddingRight: `${gap}px` }}>
              {text}
            </span>
            <span aria-hidden="true" className="shrink-0" style={{ paddingRight: `${gap}px` }}>
              {text}
            </span>
          </div>
          <style jsx>{`
            @keyframes running-text-loop {
              from {
                transform: translateX(0);
              }
              to {
                transform: translateX(calc(-1 * var(--running-text-distance)));
              }
            }
          `}</style>
        </>
      ) : (
        <span ref={textRef} className="block whitespace-nowrap">
          {text}
        </span>
      )}
    </div>
  )
}
