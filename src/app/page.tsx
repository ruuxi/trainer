"use client";

import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Users, Heart, ArrowRight, Upload, Check, Loader2, Rocket } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import SignInDialog from "@/components/auth/SignInDialog";

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
  const currentUser = useQuery(api.auth.getCurrentUser);
  const isSignedIn = Boolean(currentUser);

  const createDataset = useMutation(api.datasets.create);
  const generateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const syncMetadata = useMutation(api.r2.syncMetadata);
  const startTrainingJob = useAction(api.jobs.startQwenImageEditJob);
  const syncJobsAction = useAction(api.jobs.syncJobsForDataset);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [activeDatasetId, setActiveDatasetId] = useState<Id<"datasets"> | null>(null);
  const [activeDatasetName, setActiveDatasetName] = useState<string | null>(null);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [isSyncingJobs, setIsSyncingJobs] = useState(false);
  const [jobToast, setJobToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const datasetJobs = useQuery(
    api.jobs_helpers.listJobsForDataset,
    activeDatasetId ? { datasetId: activeDatasetId } : "skip",
  );
  const datasetJobList = Array.isArray(datasetJobs) ? datasetJobs : [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const datasetCreationPromise = useRef<Promise<{ datasetId: Id<"datasets">; datasetName: string }> | null>(null);

  const ensureDataset = useCallback(async () => {
    if (activeDatasetId) {
      return {
        datasetId: activeDatasetId,
        datasetName: activeDatasetName ?? "Untitled dataset",
      };
    }

    if (!datasetCreationPromise.current) {
      const datasetName = `Quick Dataset ${new Date().toLocaleString()}`;
      datasetCreationPromise.current = createDataset({ name: datasetName })
        .then(({ datasetId }) => {
          setActiveDatasetId(datasetId);
          setActiveDatasetName(datasetName);
          datasetCreationPromise.current = null;
          return { datasetId, datasetName };
        })
        .catch((error) => {
          datasetCreationPromise.current = null;
          throw error;
        });
    }

    return datasetCreationPromise.current!;
  }, [activeDatasetId, activeDatasetName, createDataset]);

  const handleFileSelection = useCallback(
    async (files: FileList | File[]) => {
      console.log("handleFileSelection called with", files?.length, "files");
      if (!isSignedIn) {
        setShowSignInDialog(true);
        return;
      }

      try {
        console.log("Ensuring dataset...");
        const datasetInfo = await ensureDataset();
        console.log("Dataset ensured:", datasetInfo);
      } catch (error) {
        console.error("Dataset creation error:", error);
        setUploadMessage("Failed to create dataset. Please try again.");
        return;
      }

      const fileArray = Array.from(files);
      console.log("Files before filter:", fileArray.map(f => ({ name: f.name, type: f.type, size: f.size })));
      const incoming = fileArray.filter((file) =>
        file.type ? file.type.startsWith("image/") : true,
      );
      console.log("Filtered to", incoming.length, "image files");
      if (!incoming.length) {
        return;
      }
      setSelectedFiles((prev) => {
        const next = [...prev];
        incoming.forEach((file) => {
          const exists = next.some(
            (current) =>
              current.name === file.name &&
              current.size === file.size &&
              current.lastModified === file.lastModified,
          );
          if (!exists) {
            next.push(file);
          }
        });
        console.log("Updated selectedFiles, new count:", next.length);
        return next;
      });
    },
    [ensureDataset, isSignedIn],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (!isSignedIn) {
        setShowSignInDialog(true);
        return;
      }
      if (event.dataTransfer?.files?.length) {
        void handleFileSelection(event.dataTransfer.files);
      }
    },
    [handleFileSelection, isSignedIn],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClickDropArea = useCallback(() => {
    if (!isSignedIn) {
      setShowSignInDialog(true);
      return;
    }
    fileInputRef.current?.click();
  }, [isSignedIn]);

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files?.length) {
        return;
      }
      if (!isSignedIn) {
        setShowSignInDialog(true);
        event.target.value = "";
        return;
      }
      // Convert FileList to array immediately before clearing input
      const fileArray = Array.from(files);
      event.target.value = "";
      
      handleFileSelection(fileArray).catch((error) => {
        console.error("File selection error:", error);
        setUploadMessage("Failed to select files. Please try again.");
      });
    },
    [handleFileSelection, isSignedIn],
  );

  const handleUploadButtonClick = useCallback(() => {
    if (!isSignedIn) {
      setShowSignInDialog(true);
      return;
    }
    fileInputRef.current?.click();
  }, [isSignedIn]);

  const handleSubmitUpload = useCallback(async () => {
    if (!isSignedIn) {
      setShowSignInDialog(true);
      return;
    }
    if (!selectedFiles.length) {
      return;
    }
    setIsUploading(true);
    setUploadMessage(null);
    try {
      const datasetInfo = await ensureDataset();
      if (!datasetInfo) {
        throw new Error("Dataset not available");
      }
      await Promise.all(
        selectedFiles.map(async (file) => {
          const { url, key } = await generateUploadUrl({
            datasetId: datasetInfo.datasetId,
          });
          const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!response.ok) {
            throw new Error(`Failed to upload image: ${response.statusText}`);
          }
          await syncMetadata({ key });
        }),
      );
      setSelectedFiles([]);
      setUploadMessage(
        datasetInfo.datasetName
          ? `Upload complete! Saved to ${datasetInfo.datasetName}.`
          : "Upload complete! Your dataset is ready.",
      );
    } catch (error) {
      console.error(error);
      setUploadMessage("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [
    ensureDataset,
    generateUploadUrl,
    isSignedIn,
    selectedFiles,
    syncMetadata,
  ]);

  const handleGenerateDatasetClick = useCallback(() => {
    if (!isSignedIn) {
      setShowSignInDialog(true);
    }
  }, [isSignedIn]);

  const handleStartTrainingJob = useCallback(async () => {
    if (!isSignedIn) {
      setShowSignInDialog(true);
      return;
    }
    setJobToast(null);
    setIsStartingJob(true);
    try {
      const datasetInfo = await ensureDataset();
      const result = await startTrainingJob({
        datasetId: datasetInfo.datasetId,
      });
      setJobToast({
        type: "success",
        message: `Training started! RunPod job: ${result.runpodJobId}`,
      });
    } catch (error) {
      console.error(error);
      setJobToast({
        type: "error",
        message: "Failed to queue training job. Check dataset uploads and try again.",
      });
    } finally {
      setIsStartingJob(false);
    }
  }, [ensureDataset, isSignedIn, setShowSignInDialog, startTrainingJob]);

  const handleSyncJobs = useCallback(async () => {
    if (!isSignedIn || !activeDatasetId) {
      if (!isSignedIn) {
        setShowSignInDialog(true);
      }
      return;
    }
    setIsSyncingJobs(true);
    try {
      await syncJobsAction({ datasetId: activeDatasetId });
    } catch (error) {
      console.error(error);
      setJobToast({
        type: "error",
        message: "Unable to refresh job status right now.",
      });
    } finally {
      setIsSyncingJobs(false);
    }
  }, [activeDatasetId, isSignedIn, setShowSignInDialog, syncJobsAction]);

  const selectedFilesPreview = useMemo(() => {
    if (!selectedFiles.length) {
      return "";
    }
    const names = selectedFiles.map((file) => file.name);
    if (names.length <= 3) {
      return names.join(", ");
    }
    return `${names.slice(0, 3).join(", ")} + ${names.length - 3} more`;
  }, [selectedFiles]);

  const selectedFilesSizeLabel = useMemo(() => {
    if (!selectedFiles.length) {
      return "";
    }
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB total`;
  }, [selectedFiles]);

  return (
    <div className="relative min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-70">
            <span className="font-semibold text-lg tracking-tight">GoModel</span>
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
          <div className="mx-auto max-w-5xl space-y-12">
            {/* Value Proposition */}
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Badge className="mx-auto w-fit border-neutral-200 bg-neutral-50 text-neutral-600 text-xs">
                Image Generation Training
              </Badge>
              <h1 className="font-semibold text-5xl tracking-[-0.02em] md:text-7xl">
                Train custom image models
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-neutral-600 md:text-xl">
                Create personalized AI image models in minutes. Upload your images or let AI build your dataset.
              </p>
            </div>

            {/* Two Path Options */}
            <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              {/* Option 1: Upload Images */}
              <Card className="group relative cursor-pointer overflow-hidden border-2 border-neutral-200 bg-white transition-all duration-300 hover:border-black hover:shadow-2xl">
                <CardHeader className="space-y-4 pb-8">
                  <div className="flex size-14 items-center justify-center rounded-full bg-black text-white transition-transform group-hover:scale-110">
                    <Upload className="size-6" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl tracking-tight">Upload Your Images</CardTitle>
                    <CardDescription className="text-neutral-600 text-sm leading-relaxed">
                      Have your own photos? Upload them with captions or let AI generate them automatically.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-neutral-600 text-sm">
                      <div className="flex size-5 items-center justify-center rounded-full bg-neutral-100">
                        <Check className="size-3" />
                      </div>
                      <span>Support for JPG, PNG, WebP</span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-600 text-sm">
                      <div className="flex size-5 items-center justify-center rounded-full bg-neutral-100">
                        <Check className="size-3" />
                      </div>
                      <span>Auto-caption generation</span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-600 text-sm">
                      <div className="flex size-5 items-center justify-center rounded-full bg-neutral-100">
                        <Check className="size-3" />
                      </div>
                      <span>Manual caption editing</span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl border-2 border-dashed bg-neutral-50 p-6 text-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black",
                      isDragging ? "border-black bg-white" : "border-neutral-200",
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={handleClickDropArea}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleClickDropArea();
                      }
                    }}
                  >
                    <p className="font-medium text-sm text-neutral-900">
                      Drag & drop images or click to browse
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      JPG, PNG, or WebP up to 25MB each
                    </p>
                    {activeDatasetName && (
                      <p className="mt-2 text-xs text-neutral-500">
                        Uploading to{" "}
                        <span className="font-semibold text-neutral-900">
                          {activeDatasetName}
                        </span>
                      </p>
                    )}
                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-1 text-xs text-neutral-600">
                        <p className="font-semibold">
                          {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} selected
                        </p>
                        <p className="truncate">{selectedFilesPreview}</p>
                        <p className="text-neutral-500">{selectedFilesSizeLabel}</p>
                      </div>
                    )}
                    {!isSignedIn && (
                      <p className="mt-4 text-xs font-medium text-rose-500">
                        Sign in to upload your training data.
                      </p>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="sr-only"
                    onChange={handleFileInputChange}
                  />
                  {uploadMessage && (
                    <div className="rounded-lg border border-neutral-200 bg-white/80 px-4 py-2 text-xs text-neutral-600">
                      {uploadMessage}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-6">
                  <Button
                    className="w-full bg-black text-white hover:bg-neutral-800 group-hover:scale-105 transition-transform"
                    type="button"
                    onClick={handleUploadButtonClick}
                  >
                    {selectedFiles.length ? "Add More Images" : "Upload Images"}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                  {selectedFiles.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-neutral-300 text-sm font-semibold"
                      disabled={isUploading}
                      onClick={handleSubmitUpload}
                    >
                      {isUploading && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Submit
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full border-neutral-300 text-sm font-semibold"
                    disabled={isStartingJob || !activeDatasetId}
                    onClick={handleStartTrainingJob}
                  >
                    {isStartingJob && <Loader2 className="mr-2 size-4 animate-spin" />}
                    <Rocket className="mr-2 size-4" />
                    Train Qwen Image Edit 2509
                  </Button>
                </CardFooter>
                {(jobToast || datasetJobList.length > 0) && (
                  <div className="mx-6 mb-6 mt-2 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">
                    {jobToast && (
                      <p className={jobToast.type === "success" ? "text-emerald-600" : "text-rose-600"}>
                        {jobToast.message}
                      </p>
                    )}
                    {datasetJobList.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-neutral-900">Recent jobs</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            onClick={handleSyncJobs}
                            disabled={isSyncingJobs}
                          >
                            {isSyncingJobs && <Loader2 className="mr-1 size-3 animate-spin" />}
                            Refresh
                          </Button>
                        </div>
                        <ul className="space-y-1">
                          {datasetJobList.map((job) => (
                            <li key={job._id} className="flex items-center justify-between text-neutral-700">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold">
                                  {job.aiToolkitJobName ?? "Untitled job"}
                                </p>
                                <p className="text-[11px] text-neutral-500">
                                  {job.samplePaths?.length
                                    ? `${job.samplePaths.length} samples`
                                    : "No samples yet"}
                                  {" · "}
                                  {job.checkpointPaths?.length
                                    ? `${job.checkpointPaths.length} checkpoints`
                                    : "No checkpoints"}
                                </p>
                              </div>
                              <span className="ml-2 whitespace-nowrap text-[11px] uppercase tracking-wide text-neutral-500">
                                {job.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {/* Popular badge */}
                <div className="absolute top-4 right-4">
                  <Badge className="border-black bg-black text-white text-xs">
                    Most Popular
                  </Badge>
                </div>
              </Card>

              {/* Option 2: AI-Generated Dataset */}
              <Card className="group relative cursor-pointer overflow-hidden border-2 border-neutral-200 bg-white transition-all duration-300 hover:border-black hover:shadow-2xl">
                <CardHeader className="space-y-4 pb-8">
                  <div className="flex size-14 items-center justify-center rounded-full bg-black text-white transition-transform group-hover:scale-110">
                    <Sparkles className="size-6" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl tracking-tight">AI-Powered Dataset</CardTitle>
                    <CardDescription className="text-neutral-600 text-sm leading-relaxed">
                      Let AI find and curate the perfect training dataset based on your description.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-neutral-600 text-sm">
                      <div className="flex size-5 items-center justify-center rounded-full bg-neutral-100">
                        <Check className="size-3" />
                      </div>
                      <span>AI image sourcing</span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-600 text-sm">
                      <div className="flex size-5 items-center justify-center rounded-full bg-neutral-100">
                        <Check className="size-3" />
                      </div>
                      <span>Auto-captioning included</span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-600 text-sm">
                      <div className="flex size-5 items-center justify-center rounded-full bg-neutral-100">
                        <Check className="size-3" />
                      </div>
                      <span>Quality filtering</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-6">
                  <Button
                    className="w-full bg-black text-white hover:bg-neutral-800 group-hover:scale-105 transition-transform"
                    type="button"
                    onClick={handleGenerateDatasetClick}
                  >
                    Generate Dataset
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </CardFooter>
                {/* New badge */}
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="border-neutral-200 bg-white text-neutral-600 text-xs">
                    AI-Powered
                  </Badge>
                </div>
              </Card>
            </div>

            {/* Quick info */}
            <div className="mx-auto max-w-2xl text-center text-neutral-500 text-sm animate-in fade-in duration-700 delay-300">
              <p>
                Both options include automatic optimization and GPU-powered training.
                <Link href="/pricing" className="ml-1 text-black underline-offset-4 hover:underline">
                  See pricing
                </Link>
              </p>
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
          <p>&copy; 2025 GoModel. Making AI accessible to everyone.</p>
        </div>
      </footer>
      <SignInDialog open={showSignInDialog} onOpenChange={setShowSignInDialog} />
    </div>
  );
}
