"""Pengambilan data dari API resmi Fantasy Premier League."""
import json, os, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

API = "https://fantasy.premierleague.com/api/"


def get_json(path, retries=4):
    for i in range(retries):
        try:
            req = urllib.request.Request(API + path, headers={"User-Agent": "Mozilla/5.0"})
            return json.loads(urllib.request.urlopen(req, timeout=30).read())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(1.5 * (i + 1))
        except Exception:
            time.sleep(1.5 * (i + 1))
    return None


def fetch_all(out, workers=8):
    """Unduh bootstrap, jadwal, dan riwayat tiap pemain yang pernah bermain. Mengembalikan (berhasil, total)."""
    os.makedirs(os.path.join(out, "el"), exist_ok=True)
    bs, fx = get_json("bootstrap-static/"), get_json("fixtures/")
    if not bs or not fx:
        raise RuntimeError("Data FPL tidak bisa diambil. Coba lagi beberapa menit lagi.")
    json.dump(bs, open(os.path.join(out, "bs.json"), "w"))
    json.dump(fx, open(os.path.join(out, "fx.json"), "w"))
    ids = [e["id"] for e in bs["elements"] if e["minutes"] > 0]

    def one(pid):
        d = get_json(f"element-summary/{pid}/")
        if d is None:
            return False
        json.dump(d, open(os.path.join(out, "el", f"{pid}.json"), "w"))
        return True

    with ThreadPoolExecutor(workers) as ex:
        ok = sum(ex.map(one, ids))
    return ok, len(ids)


def fetch_entry(team_id, gw):
    """Skuad sebuah tim FPL pada gameweek tertentu (data publik). None jika tidak ditemukan."""
    info = get_json(f"entry/{team_id}/", retries=2)
    if not info:
        return None
    picks = None
    for g in (gw, gw - 1):
        if g >= 1:
            picks = get_json(f"entry/{team_id}/event/{g}/picks/", retries=2)
            if picks:
                break
    if not picks:
        return None
    return dict(
        name=info.get("name", ""),
        manager=f"{info.get('player_first_name', '')} {info.get('player_last_name', '')}".strip(),
        ids=[p["element"] for p in picks["picks"]],
        bank=picks.get("entry_history", {}).get("bank", 0),
        gw=g,
    )
