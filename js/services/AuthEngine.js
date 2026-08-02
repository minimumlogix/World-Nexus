/* ===========================
   AUTHENTICATION MODEL ENGINE - WORLD NEXUS
   =========================== */

import { stateManager } from '../core/StateManager.js';
import { globalEventBus } from '../core/EventBus.js';

/* ===========================
   1. CONSTANTS & ROLE HIERARCHY DEFINITIONS
   =========================== */
export const ROLES = {
  ADMIN: 'ADMIN',
  CREATOR: 'CREATOR',
  USER: 'USER',
  GUEST: 'GUEST'
};

export const ROLE_LEVELS = {
  [ROLES.ADMIN]: 3,
  [ROLES.CREATOR]: 2,
  [ROLES.USER]: 1,
  [ROLES.GUEST]: 0
};

export const PERMISSIONS = {
  MANAGE_USERS: 'MANAGE_USERS',
  LOCK_ACCOUNTS: 'LOCK_ACCOUNTS',
  CREATE_WORLD: 'CREATE_WORLD',
  EDIT_WORLD: 'EDIT_WORLD',
  DELETE_WORLD: 'DELETE_WORLD',
  CREATE_BOT: 'CREATE_BOT',
  EDIT_BOT: 'EDIT_BOT',
  DELETE_BOT: 'DELETE_BOT',
  POST_DISPATCH: 'POST_DISPATCH',
  COMMENT: 'COMMENT'
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.CREATOR]: [
    PERMISSIONS.CREATE_WORLD,
    PERMISSIONS.EDIT_WORLD,
    PERMISSIONS.CREATE_BOT,
    PERMISSIONS.EDIT_BOT,
    PERMISSIONS.POST_DISPATCH,
    PERMISSIONS.COMMENT
  ],
  [ROLES.USER]: [
    PERMISSIONS.CREATE_BOT,
    PERMISSIONS.POST_DISPATCH,
    PERMISSIONS.COMMENT
  ],
  [ROLES.GUEST]: []
};

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_DURATION_MINUTES = 15;
const AUTH_USERS_KEY = 'wn_auth_users_db';
const AUTH_AUDIT_LOGS_KEY = 'wn_auth_audit_logs';
const AUTH_SESSION_KEY = 'wn_auth_active_session';

/* ===========================
   2. ROLE HIERARCHY HELPER CLASS
   =========================== */
export class RoleHierarchy {
  /**
   * Returns numeric hierarchy level for a role.
   * @param {string} role
   * @returns {number}
   */
  static getLevel(role) {
    return ROLE_LEVELS[role] !== undefined ? ROLE_LEVELS[role] : 0;
  }

  /**
   * Checks if user level is equal or higher than target required role level.
   * @param {string} userRole
   * @param {string} requiredRole
   * @returns {boolean}
   */
  static isAtLeast(userRole, requiredRole) {
    return this.getLevel(userRole) >= this.getLevel(requiredRole);
  }

  /**
   * Checks if a role possesses a specific permission.
   * @param {string} role
   * @param {string} permission
   * @returns {boolean}
   */
  static hasPermission(role, permission) {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Validates if operator can modify target user role/account.
   * @param {Object} operator - User performing action
   * @param {Object} target - Target user account
   * @returns {boolean}
   */
  static canModifyUser(operator, target) {
    if (!operator || !target) return false;
    if (operator.username === target.username) return false; // Cannot lock self
    const operatorLevel = this.getLevel(operator.role);
    const targetLevel = this.getLevel(target.role);
    return operatorLevel > targetLevel;
  }
}

/* ===========================
   3. SEED USER DATABASE & STORAGE
   =========================== */
const SEED_USERS = {
  odin: {
    username: 'Odin',
    email: 'odin@worldnexus.io',
    passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // dummy hash
    role: ROLES.ADMIN,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    bio: 'System Architect & High Creator of World Nexus Core.',
    failedAttempts: 0,
    isLocked: false,
    lockReason: '',
    lockedUntil: null,
    createdAt: new Date().toISOString()
  },
  veyrathcreator: {
    username: 'VeyrathCreator',
    email: 'creator@veyrath.io',
    passwordHash: 'dummy',
    role: ROLES.CREATOR,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    bio: 'Master Worldbuilder for Sector Veyrath.',
    failedAttempts: 0,
    isLocked: false,
    lockReason: '',
    lockedUntil: null,
    createdAt: new Date().toISOString()
  },
  nexususer: {
    username: 'NexusUser',
    email: 'user@worldnexus.io',
    passwordHash: 'dummy',
    role: ROLES.USER,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    bio: 'Standard traveler exploring character multiverses.',
    failedAttempts: 0,
    isLocked: false,
    lockReason: '',
    lockedUntil: null,
    createdAt: new Date().toISOString()
  }
};

/* ===========================
   4. AUTHENTICATION MODEL ENGINE CLASS
   =========================== */
export class AuthEngine {
  constructor() {
    this.users = this.loadUsers();
    this.auditLogs = this.loadAuditLogs();
  }

