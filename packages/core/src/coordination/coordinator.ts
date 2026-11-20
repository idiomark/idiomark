/**
 * Multi-Robot Coordination
 *
 * Enables multiple robots to coordinate tasks, resolve conflicts,
 * and distribute workload efficiently.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Robot information for coordination
 */
export interface RobotInfo {
  id: string;
  capabilities: string[];
  load: number; // 0.0-1.0
  location?: { x: number; y: number };
  priority?: number;
  current_task?: string;
}

/**
 * Task to be coordinated
 */
export interface CoordinationTask {
  id: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  deadline?: string;
  location?: { x: number; y: number };
  dependencies?: string[];
}

/**
 * Task assignment result
 */
export interface TaskAssignment {
  task_id: string;
  robot_id: string;
  assigned_at: string;
  estimated_completion?: string;
}

/**
 * Conflict input
 */
export interface ConflictInput {
  type: 'resource' | 'task' | 'location' | 'priority';
  robots: string[];
  resource?: string;
  task_id?: string;
  details?: Record<string, unknown>;
}

/**
 * Conflict resolution result
 */
export interface ConflictResult {
  resolved: boolean;
  winner?: string;
  loser?: string;
  resolution_strategy: 'priority' | 'load' | 'random' | 'negotiation';
  details?: Record<string, unknown>;
}

// ============================================================================
// TASK DISTRIBUTOR
// ============================================================================

/**
 * Distributes tasks among robots
 */
export class TaskDistributor {
  /**
   * Assign a task to the best available robot
   */
  assignTask(task: CoordinationTask, robots: RobotInfo[]): TaskAssignment | null {
    // Filter robots with required capability
    const capableRobots = robots.filter(r =>
      r.capabilities.includes(task.type) && r.load < 1.0
    );

    if (capableRobots.length === 0) {
      return null;
    }

    // Sort by load (ascending), then by priority (descending)
    capableRobots.sort((a, b) => {
      // Critical tasks go to highest priority robots
      if (task.priority === 'critical') {
        const aPriority = a.priority || 0;
        const bPriority = b.priority || 0;
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
      }
      return a.load - b.load;
    });

    const selectedRobot = capableRobots[0];

    return {
      task_id: task.id,
      robot_id: selectedRobot.id,
      assigned_at: new Date().toISOString()
    };
  }

  /**
   * Assign multiple tasks efficiently
   */
  assignTasks(tasks: CoordinationTask[], robots: RobotInfo[]): TaskAssignment[] {
    const assignments: TaskAssignment[] = [];
    const robotLoads = new Map(robots.map(r => [r.id, r.load]));

    // Sort tasks by priority
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const sortedTasks = [...tasks].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    for (const task of sortedTasks) {
      // Create robot list with current loads
      const currentRobots = robots.map(r => ({
        ...r,
        load: robotLoads.get(r.id) || 0
      }));

      const assignment = this.assignTask(task, currentRobots);
      if (assignment) {
        assignments.push(assignment);
        // Update load estimate
        robotLoads.set(assignment.robot_id, Math.min(1, (robotLoads.get(assignment.robot_id) || 0) + 0.2));
      }
    }

    return assignments;
  }
}

// ============================================================================
// CONFLICT RESOLVER
// ============================================================================

/**
 * Resolves conflicts between robots
 */
export class ConflictResolver {
  /**
   * Resolve a conflict between robots
   */
  resolve(conflict: ConflictInput): ConflictResult {
    switch (conflict.type) {
      case 'resource':
        return this.resolveResourceConflict(conflict);
      case 'task':
        return this.resolveTaskConflict(conflict);
      case 'location':
        return this.resolveLocationConflict(conflict);
      default:
        return {
          resolved: false,
          resolution_strategy: 'negotiation'
        };
    }
  }

  private resolveResourceConflict(conflict: ConflictInput): ConflictResult {
    // Simple priority-based resolution
    // In real implementation, would consider load, proximity, etc.
    const winner = conflict.robots[0];
    const loser = conflict.robots[1];

    return {
      resolved: true,
      winner,
      loser,
      resolution_strategy: 'priority',
      details: {
        reason: 'first_robot_gets_resource'
      }
    };
  }

  private resolveTaskConflict(conflict: ConflictInput): ConflictResult {
    // Task goes to robot with lower current load
    const winner = conflict.robots[0];

    return {
      resolved: true,
      winner,
      loser: conflict.robots[1],
      resolution_strategy: 'load',
      details: {
        task_id: conflict.task_id
      }
    };
  }

