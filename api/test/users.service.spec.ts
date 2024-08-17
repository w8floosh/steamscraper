import { UsersService } from '../src/services/users.service';
import { RedisMessageParsed, RedisMessageType } from '../src/types';
import { describe, it, expect, jest } from '@jest/globals'

describe('UsersService', () => {
    describe('getUserAchievementsScore', () => {
        it('should return the user achievements score', () => {
            const input: any = {
                steamid: '123',
                games: {
                    'game1': [
                        { 'name': 'achievement1' },
                        { 'name': 'achievement2' },
                    ],
                    'game2': [
                        { 'name': 'achievement1' },
                        { 'name': 'achievement2' },
                    ],
                    'game3': [
                        { 'name': 'achievement1' },
                        { 'name': 'achievement2' },
                    ],
                }
            }
            const data: RedisMessageParsed = {
                type: parseInt(RedisMessageType.USER_ACHIEVEMENTS_SCORE),
                consumer: 'consumer',
                requester: 'requester',
                id: 'id',
                payload: input
            };
            const spy = jest.spyOn(UsersService.prototype as any, 'getUserAchievementsScore')
            const getUserAchievementsScore = spy.getMockImplementation();
            const result = getUserAchievementsScore(data);
            expect(result.payload.data.score).toBe(6);
            expect(result.payload.data.steamid).toBe('123');
            
        });

        it('should return a partial user achievements score when some games do not have an array key', () => {
            const input: any = {
                steamid: '123',
                games: {
                    'game1': {},
                    'game2': 42,
                    'game3': [
                        { 'name': 'achievement1' },
                        { 'name': 'achievement2' },
                    ],
                }
            }
            const data: RedisMessageParsed = {
                type: parseInt(RedisMessageType.USER_ACHIEVEMENTS_SCORE),
                consumer: 'consumer',
                requester: 'requester',
                id: 'id',
                payload: input
            };
            const spy = jest.spyOn(UsersService.prototype as any, 'getUserAchievementsScore')
            const getUserAchievementsScore = spy.getMockImplementation();
            const result = getUserAchievementsScore(data);
            expect(result.payload.data.score).toBe(2);
            expect(result.payload.data.steamid).toBe('123'); 
        });
    });
    describe('getUserFavoriteGenresCategories', () => {
        it("should return the user's favorite genres and categories of games", () => {
            const input: any = {
                '10': {
                    playtime: 100,
                    genres: [
                        { description: 'genre1' },
                        { description: 'genre2' },
                    ],
                    categories: [
                        { description: 'category1' },
                        { description: 'category2' },
                    ]
                },
                '20': {
                    playtime: 200,
                    genres: [ 
                        { description: 'genre2' },
                        { description: 'genre3' },
                    ],
                    categories: [
                        { description: 'category2' },
                        { description: 'category3' },
                    ]
                },
                '30': {
                    playtime: 300,
                    genres: [
                        { description: 'genre3' },
                        { description: 'genre4' },
                    ],
                    categories: [
                        { description: 'category1' },
                        { description: 'category4' },
                    ]
                }
            }
            const data: RedisMessageParsed = {
                type: parseInt(RedisMessageType.USER_FAVORITE_GENRES_CATEGORIES),
                consumer: 'consumer',
                requester: 'requester',
                id: 'id',
                payload: input
            };
            const spy = jest.spyOn(UsersService.prototype as any, 'getUserFavoriteGenresCategories')
            const getUserFavoriteGenresCategories = spy.getMockImplementation();
            const result = getUserFavoriteGenresCategories(data);
            expect(result.payload.data.genres["genre1"]).toBe(100)
            expect(result.payload.data.genres["genre2"]).toBe(300)
            expect(result.payload.data.genres["genre3"]).toBe(500)
            expect(result.payload.data.genres["genre4"]).toBe(300)

            expect(result.payload.data.categories["category1"]).toBe(400)
            expect(result.payload.data.categories["category2"]).toBe(300)
            expect(result.payload.data.categories["category3"]).toBe(200)
            expect(result.payload.data.categories["category4"]).toBe(300) 
        });

        it('should return an empty payload when game list is empty', () => {
            const input: any = {}
            const data: RedisMessageParsed = {
                type: parseInt(RedisMessageType.USER_FAVORITE_GENRES_CATEGORIES),
                consumer: 'consumer',
                requester: 'requester',
                id: 'id',
                payload: input
            };
            const spy = jest.spyOn(UsersService.prototype as any, 'getUserFavoriteGenresCategories')
            const getUserFavoriteGenresCategories = spy.getMockImplementation();
            const result = getUserFavoriteGenresCategories(data);
            expect(result.payload.data.genres).toEqual({});
            expect(result.payload.data.categories).toEqual({}); 
        });
    });
    describe('getUserForgottenGames', () => {
        it("should return the user's forgotten games", () => {
            const input: any = {
                '10': {
                    playtime_forever: 100,
                    rtime_last_played: new Date(2024, 8, 17).getTime() / 1000
                },
                '20': {
                    playtime_forever: 1000,
                    rtime_last_played: new Date(2023, 5, 17).getTime() / 1000
                },
                '30': {
                    playtime_forever: 4000,
                    rtime_last_played: new Date(2022, 2, 22).getTime() / 1000
                },
                '40': {
                    playtime_forever: 0,
                    rtime_last_played: undefined
                }
            }
            console.log(input)
            const data: RedisMessageParsed = {
                type: parseInt(RedisMessageType.USER_FORGOTTEN_GAMES),
                consumer: 'consumer',
                requester: 'requester',
                id: 'id',
                payload: input
            };
            const spy = jest.spyOn(UsersService.prototype as any, 'getUserForgottenGames')
            const getUserForgottenGames = spy.getMockImplementation();
            const result = getUserForgottenGames(data);
            expect(result.payload.data['10']).toBeUndefined()
            expect(result.payload.data['20']).not.toBeUndefined()
            expect(result.payload.data['30']).not.toBeUndefined() 
            expect(result.payload.data['40']).not.toBeUndefined()
        });

        it('should return an empty payload when all games have either non-zero playtime_forever or 1+ year old rtime_last_played timestamp', () => {
            const input: any = {
                '10': {
                    playtime_forever: 100,
                    rtime_last_played: new Date(2024, 8, 17).getTime() / 1000
                },
                '20': {
                    playtime_forever: 1000,
                    rtime_last_played: new Date(2024, 7, 17).getTime() / 1000
                },
                '30': {
                    playtime_forever: 4000,
                    rtime_last_played: new Date(2024, 6, 17).getTime() / 1000
                },
                '40': {
                    playtime_forever: 5,
                    rtime_last_played: new Date(2024, 5, 17).getTime() / 1000
                }
            }
            const data: RedisMessageParsed = {
                type: parseInt(RedisMessageType.USER_FAVORITE_GENRES_CATEGORIES),
                consumer: 'consumer',
                requester: 'requester',
                id: 'id',
                payload: input
            };
            const spy = jest.spyOn(UsersService.prototype as any, 'getUserForgottenGames')
            const getUserForgottenGames = spy.getMockImplementation();
            const result = getUserForgottenGames(data);
            expect(result.payload.data['10']).toBeUndefined()
            expect(result.payload.data['20']).toBeUndefined()
            expect(result.payload.data['30']).toBeUndefined() 
            expect(result.payload.data['40']).toBeUndefined()
            expect(Object.entries(result.payload.data).length).toBe(0)
        });
    });
});