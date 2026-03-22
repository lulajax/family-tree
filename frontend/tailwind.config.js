/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      // 自定义颜色
      colors: {
        // 主题色
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // 性别色
        gender: {
          male: '#3b82f6',
          female: '#ec4899',
          unknown: '#6b7280',
        },
        // 代际色
        generation: {
          1: '#ef4444',
          2: '#f97316',
          3: '#eab308',
          4: '#22c55e',
          5: '#06b6d4',
          6: '#3b82f6',
          7: '#8b5cf6',
          8: '#a855f7',
        },
        // 参考点色
        reference: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
        // 家族色
        family: {
          paternal: '#3b82f6',
          maternal: '#ec4899',
        },
      },
      
      // 自定义字体
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        serif: [
          'Noto Serif SC',
          'Georgia',
          'Cambria',
          'Times New Roman',
          'Times',
          'serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      
      // 自定义间距
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // 自定义断点
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        // 自定义断点
        'mobile': { 'max': '767px' },
        'tablet': { 'min': '768px', 'max': '1279px' },
        'desktop': { 'min': '1280px' },
      },
      
      // 自定义动画
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
      },
      
      // 自定义过渡
      transitionDuration: {
        '0': '0ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      
      // 自定义阴影
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'drawer': '0 -4px 20px rgba(0, 0, 0, 0.15)',
        'sidebar': '4px 0 20px rgba(0, 0, 0, 0.1)',
        'tree-node': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'tree-node-hover': '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      
      // 自定义圆角
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      
      // 自定义z-index
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      
      // 自定义高度
      height: {
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      
      // 自定义宽度
      width: {
        'sidebar': '16rem',
        'sidebar-collapsed': '4rem',
        'drawer': '24rem',
      },
      
      // 自定义最大宽度
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      
      // 自定义最小宽度
      minWidth: {
        'tree-node': '160px',
      },
      
      // 自定义字体大小
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      
      // 自定义行高
      lineHeight: {
        'tighter': '1.1',
      },
      
      // 自定义光标
      cursor: {
        'grab': 'grab',
        'grabbing': 'grabbing',
      },
    },
  },
  
  // 插件
  plugins: [
    // 表单插件
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    
    // 自定义插件
    function({ addUtilities, addComponents, theme }) {
      // 添加自定义工具类
      addUtilities({
        '.tap-highlight-transparent': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.gpu-accelerate': {
          'transform': 'translateZ(0)',
          'will-change': 'transform',
        },
      });
      
      // 添加自定义组件
      addComponents({
        '.tree-node': {
          padding: theme('spacing.3'),
          borderRadius: theme('borderRadius.lg'),
          backgroundColor: theme('colors.white'),
          boxShadow: theme('boxShadow.card'),
          transition: 'all 200ms ease-out',
          '&:hover': {
            boxShadow: theme('boxShadow.card-hover'),
            transform: 'translateY(-2px)',
          },
        },
        '.mobile-card': {
          padding: theme('spacing.4'),
          borderRadius: theme('borderRadius.xl'),
          backgroundColor: theme('colors.white'),
          boxShadow: theme('boxShadow.sm'),
        },
        '.drawer': {
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          backgroundColor: theme('colors.white'),
          borderTopLeftRadius: theme('borderRadius.2xl'),
          borderTopRightRadius: theme('borderRadius.2xl'),
          boxShadow: theme('boxShadow.drawer'),
        },
      });
    },
  ],
  
  // 安全列表
  safelist: [
    'bg-blue-500',
    'bg-pink-500',
    'bg-gray-500',
    'bg-amber-500',
    'text-blue-600',
    'text-pink-600',
    'text-gray-600',
    'text-amber-600',
    'border-blue-500',
    'border-pink-500',
    'border-gray-500',
    'border-amber-500',
  ],
};