  private resolveLocationConflict(conflict: ConflictInput): ConflictResult {
    // Robots should maintain distance - first one stays, second moves
    const winner = conflict.robots[0];

    return {
      resolved: true,
      winner,
      loser: conflict.robots[1],
      resolution_strategy: 'priority',
      details: {
        action: 'loser_should_move'
      }
    };
  }
}

// ============================================================================
// ROBOT COORDINATOR
// ============================================================================

/**
 * Main coordinator for multi-robot management
 */
export class RobotCoordinator {
  private robots: Map<string, RobotInfo> = new Map();
  private assignments: Map<string, TaskAssignment> = new Map();
  private distributor: TaskDistributor;
  private resolver: ConflictResolver;

  constructor() {
    this.distributor = new TaskDistributor();
    this.resolver = new ConflictResolver();
  }

  /**
   * Register a robot
   */
  registerRobot(robot: RobotInfo): void {
    this.robots.set(robot.id, { ...robot });
  }

  /**
   * Unregister a robot
   */
  unregisterRobot(robotId: string): void {
    this.robots.delete(robotId);
  }

  /**
   * Get registered robot count
   */
  getRobotCount(): number {
    return this.robots.size;
  }

  /**
   * Get robot by ID
   */
  getRobot(robotId: string): RobotInfo | undefined {
    return this.robots.get(robotId);
  }

  /**
   * Update robot load
   */
  updateLoad(robotId: string, load: number): void {
    const robot = this.robots.get(robotId);
    if (robot) {
      robot.load = Math.max(0, Math.min(1, load));
    }
  }

  /**
   * Get robot load
   */
  getLoad(robotId: string): number {
    return this.robots.get(robotId)?.load || 0;
  }

  /**
   * Assign a single task
   */
  assignTask(task: CoordinationTask): TaskAssignment | null {
    const robots = Array.from(this.robots.values());
    const assignment = this.distributor.assignTask(task, robots);

    if (assignment) {
      this.assignments.set(task.id, assignment);
      this.updateLoad(assignment.robot_id, this.getLoad(assignment.robot_id) + 0.2);
    }

    return assignment;
  }

  /**
   * Assign multiple tasks
   */
  assignTasks(tasks: CoordinationTask[]): TaskAssignment[] {
    const robots = Array.from(this.robots.values());
    const assignments = this.distributor.assignTasks(tasks, robots);

    for (const assignment of assignments) {
      this.assignments.set(assignment.task_id, assignment);
    }

    return assignments;
  }

  /**
   * Detect conflicts between robots
   */
  detectConflicts(): ConflictInput[] {
    const conflicts: ConflictInput[] = [];
    const robots = Array.from(this.robots.values());

    // Check for location conflicts (robots too close)
    for (let i = 0; i < robots.length; i++) {
      for (let j = i + 1; j < robots.length; j++) {
        const r1 = robots[i];
        const r2 = robots[j];

        if (r1.location && r2.location) {
          const distance = Math.sqrt(
            Math.pow(r1.location.x - r2.location.x, 2) +
            Math.pow(r1.location.y - r2.location.y, 2)
          );

          if (distance < 1.0) { // Within 1 meter
            conflicts.push({
              type: 'location',
              robots: [r1.id, r2.id],
              details: { distance }
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve detected conflicts
   */
  resolveConflicts(conflicts?: ConflictInput[]): ConflictResult[] {
    const toResolve = conflicts || this.detectConflicts();
    return toResolve.map(c => this.resolver.resolve(c));
  }

  /**
   * Get all registered robots
   */
  getAllRobots(): RobotInfo[] {
    return Array.from(this.robots.values());
  }

  /**
   * Get robots by capability
   */
  getRobotsByCapability(capability: string): RobotInfo[] {
    return this.getAllRobots().filter(r =>
      r.capabilities.includes(capability)
    );
  }

  /**
   * Get current assignments
   */
  getAssignments(): TaskAssignment[] {
    return Array.from(this.assignments.values());
  }

  /**
   * Clear completed task
   */
  completeTask(taskId: string): void {
    const assignment = this.assignments.get(taskId);
    if (assignment) {
      this.updateLoad(assignment.robot_id, Math.max(0, this.getLoad(assignment.robot_id) - 0.2));
      this.assignments.delete(taskId);
    }
  }
}
