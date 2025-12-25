// ============================================
// COMMON UI COMPONENTS
// Reusable components used throughout the app
// ============================================

/**
 * CollapsibleSection - A section that can be expanded/collapsed
 */
const CollapsibleSection = ({ 
    title, 
    icon = null,
    isCollapsed, 
    onToggle, 
    children,
    className = '',
    headerClassName = '',
    contentClassName = '',
    badge = null,
    actions = null
}) => {
    return (
        <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
            <div className={`w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors ${headerClassName}`}>
                {/* Clickable area for collapse/expand */}
                <div 
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={onToggle}
                >
                    {icon && <span className="text-lg">{icon}</span>}
                    <span className="font-semibold text-gray-700">{title}</span>
                    {badge && (
                        <span className="px-2 py-0.5 bg-ancient-purple text-white text-xs rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Actions area - separate from toggle */}
                    {actions && (
                        <div onClick={e => e.stopPropagation()}>
                            {actions}
                        </div>
                    )}
                    {/* Collapse indicator */}
                    <div onClick={onToggle} className="cursor-pointer p-1">
                        <svg 
                            className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>
            
            {!isCollapsed && (
                <div className={`p-4 ${contentClassName}`}>
                    {children}
                </div>
            )}
        </div>
    );
};

/**
 * DismissableTip - A tip that can be dismissed permanently
 */
const DismissableTip = ({ 
    id, 
    children, 
    className = '',
    dismissedTips = {},
    onDismiss 
}) => {
    if (dismissedTips[id]) return null;
    
    return (
        <div className={`relative p-3 bg-[#f7f3ed] border-2 border-[#d4c4a8] rounded-lg ${className}`}>
            <button
                onClick={() => onDismiss && onDismiss(id)}
                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-yellow-600 hover:text-[#6d5d42] hover:bg-yellow-100 rounded-full transition-colors"
                title="Dismiss this tip"
            >
                ✕
            </button>
            <div className="pr-6 text-sm text-[#6d5d42]">{children}</div>
        </div>
    );
};

/**
 * LoadingSpinner - A simple loading indicator
 */
const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };
    
    return (
        <div className={`${sizeClasses[size]} ${className}`}>
            <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
                <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                />
                <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>
        </div>
    );
};

/**
 * ProgressBar - A progress indicator
 */
const ProgressBar = ({ current, total, showLabel = true, className = '' }) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    return (
        <div className={`w-full ${className}`}>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                    className="bg-ancient-purple h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <div className="text-xs text-gray-500 mt-1 text-center">
                    {current} / {total} ({percentage}%)
                </div>
            )}
        </div>
    );
};

/**
 * Modal - A reusable modal wrapper
 */
const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    footer = null
}) => {
    if (!isOpen) return null;
    
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-[95vw]'
    };
    
    const handleOverlayClick = (e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };
    
    return (
        <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleOverlayClick}
        >
            <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
                    {showCloseButton && (
                        <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                        >
                            &times;
                        </button>
                    )}
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
                
                {/* Footer */}
                {footer && (
                    <div className="p-6 pt-4 border-t border-gray-200">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Button - Styled button component
 */
const Button = ({ 
    children, 
    onClick, 
    variant = 'primary', 
    size = 'md',
    disabled = false,
    className = '',
    icon = null,
    ...props
}) => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variantClasses = {
        primary: 'bg-ancient-purple text-white hover:bg-[#4a3d5a] focus:ring-ancient-purple disabled:bg-gray-300',
        secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
        success: 'bg-patina text-white hover:bg-[#5a7d6e] focus:ring-patina disabled:bg-gray-300',
        danger: 'bg-rust text-white hover:bg-[#8a574a] focus:ring-rust disabled:bg-gray-300',
        outline: 'border-2 border-ancient-purple text-ancient-purple hover:bg-ancient-purple hover:text-white focus:ring-ancient-purple disabled:border-gray-300 disabled:text-gray-300',
        ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500 disabled:text-gray-300'
    };
    
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm gap-1.5',
        md: 'px-4 py-2 text-base gap-2',
        lg: 'px-6 py-3 text-lg gap-2.5'
    };
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            {...props}
        >
            {icon && <span>{icon}</span>}
            {children}
        </button>
    );
};

/**
 * ConfidenceBadge - Shows confidence level with color coding
 */
const ConfidenceBadge = ({ confidence, size = 'md' }) => {
    const percentage = Math.round(confidence * 100);
    
    let colorClass = 'bg-rust text-white'; // Low
    if (percentage >= 80) {
        colorClass = 'bg-patina text-white'; // High
    } else if (percentage >= 60) {
        colorClass = 'bg-ochre text-white'; // Medium
    }
    
    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-sm px-2 py-1',
        lg: 'text-base px-3 py-1.5'
    };
    
    return (
        <span className={`${colorClass} ${sizeClasses[size]} rounded font-medium`}>
            {percentage}%
        </span>
    );
};

/**
 * Tooltip - Simple tooltip component
 */
const Tooltip = ({ children, content, position = 'top' }) => {
    const [isVisible, setIsVisible] = React.useState(false);
    
    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };
    
    return (
        <div 
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && content && (
                <div className={`absolute ${positionClasses[position]} z-50`}>
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
};

// Make components globally available
window.CollapsibleSection = CollapsibleSection;
window.DismissableTip = DismissableTip;
window.LoadingSpinner = LoadingSpinner;
window.ProgressBar = ProgressBar;
window.Modal = Modal;
window.Button = Button;
window.ConfidenceBadge = ConfidenceBadge;
window.Tooltip = Tooltip;
