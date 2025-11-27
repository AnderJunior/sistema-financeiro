import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, checked, onChange, disabled, ...props }, ref) => {
    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            {...props}
          />
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => {
              if (!disabled && onChange) {
                const event = {
                  target: { checked: !checked }
                } as React.ChangeEvent<HTMLInputElement>
                onChange(event)
              }
            }}
            className={cn(
              'w-11 h-6 rounded-full transition-colors duration-200 ease-in-out',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              checked ? 'bg-primary-600' : 'bg-gray-300',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && 'cursor-pointer'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full',
                'transition-transform duration-200 ease-in-out',
                checked ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label 
                className="block text-sm font-medium text-gray-900 cursor-pointer"
                onClick={() => {
                  if (!disabled && onChange) {
                    const event = {
                      target: { checked: !checked }
                    } as React.ChangeEvent<HTMLInputElement>
                    onChange(event)
                  }
                }}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Switch.displayName = 'Switch'

