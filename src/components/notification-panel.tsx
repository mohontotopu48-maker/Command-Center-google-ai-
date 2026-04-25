"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, CheckCheck, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useAppStore } from "@/store/app-store";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationPanelProps {
  token: string;
}

function notifIcon(type: string) {
  switch (type) {
    case "warning":
    case "urgent":
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    case "error":
      return <X className="w-4 h-4 text-red-500 shrink-0" />;
    default:
      return <Info className="w-4 h-4 text-sky-500 shrink-0" />;
  }
}

function timeAgo(d: string) {
  try {
    return formatDistanceToNow(parseISO(d), { addSuffix: true });
  } catch {
    return d;
  }
}

export function NotificationPanel({ token }: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { setUnreadCount: setGlobalUnreadCount } = useAppStore();

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount ?? 0);
        setGlobalUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [token, setGlobalUnreadCount]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setGlobalUnreadCount(Math.max(0, useAppStore.getState().unreadCount - 1));
      } catch {
        // Silently fail
      }
    },
    [token, setGlobalUnreadCount]
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setGlobalUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, [token, setGlobalUnreadCount]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Notifications"
        aria-label="Toggle notifications panel"
      >
        <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-pink-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50"
        >
          <Card className="shadow-xl border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllRead}
                    className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 h-auto px-2 py-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.isRead) markAsRead(n.id);
                      }}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        !n.isRead ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-medium truncate ${
                              !n.isRead
                                ? "text-gray-900 dark:text-gray-100"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
