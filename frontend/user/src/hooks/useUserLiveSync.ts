import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";

export function useUserLiveSync(userId?: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const wsUrl = ((import.meta as any).env?.VITE_WS_URL as string) || window.location.origin;

    const socket = io(`${wsUrl}/events`, {
      transports: ["websocket", "polling"],
      query: {
        role: "STUDENT",
        userId: userId || "",
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    const invalidateGuideQueries = () => {
      queryClient.invalidateQueries({ queryKey: ["public_guides"] });
      queryClient.invalidateQueries({ queryKey: ["personalized_guides"] });
      queryClient.invalidateQueries({ queryKey: ["saved_guides"] });
      queryClient.invalidateQueries({ queryKey: ["counselor_guidance"] });
    };

    const invalidateNotificationQueries = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications_unread"] });
      queryClient.invalidateQueries({ queryKey: ["my_notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    // Listen to real-time guide events emitted by Admin CMS actions
    socket.on("guide.published", invalidateGuideQueries);
    socket.on("guide.unpublished", invalidateGuideQueries);
    socket.on("guide.updated", invalidateGuideQueries);
    socket.on("guide.created", invalidateGuideQueries);
    socket.on("guide.deleted", invalidateGuideQueries);

    // Listen to real-time notification events
    socket.on("notification.created", invalidateNotificationQueries);
    socket.on("notification.read", invalidateNotificationQueries);
    socket.on("notification.readAll", invalidateNotificationQueries);

    // Also listen to broadcast channel in case of multi-tab on same origin
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("swayam_erp_sync");
      bc.onmessage = (msg) => {
        if (msg.data?.type?.startsWith("guide.")) {
          invalidateGuideQueries();
        } else if (msg.data?.type?.startsWith("notification.")) {
          invalidateNotificationQueries();
        }
      };
    } catch {
      // BroadcastChannel not supported in environment
    }

    return () => {
      socket.disconnect();
      if (bc) bc.close();
    };
  }, [queryClient, userId]);

  return socketRef.current;
}