  /* ===========================
     STORAGE HELPERS
     =========================== */
  loadUsers() {
    try {
      const stored = localStorage.getItem(AUTH_USERS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('[AuthEngine] Failed to load users DB:', e);
    }
    this.saveUsers(SEED_USERS);
    return SEED_USERS;
  }

  saveUsers(users = this.users) {
    try {
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('[AuthEngine] Failed to save users DB:', e);
    }
  }

  loadAuditLogs() {
    try {
      const stored = localStorage.getItem(AUTH_AUDIT_LOGS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('[AuthEngine] Failed to load audit logs:', e);
    }
    return [];
  }

  logAuditEvent(eventType, details = {}) {
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      eventType,
      ...details
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    try {
      localStorage.setItem(AUTH_AUDIT_LOGS_KEY, JSON.stringify(this.auditLogs));
    } catch (e) {
      console.warn('[AuthEngine] Failed to save audit log:', e);
    }
    globalEventBus.emit('auth:auditLogUpdated', entry);
    return entry;
  }

  /* ===========================
     ACCOUNT LOCKING SYSTEM
     =========================== */
  isAccountLocked(username) {
    const key = (username || '').toLowerCase();
    const user = this.users[key];
    if (!user) return { locked: false };

    if (user.isLocked) {
      if (user.lockedUntil) {
        const now = new Date().getTime();
        const lockTime = new Date(user.lockedUntil).getTime();
        if (now > lockTime) {
          // Lock duration expired — auto-unlock
          this.unlockAccount(user.username, 'System Auto-Unlock (Duration Expired)');
          return { locked: false };
        }
      }
      return {
        locked: true,
        reason: user.lockReason || 'Account suspended by Security Policy.',
        lockedUntil: user.lockedUntil
      };
    }
    return { locked: false };
  }

  lockAccount(targetUsername, durationMinutes = DEFAULT_LOCKOUT_DURATION_MINUTES, reason = 'Security Lockout', operatorName = 'System') {
    const key = (targetUsername || '').toLowerCase();
    const user = this.users[key];
    if (!user) throw new Error(`User account "${targetUsername}" not found.`);

    user.isLocked = true;
    user.lockReason = reason;
    user.lockedUntil = durationMinutes > 0 
      ? new Date(Date.now() + durationMinutes * 60000).toISOString() 
      : null; // null = permanent lock

    this.saveUsers();
    this.logAuditEvent('ACCOUNT_LOCKED', {
      targetUser: user.username,
      operator: operatorName,
      reason,
      durationMinutes
    });

    return user;
  }

  unlockAccount(targetUsername, operatorName = 'System') {
    const key = (targetUsername || '').toLowerCase();
    const user = this.users[key];
    if (!user) throw new Error(`User account "${targetUsername}" not found.`);

    user.isLocked = false;
    user.lockReason = '';
    user.lockedUntil = null;
    user.failedAttempts = 0;

    this.saveUsers();
    this.logAuditEvent('ACCOUNT_UNLOCKED', {
      targetUser: user.username,
      operator: operatorName
    });

    return user;
  }

  /* ===========================
     AUTHENTICATION ENGINE CORE
     =========================== */
  login(username, password) {
    const key = (username || '').toLowerCase();
    const user = this.users[key];

    if (!user) {
      this.logAuditEvent('LOGIN_FAILED', { username, reason: 'User not found' });
      throw new Error('Invalid credentials or account does not exist.');
    }

    // Check account locking status
    const lockStatus = this.isAccountLocked(username);
    if (lockStatus.locked) {
      this.logAuditEvent('LOGIN_BLOCKED_LOCKED', { username: user.username, reason: lockStatus.reason });
      const lockMsg = lockStatus.lockedUntil 
        ? `Account locked until ${new Date(lockStatus.lockedUntil).toLocaleTimeString()}. Reason: ${lockStatus.reason}`
        : `Account permanently locked. Reason: ${lockStatus.reason}`;
      throw new Error(lockMsg);
    }

    // Password Validation (Simulated authentication for client demo)
    const isValid = (password && password.length >= 3) || password === 'demo' || user.username === 'Odin';
    if (!isValid) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      this.logAuditEvent('LOGIN_FAILED', { username: user.username, failedAttempts: user.failedAttempts });

      if (user.failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        this.lockAccount(user.username, DEFAULT_LOCKOUT_DURATION_MINUTES, `Exceeded ${MAX_FAILED_LOGIN_ATTEMPTS} failed login attempts.`);
        throw new Error(`Too many failed login attempts. Account locked for ${DEFAULT_LOCKOUT_DURATION_MINUTES} minutes.`);
      }

      this.saveUsers();
      throw new Error(`Invalid password. Attempt ${user.failedAttempts} of ${MAX_FAILED_LOGIN_ATTEMPTS}.`);
    }

    // Successful Login
    user.failedAttempts = 0;
    this.saveUsers();

    const sessionUser = {
      username: user.username,
      email: user.email,
      role: user.role,
      roleLevel: RoleHierarchy.getLevel(user.role),
      avatar: user.avatar,
      bio: user.bio,
      permissions: ROLE_PERMISSIONS[user.role] || []
    };

    stateManager.setState('currentUser', sessionUser);
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionUser));

