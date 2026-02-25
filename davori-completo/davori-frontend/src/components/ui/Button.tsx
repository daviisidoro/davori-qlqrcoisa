// src/components/ui/Button.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 disabled:opacity-60 disabled:pointer-events-none',
          {
            'bg-accent hover:bg-accent-dark text-white hover:shadow-[0_6px_20px_rgba(232,64,28,0.3)] hover:-translate-y-px active:translate-y-0': variant === 'primary',
            'border border-stone-300 hover:border-stone-500 text-stone-600 hover:text-ink bg-transparent': variant === 'outline',
            'text-stone-500 hover:text-ink hover:bg-stone-100 bg-transparent': variant === 'ghost',
            'bg-red-500 hover:bg-red-600 text-white': variant === 'danger',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-5 py-2.5 text-[15px]': size === 'md',
            'px-6 py-3.5 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Aguarde...
          </span>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
