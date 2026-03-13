"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getStacks, deployStack, removeStack, Stack } from "@/lib/docker";
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
  Layers, 
  Search, 
  RotateCcw,
  Plus,
  Trash2,
  Activity
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const Stacks = () => {
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [composeContent, setComposeContent] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);

  const refreshStacks = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const data = await getStacks();
      setStacks(data);
    } catch (err) {
      if (manual) showError("Failed to fetch stacks.");
    } finally {
      if (manual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshStacks();
    const interval = setInterval(() => refreshStacks(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (name: string) => {
    try {
      await removeStack(name);
      showSuccess(`Stack ${name} removal initiated`);
      refreshStacks(true);
    } catch (err) {
      showError(`Error removing stack ${name}: ${err}`);
    }
  };

  const handleDeploy = async () => {
    if (!newName || !composeContent) return;
    setIsDeploying(true);
    try {
      await deployStack(newName, composeContent);
      showSuccess(`Stack ${newName} deployment initiated`);
      setShowDeployDialog(false);
      setNewName("");
      setComposeContent("");
      refreshStacks(true);
    } catch (err) {
      showError(`Error deploying stack: ${err}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const filtered = stacks.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Stacks</h2>
            <p className="text-zinc-500 mt-1">Manage Docker Compose projects and multi-container deployments.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="bg-zinc-900 border-zinc-800 text-zinc-300" 
              onClick={() => refreshStacks(true)}
              disabled={isRefreshing}
            >
              <RotateCcw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowDeployDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Deploy Stack
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            placeholder="Search stacks..." 
            className="bg-zinc-900 border-zinc-800 text-zinc-300 pl-10 focus-visible:ring-blue-600 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-900/80">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400 font-medium">Name</TableHead>
                <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                <TableHead className="text-zinc-400 font-medium">Services</TableHead>
                <TableHead className="text-zinc-400 font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.name} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                  <TableCell className="font-semibold text-zinc-200">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      {s.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono uppercase border",
                      s.status === "running" 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3 h-3" />
                      {s.services} services
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-zinc-400 hover:text-rose-500"
                      onClick={() => handleDelete(s.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-zinc-500">
                    No stacks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deploy New Stack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Stack Name</Label>
              <Input 
                id="name"
                placeholder="e.g. my-awesome-app" 
                className="bg-zinc-900 border-zinc-800 text-zinc-300"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isDeploying}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compose">docker-compose.yaml</Label>
              <Textarea 
                id="compose"
                placeholder="version: '3'..." 
                className="bg-zinc-900 border-zinc-800 text-zinc-300 font-mono text-xs min-h-[300px]"
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value)}
                disabled={isDeploying}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-rose-900/50 text-rose-500 hover:bg-rose-950/30 hover:text-rose-400" onClick={() => setShowDeployDialog(false)} disabled={isDeploying}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleDeploy} disabled={isDeploying || !newName || !composeContent}>
              {isDeploying ? "Deploying..." : "Deploy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Stacks;
