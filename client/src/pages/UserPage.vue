<template>
    <q-card class="user-page">
        <q-card-section class="bg-primary text-white user-metadata">
            <div class="user-metadata-name">{{ name }}</div>
            <div v-if="email" class="user-metadata-email text-grey-5">{{ email }}</div>
            <div v-if="steamWebAPIToken" class="user-metadata-token text-grey-5">Steam Web API token: {{ steamWebAPIToken }}</div>
        </q-card-section>
        <q-card-section class="user-content">
            {{ externalUser?.username }}
            {{ userId }}
            <q-tabs
            v-model="tab"
            dense
            class="bg-grey-2 text-grey-7"
            active-color="primary"
            indicator-color="purple"
            align="justify"
            >
                <q-tab name="friends" label="Friends" />
                <q-tab name="games" label="Library" />
                <q-tab name="achievements" label="Achievements" />
                <q-tab name="favorites" label="Favorites" />
            </q-tabs>
            <q-tab-panels v-model="tab" animated class="bg-primary text-white">

                <q-tab-panel name="friends">
                    <PlayerCardList v-if="userData.friends?.length" :players="userData.friends"/>
                    <q-spinner-dots v-else-if="loading" color="white" size="40px" />
                    <div v-else>{{ tabErrorMessage?? "No friends found" }}</div>
                </q-tab-panel>

                <q-tab-panel name="games">
                    <q-splitter v-model="gamesSplit" before-class="user-library-inner-tabs">
                        <template v-slot:before>
                            <q-tabs
                            v-model="gamesTab"
                            vertical
                            class="bg-grey-2 text-grey-7"
                            active-color="primary"
                            indicator-color="purple"
                            align="justify"
                            stretch
                            >
                                <q-tab name="allGames" label="All"/>
                                <q-tab name="recentGames" label="Recently played"/>
                                <q-tab name="forgottenGames" label="Forgotten"/>
                            </q-tabs>
                        </template>
                        <template v-slot:after>
                            <q-tab-panels v-model="gamesTab" animated class="bg-primary text-white">
                                <q-tab-panel name="allGames" class="user-library-inner-content">
                                    <AppCardList v-if="userData.games?.length" :apps="userData.games"/>
                                    <q-spinner-dots v-else-if="loading" color="white" size="40px" />
                                    <div v-else>{{ tabErrorMessage?? "No games found" }}</div>
                                </q-tab-panel>
                                <q-tab-panel name="recentGames" class="user-library-inner-content">
                                    <AppCardList v-if="userData.recent?.length" :apps="userData.recent"/>
                                    <q-spinner-dots v-else-if="loading" color="white" size="40px" />
                                    <div v-else>{{ tabErrorMessage?? "No games played recently" }}</div>
                                </q-tab-panel>
                                <q-tab-panel name="forgottenGames" class="user-library-inner-content">
                                    <AppCardList v-if="userData.forgotten?.length" :apps="userData.forgotten"/>
                                    <q-spinner-dots v-else-if="loading" color="white" size="40px" />
                                    <div v-else>{{ tabErrorMessage?? "No games found" }} </div>
                                </q-tab-panel>
                            </q-tab-panels>
                        </template>
                    </q-splitter>
                </q-tab-panel>

                <q-tab-panel name="achievements">
                    <q-infinite-scroll ref="scrollTargetRef" v-if="userData.games?.length"
                        class="achievements-infscr"
                        :disable="!userData.games?.length"
                        @load="loadAchievements"
                        :scroll-target="scrollTargetRef"
                    >
                        <div v-for="(item, index) in userData.achievements" :key="item.apiName || index">
                            <AchievementCard
                                :appName="item.appName"
                                :name="item.name"
                                :unlockedAt="item.unlockTime"
                            />
                        </div>
                        <template v-slot:loading>
                            <div class="row justify-center q-my-md">
                                <q-spinner-dots color="white" size="40px" />
                            </div>
                        </template>
                    </q-infinite-scroll>
                    <div v-else> {{ tabErrorMessage?? "Cannot retrieve achievements without loading the game list" }}</div>

                </q-tab-panel>

                <q-tab-panel name="favorites">
                    <q-splitter v-model="favoritesSplit" before-class="user-library-inner-tabs">
                        <template v-slot:before>
                            <q-tabs
                            v-model="favoritesTab"
                            vertical
                            class="bg-grey-2 text-grey-7"
                            active-color="primary"
                            indicator-color="purple"
                            align="justify"
                            stretch
                            >
                                <q-tab name="genres" label="Genres"/>
                                <q-tab name="categories" label="Categories"/>
                            </q-tabs>
                        </template>
                        <template v-slot:after>
                            <q-tab-panels v-model="favoritesTab" animated class="bg-primary text-white">
                                <q-tab-panel name="genres" class="user-library-inner-content">
                                    <GenreCategoryInfoCardList v-if="userData.favorite.genres?.length"
                                        :data="userData.favorite.genres"
                                        sort="desc"/>
                                    <q-spinner-dots v-else-if="loading" color="white" size="40px" />
                                    <div v-else>No favorite genres found</div>
                                </q-tab-panel>
                                <q-tab-panel name="categories" class="user-library-inner-content">
                                    <GenreCategoryInfoCardList v-if="userData.favorite.categories?.length"
                                        :data="userData.favorite.categories"
                                        sort="desc"/>
                                    <q-spinner-dots v-else-if="loading" color="white" size="40px" />
                                    <div v-else>No favorite categories found</div>
                                </q-tab-panel>
                            </q-tab-panels>
                        </template>
                    </q-splitter>
                </q-tab-panel>
            </q-tab-panels>
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useUserTabs } from 'src/composables/useUserTabs';
import { UserData, UserTab, UserGamesTab, IUser } from 'src/composables/types'
import { useAuthStore } from 'src/stores/auth';
import { storeToRefs } from 'pinia';
import PlayerCardList from 'src/components/lists/PlayerCardList.vue';
import AppCardList from 'src/components/lists/AppCardList.vue';
import AchievementCard from 'src/components/cards/AchievementCard.vue';
import { RecentlyPlayedResponse, FriendListResponse, OwnedGamesResponse, FavoriteGenresCategoriesResponse, SteamAPIError, AllPlayerAchievementsResponse } from 'src/clients/responses'
import { IAchievementMetadata } from 'src/components/models';
import GenreCategoryInfoCardList from 'src/components/lists/GenreCategoryInfoCardList.vue';
import { useUserService } from 'src/composables/useUserService';

