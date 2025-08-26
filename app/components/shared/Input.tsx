interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'textarea' | 'date';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  rows?: number;
  error?: string;
}

export default function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  label,
  required = false,
  rows = 4,
  error
}: InputProps) {
  const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed";
  const errorClasses = error ? "border-red-500" : "border-gray-300";

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          className={`${baseClasses} ${errorClasses} resize-vertical`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`${baseClasses} ${errorClasses}`}
        />
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 