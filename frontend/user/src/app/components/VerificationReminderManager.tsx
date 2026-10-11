import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import MobileVerificationModal from "./MobileVerificationModal";
import EmailVerificationModal from "./EmailVerificationModal";

interface ReminderState {
  userId: string;
  reminderType: "MOBILE" | "EMAIL";
  nextTriggerAt: number;
  skipCount: number;
}

export default function VerificationReminderManager() {
  const { user } = useAuth();
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<string | undefined>(undefined);
  const [isGatedAction, setIsGatedAction] = useState(false);

  const activeUserIdRef = useRef<string | null>(null);

  // Listen to custom gating events (Requirement 8)
  useEffect(() => {
    const handleOpenMobile = (e: any) => {
      setModalReason(e?.detail?.reason || "Mobile verification is required for this action.");
      setIsGatedAction(true);
      setMobileModalOpen(true);
    };

    const handleOpenEmail = (e: any) => {
      setModalReason(e?.detail?.reason || "Email verification is required for this action.");
      setIsGatedAction(true);
      setEmailModalOpen(true);
    };

    window.addEventListener("swayam:open-mobile-verification", handleOpenMobile);
    window.addEventListener("swayam:open-email-verification", handleOpenEmail);

    return () => {
      window.removeEventListener("swayam:open-mobile-verification", handleOpenMobile);
      window.removeEventListener("swayam:open-email-verification", handleOpenEmail);
    };
  }, []);

  // Reminder Scheduling Engine (Requirements 6 & 7)
  useEffect(() => {
    if (!user) {
      activeUserIdRef.current = null;
      setMobileModalOpen(false);
      setEmailModalOpen(false);
      return;
    }

    const userId = user.id;
    const isMobileVerified = Boolean(user.phoneVerified || user.mobileVerified);
    const isEmailVerified = Boolean(user.emailVerified);

    // If both are verified, permanently stop all reminders
    if (isMobileVerified && isEmailVerified) {
      sessionStorage.removeItem(`swayam_reminder_${userId}`);
      return;
    }

    // Determine target reminder type
    // If mobile is not verified, mobile verification takes priority (Google signup etc.)
    // Otherwise email verification reminder triggers
    const targetType: "MOBILE" | "EMAIL" = !isMobileVerified ? "MOBILE" : "EMAIL";
    const storageKey = `swayam_reminder_${userId}`;

    // Read or initialize reminder state in sessionStorage to survive page refreshes without duplicate timers
    let state: ReminderState | null = null;
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        state = JSON.parse(stored);
      }
    } catch {
      state = null;
    }

    // Initialize initial 1-minute timer if not already set or if user switched
    if (!state || state.userId !== userId || state.reminderType !== targetType) {
      state = {
        userId,
        reminderType: targetType,
        nextTriggerAt: Date.now() + 60 * 1000, // 1 minute after login
        skipCount: 0,
      };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(state));
      } catch {}
    }

    // Heartbeat ticker to evaluate reminder trigger reliably
    const interval = setInterval(() => {
      // Don't trigger if a verification modal is already open
      if (mobileModalOpen || emailModalOpen) return;

      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return;
        const cur: ReminderState = JSON.parse(raw);

        if (Date.now() >= cur.nextTriggerAt) {
          setIsGatedAction(false);
          setModalReason(undefined);
          if (cur.reminderType === "MOBILE") {
            setMobileModalOpen(true);
          } else {
            setEmailModalOpen(true);
          }
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [user, mobileModalOpen, emailModalOpen]);

  // Handle Skip action according to rules (1 min -> 2 min -> 5 min -> every 5 min)
  const handleSkip = () => {
    if (!user) return;
    const storageKey = `swayam_reminder_${user.id}`;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const cur: ReminderState = JSON.parse(raw);
        const newSkipCount = cur.skipCount + 1;
        let delayMinutes = 5;
        if (newSkipCount === 1) {
          delayMinutes = 2; // Skip 1 -> 2 minutes
        } else {
          delayMinutes = 5; // Skip 2 and thereafter -> 5 minutes
        }

        const updated: ReminderState = {
          ...cur,
          skipCount: newSkipCount,
          nextTriggerAt: Date.now() + delayMinutes * 60 * 1000,
        };
        sessionStorage.setItem(storageKey, JSON.stringify(updated));
      }
    } catch {}
  };

  // Handle successful verification (permanently stop reminder)
  const handleSuccess = () => {
    if (!user) return;
    const storageKey = `swayam_reminder_${user.id}`;
    sessionStorage.removeItem(storageKey);
  };

  return (
    <>
      <MobileVerificationModal
        open={mobileModalOpen}
        onClose={() => setMobileModalOpen(false)}
        allowSkip={!isGatedAction}
        onSkip={handleSkip}
        onSuccess={handleSuccess}
        reason={modalReason}
      />
      <EmailVerificationModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        allowSkip={!isGatedAction}
        onSkip={handleSkip}
        onSuccess={handleSuccess}
        reason={modalReason}
      />
    </>
  );
}
