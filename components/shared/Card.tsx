import React from 'react';

interface CardProps {
  title?: string; // Made title optional
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      )}
      <div className={title ? "p-4 sm:p-6" : ""}>
        {children}
      </div>
    </div>
  );
};

export default Card;