import { api as axios } from 'src/boot/axios';
import {
  AllPlayerAchievementsResponse,
  FriendListResponse,
  ISteamAPIResponse,
  OwnedGamesResponse,
  PlayerAchievementsResponse,
  RecentlyPlayedResponse,
  SteamAPIError,
} from './responses';
import { useAuthStore } from 'src/stores/auth';
import { storeToRefs } from 'pinia';
import { PlayerSummaryResponse } from './responses';

export default new (class UserClient {
  private base_url = '/users';
  private ach_url = '/stats/players';
  async getOwnedGames(
    userId: string,
    include_appinfo?: boolean,
    include_played_free_games?: boolean,
    appids_filter?: string
  ): Promise<ISteamAPIResponse<OwnedGamesResponse>> {
    const url = `${this.base_url}/${userId}/games`;
    const params = {
      include_appinfo,
      include_played_free_games,
      appids_filter,
      key: storeToRefs(useAuthStore()).steamWebAPIToken.value,
    };

    try {
      const response = await axios.get<ISteamAPIResponse<OwnedGamesResponse>>(
        url,
        { params }
      );
      if (response.data.errors.length) {
        throw new SteamAPIError(response.data.errors.join('\n'));
      }
      return response.data;
    } catch (error) {
      console.error('Error retrieving owned games:', error);
      throw error;
    }
  }

  async getPlayerSummary(
    userId: string
  ): Promise<ISteamAPIResponse<PlayerSummaryResponse>> {
    const url = `${this.base_url}/${userId}/summary`;
    const params = {
      key: storeToRefs(useAuthStore()).steamWebAPIToken.value,
    };

    try {
      const response = await axios.get<
        ISteamAPIResponse<PlayerSummaryResponse>
      >(url, { params });
      if (response.data.errors.length)
        throw new SteamAPIError(response.data.errors.join('\n'));
      return response.data;
    } catch (error) {
      console.error('Error retrieving player summary:', error);
      throw error;
    }
  }

  async getRecentlyPlayed(
    userId: string
  ): Promise<ISteamAPIResponse<RecentlyPlayedResponse>> {
    const url = `${this.base_url}/${userId}/recent`;
    const params = {
      key: storeToRefs(useAuthStore()).steamWebAPIToken.value,
    };

    try {
      const response = await axios.get<
        ISteamAPIResponse<RecentlyPlayedResponse>
      >(url, { params });
      if (response.data.errors.length)
        throw new SteamAPIError(response.data.errors.join('\n'));
      return response.data;
    } catch (error) {
      console.error('Error retrieving recently played games:', error);
      throw error;
    }
  }

  async getFriendsList(
    userId: string
  ): Promise<ISteamAPIResponse<FriendListResponse>> {
    const url = `${this.base_url}/${userId}/friends`;
    const params = {
      key: storeToRefs(useAuthStore()).steamWebAPIToken.value,
    };

    try {
      const response = await axios.get<ISteamAPIResponse<FriendListResponse>>(
        url,
        { params }
      );
      if (response.data.errors.length)
        throw new SteamAPIError(response.data.errors.join('\n'));
      return response.data;
    } catch (error) {
      console.error('Error retrieving friends list:', error);
      throw error;
    }
  }

  async getPlayerAchievements(
    userId: string,
    appid: number
  ): Promise<ISteamAPIResponse<PlayerAchievementsResponse>> {
    const url = `${this.ach_url}/${userId}/achievements`;
    const params = {
      appid,
      key: storeToRefs(useAuthStore()).steamWebAPIToken.value,
    };

    try {
      const response = await axios.get<
        ISteamAPIResponse<PlayerAchievementsResponse>
      >(url, { params });
      if (response.data.errors.length)
        throw new SteamAPIError(response.data.errors.join('\n'));
      return response.data;
    } catch (error) {
      console.error('Error retrieving player achievements:', error);
      throw error;
    }
  }

  async getAllPlayerAchievements(
    userId: string,
    appids: number[]
  ): Promise<ISteamAPIResponse<AllPlayerAchievementsResponse>> {
    const url = `${this.ach_url}/${userId}/achievements`;
    const params = {
      key: storeToRefs(useAuthStore()).steamWebAPIToken.value,
    };

    try {
      const response = await axios.post<
        ISteamAPIResponse<AllPlayerAchievementsResponse>
      >(url, { appids }, { params });
      if (response.data.errors.length)
        throw new SteamAPIError(response.data.errors.join('\n'));
      return response.data;
    } catch (error) {
      console.error('Error retrieving all player achievements:', error);
      throw error;
    }
  }
})();
