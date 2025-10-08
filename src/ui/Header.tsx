import React from 'react';

export const Header = React.memo(() => {
  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 py-3">
      <h1 className="text-lg font-bold text-gray-900 text-left">
        Разметка дефектов сварных соединений согласно ГОСТ 7512-82
      </h1>
    </header>
  );
});