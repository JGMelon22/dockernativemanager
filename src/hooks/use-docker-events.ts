import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

export function useDockerEvent(type: "container" | "image" | "volume" | "network" | "all", callback: (event?: any) => void) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      unlisten = await listen<any>("docker-event", (event) => {
        if (type === "all" || event.payload.Type === type) {
          callback(event.payload);
        }
      });
    };

    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, [type, callback]);
}
