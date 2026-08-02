/* ===========================
   FEED MANAGER ENGINE - WORLD NEXUS
   =========================== */

import { stateManager } from '../core/StateManager.js';
import { globalEventBus } from '../core/EventBus.js';

/* ===========================
   1. CONSTANTS & IMPORTANCE RATING SYSTEM
   =========================== */
export const FEED_IMPORTANCE = {
  CRITICAL: 3,  // World Creation, System Milestone -> Broadcasts to General & World Feeds
  HIGH: 2,      // Bot Creation, Lore Approval -> Broadcasts to General & World Feeds
  MEDIUM: 1,    // Lore Revision, Media Upload, Bot Credentials Edit -> Posted to World Feed
  LOW: 0        // Channel Chatter & Custom Dispatches -> Channel specific
};

export const FEED_EVENT_TYPES = {
  WORLD_CREATED: 'WORLD_CREATED',
  BOT_CREATED: 'BOT_CREATED',
  BOT_UPDATED: 'BOT_UPDATED',
  LORE_UPDATED: 'LORE_UPDATED',
  LORE_SUBMITTED: 'LORE_SUBMITTED',
  MEDIA_UPLOADED: 'MEDIA_UPLOADED',
  COLLABORATOR_ADDED: 'COLLABORATOR_ADDED',
  DISPATCH_POSTED: 'DISPATCH_POSTED'
};

/* ===========================
   2. FEED MANAGER ENGINE CLASS
   =========================== */
export class FeedManager {
  constructor() {
    this.initListeners();
  }

  /**
   * Initializes event listeners to automatically track state changes.
   */
  initListeners() {
    globalEventBus.on('world:created', (world) => this.trackWorldCreation(world));
    globalEventBus.on('bot:created', (data) => this.trackBotCreation(data.bot, data.worldId));
    globalEventBus.on('lore:updated', (data) => this.trackLoreUpdate(data.worldId, data.lore));
  }

