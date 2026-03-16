/*
 * File: DockerContext.tsx
 * Project: docker-native-manager
 * Created: 2026-03-14
 * Author: Pedro Farias
 * 
 * Last Modified: Sun Mar 15 2026
 * Modified By: Pedro Farias
 * 
 * Copyright (c) 2026 Pedro Farias
 * License: MIT
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  getContainers, 
  getStacks, 
  getImages, 
  getVolumes, 
  getNetworks, 
  getSystemInfo,
  Container,
  Stack,
  Image,
  Volume,
  Network,
  SystemInfo
} from '@/lib/docker';
import { useDockerEvent } from '@/hooks/use-docker-events';

export interface DockerEvent {
  time: Date;
  type: string;
  action: string;
  id: string;
  from?: string;
  status?: string;
  attributes?: Record<string, string>;
}

export interface HostStats {
  cpu_usage: number;
  memory_used: number;
  memory_total: number;
  disk_read_bytes: number;
  disk_write_bytes: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
}

interface DockerContextType {
  containers: Container[];
  stacks: Stack[];
  images: Image[];
  volumes: Volume[];
  networks: Network[];
  systemInfo: SystemInfo | null;
  events: DockerEvent[];
  hostStats: HostStats | null;
  hostStatsHistory: HostStats[];
  loading: Record<string, boolean>;
  refreshAll: () => Promise<void>;
  refreshContainers: () => Promise<void>;
  refreshStacks: () => Promise<void>;
  refreshImages: () => Promise<void>;
  refreshVolumes: () => Promise<void>;
  refreshNetworks: () => Promise<void>;
  refreshSystemInfo: () => Promise<void>;
  pullingImages: Record<string, { status: string; progress: number | null }>;
  pullImageBackground: (imageName: string) => Promise<void>;
}

const DockerContext = createContext<DockerContextType | undefined>(undefined);

export const DockerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [events, setEvents] = useState<DockerEvent[]>([]);
  const [hostStats, setHostStats] = useState<HostStats | null>(null);
  const [hostStatsHistory, setHostStatsHistory] = useState<HostStats[]>([]);
  const [pullingImages, setPullingImages] = useState<Record<string, { status: string; progress: number | null }>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({
    containers: true,
    stacks: true,
    images: true,
    volumes: true,
    networks: true,
    systemInfo: true,
  });

  const refreshContainers = useCallback(async () => {
    try {
      const data = await getContainers();
      setContainers(data);
    } finally {
      setLoading(prev => ({ ...prev, containers: false }));
    }
  }, []);

  const refreshStacks = useCallback(async () => {
    try {
      const data = await getStacks();
      setStacks(data);
    } finally {
      setLoading(prev => ({ ...prev, stacks: false }));
    }
  }, []);

  const refreshImages = useCallback(async () => {
    try {
      const data = await getImages();
      setImages(data);
    } finally {
      setLoading(prev => ({ ...prev, images: false }));
    }
  }, []);

  const refreshVolumes = useCallback(async () => {
    try {
      const data = await getVolumes();
      setVolumes(data);
    } finally {
      setLoading(prev => ({ ...prev, volumes: false }));
    }
  }, []);

  const refreshNetworks = useCallback(async () => {
    try {
      const data = await getNetworks();
      setNetworks(data);
    } finally {
      setLoading(prev => ({ ...prev, networks: false }));
    }
  }, []);

  const refreshSystemInfo = useCallback(async () => {
    try {
      const data = await getSystemInfo();
      setSystemInfo(data);
    } finally {
      setLoading(prev => ({ ...prev, systemInfo: false }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshContainers(),
      refreshStacks(),
      refreshImages(),
      refreshVolumes(),
      refreshNetworks(),
      refreshSystemInfo(),
    ]);
  }, [refreshContainers, refreshStacks, refreshImages, refreshVolumes, refreshNetworks, refreshSystemInfo]);

  const pullImageBackground = useCallback(async (imageName: string) => {
    const { pullImage } = await import('@/lib/docker');
    const { listen } = await import('@tauri-apps/api/event');
    const { showSuccess, showError } = await import('@/utils/toast');

    const fullImageName = imageName.includes(':') ? imageName : `${imageName}:latest`;
    
    // Check if already pulling
    if (pullingImages[fullImageName]) return;

    setPullingImages(prev => ({
      ...prev,
      [fullImageName]: { status: 'Starting...', progress: null }
    }));

    let unlisten: (() => void) | undefined;

    try {
      unlisten = await listen<{ status?: string; progressDetail?: { current?: number; total?: number } }>(
        `pull-progress-${fullImageName}`,
        (event) => {
          const { status, progressDetail } = event.payload;
          setPullingImages(prev => ({
            ...prev,
            [fullImageName]: {
              status: status || prev[fullImageName]?.status || 'Pulling...',
              progress: (progressDetail?.current && progressDetail?.total) 
                ? Math.round((progressDetail.current / progressDetail.total) * 100)
                : prev[fullImageName]?.progress
            }
          }));
        }
      );

      await pullImage(imageName);
      showSuccess(`Image ${imageName} pulled successfully`);
      refreshImages();
    } catch (err) {
      showError(`Failed to pull image ${imageName}: ${err}`);
    } finally {
      if (unlisten) unlisten();
      setPullingImages(prev => {
        const next = { ...prev };
        delete next[fullImageName];
        return next;
      });
    }
  }, [pullingImages, refreshImages]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useDockerEvent('all', useCallback((event) => {
    refreshAll();
    if (event) {
      setEvents((prev) => {
        const newEvents = [{
          time: new Date(),
          type: event.Type || "system",
          action: event.Action || "unknown",
          id: event.Actor?.ID || "",
          from: event.From || event.from, // Handle different casing just in case
          status: event.status || event.Status,
          attributes: event.Actor?.Attributes || {}
        }, ...prev];
        return newEvents.slice(0, 20); // keep last 20
      });
    }
  }, [refreshAll]));

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen<HostStats>("host-stats", (event) => {
        setHostStats(event.payload);
        setHostStatsHistory(prev => {
          const newHistory = [...prev, event.payload];
          if (newHistory.length > 30) return newHistory.slice(1);
          return newHistory;
        });
      });
    };

    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return (
    <DockerContext.Provider value={{
      containers,
      stacks,
      images,
      volumes,
      networks,
      systemInfo,
      events,
      hostStats,
      hostStatsHistory,
      loading,
      refreshAll,
      refreshContainers,
      refreshStacks,
      refreshImages,
      refreshVolumes,
      refreshNetworks,
      refreshSystemInfo,
      pullingImages,
      pullImageBackground,
    }}>
      {children}
    </DockerContext.Provider>
  );
};

export const useDocker = () => {
  const context = useContext(DockerContext);
  if (context === undefined) {
    throw new Error('useDocker must be used within a DockerProvider');
  }
  return context;
};
