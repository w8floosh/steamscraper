import asyncio
import dataclasses
from sys import stderr
from quart import Blueprint, request
from httpx import AsyncClient


from ..broker import broker
from ..broker.types import (
    RedisMessageType,
    RedisMessage,
)
from ..broker.utils import send_request, get_response
from ..api.types import DEFAULT_API_CLIENT_LIMITS
from ..api.stats import get_player_achievements
from ..api.store import get_app_details
from ..api.users import get_owned_games
from ..api.utils import (
    clean_obj,
    set_payload_from_requests,
)


api = Blueprint("playerstats", __name__, url_prefix="/compute/stats/players")


@api.route("/<userid>/gamerscore", methods=["GET"])
@broker.ping()
async def get_achievement_score(userid, **kwargs):
    async def set_callback(message: RedisMessage, requests):
        responses = await asyncio.gather(*requests)
        for result in responses:
            data: dict = result.get("data")
            if data:
                key = list(data.keys())[0]
                message.payload["games"].update({key: data.pop(key)})

    requester = kwargs.get("custom_req_data", {}).get("requester")
    message = RedisMessage(
        RedisMessageType.USER_ACHIEVEMENTS_SCORE.value, requester or userid
    )

    injected_client = kwargs.get("session")
    client = injected_client or AsyncClient(limits=DEFAULT_API_CLIENT_LIMITS)
    owned = await get_owned_games(
        userid,
        key=request.args.get("key"),
        include_played_free_games=1,
        session=client,
        custom_req_data={"userid": userid},
    )
    if owned.get("success") is not True:
        return owned
    message.payload.update({"steamid": userid, "games": dict()})
    requests = [
        get_player_achievements(
            userid,
            key=request.args.get("key"),
            appid=game,
            session=client,
            custom_req_data={"userid": userid, "appid": game},
        )
        for game in owned["data"]
    ]

    message = await set_payload_from_requests(
        message, requests, set_callback, DEFAULT_API_CLIENT_LIMITS.max_connections
    )

    # publish message to Redis
    reqid = await send_request(message)

    response = await get_response(userid)

    if injected_client is None:
        await client.aclose()
    return dataclasses.asdict(response)


async def get_achievement_score_from_userid_list(userids, **kwargs):
    async def set_callback(scores: list, requests):
        calls = [req["call"] for req in requests]
        responses = await asyncio.gather(*calls)
        for idx, result in enumerate(responses):
            data = result.get("data", {})
            try:
                scores.append(
                    {
                        "steamid": requests[idx].get("steamid"),
                        "score": data["score"],
                    }
                )
            except:
                continue

    injected_client = kwargs.get("session")
    client = injected_client or AsyncClient(limits=DEFAULT_API_CLIENT_LIMITS)

    requests = [
        {
            "call": get_achievement_score(
                userid,
                key=request.args.get("key"),
                session=client,
                custom_req_data={"userid": userid},
            ),
            "steamid": userid,
        }
        for userid in userids
    ]

    return await set_payload_from_requests(
        [], requests, set_callback, DEFAULT_API_CLIENT_LIMITS.max_connections
    )


@api.route("/<userid>/favorite", methods=["GET"])
@broker.ping()
async def get_user_favorite_genres_categories(userid):
    async def set_callback(message: RedisMessage, requests, owned: dict):
        responses = await asyncio.gather(*requests)
        for res in responses:
            if len(res["errors"]):
                continue
            for appid, details in res["data"].items():
                if (
                    not details
                    or not details.get("genres")
                    or not details.get("categories")
                ):
                    continue
                if owned.get(appid) is None and owned.get(int(appid)) is None:
                    continue
                game = owned.get(appid) or owned.get(int(appid))
                message.payload.update(
                    {
                        appid: {
                            "genres": details["genres"],
                            "categories": details["categories"],
                            "playtime": game["playtime_forever"],
                        }
                    }
                )

    message = RedisMessage(
        RedisMessageType.USER_FAVORITE_GENRES_CATEGORIES.value, userid
    )

    async with AsyncClient(limits=DEFAULT_API_CLIENT_LIMITS) as session:
        owned = await get_owned_games(
            userid,
            key=request.args.get("key"),
            include_played_free_games=1,
            session=session,
            custom_req_data={"userid": userid},
        )
        if owned.get("success") is not True:
            return owned
        requests = [
            get_app_details(game, session=session, custom_req_data={"appid": game})
            for game in owned["data"]
        ]

        message = await set_payload_from_requests(
            message,
            requests,
            set_callback,
            DEFAULT_API_CLIENT_LIMITS.max_connections,
            owned["data"],
        )
        # publish message to Redis

        reqid = await send_request(message)

        response = await get_response(userid)

        return dataclasses.asdict(response)


@api.route("/<userid>/forgotten", methods=["GET"])
@broker.ping()
async def get_user_forgotten_games(userid):
    message = RedisMessage(RedisMessageType.USER_FORGOTTEN_GAMES.value, userid)

    async with AsyncClient(limits=DEFAULT_API_CLIENT_LIMITS) as session:
        owned = await get_owned_games(
            userid,
            key=request.args.get("key"),
            include_appinfo=1,
            session=session,
            custom_req_data={"userid": userid},
        )
        if owned.get("success") is not True:
            return owned

        for game, data in owned["data"].items():
            message.payload.update(
                {
                    game: clean_obj(
                        data, entries=["name", "playtime_forever", "rtime_last_played"]
                    ),
                }
            )

    # publish message to Redis
    reqid = await send_request(message)

    response = await get_response(userid)
    return dataclasses.asdict(response)
