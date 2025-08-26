interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export default function LoadingSpinner({ size = 'medium', color = '#22A699' }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`animate-spin rounded-full border-2 border-gray-200 ${sizeClasses[size]}`}
        style={{ borderTopColor: color }}
      />
    </div>
  );
} 