import React from 'react';

export interface ModuleHomeProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  children?: React.ReactNode;
}

export function ModuleHome({ title, description, icon: Icon, children }: ModuleHomeProps) {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-4">
          {Icon && (
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md mb-3">
              <Icon className="h-8 w-8" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default ModuleHome;
