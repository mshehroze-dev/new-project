import React from 'react';

interface AISectionCardProps {
  title: string;
  description: string;
  footer?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function AISectionCard({ title, description, footer, children, onClick }: AISectionCardProps) {
  if (children) {
    // Full implementation mode with form content
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
        
        <div className="space-y-4">
          {children}
        </div>
        
        {footer && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">{footer}</p>
          </div>
        )}
      </div>
    );
  }

  // Simple card mode for selection
  return (
    <div
      className="bg-white shadow rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>

      <div className="mt-4 flex items-center text-indigo-600">
        <span className="text-sm font-medium">Try it now</span>
        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
