"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Sparkles, Zap, Users, Heart, ArrowRight } from "lucide-react";
import Link from "next/link";

// Mock data for featured content
const featuredModels = [
  {
    id: 1,
    name: "DreamScape",
    description: "Cinematic landscape generator trained on nature photography",
    creator: "Alex Chen",
    uses: "12.4K",
    likes: "2.1K",
    tags: ["Landscape", "Photography", "Nature"],
    thumbnail: "#f5f5f5",
  },
  {
    id: 2,
    name: "PortraitPro",
    description: "Professional headshot generator with studio lighting",
    creator: "Sarah Kim",
    uses: "28.9K",
    likes: "4.5K",
    tags: ["Portrait", "Professional", "Studio"],
    thumbnail: "#fafafa",
  },
  {
    id: 3,
    name: "AnimeStyle",
    description: "Transform photos into anime art",
    creator: "Yuki Tanaka",
    uses: "45.2K",
    likes: "8.9K",
    tags: ["Anime", "Art", "Style Transfer"],
    thumbnail: "#f5f5f5",
  },
];

const featuredWorkflows = [
  {
    id: 1,
    name: "Music Video Generator",
    description: "Image → Video → Music → Complete music video",
    creator: "Marcus Johnson",
    uses: "8.7K",
    likes: "1.8K",
    tags: ["Video", "Music", "Creative"],
    thumbnail: "#fafafa",
  },
  {
    id: 2,
    name: "Social Content Pack",
    description: "Generate complete social media content packages",
    creator: "Emma Davis",
    uses: "15.3K",
    likes: "3.2K",
    tags: ["Social Media", "Marketing", "Content"],
    thumbnail: "#f5f5f5",
  },
];