  /**
   * Generates a unique feed item ID.
   */
  generateFeedId() {
    return `feed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  /**
   * Dispatches a new feed event into channel messages and activities state.
   * @param {Object} eventOptions
   */
  dispatchEvent(eventOptions) {
    const {
      worldId = 'general',
      eventType,
      importance = FEED_IMPORTANCE.LOW,
      authorName = 'Nexus System',
      authorAvatar = '',
      authorRole = 'System',
      authorType = 'system',
      title = '',
      content = '',
      attachments = [],
      metadata = {}
    } = eventOptions;

    const feedId = this.generateFeedId();
    const timestamp = 'Just now';

    // Format rich system message object
    const feedMessage = {
      id: feedId,
      worldId,
      authorId: (authorName || 'system').toLowerCase().replace(/\s+/g, '-'),
      authorName,
      authorAvatar: authorAvatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%230e7490"/><text x="50" y="55" fill="%2322d3ee" font-size="28" font-family="Outfit" text-anchor="middle">⚡</text></svg>',
      authorRole,
      authorType,
      content: this.formatMessageContent(eventType, title, content, importance),
      timestamp,
      attachments,
      reactions: {},
      isSystem: authorType === 'system',
      importance,
      eventType,
      metadata
    };

    // Save to channelMessages in StateManager
    const channelMessages = stateManager.getState('channelMessages') || [];
    
    // 1. Post to target world channel
    if (worldId && worldId !== 'general') {
      channelMessages.push({ ...feedMessage, worldId });
    }

    // 2. If HIGH or CRITICAL importance, automatically link & broadcast to GENERAL FEED!
    if (importance >= FEED_IMPORTANCE.HIGH || worldId === 'general') {
      channelMessages.push({ ...feedMessage, worldId: 'general' });
    }

    stateManager.setState('channelMessages', channelMessages, true);

    // Track activity in worldActivities
    const activities = stateManager.getState('worldActivities') || [];
    activities.unshift({
      id: `act_${Date.now()}`,
      worldId,
      author: authorName,
      action: eventType.toLowerCase(),
      details: title || content,
      importance,
      timestamp
    });
    stateManager.setState('worldActivities', activities, true);

    // Emit live event for real-time subscribers
    globalEventBus.emit('feed:newEvent', feedMessage);

    return feedMessage;
  }

  /**
   * Formats message content with markdown badges based on event type & priority.
   */
  formatMessageContent(eventType, title, content, importance) {
    let badge = '📌';
    if (importance === FEED_IMPORTANCE.CRITICAL) badge = '🚨 [CRITICAL FEED]';
    else if (importance === FEED_IMPORTANCE.HIGH) badge = '🌟 [HIGH PRIORITY]';
    else if (importance === FEED_IMPORTANCE.MEDIUM) badge = '📜 [UPDATE]';

    switch (eventType) {
      case FEED_EVENT_TYPES.WORLD_CREATED:
        return `🌌 **NEW REALITY DISCOVERED**: **${title}**\n${content}\n*Explore sector details in the World Directory.*`;
      case FEED_EVENT_TYPES.BOT_CREATED:
        return `🤖 **NEW ENTITY DETECTED**: **${title}**\n${content}\n*Available for interactive chat and tactical scenarios.*`;
      case FEED_EVENT_TYPES.LORE_UPDATED:
        return `📖 **LORE RECORD UPDATED**: **${title}**\n${content}`;
      case FEED_EVENT_TYPES.MEDIA_UPLOADED:
        return `🖼️ **TACTICAL MEDIA UPLOADED**: **${title}**\n${content}`;
      default:
        return `${badge} **${title}**\n${content}`;
    }
  }

  /* ===========================
     CONVENIENCE DISPATCH METHOD HOOKS
     =========================== */

  /**
   * Tracks a newly published World across the feed hierarchy (CRITICAL Priority).
   */
  trackWorldCreation(world) {
    if (!world) return;
    return this.dispatchEvent({
      worldId: world.id || 'general',
      eventType: FEED_EVENT_TYPES.WORLD_CREATED,
      importance: FEED_IMPORTANCE.CRITICAL,
      authorName: world.author || 'Odin',
      authorRole: 'Creator',
      authorType: 'creator',
      title: world.name || 'New Sector',
      content: world.description || 'A new world reality has been forged in the Nexus.',
      attachments: world.bannerImage ? [{ type: 'image', url: world.bannerImage, caption: world.name }] : []
    });
  }

  /**
   * Tracks a newly created Bot/Character (HIGH Priority).
   */
  trackBotCreation(bot, worldId) {
    if (!bot) return;
    return this.dispatchEvent({
      worldId: worldId || bot.world || 'general',
      eventType: FEED_EVENT_TYPES.BOT_CREATED,
      importance: FEED_IMPORTANCE.HIGH,
      authorName: bot.creator || 'Creator',
      authorRole: 'Author',
      authorType: 'creator',
      title: bot.name,
      content: bot.description || `New ${bot.type || 'character'} identity activated in sector.`,
      attachments: (bot.cardImage || bot.avatar) ? [{ type: 'image', url: bot.cardImage || bot.avatar, caption: bot.name }] : []
    });
  }

  /**
   * Tracks Lore updates (MEDIUM Priority).
   */
  trackLoreUpdate(worldId, loreItem) {
    if (!loreItem) return;
    return this.dispatchEvent({
      worldId: worldId || 'general',
      eventType: FEED_EVENT_TYPES.LORE_UPDATED,
      importance: FEED_IMPORTANCE.MEDIUM,
      authorName: loreItem.author || 'World Editor',
      authorRole: 'Contributor',
      authorType: 'creator',
      title: loreItem.title || 'Lore Entry',
      content: loreItem.content ? loreItem.content.substring(0, 200) + '...' : 'Lore record revised.'
    });
  }
}

// Singleton FeedManager instance export
export const feedManager = new FeedManager();
export default feedManager;
