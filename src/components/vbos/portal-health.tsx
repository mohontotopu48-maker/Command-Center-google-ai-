"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Cpu, Globe, Rocket, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PortalStats {
  userCount: number;
  leadCount: number;
  projectCount: number;
  active: boolean;
}

interface PortalData {
  vbos: PortalStats;
  visual_os: PortalStats;
  nxl: PortalStats;
}

export default function PortalHealthOverview({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, usersRes] = await Promise.all([
        fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const dashData = await dashRes.json();
      const usersData = await usersRes.json();

      const users = usersData.users || [];

      const vbosUsers = users.filter((u: { portal: string }) => u.portal === "vbos").length;
      const vosUsers = users.filter((u: { portal: string }) => u.portal === "visual_os").length;
      const nxlUsers = users.filter((u: { portal: string }) => u.portal === "nxl").length;

      const totalLeads = Object.values(dashData.leads?.byStage || {}).reduce(
        (a: number, b: number) => a + b,
        0
      ) as number;

      const projectCount = dashData.projects?.summary?.length || 0;

      setData({
        vbos: { userCount: vbosUsers, leadCount: 0, projectCount: 0, active: true },
        visual_os: {
          userCount: vosUsers,
          leadCount: totalLeads,
          projectCount: 0,
          active: true,
        },
        nxl: {
          userCount: nxlUsers,
          leadCount: totalLeads,
          projectCount,
          active: true,
        },
      });
    } catch {
      // Fallback data on error
      setData({
        vbos: { userCount: 2, leadCount: 0, projectCount: 0, active: true },
        visual_os: { userCount: 0, leadCount: 0, projectCount: 0, active: true },
        nxl: { userCount: 0, leadCount: 0, projectCount: 0, active: true },
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  const portals = [
    {
      id: "vbos",
      name: "VBOS",
      subtitle: "Master Admin",
      icon: Cpu,
      gradient: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-700",
      borderColor: "border-emerald-200",
      metrics: [
        { label: "Admins", value: data?.vbos.userCount ?? 0 },
      ],
    },
    {
      id: "visual_os",
      name: "Visual OS Portal",
      subtitle: "CRM & Pipeline",
      icon: Globe,
      gradient: "from-teal-500 to-emerald-600",
      bgLight: "bg-teal-50",
      textColor: "text-teal-700",
      borderColor: "border-teal-200",
      metrics: [
        { label: "Users", value: data?.visual_os.userCount ?? 0 },
        { label: "Leads", value: data?.visual_os.leadCount ?? 0 },
      ],
    },
    {
      id: "nxl",
      name: "NXL Builder",
      subtitle: "Project Management",
      icon: Rocket,
      gradient: "from-rose-500 to-pink-600",
      bgLight: "bg-rose-50",
      textColor: "text-rose-700",
      borderColor: "border-rose-200",
      metrics: [
        { label: "Users", value: data?.nxl.userCount ?? 0 },
        { label: "Projects", value: data?.nxl.projectCount ?? 0 },
      ],
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-sm text-gray-500">Loading portal health...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-600" />
          Portal Health Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {portals.map((portal) => (
            <div
              key={portal.id}
              className={`relative rounded-xl border ${portal.borderColor} p-4 hover:shadow-md transition-shadow duration-200`}
            >
              {/* Status indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>

              {/* Portal icon */}
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${portal.gradient} flex items-center justify-center mb-3`}
              >
                <portal.icon className="w-5 h-5 text-white" />
              </div>

              {/* Portal info */}
              <h3 className="text-sm font-semibold text-gray-900">{portal.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{portal.subtitle}</p>

              {/* Metrics */}
              <div className="flex gap-4">
                {portal.metrics.map((metric) => (
                  <div key={metric.label}>
                    <p className="text-xl font-bold text-gray-900">{metric.value}</p>
                    <p className="text-xs text-gray-500">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
