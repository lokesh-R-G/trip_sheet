export type TripStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export interface TransitionDefinition {
  from: TripStatus;
  to: TripStatus;
  actionName: string;
  requiresReason: boolean;
}

export class TripLifecycleEngine {
  private static readonly PERMITTED_TRANSITIONS: TransitionDefinition[] = [
    { from: 'draft', to: 'in_progress', actionName: 'DISPATCH', requiresReason: false },
    { from: 'draft', to: 'cancelled', actionName: 'ABORT_DRAFT', requiresReason: false },
    { from: 'in_progress', to: 'completed', actionName: 'COMPLETE_TRIP', requiresReason: false },
    { from: 'in_progress', to: 'cancelled', actionName: 'ABORT_ACTIVE_TRIP', requiresReason: true },
  ];

  public canTransition(from: TripStatus, to: TripStatus): boolean {
    if (from === to) return true;
    return TripLifecycleEngine.PERMITTED_TRANSITIONS.some((t) => t.from === from && t.to === to);
  }

  public getTransitionDefinition(from: TripStatus, to: TripStatus): TransitionDefinition | null {
    return TripLifecycleEngine.PERMITTED_TRANSITIONS.find((t) => t.from === from && t.to === to) || null;
  }

  public getPermittedNextStatuses(from: TripStatus): TripStatus[] {
    return TripLifecycleEngine.PERMITTED_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
  }

  public isTerminal(status: TripStatus): boolean {
    return status === 'completed' || status === 'cancelled';
  }
}

export const tripLifecycleEngine = new TripLifecycleEngine();
