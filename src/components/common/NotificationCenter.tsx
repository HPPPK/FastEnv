/**
 * 通知中心组件
 * 显示所有系统通知
 */

import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function NotificationCenter(): JSX.Element {
  const { notifications, removeNotification } = useUIStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'info':
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-md flex-col gap-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`animate-slide-in-up rounded-lg border p-4 shadow-lg ${getBgColor(
            notification.type
          )}`}
        >
          <div className="flex items-start gap-3">
            {getIcon(notification.type)}
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{notification.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
              {notification.action && (
                <button
                  onClick={notification.action.onClick}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  {notification.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
