/**
 * 空状态组件
 * 显示空列表或无数据状态
 */

import React from 'react';
import { Package, AlertCircle, Search } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
}

export default function EmptyState({ title, description, icon }: EmptyStateProps): JSX.Element {
  const getIcon = () => {
    switch (icon) {
      case 'Package':
        return <Package size={48} className="text-muted-foreground" />;
      case 'AlertCircle':
        return <AlertCircle size={48} className="text-muted-foreground" />;
      case 'Search':
        return <Search size={48} className="text-muted-foreground" />;
      default:
        return <Package size={48} className="text-muted-foreground" />;
    }
  };

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mb-4 flex justify-center">{getIcon()}</div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
