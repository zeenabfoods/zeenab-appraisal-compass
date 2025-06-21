
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Eye, User, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';
import { formatDistanceToNow } from 'date-fns';

export function NotificationCenter() {
  const { toast } = useToast();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotificationSystem();

  const handleMarkAllAsRead = async () => {
    const result = await markAllAsRead();
    if (result.success) {
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 border rounded-lg ${
                notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-sm">{notification.title}</h4>
                    {!notification.is_read && (
                      <Badge variant="default" className="text-xs">New</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">
                    {notification.message}
                  </p>

                  {notification.employee && (
                    <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
                      <User className="h-3 w-3" />
                      <span>
                        {notification.employee.first_name} {notification.employee.last_name}
                      </span>
                      {notification.employee.position && (
                        <>
                          <span>•</span>
                          <span>{notification.employee.position}</span>
                        </>
                      )}
                      {notification.employee.department && (
                        <>
                          <span>•</span>
                          <span>{notification.employee.department.name}</span>
                        </>
                      )}
                    </div>
                  )}

                  {notification.related_question_ids && (
                    <div className="text-xs text-gray-600 mb-2">
                      <span className="font-medium">
                        {notification.related_question_ids.length} question(s) assigned
                      </span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