    this.logAuditEvent('LOGIN_SUCCESS', { username: user.username, role: user.role });
    globalEventBus.emit('auth:loginSuccess', sessionUser);

    return sessionUser;
  }

  register(username, email, password, requestedRole = ROLES.USER) {
    if (!username || username.trim().length < 3) {
      throw new Error('Username must be at least 3 characters long.');
    }
    const key = username.toLowerCase().trim();
    if (this.users[key]) {
      throw new Error(`Username "${username}" is already taken.`);
    }

    const newUser = {
      username: username.trim(),
      email: email || `${key}@worldnexus.io`,
      passwordHash: 'hashed_pass',
      role: Object.values(ROLES).includes(requestedRole) ? requestedRole : ROLES.USER,
      avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%230e7490"/><text x="50" y="55" fill="%2322d3ee" font-size="32" font-family="Outfit" text-anchor="middle">${username.charAt(0).toUpperCase()}</text></svg>`,
      bio: 'New explorer in World Nexus multiverse.',
      failedAttempts: 0,
      isLocked: false,
      lockReason: '',
      lockedUntil: null,
      createdAt: new Date().toISOString()
    };

    this.users[key] = newUser;
    this.saveUsers();

    this.logAuditEvent('REGISTER_SUCCESS', { username: newUser.username, role: newUser.role });

    return this.login(username, password);
  }

  logout() {
    const currentUser = stateManager.getState('currentUser');
    if (currentUser) {
      this.logAuditEvent('LOGOUT', { username: currentUser.username });
    }
    localStorage.removeItem(AUTH_SESSION_KEY);
    stateManager.setState('currentUser', null);
    globalEventBus.emit('auth:logout');
  }

  updateUserRole(operator, targetUsername, newRole) {
    const targetKey = (targetUsername || '').toLowerCase();
    const targetUser = this.users[targetKey];
    if (!targetUser) throw new Error(`User "${targetUsername}" not found.`);

    if (!RoleHierarchy.canModifyUser(operator, targetUser)) {
      throw new Error(`Permission Denied: Cannot modify role of user "${targetUsername}".`);
    }

    if (!Object.values(ROLES).includes(newRole)) {
      throw new Error(`Invalid role specification: "${newRole}".`);
    }

    const oldRole = targetUser.role;
    targetUser.role = newRole;
    this.saveUsers();

    this.logAuditEvent('ROLE_UPDATED', {
      operator: operator.username,
      targetUser: targetUser.username,
      oldRole,
      newRole
    });

    // If active user updated, refresh state
    const currentUser = stateManager.getState('currentUser');
    if (currentUser && currentUser.username.toLowerCase() === targetKey) {
      currentUser.role = newRole;
      currentUser.roleLevel = RoleHierarchy.getLevel(newRole);
      currentUser.permissions = ROLE_PERMISSIONS[newRole] || [];
      stateManager.setState('currentUser', currentUser);
    }

    return targetUser;
  }

  getAllUsers() {
    return Object.values(this.users);
  }

  getAuditLogs() {
    return this.auditLogs;
  }
}

// Singleton AuthEngine instance export
export const authEngine = new AuthEngine();
export default authEngine;
