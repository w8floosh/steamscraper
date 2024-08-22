from math import ceil
from sys import stderr
from typing import Coroutine
from httpx import Response

from .types import (
    APIType,
    CleanMode,
    SteamAPIResponse,
    SteamStoreAPI,
)

from ..broker.types import RedisMessage


def _extract_query(key, *route, **kwargs):
    query = ""
    if bool(route):
        for param in route:
            query = "/".join([query, param])
    if not bool(kwargs):
        return query

    query += "?"
    if bool(key):
        query += f"key={key}"

    args = ""
    for arg, value in kwargs.items():
        if value is not None:
            args = "&".join([args, f"{arg}={value}"])

    return "".join([query, args])


def prepare_response(response: Response):
    if response.status_code == 200:
        return SteamAPIResponse(True, response.json())
    else:
        return SteamAPIResponse(False, {}, [response.text])


def clean_obj(obj: dict, clean_mode: CleanMode = "take", entries: list = []):
    if entries:
        for key in entries:
            if not key in obj.keys():
                entries.remove(key)
        if clean_mode == "take":
            to_remove_list = list(set(obj.keys()) - set(entries))
        else:
            to_remove_list = list(set(obj.keys()) - (set(obj.keys()) - set(entries)))
        for el in to_remove_list:
            obj.pop(el)
    return obj


async def set_payload_from_requests(
    message: RedisMessage, requests, do: Coroutine, batch_size=None, *args
):
    nreq = len(requests)
    if not batch_size:
        await do(message, requests, *args)
        return message

    for batch in range(ceil(nreq / batch_size)):
        batch_start = batch * batch_size
        batch_end = min((batch + 1) * batch_size, nreq)
        await do(message, requests[batch_start:batch_end], *args)
    return message


def build_url(interface: APIType, call: str, version="0002", key="", *route, **kwargs):
    if any(interface.name is x for x in SteamStoreAPI.__members__):
        url = f"https://store-steampowered/{interface.value}/{call}{_extract_query(None, *route, **kwargs)}"
    else:
        url = f"http://api-steampowered/{interface.value}/{call}/v{version}{_extract_query(key, **kwargs)}"
    return url