interface ComponentProps {
    userId?: string
}
const props = defineProps<ComponentProps>()

const EMPTY_USERDATA: UserData = {
    recent: undefined,
    friends: undefined,
    games: undefined,
    achievements: undefined,
    forgotten: undefined,
    favorite: {
        genres: undefined,
        categories: undefined
    }
}
const LOADING_USER: Partial<IUser> = {
    username: '...',
    avatarURL: '',
    steamId: '...'
}

const scrollTargetRef = ref(undefined)
const tab = ref<UserTab>('friends')
const gamesTab = ref<UserGamesTab | null>(null)
const favoritesTab = ref<'genres' | 'categories' | null>(null)
const tabErrorMessage = ref<string | null>(null)
const gamesSplit = ref<number>(20)
const favoritesSplit = ref<number>(20)

const { loadData } = useUserTabs()

const { user: userAccount } = storeToRefs(useAuthStore())
const externalUser = ref<Partial<IUser> | null>(null)

const user = computed(() => externalUser.value?? userAccount.value )
const name = computed(() => user.value.username || '')
const email = computed(() => user.value.email || '')
const steamWebAPIToken = computed(() => user.value.steamWebAPIToken || '')
const steamId = computed(() => user.value.steamId || '')
const loading = ref(false)
const lastApp = ref('')

const userData = ref<UserData>(structuredClone(EMPTY_USERDATA))
// const userData = computed(() => userData.value)

const load = async <T extends UserTab>(tab: T) => {
    loading.value = true;
    switch (tab){
        case 'friends':
            if (userData.value.friends) break
            const friends = await loadData<FriendListResponse>('friends', steamId.value)
            userData.value.friends = friends?.map((friend) => ({
                id: friend.steamid,
                name: friend.steamid.toString(),
                friendSince: new Date(friend.friend_since * 1000)
            }))
            break;
        case 'favorites':
            if (userData.value.favorite.genres && userData.value.favorite.categories) break
            const data = await loadData<FavoriteGenresCategoriesResponse>('favorites', steamId.value)
            if (!data) break

            const { genres, categories } = data
            userData.value.favorite.genres = Object.entries(genres).map(
                ([description, playtime]) => ({description, playtime})
            )
            userData.value.favorite.categories = Object.entries(categories).map(
                ([description, playtime]) => ({description, playtime})
            )
            break;
        case 'games':
            gamesTab.value = 'allGames'
            break;
        default:
            break;
    }
}

const loadGames = async <T extends UserGamesTab>(tab: T) => {
    loading.value = true;
    switch (tab){
        case 'allGames':
            if (userData.value.games) break
            const games = await loadData<OwnedGamesResponse>('allGames', steamId.value, true, true)
            if (!games) break
            userData.value.games = Object.entries(games).map((([id, game]) => ({
                id: parseInt(id),
                name: game.name
            })))
            break;
        case 'recentGames':
            if (userData.value.recent) break
            const recent = await loadData<RecentlyPlayedResponse>('recentGames', steamId.value)
            if (!recent) break
            userData.value.recent = Object.entries(recent).map(([id, metadata]) => ({
                id: parseInt(id),
                name: metadata.name,
                img_icon_url: metadata.img_icon_url,
                playtime_forever: metadata.playtime_forever,
                playtime_2weeks: metadata.playtime_2weeks
            }))
            break;
        case 'forgottenGames':
            if (userData.value.forgotten) break
            const forgotten = await loadData<OwnedGamesResponse>('forgottenGames', steamId.value, false, true)
            if (!forgotten) break
            userData.value.forgotten = Object.entries(forgotten).map((([id, game]) => ({
                id: parseInt(id),
                name: game.name
            })))
            break;
        default:
            break;
    }
}

