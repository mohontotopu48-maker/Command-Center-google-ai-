"use client";

import {
  Bot,
  Brain,
  Search,
  Image,
  Video,
  Mic,
  FileText,
  Presentation,
  BarChart3,
  Globe,
  Shield,
  Zap,
  ArrowRight,
  Activity,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const aiSkills = [
  { icon: Brain, name: "LLM Chat", desc: "Intelligent conversational AI", color: "text-emerald-600" },
  { icon: Bot, name: "Vision AI", desc: "Image & document understanding", color: "text-violet-600" },
  { icon: Image, name: "Image Gen", desc: "AI-powered image creation", color: "text-pink-600" },
  { icon: Video, name: "Video Gen", desc: "Text-to-video generation", color: "text-orange-600" },
  { icon: Mic, name: "Speech to Text", desc: "Audio transcription (ASR)", color: "text-cyan-600" },
  { icon: Mic, name: "Text to Speech", desc: "Natural voice synthesis", color: "text-blue-600" },
];

const productivityTools = [
  { icon: Search, name: "Web Search", desc: "Real-time web information retrieval", color: "text-amber-600" },
  { icon: Globe, name: "Web Reader", desc: "Extract content from web pages", color: "text-teal-600" },
  { icon: FileText, name: "Documents", desc: "Create & edit Word, PDF, Excel", color: "text-red-600" },
  { icon: Presentation, name: "Presentations", desc: "Build professional slide decks", color: "text-rose-600" },
  { icon: BarChart3, name: "Data & Charts", desc: "Visualize data with charts & dashboards", color: "text-green-600" },
  { icon: Shield, name: "Finance API", desc: "Real-time market data & analysis", color: "text-yellow-600" },
];

const stats = [
  { label: "AI Skills", value: "6+", icon: Sparkles },
  { label: "Productivity Tools", value: "6+", icon: Zap },
  { label: "Capabilities", value: "20+", icon: Layers },
  { label: "Uptime", value: "99.9%", icon: Activity },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Command Center</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Google AI Powered</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden sm:flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Online
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                v1.0
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hero */}
        <section className="text-center mb-10">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> AI-Powered Platform
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Your Intelligent
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              {" "}Command Center
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Harness the power of Google AI with a comprehensive suite of tools for content creation,
            data analysis, communication, and automation — all in one unified dashboard.
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-10">
          {stats.map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent className="p-4 sm:p-6">
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* AI Skills */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-emerald-600" />
            <h3 className="text-xl font-bold">AI Skills</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiSkills.map((skill) => (
              <Card
                key={skill.name}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <skill.icon className={`w-5 h-5 ${skill.color}`} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardTitle className="text-base mt-3">{skill.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{skill.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-8" />

        {/* Productivity Tools */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-600" />
            <h3 className="text-xl font-bold">Productivity Tools</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productivityTools.map((tool) => (
              <Card
                key={tool.name}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <tool.icon className={`w-5 h-5 ${tool.color}`} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardTitle className="text-base mt-3">{tool.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{tool.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-8" />

        {/* CTA */}
        <section className="text-center py-8">
          <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200/50">
            <CardContent className="p-8 sm:p-12">
              <h3 className="text-2xl sm:text-3xl font-bold mb-3">Ready to Get Started?</h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Start building with powerful AI capabilities and productivity tools integrated into your workflow.
              </p>
              <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8">
                <Sparkles className="w-4 h-4 mr-2" />
                Explore Command Center
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-md mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium">Command Center</span>
              <Badge variant="outline" className="text-[10px]">Google AI</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Visual Digital Media. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
