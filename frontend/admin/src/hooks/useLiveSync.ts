import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";

export function useLiveSync(roomType: "admin" | "counselor" = "admin", entityId?: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const wsUrl = ((import.meta as any).env?.VITE_WS_URL as string) || window.location.origin;

    const socket = io(`${wsUrl}/events`, {
      transports: ["websocket", "polling"],
      query: {
        role: "ADMIN",
        userId: entityId || "",
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Subscribe to admin events
      socket.emit("subscribe_admin");
    });

    // Student events
    socket.on("student.created", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_students_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
    });

    socket.on("student.updated", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_students_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_student_detail"] });
    });

    socket.on("student.approved", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_students_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_student_detail"] });
    });

    // Counselor events
    socket.on("counselor.created", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_counselors"] });
      queryClient.invalidateQueries({ queryKey: ["admin_counselor_stats"] });
    });

    socket.on("counselor.updated", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_counselors"] });
      queryClient.invalidateQueries({ queryKey: ["admin_counselor_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_counselor_detail"] });
    });

    socket.on("counselor.assignment.updated", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_counselors"] });
      queryClient.invalidateQueries({ queryKey: ["admin_students_list"] });
      queryClient.invalidateQueries({ queryKey: ["leads_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
    });

    // Application events
    socket.on("application.created", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
    });

    socket.on("application.submitted", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin_students_list"] });
    });

    socket.on("application.review.updated", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
    });

    socket.on("application.approved", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin_students_list"] });
    });

    socket.on("application.rejected", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
    });

    // Lead & Payment events
    socket.on("lead.created", () => {
      queryClient.invalidateQueries({ queryKey: ["leads_list"] });
      queryClient.invalidateQueries({ queryKey: ["senior_counselor_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
    });

    socket.on("payment.completed", () => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin_students_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, roomType, entityId]);

  return socketRef.current;
}
