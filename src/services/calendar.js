import { google } from 'googleapis';
import dayjs from 'dayjs';
import config from '../config/env.js';

/**
 * Google Calendar 服務類別
 */
class CalendarService {
  constructor() {
    // 初始化 OAuth2 客戶端
    this.auth = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret
    );

    // 設定認證憑證
    this.auth.setCredentials({
      refresh_token: config.google.refreshToken
    });

    // 初始化 Calendar API
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    this.calendarId = config.google.calendarId;
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
        attendees: meetingData.participants.map(p => ({
          email: `user${p.user_id}@discord.bot`,
          displayName: p.name,
        })),
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
        const meetingInfo = this.parseDescription(meeting.description);
        if (!meetingInfo.discordInfo) continue;

        // 檢查是否有相同參加者
        const conflictingParticipants = participants.filter(p =>
          meetingInfo.discordInfo.participants.some(mp => mp.user_id === p.user_id)
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
    const discordInfo = {
      guild_id: data.guild_id,
      channel_id: data.channel_id,
      creator_id: data.creator_id,
      message_id: data.message_id || null,
      meeting_type: data.type,
      participants: data.participants || [],
    };

    return `=== 會議內容 ===
${data.content || '無'}

=== 參加者 ===
${data.participants ? data.participants.map(p => `@${p.name}`).join(' ') : '無'}

=== Discord 資訊 (JSON) ===
${JSON.stringify(discordInfo, null, 2)}`;
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
}

export default CalendarService;
