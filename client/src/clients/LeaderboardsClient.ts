import { api as axios } from 'src/boot/axios';
import { ISteamAPIResponse, SteamAPIError } from './responses';
import { useAuthStore } from 'src/stores/auth';
import { storeToRefs } from 'pinia';

export default new (class LeaderboardsClient {
  private base_url =
    axios.defaults.baseURL + '/compute/stats/leaderboards/friends';

  async getAchievementScoreFriendsLeaderboard(
    userId: string
  ): Promise<ISteamAPIResponse> {
    const url = `${this.base_url}/${userId}/gamerscore`;
    const params = {
      key: storeToRefs(useAuthStore()).steamWebAPIToken.value,
    };

    try {
      const response = await axios.get<ISteamAPIResponse>(url, { params });
      if (response.data.errors.length)
        throw new SteamAPIError(response.data.errors.join('\n'));
      return response.data;
    } catch (error) {
      console.error(
        'Error retrieving achievement score friends leaderboard:',
        error
      );
      throw error;
    }
  }

  async getPlaytimeFriendsLeaderboard(
    userId: string
  ): Promise<ISteamAPIResponse> {
    const url = `${this.base_url}/${userId}/playtime`;
    const params = {
      key: storeToRefs(useAuthStore()).steamWebAPIToken.value,
    };

    try {
      const response = await axios.get<ISteamAPIResponse>(url, { params });
      if (response.data.errors.length)
        throw new SteamAPIError(response.data.errors.join('\n'));
      return response.data;
    } catch (error) {
      console.error('Error retrieving playtime friends leaderboard:', error);
      throw error;
    }
  }

  async getVersatilityScoreFriendsLeaderboard(
    userId: string
  ): Promise<ISteamAPIResponse> {
    const url = `${this.base_url}/${userId}/versatility`;
    const params = {
      key: storeToRefs(useAuthStore()).steamWebAPIToken.value,
    };

    try {
      const response = await axios.get<ISteamAPIResponse>(url, { params });
      if (response.data.errors.length)
        throw new SteamAPIError(response.data.errors.join('\n'));
      return response.data;
    } catch (error) {
      console.error(
        'Error retrieving versatility score friends leaderboard:',
        error
      );
      throw error;
    }
  }
})();
