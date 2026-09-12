"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "./auth-context";
import { TOUR_STEPS } from "@/components/onboarding/tour-steps";

const STORAGE_PREFIX = "salescore_onboarding_";

function storageKey(userId: number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function isOnboardingDone(userId: number): boolean {
  try {
    return localStorage.getItem(storageKey(userId)) === "done";
  } catch {
    return false;
  }
}

function markOnboardingDone(userId: number): void {
  try {
    localStorage.setItem(storageKey(userId), "done");
  } catch {
    // Private-browsing / storage-disabled: onboarding simply re-offers itself next time,
    // which is a harmless degradation rather than a broken feature.
  }
}

interface OnboardingContextValue {
  /** Welcome screen shown once, immediately after a successful self-registration. */
  showWelcome: boolean;
  /** Product tour overlay is active (either continuing from Welcome, or via "Restart tour"). */
  tourActive: boolean;
  stepIndex: number;
  totalSteps: number;
  continueFromWelcome: () => void;
  skipWelcome: () => void;
  nextStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  restartTour: () => void;
  guideOpen: boolean;
  openGuide: () => void;
  closeGuide: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, justRegistered, acknowledgeRegistration } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);

  // Fires exactly once per successful registration in this tab: a brand-new account has
  // nothing recorded under its user id yet, so this never re-triggers on a later login.
  useEffect(() => {
    if (!user || !justRegistered) return;
    // Reacting to a one-time flag set by a prior user action (registration), reading
    // localStorage as an external system - not a synchronous derivation of props/state.
    if (!isOnboardingDone(user.id)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWelcome(true);
    }
    acknowledgeRegistration();
  }, [user, justRegistered, acknowledgeRegistration]);

  const continueFromWelcome = useCallback(() => {
    setShowWelcome(false);
    setStepIndex(0);
    setTourActive(true);
  }, []);

  const skipWelcome = useCallback(() => {
    setShowWelcome(false);
    if (user) markOnboardingDone(user.id);
  }, [user]);

  const nextStep = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= TOUR_STEPS.length) {
        setTourActive(false);
        if (user) markOnboardingDone(user.id);
        return i;
      }
      return i + 1;
    });
  }, [user]);

  const skipTour = useCallback(() => {
    setTourActive(false);
    if (user) markOnboardingDone(user.id);
  }, [user]);

  const finishTour = useCallback(() => {
    setTourActive(false);
    if (user) markOnboardingDone(user.id);
  }, [user]);

  const restartTour = useCallback(() => {
    setGuideOpen(false);
    setShowWelcome(false);
    setStepIndex(0);
    setTourActive(true);
  }, []);

  const openGuide = useCallback(() => setGuideOpen(true), []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  const value = useMemo(
    () => ({
      showWelcome,
      tourActive,
      stepIndex,
      totalSteps: TOUR_STEPS.length,
      continueFromWelcome,
      skipWelcome,
      nextStep,
      skipTour,
      finishTour,
      restartTour,
      guideOpen,
      openGuide,
      closeGuide,
    }),
    [
      showWelcome,
      tourActive,
      stepIndex,
      continueFromWelcome,
      skipWelcome,
      nextStep,
      skipTour,
      finishTour,
      restartTour,
      guideOpen,
      openGuide,
      closeGuide,
    ]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