const loadAchievements = async (index: number, done: (stop?: boolean) => void) => {
    loading.value = true
    if (!userData.value.games){
        loading.value = false
        done()
        return
    }
    const startIndex = Math.min(10 * (index - 1), userData.value.games.length)
    const endIndex = startIndex + 10
    const slicedGames = userData.value.games.slice(startIndex, Math.min(endIndex, userData.value.games.length))

    if (!slicedGames.length){
        loading.value = false
        done(true)
        return
    }

    const data = await loadData<AllPlayerAchievementsResponse>('achievements', steamId.value, slicedGames.map(game => game.id))
    if (!data){
        lastApp.value = slicedGames.slice(-1)[0].name
        loading.value = false
        done()
        return
    }

    const achievementListMetadata = Object.entries(data).reduce((acc: IAchievementMetadata[], [id, achs]) => {
        const game = slicedGames.find((g) => g.id === parseInt(id))
        if (!game) return acc
        acc.push(...achs.map((ach) => ({
            appName: game.name,
            apiName: ach.apiname,
            name: ach.name || ach.apiname,
            unlockTime: new Date(ach.unlocktime * 1000)
        })))
        return acc
    }, [] as IAchievementMetadata[])


    if (!achievementListMetadata.length){
        lastApp.value = slicedGames.slice(-1)[0].name
        loading.value = false;
        done()
        return
    }

    (userData.value.achievements ??= []).push(...achievementListMetadata)
    lastApp.value = achievementListMetadata.slice(-1)[0].appName
    loading.value = false
    done()
}

const getExternalUserData = async (id: string) => {
    loading.value = true
    userData.value = structuredClone(EMPTY_USERDATA)
    externalUser.value = structuredClone(LOADING_USER)
    const { getPlayerSummary } = useUserService()
    const playerSummary = (await getPlayerSummary(id))[id]
    externalUser.value = {
        username: playerSummary.personaname,
        avatarURL: playerSummary.avatarmedium,
        steamId: props.userId,
    }
}

watch(tab, async (newTab) => {
    tabErrorMessage.value = null
    if (!newTab) return
    if (newTab === 'games') gamesSplit.value = 20
    else gamesSplit.value = 0
    try {
        await load(newTab)
    }
    catch (e) {
        tabErrorMessage.value = (e as SteamAPIError).message
    }
    finally {
        loading.value = false
    }
}, {immediate: true})

watch(gamesTab, async (newGamesTab) => {
    tabErrorMessage.value = null
    if (!newGamesTab) return
    try {
        await loadGames(newGamesTab)
    }
    catch (e) {
        tabErrorMessage.value = (e as SteamAPIError).message
    } finally {
        loading.value = false
    }
}, {immediate: true})

watch(() => props.userId, async (newId, oldId) => {
    // tab.value = null
    // gamesTab.value = null
    // favoritesTab.value = null
    tabErrorMessage.value = null
    if (!newId){
        userData.value = structuredClone(EMPTY_USERDATA)
        externalUser.value = null
        try {
            await load(tab.value)
        } catch (e) {
        tabErrorMessage.value = (e as SteamAPIError).message
        } finally {
            loading.value = false
        }
        return
    }
    if (newId !== oldId) try {
        await getExternalUserData(newId as string)
        await load(tab.value)
    } catch (e) {
        tabErrorMessage.value = (e as SteamAPIError).message
    } finally {
        loading.value = false
    }
}, {immediate: true, deep: true})


</script>

<style scoped>
    .user-page {
        width: 100%;
        margin: 16px auto;
        display: grid;
        grid-template-rows: 64px 1fr;
    }
    .user-metadata {
        width: 100%;
        padding: 8px;
        grid-row: 1;
        display: grid;
        grid-template-columns: 1fr 1fr 350px;
    }
    .user-content {
        padding: 8px;
        grid-row: 2;
    }
    .user-metadata-name {
        font-size: 24px;
        place-self: center start;
    }
    .user-metadata-email {
        font-size: 16px;
        place-self: center start;
    }
    .user-metadata-token {
        font-size: 12px;
        place-self: center end;
    }
    .user-library-inner-tabs {
        height: auto;
    }
    .user-library-inner-content {
        padding: 0px 0px 0px 8px
    }
    .achievements-infscr {
        height: calc(100vh - 300px);
        overflow: auto;
    }
</style>
