import { google } from 'googleapis';
import { parseDate } from '../utils/date-utils.js';
import config from '../config/env.js';
import CONSTANTS from '../config/constants.js';

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

      try {
        let authConfig;

        // 優先使用環境變數 (雲端部署)
        if (config.google.serviceAccountJson) {
          console.log('📦 從環境變數載入 Service Account (Base64)');

          // 解碼 Base64
          const jsonString = Buffer.from(config.google.serviceAccountJson, 'base64').toString('utf-8');
          const credentials = JSON.parse(jsonString);

          authConfig = {
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/calendar'],
          };
        }
        // 本地開發使用檔案路徑
        else if (config.google.serviceAccountPath) {
          console.log('📁 從檔案載入 Service Account');

          authConfig = {
            keyFile: config.google.serviceAccountPath,
            scopes: ['https://www.googleapis.com/auth/calendar'],
          };
        }
        else {
          throw new Error('❌ Service Account 模式需要設定 GOOGLE_SERVICE_ACCOUNT_JSON 或 GOOGLE_SERVICE_ACCOUNT_PATH');
        }

        const auth = new google.auth.GoogleAuth(authConfig);

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
   * 根據會議類型和地點取得 Google Calendar 顏色 ID
   * - 線上會議 → 香蕉黃 (colorId: 5)
   * - TRB/TRB工作室 → 紅鶴色 (colorId: 4)
   * - 其他線下會議 → 藍莓色 (colorId: 9)
   * @param {string} meetingType - 會議類型
   * @param {string} location - 會議地點
   * @returns {string} - Google Calendar colorId
   */
  getMeetingColorId(meetingType, location) {
    // 線上會議 → 香蕉黃
    if (meetingType === '線上會議') {
      return '5';
    }

    // 線下會議：檢查地點
    if (location) {
      const locationUpper = location.toUpperCase();
      // TRB 或 TRB工作室 → 紅鶴色
      if (locationUpper.includes('TRB') || location.includes('TRB工作室')) {
        return '4';
      }
    }

    // 其他線下會議 → 藍莓色
    return '9';
  }

  /**
   * 建立會議
   * @param {Object} meetingData - 會議資料
   * @returns {Promise<Object>} - 建立的事件資料
   */
  async createMeeting(meetingData) {
    try {
      // 使用 parseDate 確保時區正確 (Asia/Taipei)
      const startTime = parseDate(`${meetingData.date} ${meetingData.time}`, 'YYYY-MM-DD HH:mm');
      const endTime = startTime.add(meetingData.duration || 2, 'hour');

      // 根據會議類型和地點決定顏色
      const colorId = this.getMeetingColorId(meetingData.type, meetingData.location);

      const event = {
        summary: `[${meetingData.type}] ${meetingData.title}`,
        location: meetingData.location,
        description: this.formatDescription(meetingData),
        colorId: colorId,
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
   * 取得單一會議 (內部方法,回傳原始事件物件)
   * @private
   * @param {string} eventId - 事件 ID
   * @returns {Promise<Object>} - Google Calendar 原始事件物件
   */
  async _getRawEvent(eventId) {
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
   * 取得單一會議
   * @param {string} eventId - 事件 ID
   * @returns {Promise<Object>} - 會議資料
   */
  async getMeeting(eventId) {
    try {
      const rawEvent = await this._getRawEvent(eventId);

      // 解析事件資料為應用程式格式
      return this.parseMeetingEvent(rawEvent);
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
      const event = await this._getRawEvent(eventId);

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
        // 使用 parseDate 確保時區正確 (Asia/Taipei)
        const startTime = parseDate(`${meetingData.date} ${meetingData.time}`, 'YYYY-MM-DD HH:mm');
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

      // 更新顏色 (當 type 或 location 變更時)
      if (meetingData.type || meetingData.location) {
        const currentDiscordInfo = this.getDiscordInfo(event);
        const effectiveType = meetingData.type || currentDiscordInfo.meeting_type || '線下會議';
        const effectiveLocation = meetingData.location || event.location || '';
        event.colorId = this.getMeetingColorId(effectiveType, effectiveLocation);
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
   * 建立租借事件
   * @param {Object} rentalData - 租借資料
   * @returns {Promise<Object>} - 建立的事件資料
   */
  async createRental(rentalData) {
    try {
      const startTime = parseDate(`${rentalData.date} ${rentalData.time}`, 'YYYY-MM-DD HH:mm');
      const endTime = startTime.add(rentalData.duration || CONSTANTS.DEFAULTS.RENTAL_DURATION, 'hour');

      const event = {
        summary: `[${CONSTANTS.RENTAL_TYPE}] ${rentalData.title}`,
        location: CONSTANTS.RENTAL_LOCATION,
        description: this.formatRentalDescription(rentalData),
        colorId: CONSTANTS.RENTAL_COLOR_ID,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: config.timezone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: config.timezone,
        },
        extendedProperties: {
          private: {
            discord_info: JSON.stringify({
              guild_id: rentalData.guild_id,
              channel_id: rentalData.channel_id,
              creator_id: rentalData.creator_id,
              event_type: 'venue_rental',
              renter_name: rentalData.renter_name,
              registrar_id: rentalData.registrar_id,
              registrar_name: rentalData.registrar_name,
            }),
          },
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
      });

      console.log(`✅ 租借事件已建立: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('❌ 建立租借事件失敗:', error);
      throw new Error(`建立租借事件失敗: ${error.message}`);
    }
  }

  /**
   * 更新租借事件
   * @param {string} eventId - 事件 ID
   * @param {Object} rentalData - 更新的租借資料
   * @returns {Promise<Object>} - 更新後的事件資料
   */
  async updateRental(eventId, rentalData) {
    try {
      const event = await this._getRawEvent(eventId);

      if (rentalData.title) {
        event.summary = `[${CONSTANTS.RENTAL_TYPE}] ${rentalData.title}`;
      }
      if (rentalData.content || rentalData.renter_name) {
        event.description = this.formatRentalDescription(rentalData);
      }
      if (rentalData.date || rentalData.time) {
        const startTime = parseDate(`${rentalData.date} ${rentalData.time}`, 'YYYY-MM-DD HH:mm');
        const endTime = startTime.add(rentalData.duration || CONSTANTS.DEFAULTS.RENTAL_DURATION, 'hour');
        event.start = { dateTime: startTime.toISOString(), timeZone: config.timezone };
        event.end = { dateTime: endTime.toISOString(), timeZone: config.timezone };
      }

      const currentDiscordInfo = this.getDiscordInfo(event);
      event.extendedProperties = {
        private: {
          discord_info: JSON.stringify({
            guild_id: currentDiscordInfo.guild_id,
            channel_id: currentDiscordInfo.channel_id,
            creator_id: currentDiscordInfo.creator_id,
            event_type: 'venue_rental',
            renter_name: rentalData.renter_name || currentDiscordInfo.renter_name,
            registrar_id: currentDiscordInfo.registrar_id,
            registrar_name: currentDiscordInfo.registrar_name,
          }),
        },
      };

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: event,
      });

      console.log(`✅ 租借事件已更新: ${eventId}`);
      return response.data;
    } catch (error) {
      console.error('❌ 更新租借事件失敗:', error);
      throw new Error(`更新租借事件失敗: ${error.message}`);
    }
  }

  /**
   * 查詢租借事件列表
   * @param {string} timeMin - 開始時間 (ISO 格式)
   * @param {string} timeMax - 結束時間 (ISO 格式)
   * @returns {Promise<Array>} - 租借事件列表
   */
  async listRentals(timeMin, timeMax) {
    try {
      const events = await this.listMeetings(timeMin, timeMax);
      return events.filter(event => {
        const discordInfo = this.getDiscordInfo(event);
        return discordInfo.event_type === 'venue_rental';
      }).map(event => this.parseMeetingEvent(event));
    } catch (error) {
      console.error('❌ 查詢租借列表失敗:', error);
      throw new Error(`查詢租借列表失敗: ${error.message}`);
    }
  }

  /**
   * 檢查 TRB 場地時間衝突
   * @param {string} startTime - 開始時間 (ISO 格式)
   * @param {string} endTime - 結束時間 (ISO 格式)
   * @param {string} [excludeEventId] - 排除的事件 ID（編輯時使用）
   * @returns {Promise<Object>} - 衝突資訊 { hasConflict, conflicts }
   */
  async checkVenueConflicts(startTime, endTime, excludeEventId = null) {
    try {
      const events = await this.listMeetings(startTime, endTime);
      const conflicts = events.filter(event => {
        if (excludeEventId && event.id === excludeEventId) return false;
        return event.location && event.location.toUpperCase().includes('TRB');
      });

      return {
        hasConflict: conflicts.length > 0,
        conflicts: conflicts,
      };
    } catch (error) {
      console.error('❌ 檢查場地衝突失敗:', error);
      return { hasConflict: false, conflicts: [] };
    }
  }

  /**
   * 格式化租借描述
   * @param {Object} data - 租借資料
   * @returns {string} - 格式化的描述
   */
  formatRentalDescription(data) {
    return `=== 活動內容 ===
${data.content || '無'}

=== 租借資訊 ===
租借人: ${data.renter_name || '未設定'}
登記者: @${data.registrar_name || '未設定'}`;
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
      // 租借事件額外欄位
      event_type: discordInfo?.event_type || null,
      renter_name: discordInfo?.renter_name || null,
      registrar_id: discordInfo?.registrar_id || null,
      registrar_name: discordInfo?.registrar_name || null,
    };
  }
}

export default CalendarService;
