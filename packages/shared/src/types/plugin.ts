export type PluginState = "INACTIVE" | "RUNNING" | "ERROR";

export interface IPluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  url: string;
  requiresReady?: boolean;
}

export interface PluginLaunchContext {
  roomId: string;
  pluginId: string;
  token: string;
  members: { userId: string; nickname: string }[];
}

export interface PluginInstance {
  id: string;
  roomId: string;
  pluginId: string;
  state: PluginState;
  config?: Record<string, unknown> | null;
  token?: string | null;
  tokenExpiresAt?: string | null;
  activatedAt?: string | null;
  createdAt: string;
}

export interface StartPluginRequest {
  roomId: string;
  pluginId: string;
}

export interface EndPluginRequest {
  pluginId: string;
  token: string;
}

export interface PluginContextResponse {
  room: {
    id: string;
    name: string;
  };
  members: {
    userId: string;
    nickname: string;
  }[];
}