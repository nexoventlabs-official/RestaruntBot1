import { X, CheckCircle, AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';

const Dialog = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info', 
  onConfirm, 
  confirmText = 'OK', 
  cancelText = 'Cancel',
  showCancel = false,
  showInput = false,
  inputValue = '',
  onInputChange,
  inputPlaceholder = '',
  loading = false
}) => {
  if (!isOpen) return null;
  
  const icons = {
    success: <CheckCircle className="w-12 h-12 text-green-500" />,
    error: <AlertCircle className="w-12 h-12 text-red-500" />,
    warning: <AlertTriangle className="w-12 h-12 text-amber-500" />,
    confirm: <AlertTriangle className="w-12 h-12 text-amber-500" />,
    info: <Info className="w-12 h-12 text-blue-500" />
  };

  const confirmButtonStyles = {
    success: 'bg-green-500 hover:bg-green-600 text-white',
    error: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    confirm: 'bg-green-500 hover:bg-green-600 text-white',
    info: 'bg-primary-500 hover:bg-primary-600 text-white'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 !mt-0" style={{ marginTop: 0 }}>
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose} 
          disabled={loading}
          className="absolute top-4 right-4 text-dark-400 hover:text-dark-600 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="flex justify-center mb-4">{icons[type]}</div>
          <h3 className="text-lg font-semibold text-dark-900 mb-2">{title}</h3>
          <p className="text-dark-500 mb-4">{message}</p>
          
          {showInput && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange?.(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full px-4 py-2.5 border border-dark-200 rounded-xl mb-4 focus:border-primary-500 focus:outline-none transition-colors"
              autoFocus
            />
          )}
          
          <div className="flex gap-3 justify-center">
            {showCancel && (
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2.5 bg-dark-100 text-dark-700 rounded-xl font-medium hover:bg-dark-200 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm || onClose}
              disabled={loading}
              className={`px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 ${confirmButtonStyles[type]}`}
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
