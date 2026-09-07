import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'pink' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#ffd23f] hover:bg-[#e6bd35] text-black font-comic tracking-wider shadow-comic-sm border-2 border-black comic-btn-tactile',
  secondary:
    'bg-[#191924] hover:bg-[#20202e] text-white border-2 border-[#262634] shadow-comic-sm comic-btn-tactile',
  pink:
    'bg-[#ff2e63] hover:bg-[#e62453] text-white font-comic tracking-wider shadow-comic-sm border-2 border-black comic-btn-tactile',
  ghost:
    'bg-transparent hover:bg-[#181822] text-text-secondary hover:text-white border border-transparent',
  danger:
    'bg-red-600/15 hover:bg-red-600/25 text-red-400 border-2 border-red-500/30 shadow-sm',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-xl',
  lg: 'px-5 py-2.5 text-base gap-2.5 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-medium transition-all duration-150 outline-none cursor-pointer select-none uppercase',
        variantClasses[variant],
        sizeClasses[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
