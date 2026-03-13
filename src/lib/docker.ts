"use client";

import { invoke } from "@tauri-apps/api/core";

// Helper to check if we are running inside Tauri
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
}

export interface ContainerStats {
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
}

export interface Image {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

export interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
}

export interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

export interface Stack {
  name: string;
  status: string;
  services: number;
}

// MOCK DATA for Web Preview
const MOCK_CONTAINERS: Container[] = [
  { id: "c1", name: "nginx-proxy", image: "nginx:latest", status: "running", state: "Up 2 hours", ports: "80:80, 443:443" },
  { id: "c2", name: "postgres-db", image: "postgres:15-alpine", status: "running", state: "Up 5 hours", ports: "5432:5432" },
  { id: "c3", name: "redis-cache", image: "redis:7", status: "exited", state: "Exited (0) 10 mins ago", ports: "6379" },
];

const MOCK_IMAGES: Image[] = [
  { id: "sha256:1", repository: "nginx", tag: "latest", size: "142MB", created: "2 weeks ago" },
  { id: "sha256:2", repository: "postgres", tag: "15-alpine", size: "230MB", created: "1 month ago" },
  { id: "sha256:3", repository: "node", tag: "20-slim", size: "180MB", created: "3 days ago" },
];

const MOCK_VOLUMES: Volume[] = [
  { name: "db_data", driver: "local", mountpoint: "/var/lib/docker/volumes/db_data/_data" },
  { name: "cache_data", driver: "local", mountpoint: "/var/lib/docker/volumes/cache_data/_data" },
];

const MOCK_NETWORKS: Network[] = [
  { id: "n1", name: "bridge", driver: "bridge", scope: "local" },
  { id: "n2", name: "host", driver: "host", scope: "local" },
  { id: "n3", name: "none", driver: "null", scope: "local" },
];

export const getContainers = async (): Promise<Container[]> => {
  if (!isTauri) return MOCK_CONTAINERS;
  return await invoke("get_containers");
};

export const getImages = async (): Promise<Image[]> => {
  if (!isTauri) return MOCK_IMAGES;
  return await invoke("get_images");
};

export const getVolumes = async (): Promise<Volume[]> => {
  if (!isTauri) return MOCK_VOLUMES;
  return await invoke("get_volumes");
};

export const getNetworks = async (): Promise<Network[]> => {
  if (!isTauri) return MOCK_NETWORKS;
  return await invoke("get_networks");
};

export const startContainer = async (id: string) => {
  if (!isTauri) return console.log("Mock: Starting container", id);
  return await invoke("start_container", { id });
};

export const stopContainer = async (id: string) => {
  if (!isTauri) return console.log("Mock: Stopping container", id);
  return await invoke("stop_container", { id });
};

export const restartContainer = async (id: string) => {
  if (!isTauri) return console.log("Mock: Restarting container", id);
  return await invoke("restart_container", { id });
};

export const deleteContainer = async (id: string) => {
  if (!isTauri) return console.log("Mock: Deleting container", id);
  return await invoke("delete_container", { id });
};

export const createContainer = async (name: string, image: string) => {
  if (!isTauri) return console.log("Mock: Creating container", name, image);
  return await invoke("create_container", { name, image });
};

export const deleteImage = async (id: string) => {
  if (!isTauri) return console.log("Mock: Deleting image", id);
  return await invoke("delete_image", { id });
};

export const deleteVolume = async (name: string) => {
  if (!isTauri) return console.log("Mock: Deleting volume", name);
  return await invoke("delete_volume", { name });
};

export const createVolume = async (name: string) => {
  if (!isTauri) return console.log("Mock: Creating volume", name);
  return await invoke("create_volume", { name });
};

export const deleteNetwork = async (id: string) => {
  if (!isTauri) return console.log("Mock: Deleting network", id);
  return await invoke("delete_network", { id });
};

export const createNetwork = async (name: string) => {
  if (!isTauri) return console.log("Mock: Creating network", name);
  return await invoke("create_network", { name });
};

export const pullImage = async (image: string) => {
  if (!isTauri) return console.log("Mock: Pulling image", image);
  return await invoke("pull_image", { image });
};

export const getContainerLogs = async (id: string): Promise<string> => {
  if (!isTauri) return "[MOCK LOGS]\n2023-10-27 10:00:01 INFO: Database connection established\n2023-10-27 10:00:05 DEBUG: Polling for new tasks...";
  return await invoke("get_container_logs", { id });
};

export const getContainerStats = async (id: string): Promise<ContainerStats> => {
  if (!isTauri) return { cpu_percent: 0, memory_usage: 0, memory_limit: 0 };
  return await invoke("get_container_stats", { id });
};

export const getStacks = async (): Promise<Stack[]> => {
  if (!isTauri) return [{ name: "my-app", status: "running", services: 3 }];
  return await invoke("get_stacks");
};

export const deployStack = async (name: string, composeContent: string): Promise<void> => {
  if (!isTauri) return console.log("Mock: Deploying stack", name);
  await invoke("deploy_stack", { name, composeContent });
};

export const removeStack = async (name: string): Promise<void> => {
  if (!isTauri) return console.log("Mock: Removing stack", name);
  await invoke("remove_stack", { name });
};
