import { google } from 'googleapis';
import dayjs from 'dayjs';
import config from '../config/env.js';

/**
 * Google Calendar 服務類別
 */
class CalendarService {
  constructor() {
    // 根據配置選擇認證方式
    this.auth = this.initializeAuth();

    // 初始化 Calendar API
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    this.calendarId = config.google.calendarId;
  }

  /**
   * 初始化認證方式
   * 支援 Service Account 和 OAuth 2.0 兩種方式
   * @returns {GoogleAuth} 認證客戶端
   */
  initializeAuth() {
    const authType = config.google.authType || 'oauth';

    if (authType === 'service_account') {
      // Service Account 認證 (推薦)
      console.log('🔐 使用 Service Account 認證');

      if (!config.google.serviceAccountPath) {
        throw new Error('❌ Service Account 模式需要設定 GOOGLE_SERVICE_ACCOUNT_PATH');
      }

      try {
        const auth = new google.auth.GoogleAuth({
          keyFile: config.google.serviceAccountPath,
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });

        console.log('✅ Service Account 認證初始化成功');
        return auth;
      } catch (error) {
        console.error('❌ Service Account 認證失敗:', error.message);
        throw new Error(`Service Account 認證失敗: ${error.message}`);
      }
    } else {
      // OAuth 2.0 認證 (需要定期更新 token)
      console.log('🔐 使用 OAuth 2.0 認證');

      if (!config.google.clientId || !config.google.clientSecret || !config.google.refreshToken) {
        throw new Error('❌ OAuth 模式需要設定 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
      }

      const auth = new google.auth.OAuth2(
        config.google.clientId,
        config.google.clientSecret
      );

      auth.setCredentials({
        refresh_token: config.google.refreshToken
      });

      console.log('✅ OAuth 2.0 認證初始化成功');
      return auth;
    }
  }

  /**
   * 建立會議
   * @param {Object} meetingData - 會議資料
   * @returns {Promise<Object>} - 建立的事件資料
   */
  async createMeeting(meetingData) {
    try {
      const startTime = dayjs(`${meetingData.date} ${meetingData.time}`);
      const endTime = startTime.add(meetingData.duration || 2, 'hour');

      const event = {
        summary: `[${meetingData.type}] ${meetingData.title}`,
        location: meetingData.location,
        description: this.formatDescription(meetingData),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: config.timezone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: config.timezone,
        },
        // Discord Bot 無法獲取使用者的真實 email，因此不設定 attendees
        // 參加者資訊已儲存在 extendedProperties 中
        extendedProperties: {
          private: {
            discord_info: JSON.stringify({
              guild_id: meetingData.guild_id,
              channel_id: meetingData.channel_id,
              creator_id: meetingData.creator_id,
              message_id: meetingData.message_id || null,
              meeting_type: meetingData.type,
              participants: meetingData.participants || [],
            }),
          },
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
      });

      console.log(`✅ 會議已建立: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('❌ 建立會議失敗:', error);
      throw new Error(`建立會議失敗: ${error.message}`);
    }
  }

  /**
   * 取得會議列表
   * @param {string} timeMin - 開始時間 (ISO 格式)
   * @param {string} timeMax - 結束時間 (ISO 格式)
   * @returns {Promise<Array>} - 會議列表
   */
  async listMeetings(timeMin, timeMax) {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      console.log(`📋 找到 ${response.data.items.length} 個會議`);
      return response.data.items || [];
    } catch (error) {
      console.error('❌ 取得會議列表失敗:', error);
      throw new Error(`取得會議列表失敗: ${error.message}`);
    }
  }

  /**
   * 取得單一會議
   * @param {string} eventId - 事件 ID
   * @returns {Promise<Object>} - 會議資料
   */
  async getMeeting(eventId) {
    try {
      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      return response.data;
    } catch (error) {
      console.error('❌ 取得會議失敗:', error);
      throw new Error(`取得會議失敗: ${error.message}`);
    }
  }

  /**
   * 更新會議
   * @param {string} eventId - 事件 ID
   * @param {Object} meetingData - 更新的會議資料
   * @returns {Promise<Object>} - 更新後的事件資料
   */
  async updateMeeting(eventId, meetingData) {
    try {
      const event = await this.getMeeting(eventId);

      // 更新欄位
      if (meetingData.title || meetingData.type) {
        event.summary = `[${meetingData.type || '線上會議'}] ${meetingData.title || event.summary}`;
      }
      if (meetingData.location) {
        event.location = meetingData.location;
      }
      if (meetingData.content || meetingData.participants) {
        event.description = this.formatDescription(meetingData);
      }
      if (meetingData.date || meetingData.time) {
        const startTime = dayjs(`${meetingData.date} ${meetingData.time}`);
        const endTime = startTime.add(meetingData.duration || 2, 'hour');
        event.start = {
          dateTime: startTime.toISOString(),
          timeZone: config.timezone,
        };
        event.end = {
          dateTime: endTime.toISOString(),
          timeZone: config.timezone,
        };
      }

      // 更新 Discord 資訊 (使用 extendedProperties)
      if (meetingData.guild_id || meetingData.channel_id || meetingData.creator_id || meetingData.participants || meetingData.type) {
        const currentDiscordInfo = this.getDiscordInfo(event);
        event.extendedProperties = {
          private: {
            discord_info: JSON.stringify({
              guild_id: meetingData.guild_id || currentDiscordInfo.guild_id,
              channel_id: meetingData.channel_id || currentDiscordInfo.channel_id,
              creator_id: meetingData.creator_id || currentDiscordInfo.creator_id,
              message_id: meetingData.message_id || currentDiscordInfo.message_id,
              meeting_type: meetingData.type || currentDiscordInfo.meeting_type,
              participants: meetingData.participants || currentDiscordInfo.participants || [],
            }),
          },
        };
      }

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: event,
      });

      console.log(`✅ 會議已更新: ${eventId}`);
      return response.data;
    } catch (error) {
      console.error('❌ 更新會議失敗:', error);
      throw new Error(`更新會議失敗: ${error.message}`);
    }
  }

  /**
   * 刪除會議
   * @param {string} eventId - 事件 ID
   * @returns {Promise<void>}
   */
  async deleteMeeting(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      console.log(`✅ 會議已刪除: ${eventId}`);
    } catch (error) {
      console.error('❌ 刪除會議失敗:', error);
      throw new Error(`刪除會議失敗: ${error.message}`);
    }
  }

  /**
   * 從事件中取得 Discord 資訊
   * @param {Object} event - Google Calendar 事件物件
   * @returns {Object} - Discord 資訊
   */
  getDiscordInfo(event) {
    try {
      // 優先從 extendedProperties 讀取
      if (event.extendedProperties?.private?.discord_info) {
        return JSON.parse(event.extendedProperties.private.discord_info);
      }

      // 向下相容：從 description 解析 (舊格式)
      const parsedData = this.parseDescription(event.description);
      return parsedData.discordInfo || {};
    } catch (error) {
      console.error('❌ 解析 Discord 資訊失敗:', error);
      return {};
    }
  }

  /**
   * 查詢使用者參加的會議
   * @param {string} userId - Discord 用戶 ID
   * @param {string} timeMin - 開始時間 (ISO 格式)
   * @param {string} timeMax - 結束時間 (ISO 格式)
   * @returns {Promise<Array>} - 會議列表
   */
  async getUserMeetings(userId, timeMin, timeMax) {
    try {
      const allEvents = await this.listMeetings(timeMin, timeMax);
      const allMeetings = allEvents.map(event => this.parseMeetingEvent(event));

      // 篩選出使用者參加的會議
      const userMeetings = allMeetings.filter(meeting => {
        return meeting.participants && meeting.participants.some(p => p.user_id === userId);
      });

      console.log(`📋 找到 ${userMeetings.length} 個用戶 ${userId} 的會議`);
      return userMeetings;
    } catch (error) {
      console.error('❌ 查詢使用者會議失敗:', error);
      throw new Error(`查詢使用者會議失敗: ${error.message}`);
    }
  }

  /**
   * 檢查會議時間衝突
   * @param {string} startTime - 開始時間 (ISO 格式)
   * @param {string} endTime - 結束時間 (ISO 格式)
   * @param {Array} participants - 參加者列表
   * @returns {Promise<Object>} - 衝突資訊 { hasConflict: boolean, conflicts: Array }
   */
  async checkConflicts(startTime, endTime, participants) {
    try {
      const meetings = await this.listMeetings(startTime, endTime);
      const conflicts = [];

      for (const meeting of meetings) {
        const discordInfo = this.getDiscordInfo(meeting);
        if (!discordInfo || !discordInfo.participants) continue;

        // 檢查是否有相同參加者
        const conflictingParticipants = participants.filter(p =>
          discordInfo.participants.some(mp => mp.user_id === p.user_id)
        );

        if (conflictingParticipants.length > 0) {
          conflicts.push({
            meeting: meeting,
            participants: conflictingParticipants,
          });
        }
      }

      return {
        hasConflict: conflicts.length > 0,
        conflicts: conflicts,
      };
    } catch (error) {
      console.error('❌ 檢查衝突失敗:', error);
      return { hasConflict: false, conflicts: [] };
    }
  }

  /**
   * 格式化會議描述
   * @param {Object} data - 會議資料
   * @returns {string} - 格式化的描述
   */
  formatDescription(data) {
    return `=== 會議內容 ===
${data.content || '無'}

=== 參加者 ===
${data.participants ? data.participants.map(p => `@${p.name}`).join(' ') : '無'}`;
  }

  /**
   * 解析會議描述
   * @param {string} description - 會議描述
   * @returns {Object} - 解析後的資料
   */
  parseDescription(description) {
    if (!description) {
      return { content: '', participants: '', discordInfo: null };
    }

    const contentMatch = description.match(/=== 會議內容 ===\n(.*?)\n\n/s);
    const participantsMatch = description.match(/=== 參加者 ===\n(.*?)\n\n/s);
    const jsonMatch = description.match(/=== Discord 資訊 \(JSON\) ===\n({[\s\S]*})/);

    return {
      content: contentMatch ? contentMatch[1].trim() : '',
      participants: participantsMatch ? participantsMatch[1].trim() : '',
      discordInfo: jsonMatch ? JSON.parse(jsonMatch[1]) : null,
    };
  }

  /**
   * 解析 Google Calendar 事件為會議資料
   * @param {Object} event - Google Calendar 事件
   * @returns {Object} - 解析後的會議資料
   */
  parseMeetingEvent(event) {
    // 取得 Discord 資訊（從 extendedProperties 或 description）
    const discordInfo = this.getDiscordInfo(event);

    // 從 summary 中提取會議類型和名稱
    const summaryMatch = event.summary?.match(/\[(.*?)\]\s*(.*)/);
    const meetingType = summaryMatch ? summaryMatch[1] : '未分類';
    const meetingTitle = summaryMatch ? summaryMatch[2] : event.summary;

    // 解析 description 取得會議內容
    const parsedDesc = this.parseDescription(event.description);

    return {
      id: event.id,
      title: meetingTitle,
      type: meetingType,
      location: event.location || '未指定',
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      participants: discordInfo?.participants || [],
      content: parsedDesc.content,
      discordInfo: discordInfo,
    };
  }
}

export default CalendarService;
