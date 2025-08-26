interface FormCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormCard({ title, children, className = '' }: FormCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
} 