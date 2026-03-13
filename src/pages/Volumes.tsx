"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getVolumes, deleteVolume, createVolume, Volume } from "@/lib/docker";
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
  Database, 
  Search, 
  RotateCcw,
  Plus,
  Trash2
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

const Volumes = () => {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const refreshVolumes = async () => {
    setIsRefreshing(true);
    try {
      const data = await getVolumes();
      setVolumes(data);
    } catch (err) {
      showError("Failed to fetch volumes.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshVolumes();
  }, []);

  const handleDelete = async (name: string) => {
    try {
      await deleteVolume(name);
      showSuccess(`Volume ${name} deleted`);
      refreshVolumes();
    } catch (err) {
      showError(`Error deleting volume ${name}: ${err}`);
    }
  };

  const handleCreate = async () => {
    if (!newName) return;
    setIsCreating(true);
    try {
      await createVolume(newName);
      showSuccess(`Volume ${newName} created`);
      setShowCreateDialog(false);
      setNewName("");
      refreshVolumes();
    } catch (err) {
      showError(`Error creating volume: ${err}`);
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = volumes.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    v.driver.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Volumes</h2>
            <p className="text-zinc-500 mt-1">Manage persistent data storage for your containers.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="bg-zinc-900 border-zinc-800 text-zinc-300" 
              onClick={refreshVolumes}
              disabled={isRefreshing}
            >
              <RotateCcw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Volume
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            placeholder="Search volumes..." 
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
                <TableHead className="text-zinc-400 font-medium">Driver</TableHead>
                <TableHead className="text-zinc-400 font-medium">Mountpoint</TableHead>
                <TableHead className="text-zinc-400 font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.name} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                  <TableCell className="font-semibold text-zinc-200">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-500" />
                      {v.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded border border-zinc-700 font-mono">
                      {v.driver}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-500 text-xs font-mono max-w-md truncate">{v.mountpoint}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-zinc-400 hover:text-rose-500"
                      onClick={() => handleDelete(v.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-zinc-500">
                    No volumes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
          <DialogHeader>
            <DialogTitle>Create New Volume</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Volume Name</Label>
              <Input 
                id="name"
                placeholder="e.g. my-data-volume" 
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
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate} disabled={isCreating || !newName}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Volumes;
