"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Zap, Play, Pause, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
  _count: { logs: number };
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

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "Lead Created",
  stage_changed: "Stage Changed",
  task_overdue: "Task Overdue",
  stuck_lead: "Stuck Lead",
  new_user: "New User",
};

export default function AutomationRulesManager({
  token,
  toast,
}: {
  token: string;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/automations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.rules) setRules(data.rules);
    } catch {
      toast("Failed to load automations", "error");
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) fetchRules();
  }, [token, fetchRules]);

  const toggleRule = useCallback(
    async (rule: AutomationRule) => {
      setTogglingId(rule.id);
      try {
        const res = await fetch("/api/automations", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
        });
        const data = await res.json();
        if (data.rule) {
          toast(
            `"${rule.name}" ${rule.isActive ? "paused" : "activated"}`,
            "success"
          );
          fetchRules();
        } else {
          toast(data.error || "Failed to update rule", "error");
        }
      } catch {
        toast("Failed to update rule", "error");
      } finally {
        setTogglingId(null);
      }
    },
    [token, toast, fetchRules]
  );

  const activeCount = rules.filter((r) => r.isActive).length;
  const totalRuns = rules.reduce((a, r) => a + r.runCount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-sm text-gray-500">
            Loading automations...
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              Automation Rules
            </CardTitle>
            <div className="flex gap-3 mt-2">
              <Badge
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                {activeCount} Active
              </Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                {totalRuns} Total Runs
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRules}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No automation rules configured</p>
            <p className="text-xs text-gray-300 mt-1">
              Create rules in Settings to automate workflows
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-200 ${
                  rule.isActive
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-gray-200 bg-gray-50/50 opacity-60"
                }`}
              >
                {/* Toggle */}
                <button
                  onClick={() => toggleRule(rule)}
                  disabled={togglingId === rule.id}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${
                    rule.isActive ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                  aria-label={`Toggle ${rule.name}`}
                >
                  {togglingId === rule.id ? (
                    <Loader2 className="w-3 h-3 animate-spin text-white absolute top-1 left-1" />
                  ) : (
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        rule.isActive ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  )}
                </button>

                {/* Rule info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {rule.name}
                    </p>
                    {rule.isActive ? (
                      <Play className="w-3 h-3 text-emerald-500 shrink-0" />
                    ) : (
                      <Pause className="w-3 h-3 text-gray-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Trigger:{" "}
                    {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                  </p>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm font-semibold text-gray-700">
                    {rule.runCount}
                  </p>
                  <p className="text-xs text-gray-400">
                    {rule.lastRunAt ? timeAgo(rule.lastRunAt) : "Never"}
                  </p>
                </div>

                {/* Status badge */}
                <Badge
                  className={`text-[10px] shrink-0 ${
                    rule.isActive
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                >
                  {rule.isActive ? "Active" : "Paused"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
