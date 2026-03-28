import React, { useState } from 'react'

// Input component — Figma node 8107:235155 (02-input-field, Flexible type)
// Monument Design System

export type InputState = 'default' | 'focused' | 'filled' | 'error' | 'disabled'
export type FeedbackType = 'info' | 'error' | 'success'

export interface InputProps {
  label?: string
  value?: string
  placeholder?: string
  state?: InputState
  required?: boolean
  hint?: string
  feedback?: string
  feedbackType?: FeedbackType
  onChange?: (value: string) => void
}

const FEEDBACK_STYLES: Record<FeedbackType, { bg: string; color: string }> = {
  info:    { bg: '#F5F0FF', color: '#7D52F8' },
  error:   { bg: '#FEF1F2', color: '#E02D3C' },
  success: { bg: '#EDFDF8', color: '#08875D' },
}

export const Input: React.FC<InputProps> = ({
  label,
  value: controlledValue,
  placeholder,
  state = 'default',
  required = false,
  hint,
  feedback,
  feedbackType = 'info',
  onChange,
}) => {
  const [internalValue, setInternalValue] = useState('')
  const [focused, setFocused] = useState(false)

  const value = controlledValue ?? internalValue
  const isDisabled = state === 'error' ? false : state === 'disabled'
  const isError = state === 'error'
  const hasValue = value.length > 0
  const isFloated = focused || hasValue || state === 'filled'

  // Border color
  let borderColor = '#E1E6EF'
  let borderWidth = 1
  let labelColor = isFloated ? (isError ? '#E02D3C' : focused ? '#7D52F8' : '#161616') : '#161616'
  if (focused || state === 'focused') { borderColor = '#7D52F8'; borderWidth = 2 }
  if (isError) { borderColor = '#E02D3C'; borderWidth = 1 }
  if (isDisabled) { borderColor = '#E1E6EF'; labelColor = '#A4B1CC' }

  const bg = isDisabled ? '#F1F3F9' : focused ? '#FFFFFF' : state === 'focused' ? '#FFFFFF' : '#FFFFFF'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value)
    onChange?.(e.target.value)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'Inter, sans-serif', width: '100%' }}>
      {/* Input box */}
      <div
        style={{
          position: 'relative',
          height: 40,
          background: bg,
          border: `${borderWidth}px solid ${borderColor}`,
          borderRadius: 8,
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          transition: 'border-color 150ms',
        }}
      >
        {/* Floating label */}
        {label && (
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: isFloated ? 4 : '50%',
              transform: isFloated ? 'none' : 'translateY(-50%)',
              fontSize: isFloated ? 10 : 16,
              fontWeight: 600,
              color: isDisabled ? '#A4B1CC' : labelColor,
              pointerEvents: 'none',
              transition: 'top 150ms, font-size 150ms, color 150ms, transform 150ms',
              lineHeight: '12px',
            }}
          >
            {label}{required && <span style={{ color: isError ? '#E02D3C' : '#7D52F8' }}> *</span>}
          </span>
        )}

        <input
          type="text"
          value={value}
          placeholder={(!label || isFloated) ? placeholder : undefined}
          disabled={isDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={handleChange}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'Inter, sans-serif',
            fontSize: 16,
            fontWeight: 400,
            color: isDisabled ? '#A4B1CC' : '#161616',
            width: '100%',
            paddingTop: label ? 12 : 0,
            lineHeight: '20px',
          }}
        />
      </div>

      {/* Hint text */}
      {hint && !feedback && (
        <span style={{ fontSize: 12, color: '#A4B1CC', paddingLeft: 2 }}>{hint}</span>
      )}

      {/* Feedback banner */}
      {feedback && (
        <div
          style={{
            background: FEEDBACK_STYLES[feedbackType].bg,
            borderRadius: 4,
            padding: 4,
            fontSize: 12,
            color: '#161616',
          }}
        >
          {feedback}
        </div>
      )}
    </div>
  )
}

export default Input
Input.displayName = 'Input'