export default function Home() {
  const handleSubmit = (message: { text: string; files: any[] }) => {
    // Demo mode - just log the message
    console.log("Demo submission:", message);
    // In production, this would trigger the AI workflow
  };

  return (
    <div className="relative min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-70">
            <span className="font-semibold text-lg tracking-tight">FromYou</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="font-medium">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="font-medium bg-black text-white hover:bg-neutral-800">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        {/* Hero */}
        <section className="container mx-auto px-6 py-32 md:py-20">
          <div className="mx-auto max-w-4xl space-y-16">
            {/* Value Proposition */}
            <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="font-semibold text-5xl tracking-[-0.02em] md:text-7xl">
                Train AI models
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-neutral-600 md:text-xl">
                Create custom image and video models, build AI workflows, and share your creations.
              </p>
            </div>

            {/* Prompt Input */}
            <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              <div className="rounded-xl border border-neutral-200 bg-white p-2 shadow-lg transition-shadow duration-300 hover:shadow-xl">
                <PromptInput onSubmit={handleSubmit}>
                  <PromptInputBody>
                    <PromptInputTextarea
                      placeholder="Try: 'Train a model on my art style' or 'Create a music video from my photos'"
                      className="min-h-28 border-0 bg-transparent text-base placeholder:text-neutral-400"
                    />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools />
                    <PromptInputSubmit className="bg-black text-white hover:bg-neutral-800" />
                  </PromptInputFooter>
                </PromptInput>
              </div>

              {/* Example prompts */}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="outline" size="sm" className="border-neutral-200 text-neutral-600 text-xs hover:border-black hover:text-black">
                  Train on my photos
                </Button>
                <Button variant="outline" size="sm" className="border-neutral-200 text-neutral-600 text-xs hover:border-black hover:text-black">
                  Create video workflow
                </Button>
                <Button variant="outline" size="sm" className="border-neutral-200 text-neutral-600 text-xs hover:border-black hover:text-black">
                  Generate dataset
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="border-y border-neutral-200 bg-neutral-50">
          <div className="container mx-auto px-6 py-24">
            <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-3">
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <div className="flex size-12 items-center justify-center rounded-full bg-black text-white">
                  <Sparkles className="size-5" />
                </div>
                <h3 className="font-semibold text-lg">Auto Everything</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  AI finds images, captions, and organizes your dataset automatically
                </p>
              </div>
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <div className="flex size-12 items-center justify-center rounded-full bg-black text-white">
                  <Zap className="size-5" />
                </div>
                <h3 className="font-semibold text-lg">GPU-Powered</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  We handle all infrastructure, provisioning, and deployment
                </p>
              </div>
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
                <div className="flex size-12 items-center justify-center rounded-full bg-black text-white">
                  <Users className="size-5" />
                </div>
                <h3 className="font-semibold text-lg">Share & Earn</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  Earn affiliate revenue when others use your models
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Content */}
        <section className="container mx-auto px-6 py-32">
          <div className="mx-auto max-w-6xl space-y-24">
            {/* Trending Models */}
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
              <div className="flex items-end justify-between">
                <div className="space-y-2">
                  <h2 className="font-semibold text-3xl tracking-tight md:text-4xl">Trending Models</h2>
                  <p className="text-neutral-600">Explore what the community is creating</p>
                </div>
                <Button variant="ghost" className="group font-medium text-sm">
                  View All
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {featuredModels.map((model, index) => (
                  <Card
                    key={model.id}
                    className="group cursor-pointer overflow-hidden border-neutral-200 bg-white transition-all duration-300 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${600 + index * 100}ms`, animationDuration: "700ms" }}
                  >
                    <div
                      className="h-48 w-full border-b border-neutral-200 transition-all duration-300 group-hover:h-52"
                      style={{ background: model.thumbnail }}
                    />
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl tracking-tight">{model.name}</CardTitle>
                        <Badge variant="secondary" className="border-neutral-200 bg-neutral-50 text-xs">
                          {model.uses}
                        </Badge>
                      </div>
                      <CardDescription className="text-neutral-600 text-sm leading-relaxed">{model.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {model.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="border-neutral-200 text-neutral-600 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between border-t border-neutral-100 pt-4">
                      <span className="text-neutral-500 text-xs">by {model.creator}</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-neutral-500 text-xs">
                          <Heart className="size-3.5" />
                          {model.likes}
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>

            {/* Popular Workflows */}
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700">
              <div className="flex items-end justify-between">
                <div className="space-y-2">
                  <h2 className="font-semibold text-3xl tracking-tight md:text-4xl">Popular Workflows</h2>
                  <p className="text-neutral-600">AI-powered model combinations</p>
                </div>
                <Button variant="ghost" className="group font-medium text-sm">
                  View All
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                {featuredWorkflows.map((workflow, index) => (
                  <Card
                    key={workflow.id}
                    className="group cursor-pointer overflow-hidden border-neutral-200 bg-white transition-all duration-300 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${800 + index * 100}ms`, animationDuration: "700ms" }}
                  >
                    <div
                      className="h-56 w-full border-b border-neutral-200 transition-all duration-300 group-hover:h-60"
                      style={{ background: workflow.thumbnail }}
                    />
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl tracking-tight">{workflow.name}</CardTitle>
                        <Badge variant="secondary" className="border-neutral-200 bg-neutral-50 text-xs">
                          {workflow.uses}
                        </Badge>
                      </div>
                      <CardDescription className="text-neutral-600 text-sm leading-relaxed">{workflow.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {workflow.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="border-neutral-200 text-neutral-600 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between border-t border-neutral-100 pt-4">
                      <span className="text-neutral-500 text-xs">by {workflow.creator}</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-neutral-500 text-xs">
                          <Heart className="size-3.5" />
                          {workflow.likes}
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-neutral-50 py-16">
        <div className="container mx-auto px-6 text-center text-neutral-500 text-sm">
          <p>&copy; 2025 FromYou. Making AI accessible to everyone.</p>
        </div>
      </footer>
    </div>
  );
}
