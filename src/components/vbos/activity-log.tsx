"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Loader2,
  UserPlus,
  ArrowRight,
  Plus,
  CheckCircle2,
  Star,
  Phone,
  FileText,
  Circle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  portal: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null } | null;
}

function actIcon(type: string) {
  switch (type) {
    case "lead_created":
      return <UserPlus className="w-4 h-4 text-emerald-600" />;
    case "stage_changed":
      return <ArrowRight className="w-4 h-4 text-sky-600" />;
    case "task_created":
      return <Plus className="w-4 h-4 text-fuchsia-600" />;
    case "task_completed":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "hot_lead":
      return <Star className="w-4 h-4 text-rose-500" />;
    case "call_scheduled":
      return <Phone className="w-4 h-4 text-emerald-600" />;
    case "mockup_sent":
      return <FileText className="w-4 h-4 text-cyan-600" />;
    case "note_added":
      return <FileText className="w-4 h-4 text-amber-600" />;
    default:
      return <Circle className="w-4 h-4 text-gray-400" />;
  }
}

function timeAgo(d: string) {
  try {
    const now = new Date().getTime();
    const then = new Date(d).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return d;
  }
}

const PORTAL_TABS = [
  { id: "all", label: "All" },
  { id: "vbos", label: "VBOS" },
  { id: "visual_os", label: "Visual OS" },
  { id: "nxl", label: "NXL" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "lead_created", label: "Lead Created" },
  { value: "stage_changed", label: "Stage Changed" },
  { value: "task_created", label: "Task Created" },
  { value: "task_completed", label: "Task Completed" },
  { value: "hot_lead", label: "Hot Lead" },
  { value: "call_scheduled", label: "Call Scheduled" },
  { value: "mockup_sent", label: "Mockup Sent" },
  { value: "note_added", label: "Note Added" },
  { value: "user_created", label: "User Created" },
  { value: "system", label: "System" },
  { value: "automation", label: "Automation" },
];

export default function ActivityLogViewer({
  token,
}: {
  token: string;
}) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalFilter, setPortalFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");

  const fetchActivities = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (portalFilter !== "all") params.set("portal", portalFilter);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/activities?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.activities) setActivities(data.activities);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [token, portalFilter, typeFilter]);

  useEffect(() => {
    if (token) fetchActivities();
  }, [token, fetchActivities]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Activity Log
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {/* Portal filter tabs */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {PORTAL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setPortalFilter(tab.id);
                    setLoading(true);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    portalFilter === tab.id
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Type filter dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setLoading(true);
              }}
              className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchActivities();
              }}
              className="h-7 px-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            <span className="ml-2 text-sm text-gray-500">
              Loading activities...
            </span>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No activities found</p>
            <p className="text-xs text-gray-300 mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="space-y-0 max-h-96 overflow-y-auto">
            {activities.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded px-1 transition-colors"
              >
                {/* Icon */}
                <div className="mt-0.5 shrink-0">{actIcon(item.type)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">
                    {item.message}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.user && (
                      <span className="text-xs text-gray-500 font-medium">
                        {item.user.name}
                      </span>
                    )}
                    {item.portal && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {item.portal === "visual_os"
                          ? "Visual OS"
                          : item.portal === "nxl"
                          ? "NXL"
                          : item.portal.toUpperCase()}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
