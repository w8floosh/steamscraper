import dataclasses
from sys import stderr
from quart import Blueprint, request
from httpx import AsyncClient, Timeout

from ..broker import broker
from ..broker.types import RedisCacheTTL, RedisCacheKeyPattern
from ..broker.cache import cached
from ..api.types import SteamStoreAPI, SteamworksAPI
from ..api.utils import build_url, clean_obj, prepare_response

api = Blueprint("store", __name__, url_prefix="/store")


@api.route("", methods=["GET"])
# @cached(RedisCacheKeyPattern.APP_LIST, ttl=RedisCacheTTL.FOREVER)
async def get_app_list(**kwargs):
    injected_client = kwargs.get("session")
    client = injected_client or AsyncClient(timeout=Timeout(timeout=60))

    result = prepare_response(
        await client.get(
            build_url(
                SteamworksAPI.STORE,
                "GetAppList",
                "1",
                request.args.get("key"),
                max_results=request.args.get("max_results", 10000),
                last_appid=request.args.get("last_appid"),
            )
        )
    )
    apps = result.data["response"]["apps"]

    for app in apps:
        id = app.pop("appid")
        result.data.update({id: clean_obj(app, entries=["name", "last_modified"])})

    result.data.pop("response")

    if injected_client is None:
        await client.aclose()
    return dataclasses.asdict(result)


@api.route("details/<appid>", methods=["GET"])
@broker.ping(skip_on_failure=True)
@cached(RedisCacheKeyPattern.APP_DATA, ["appid"], ["details"])
async def get_app_details(appid, **kwargs):
    """Can be executed for multiple apps only for price retrieval"""
    injected_client = kwargs.get("session")
    client = injected_client or AsyncClient()
    filters = request.args.get("filters", kwargs.get("filters"))
    result = prepare_response(
        await client.get(
            build_url(
                SteamStoreAPI.GENERIC,
                "appdetails",
                # appids=request.args.get("appids", kwargs.get("appids")),
                appids=appid,
                filters=filters,
                cc=request.args.get("cc", kwargs.get("cc", "US")),
                language=request.args.get(
                    "language", kwargs.get("language", "english")
                ),
            ),
        )
    )
    for appid, details in result.data.copy().items():
        if not details["success"]:
            result.errors.append(f"App {appid} not found")
            result.data.update({appid: {}})
        elif not details["data"] and filters.find("price_overview"):
            result.errors.append(f"App {appid} is currently free")
            result.data.update({appid: {}})
        else:
            result.data.update(
                {
                    appid: clean_obj(
                        details["data"],
                        entries=["name", "price_overview", "categories", "genres"],
                    )
                }
            )

        if len(result.errors) == len(result.data):
            result.success = False
        elif len(result.errors):
            result.success = "with_warnings"

    if injected_client is None:
        await client.aclose()
    return dataclasses.asdict(result)
