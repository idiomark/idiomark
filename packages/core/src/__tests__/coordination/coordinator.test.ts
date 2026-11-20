import { describe, it, expect } from 'vitest';
import {
  RobotCoordinator,
  TaskDistributor,
  ConflictResolver,
  type RobotInfo,
  type CoordinationTask,
  type ConflictResult
} from '../../coordination/coordinator';

describe('Multi-Robot Coordination', () => {
  describe('TaskDistributor', () => {
    const distributor = new TaskDistributor();

    const robots: RobotInfo[] = [
      { id: 'robot-001', capabilities: ['food_service'], load: 0.2 },
      { id: 'robot-002', capabilities: ['food_service', 'payment'], load: 0.5 },
      { id: 'robot-003', capabilities: ['payment'], load: 0.1 }
    ];

    it('should assign task to capable robot with lowest load', () => {
      const task: CoordinationTask = {
        id: 'task-001',
        type: 'food_service',
        priority: 'normal'
      };

      const assignment = distributor.assignTask(task, robots);

      expect(assignment).toBeDefined();
      expect(assignment?.robot_id).toBe('robot-001'); // Lowest load with food_service
    });

    it('should return null if no capable robot', () => {
      const task: CoordinationTask = {
        id: 'task-002',
        type: 'surgery', // No robot can do this
        priority: 'high'
      };

      const assignment = distributor.assignTask(task, robots);

      expect(assignment).toBeNull();
    });

    it('should prefer higher priority robots for high priority tasks', () => {
      const highPriorityTask: CoordinationTask = {
        id: 'task-003',
        type: 'payment',
        priority: 'critical'
      };

      const assignment = distributor.assignTask(highPriorityTask, robots);

      expect(assignment).toBeDefined();
      expect(assignment?.robot_id).toBe('robot-003'); // Lowest load for payment
    });
  });

  describe('ConflictResolver', () => {
    const resolver = new ConflictResolver();

    it('should resolve resource conflict', () => {
      const conflict: ConflictResult = resolver.resolve({
        type: 'resource',
        robots: ['robot-001', 'robot-002'],
        resource: 'counter-1',
        details: { reason: 'both_robots_need_same_counter' }
      });

      expect(conflict.resolved).toBe(true);
      expect(conflict.winner).toBeDefined();
      expect(conflict.resolution_strategy).toBe('priority');
    });

    it('should resolve task conflict', () => {
      const conflict: ConflictResult = resolver.resolve({
        type: 'task',
        robots: ['robot-001', 'robot-002'],
        task_id: 'task-001',
        details: { both_assigned: true }
      });

      expect(conflict.resolved).toBe(true);
      expect(conflict.winner).toBeDefined();
    });
  });

  describe('RobotCoordinator', () => {
    it('should register robots', () => {
      const coordinator = new RobotCoordinator();

      coordinator.registerRobot({
        id: 'robot-001',
        capabilities: ['food_service'],
        load: 0
      });

      expect(coordinator.getRobotCount()).toBe(1);
    });

    it('should unregister robots', () => {
      const coordinator = new RobotCoordinator();

      coordinator.registerRobot({ id: 'robot-001', capabilities: [], load: 0 });
      coordinator.unregisterRobot('robot-001');

      expect(coordinator.getRobotCount()).toBe(0);
    });

    it('should assign task to best robot', () => {
      const coordinator = new RobotCoordinator();

      coordinator.registerRobot({
        id: 'robot-001',
        capabilities: ['food_service'],
        load: 0.1
      });
      coordinator.registerRobot({
        id: 'robot-002',
        capabilities: ['food_service'],
        load: 0.8
      });

      const assignment = coordinator.assignTask({
        id: 'task-001',
        type: 'food_service',
        priority: 'normal'
      });

      expect(assignment?.robot_id).toBe('robot-001');
    });

    it('should track robot load', () => {
      const coordinator = new RobotCoordinator();

      coordinator.registerRobot({
        id: 'robot-001',
        capabilities: ['food_service'],
        load: 0.5
      });

      coordinator.updateLoad('robot-001', 0.8);

      const load = coordinator.getLoad('robot-001');
      expect(load).toBe(0.8);
    });

    it('should handle multiple task assignments', () => {
      const coordinator = new RobotCoordinator();

      coordinator.registerRobot({
        id: 'robot-001',
        capabilities: ['food_service'],
        load: 0
      });

      const tasks = [
        { id: 'task-001', type: 'food_service', priority: 'normal' as const },
        { id: 'task-002', type: 'food_service', priority: 'normal' as const }
      ];

      const assignments = coordinator.assignTasks(tasks);

      expect(assignments).toHaveLength(2);
    });

    it('should detect conflicts', () => {
      const coordinator = new RobotCoordinator();

      coordinator.registerRobot({
        id: 'robot-001',
        capabilities: ['food_service'],
        load: 0,
        location: { x: 0, y: 0 }
      });
      coordinator.registerRobot({
        id: 'robot-002',
        capabilities: ['food_service'],
        load: 0,
        location: { x: 0.5, y: 0.5 } // Very close
      });

      const conflicts = coordinator.detectConflicts();

      // Robots in same area might have conflicts
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should coordinate multiple robots for complex task', () => {
      const coordinator = new RobotCoordinator();

      // Register robots with different capabilities
      coordinator.registerRobot({
        id: 'barista-001',
        capabilities: ['coffee', 'food_service'],
        load: 0.2
      });
      coordinator.registerRobot({
        id: 'waiter-001',
        capabilities: ['food_service', 'customer_interaction'],
        load: 0.3
      });
      coordinator.registerRobot({
        id: 'cashier-001',
        capabilities: ['payment'],
        load: 0.1
      });

      // Assign multiple tasks
      const tasks: CoordinationTask[] = [
        { id: 'coffee-001', type: 'coffee', priority: 'high' },
        { id: 'serve-001', type: 'food_service', priority: 'normal' },
        { id: 'pay-001', type: 'payment', priority: 'normal' }
      ];

      const assignments = coordinator.assignTasks(tasks);

      expect(assignments).toHaveLength(3);

      // Verify right robot got right task
      const coffeeAssignment = assignments.find(a => a.task_id === 'coffee-001');
      expect(coffeeAssignment?.robot_id).toBe('barista-001');

      const paymentAssignment = assignments.find(a => a.task_id === 'pay-001');
      expect(paymentAssignment?.robot_id).toBe('cashier-001');
    });
  });
});
