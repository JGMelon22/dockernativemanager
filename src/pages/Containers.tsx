"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  getContainers, 
  startContainer,
  stopContainer,
  restartContainer,
  deleteContainer,
  createContainer,
  getContainerLogs,
  Container
} from "@/lib/docker";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Square, 
  RotateCcw,
  Trash2,
  Search,
  Terminal,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { showSuccess, showError } from "@/utils/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Containers = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [search, setSearch] = useState("");
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [logs, setLogs] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const refreshContainers = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const data = await getContainers();
      setContainers(data);
    } catch (err) {
      if (manual) showError("Failed to fetch containers. Check Docker daemon.");
    } finally {
      if (manual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshContainers();
    const interval = setInterval(() => refreshContainers(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: (id: string) => Promise<any>, id: string, name: string) => {
    try {
      await action(id);
      showSuccess(`Action executed on ${name}`);
      refreshContainers();
    } catch (err) {
      showError(`Error performing action on ${name}`);
    }
  };

  const openLogs = async (container: Container) => {
    setSelectedContainer(container);
    setLogs("Loading logs...");
    try {
      const logData = await getContainerLogs(container.id);
      setLogs(logData || "No logs available.");
    } catch (err) {
      setLogs("Error loading logs.");
    }
  };

  const handleCreate = async () => {
    if (!newImage) return;
    setIsCreating(true);
    try {
      await createContainer(newName, newImage);
      showSuccess(`Container ${newName || newImage} created`);
      setShowCreateDialog(false);
      setNewName("");
      setNewImage("");
      refreshContainers();
    } catch (err) {
      showError(`Error creating container: ${err}`);
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = containers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.image.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Containers</h2>
          <p className="text-zinc-500 mt-1">Manage your running and stopped Docker instances.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="bg-zinc-900 border-zinc-800 text-zinc-300"
            onClick={() => refreshContainers(true)}
            disabled={isRefreshing}
          >
            <RotateCcw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowCreateDialog(true)}>
            Create Container
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input 
          placeholder="Filter containers by name or image..." 
          className="bg-zinc-900 border-zinc-800 text-zinc-300 pl-10 focus-visible:ring-blue-600 h-11"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400 font-medium">Status</TableHead>
              <TableHead className="text-zinc-400 font-medium">Name</TableHead>
              <TableHead className="text-zinc-400 font-medium">Image</TableHead>
              <TableHead className="text-zinc-400 font-medium">Stats</TableHead>
              <TableHead className="text-zinc-400 font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((container) => (
              <ContainerRow
                key={container.id}
                container={container}
                handleAction={handleAction}
                openLogs={openLogs}
              />
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                  No containers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedContainer} onOpenChange={(open) => !open && setSelectedContainer(null)}>
        <SheetContent side="right" className="w-[600px] sm:w-[800px] bg-zinc-950 border-zinc-800 text-zinc-200">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-500" />
              Logs: {selectedContainer?.name}
            </SheetTitle>
            <SheetDescription className="text-zinc-500">
              Live container output from {selectedContainer?.image}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 bg-zinc-900 rounded-lg p-4 font-mono text-xs overflow-auto max-h-[80vh] whitespace-pre-wrap border border-zinc-800">
            {logs}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
          <DialogHeader>
            <DialogTitle>Create New Container</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="image">Image Name (required)</Label>
              <Input
                id="image"
                placeholder="e.g. nginx:latest"
                className="bg-zinc-900 border-zinc-800 text-zinc-300"
                value={newImage}
                onChange={(e) => setNewImage(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Container Name (optional)</Label>
              <Input
                id="name"
                placeholder="e.g. my-web-app"
                className="bg-zinc-900 border-zinc-800 text-zinc-300"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isCreating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-rose-900/50 text-rose-500 hover:bg-rose-950/30 hover:text-rose-400" onClick={() => setShowCreateDialog(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate} disabled={isCreating || !newImage}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ContainerRow = ({ container, handleAction, openLogs }: any) => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (container.status === "running") {
      import("@/lib/docker").then(({ getContainerStats }) => {
        const fetchStats = async () => {
          try {
            const data = await getContainerStats(container.id);
            setStats(data);
          } catch (e) {
            // ignore stats error
          }
        };
        fetchStats();
        interval = setInterval(fetchStats, 3000);
      });
    } else {
      setStats(null);
    }
    return () => clearInterval(interval);
  }, [container.status, container.id]);

  return (
    <TableRow className="border-zinc-800 hover:bg-zinc-800/30 transition-colors group">
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge className={cn(
            "capitalize px-2 py-0.5 text-[10px] font-semibold",
            container.status === "running" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
          )}>
            {container.status}
          </Badge>
          <span className="text-xs text-zinc-500 font-mono">{container.state}</span>
        </div>
      </TableCell>
      <TableCell className="font-semibold text-zinc-200">{container.name}</TableCell>
      <TableCell className="text-zinc-400 text-xs font-mono">{container.image}</TableCell>
      <TableCell className="text-zinc-400 text-xs font-mono">
        {stats ? (
          <div className="flex flex-col gap-1">
            <span className="text-emerald-400">{stats.cpu_percent.toFixed(2)}% CPU</span>
            <span className="text-blue-400">{formatBytes(stats.memory_usage)} / {formatBytes(stats.memory_limit)} RAM</span>
          </div>
        ) : (
          <span className="text-zinc-600">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {container.status === "running" ? (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-amber-500" onClick={async () => handleAction((await import("@/lib/docker")).stopContainer, container.id, container.name)}>
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-emerald-500" onClick={async () => handleAction((await import("@/lib/docker")).startContainer, container.id, container.name)}>
              <Play className="w-4 h-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-blue-400" onClick={async () => handleAction((await import("@/lib/docker")).restartContainer, container.id, container.name)}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-blue-500" onClick={() => openLogs(container)}>
            <Terminal className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-rose-500" onClick={async () => handleAction((await import("@/lib/docker")).deleteContainer, container.id, container.name)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default Containers;