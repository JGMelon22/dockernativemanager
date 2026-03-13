"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getImages, deleteImage, pullImage, Image } from "@/lib/docker";
import {
  Table,
  TableBody,
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Trash2, 
  Search, 
  RotateCcw,
  HardDrive
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/utils/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

const Images = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [search, setSearch] = useState("");
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullImageUrl, setPullImageUrl] = useState("");
  const [showPullDialog, setShowPullDialog] = useState(false);

  const refreshImages = async () => {
    setIsRefreshing(true);
    try {
      const data = await getImages();
      setImages(data);
    } catch (err) {
      showError("Failed to fetch images.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshImages();
  }, []);

  const handleDelete = async (id: string, repo: string) => {
    try {
      await deleteImage(id);
      showSuccess(`Image ${repo} deleted`);
      refreshImages();
    } catch (err) {
      showError(`Error deleting image ${repo}`);
    }
  };

  const handlePull = async () => {
    if (!pullImageUrl) return;
    setIsPulling(true);
    try {
      await pullImage(pullImageUrl);
      showSuccess(`Image ${pullImageUrl} pulled successfully`);
      setShowPullDialog(false);
      setPullImageUrl("");
      refreshImages();
    } catch (err) {
      showError(`Failed to pull image: ${err}`);
    } finally {
      setIsPulling(false);
    }
  };

  const filtered = images.filter(img =>
    img.repository.toLowerCase().includes(search.toLowerCase()) ||
    img.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Images</h2>
            <p className="text-zinc-500 mt-1">Manage local Docker images and pull new ones.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-zinc-900 border-zinc-800 text-zinc-300"
              onClick={refreshImages}
              disabled={isRefreshing}
            >
              <RotateCcw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowPullDialog(true)}>
              <Download className="w-4 h-4 mr-2" />
              Pull Image
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            placeholder="Search images..." 
            className="bg-zinc-900 border-zinc-800 text-zinc-300 pl-10 focus-visible:ring-blue-600 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-900/80">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400 font-medium">Repository</TableHead>
                <TableHead className="text-zinc-400 font-medium">Tag</TableHead>
                <TableHead className="text-zinc-400 font-medium">Image ID</TableHead>
                <TableHead className="text-zinc-400 font-medium">Size</TableHead>
                <TableHead className="text-zinc-400 font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((img) => (
                <TableRow key={img.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                  <TableCell className="font-semibold text-zinc-200">{img.repository}</TableCell>
                  <TableCell>
                    <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded border border-zinc-700 font-mono">
                      {img.tag}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-500 text-xs font-mono">{img.id}</TableCell>
                  <TableCell className="text-zinc-400 text-xs flex items-center gap-2">
                    <HardDrive className="w-3 h-3 text-zinc-600" />
                    {img.size}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-zinc-400 hover:text-rose-500"
                      onClick={() => handleDelete(img.id, img.repository)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                    No images found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showPullDialog} onOpenChange={setShowPullDialog}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
          <DialogHeader>
            <DialogTitle>Pull New Image</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g. nginx:latest or ubuntu"
              className="bg-zinc-900 border-zinc-800 text-zinc-300"
              value={pullImageUrl}
              onChange={(e) => setPullImageUrl(e.target.value)}
              disabled={isPulling}
            />
            <p className="text-xs text-zinc-500 mt-2">
              Enter the image name and tag to pull from Docker Hub.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-rose-900/50 text-rose-500 hover:bg-rose-950/30 hover:text-rose-400" onClick={() => setShowPullDialog(false)} disabled={isPulling}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handlePull} disabled={isPulling || !pullImageUrl}>
              {isPulling ? "Pulling..." : "Pull Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Images;
