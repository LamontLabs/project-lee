import { z } from "zod";

export const lifecycleStates = ["INITIALIZING", "BOOTING", "HEALTHY", "DEGRADED", "PAUSED", "RECOVERING", "UNAVAILABLE", "SHUTDOWN"] as const;
export type LifecycleState = typeof lifecycleStates[number];
export const recoveryPolicies = ["AUTO_RESTART", "AUTO_FALLBACK", "GRACEFUL_DISABLE", "MANUAL_RECOVERY"] as const;
export type RecoveryPolicy = typeof recoveryPolicies[number];
export type BootResult = { success: boolean; missing_dependencies: string[]; degraded_capabilities: string[] };
export type HealthStatus = { engineId: string; state: LifecycleState; healthy: boolean; lastActivity: Date | null; activeDegradations: string[] };
export interface EngineLifecycle {
  initialize(): Promise<void>;
  boot(): Promise<BootResult>;
  health_check(): HealthStatus;
  pause(reason: string): Promise<void>;
  resume(): Promise<void>;
  recover(policy: RecoveryPolicy): Promise<BootResult>;
  shutdown(): Promise<void>;
}
export const lifecycleRegistrationSchema = z.object({
  requiredDependencies: z.array(z.string()).default([]),
  optionalDependencies: z.array(z.string()).default([]),
  recoveryPolicy: z.enum(recoveryPolicies).default("GRACEFUL_DISABLE"),
  recoveryConfig: z.record(z.unknown()).default({}),
});