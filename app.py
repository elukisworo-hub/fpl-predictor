"""Prediksi Poin FPL — aplikasi Streamlit. Jalankan: streamlit run app.py"""
import html
import shutil
import tempfile
import time
from datetime import datetime, timedelta

import altair as alt
import pandas as pd
import streamlit as st



# ===== pengambilan data =====
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

# ===== model prediksi =====
"""Model prediksi poin FPL (expected points / xP) berbasis komponen.

Pakai:
  python3 model.py <folder_data> backtest          -> uji model pada GW yang sudah lewat
  python3 model.py <folder_data> build <out.json>  -> hasilkan data prediksi untuk web app
"""
import json, math, os, sys
from collections import defaultdict

HORIZON = 6
DECAY = 0.88          # bobot pertandingan lama (per pertandingan ke belakang)
PRIOR_MIN = 450       # menit "prior" untuk menstabilkan xG/xA pemain bermenit sedikit
POS = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}
DC_THRESHOLD = {2: 10, 3: 12, 4: 12}


def load(folder):
    bs = json.load(open(os.path.join(folder, "bs.json")))
    fx = json.load(open(os.path.join(folder, "fx.json")))
    hist = {}
    for e in bs["elements"]:
        p = os.path.join(folder, "el", f"{e['id']}.json")
        hist[e["id"]] = json.load(open(p))["history"] if os.path.exists(p) else []
    return bs, fx, hist


def pois_floor_half(lam):
    """E[floor(X/2)] untuk X ~ Poisson(lam)."""
    tot, p = 0.0, math.exp(-lam)
    for k in range(0, 15):
        tot += (k // 2) * p
        p *= lam / (k + 1)
    return tot


def team_model(fx, hist, asof):
    """Kekuatan serang/bertahan tiap tim dari gol + xG, disesuaikan lawan."""
    xg = defaultdict(float)  # (fixture, team) -> xG
    fxmap = {f["id"]: f for f in fx}
    for pid, hs in hist.items():
        for h in hs:
            if h["round"] <= asof:
                f = fxmap[h["fixture"]]
                team = f["team_h"] if h["was_home"] else f["team_a"]
                xg[(h["fixture"], team)] += float(h["expected_goals"])
    games = []  # (home, away, g_home, g_away)
    for f in fx:
        if f["event"] and f["event"] <= asof and f["finished"]:
            gh = 0.7 * xg[(f["id"], f["team_h"])] + 0.3 * f["team_h_score"]
            ga = 0.7 * xg[(f["id"], f["team_a"])] + 0.3 * f["team_a_score"]
            games.append((f["team_h"], f["team_a"], gh, ga))
    teams = sorted({t for g in games for t in g[:2]})
    mu = sum(g[2] + g[3] for g in games) / (2 * len(games))
    hf = math.sqrt(sum(g[2] for g in games) / max(1e-9, sum(g[3] for g in games)))
    hf = 1 + (hf - 1) * 0.7
    att = {t: 1.0 for t in teams}; dfn = {t: 1.0 for t in teams}
    K = 4  # pertandingan prior di rata-rata liga
    for _ in range(30):
        na, nd = {}, {}
        for t in teams:
            num = den = num2 = den2 = 0.0
            for h, a, gh, ga in games:
                if h == t:
                    num += gh; den += mu * hf * dfn[a]; num2 += ga; den2 += mu / hf * att[a]
                elif a == t:
                    num += ga; den += mu / hf * dfn[h]; num2 += gh; den2 += mu * hf * att[h]
            na[t] = (num + K * mu) / (den + K * mu)
            nd[t] = (num2 + K * mu) / (den2 + K * mu)
        att, dfn = na, nd
    return mu, hf, att, dfn


def lam(tm, team, opp, home):
    mu, hf, att, dfn = tm
    return mu * (hf if home else 1 / hf) * att.get(team, 1) * dfn.get(opp, 1)


def player_rates(bs, fx, hist, asof):
    """Rate per-90 tiap pemain (berbobot ke pertandingan terbaru) + proyeksi menit."""
    team_rounds = defaultdict(list)  # team -> daftar fixture id selesai, urut waktu
    for f in sorted(fx, key=lambda f: f["kickoff_time"] or ""):
        if f["event"] and f["event"] <= asof and f["finished"]:
            team_rounds[f["team_h"]].append(f["id"]); team_rounds[f["team_a"]].append(f["id"])
    raw = {}
    for e in bs["elements"]:
        hs = [h for h in hist[e["id"]] if h["round"] <= asof]
        hs.sort(key=lambda h: h["kickoff_time"])
        n = len(hs)
        acc = defaultdict(float)
        dc_hit = dc_n = 0.0
        for i, h in enumerate(hs):
            w = DECAY ** (n - 1 - i)
            m = h["minutes"]
            acc["min"] += w * m
            acc["xg"] += w * (0.8 * float(h["expected_goals"]) + 0.2 * h["goals_scored"])
            acc["xa"] += w * (0.8 * float(h["expected_assists"]) + 0.2 * h["assists"])
            acc["sv"] += w * h["saves"]; acc["bo"] += w * h["bonus"]
            acc["card"] += w * (h["yellow_cards"] + 3 * h["red_cards"])
            if m >= 60 and e["element_type"] in DC_THRESHOLD:
                dc_n += w; dc_hit += w * (h["defensive_contribution"] >= DC_THRESHOLD[e["element_type"]])
        # menit: 5 laga terakhir tim SAAT INI (laga tanpa main = 0)
        by_fx = {h["fixture"]: h["minutes"] for h in hs}
        last = team_rounds[e["team"]][-5:][::-1]
        wts = [0.30, 0.25, 0.20, 0.15, 0.10][: len(last)]
        sw = sum(wts) or 1
        mins = [by_fx.get(f, 0) for f in last]
        raw[e["id"]] = dict(
            acc=acc, dc_hit=dc_hit, dc_n=dc_n,
            emin=sum(w * m for w, m in zip(wts, mins)) / sw,
            pplay=sum(w * (m > 0) for w, m in zip(wts, mins)) / sw,
            p60=sum(w * (m >= 60) for w, m in zip(wts, mins)) / sw,
        )
    # prior per posisi & kisaran harga
    rates = {}
    els = bs["elements"]
    for e in els:
        r = raw[e["id"]]; a = r["acc"]
        peers = [raw[o["id"]]["acc"] for o in els
                 if o["element_type"] == e["element_type"] and abs(o["now_cost"] - e["now_cost"]) <= 10]
        pm = sum(p["min"] for p in peers) or 1
        def shr(key, prior_min=PRIOR_MIN):
            prior = sum(p[key] for p in peers) / pm
            return (a[key] + prior * prior_min) / (a["min"] + prior_min) * 90
        pos_dc = [raw[o["id"]] for o in els if o["element_type"] == e["element_type"]]
        dcp = sum(p["dc_hit"] for p in pos_dc) / (sum(p["dc_n"] for p in pos_dc) or 1)
        rates[e["id"]] = dict(
            xg90=shr("xg"), xa90=shr("xa"), sv90=shr("sv", 180), bo90=shr("bo"), card90=shr("card"),
            pdc=(r["dc_hit"] + dcp * 3) / (r["dc_n"] + 3),
            emin=r["emin"], pplay=r["pplay"], p60=r["p60"],
        )
    return rates


def availability(e, k):
    """Peluang tersedia pada GW ke-k dari sekarang (k=0: GW berikutnya)."""
    c = e.get("chance_of_playing_next_round")
    st = e.get("status")
    if st == "u":
        return 0.0
    if c is None:
        return 1.0
    c /= 100
    if c == 0:
        return [0, 0.2, 0.4, 0.5, 0.6, 0.65][min(k, 5)]
    return c + (1 - c) * min(1, 0.3 * k)


def fixture_xp(e, r, tm, sc, team, opp, home, avail=1.0):
    pos = POS[e["element_type"]]
    lf, la = lam(tm, team, opp, home), lam(tm, opp, team, not home)
    mu, hf, att, dfn = tm
    atk = lf / (mu * att.get(team, 1))  # pengali kemudahan lawan terhadap rata-rata tim
    mins = r["emin"] * avail; pplay = r["pplay"] * avail; p60 = r["p60"] * avail
    m90 = mins / 90
    out = {}
    out["main"] = pplay * sc["short_play"] + p60 * (sc["long_play"] - sc["short_play"])
    out["gol"] = r["xg90"] * m90 * atk * sc["goals_scored"][pos]
    out["assist"] = r["xa90"] * m90 * atk * sc["assists"]
    out["cs"] = sc["clean_sheets"][pos] * math.exp(-la) * p60
    other = r["bo90"] * m90 * (0.6 + 0.4 * atk) - r["card90"] * m90
    if pos in ("GKP", "DEF"):
        mplay = mins / pplay if pplay > 0 else 0
        other -= pplay * pois_floor_half(la * mplay / 90)
    if pos == "GKP":
        sv = r["sv90"] * m90 * math.sqrt(la / mu)
        other += max(0.0, sv / 3 - 0.3 * pplay)
    else:
        other += sc["defensive_contribution"][pos] * r["pdc"] * p60
    out["lain"] = other
    out["xp"] = sum(out.values())
    return out


def predict(bs, fx, hist, asof, n_gw=HORIZON, use_avail=True):
    tm = team_model(fx, hist, asof)
    rates = player_rates(bs, fx, hist, asof)
    sc = bs["game_config"]["scoring"]
    by_team = defaultdict(lambda: defaultdict(list))  # team -> gw -> [(opp, home)]
    for f in fx:
        if f["event"] and asof < f["event"] <= asof + n_gw:
            by_team[f["team_h"]][f["event"]].append((f["team_a"], True))
            by_team[f["team_a"]][f["event"]].append((f["team_h"], False))
    preds = {}
    for e in bs["elements"]:
        r = rates[e["id"]]; per_gw = []
        for k in range(n_gw):
            gw = asof + 1 + k
            av = availability(e, k) if use_avail else 1.0
            comp = defaultdict(float)
            for opp, home in by_team[e["team"]][gw]:
                for key, v in fixture_xp(e, r, tm, sc, e["team"], opp, home, av).items():
                    comp[key] += v
            per_gw.append(dict(comp) if comp else {"xp": 0.0})
        preds[e["id"]] = per_gw
    return preds, tm, rates, by_team


def corr(a, b):
    n = len(a); ma, mb = sum(a) / n, sum(b) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    return cov / math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))


def backtest(bs, fx, hist, last_gw):
    res = []
    for asof in range(4, last_gw):
        preds, *_ = predict(bs, fx, hist, asof, 1, use_avail=False)
        tgt = asof + 1
        P, A, B1, B2 = [], [], [], []
        for e in bs["elements"]:
            hs = hist[e["id"]]
            past = [h for h in hs if h["round"] <= asof]
            if sum(h["minutes"] for h in past) < 90:
                continue
            actual = sum(h["total_points"] for h in hs if h["round"] == tgt)
            P.append(preds[e["id"]][0]["xp"]); A.append(actual)
            B1.append(sum(h["total_points"] for h in past) / max(1, len(past)))
            recent = sorted(past, key=lambda h: h["kickoff_time"])[-4:]
            B2.append(sum(h["total_points"] for h in recent) / len(recent))
        mae = lambda X: sum(abs(x - y) for x, y in zip(X, A)) / len(A)
        # rata-rata poin aktual dari 30 pemain teratas menurut tiap metode
        top = lambda X: sum(a for _, a in sorted(zip(X, A), reverse=True)[:30]) / 30
        res.append((tgt, len(A), corr(P, A), corr(B1, A), corr(B2, A), mae(P), mae(B1), mae(B2), top(P), top(B1), top(B2)))
    return res


def build(bs, fx, hist, asof, out):
    preds, tm, rates, by_team = predict(bs, fx, hist, asof)
    mu, hf, att, dfn = tm
    events = {e["id"]: e for e in bs["events"]}
    gws = [g for g in range(asof + 1, asof + 1 + HORIZON) if g in events]
    teams = {}
    for t in bs["teams"]:
        fxs = []
        for g in gws:
            row = []
            for opp, home in by_team[t["id"]][g]:
                lf, la = lam(tm, t["id"], opp, home), lam(tm, opp, t["id"], not home)
                row.append([opp, 1 if home else 0, round(lf, 2), round(la, 2)])
            fxs.append(row)
        teams[t["id"]] = dict(n=t["name"], s=t["short_name"], att=round(att.get(t["id"], 1), 2),
                              dfn=round(dfn.get(t["id"], 1), 2), fx=fxs)
    players = []
    for e in bs["elements"]:
        if e.get("removed"):
            continue
        pg = preds[e["id"]][: len(gws)]
        b = pg[0]
        players.append(dict(
            id=e["id"], n=e["web_name"], fn=(e["first_name"] + " " + e["second_name"]), t=e["team"],
            p=e["element_type"], c=e["now_cost"], sel=float(e["selected_by_percent"]),
            st=e["status"], news=e["news"], ch=e["chance_of_playing_next_round"],
            pts=e["total_points"], form=float(e["form"]), mins=e["minutes"],
            em=round(rates[e["id"]]["emin"]),
            xp=[round(g["xp"], 2) for g in pg],
            br=[round(b.get(k, 0), 2) for k in ("main", "gol", "assist", "cs", "lain")],
        ))
    data = dict(
        updated=max(f["kickoff_time"] for f in fx if f["finished"]),
        gws=[dict(id=g, deadline=events[g]["deadline_time"]) for g in gws],
        teams=teams, players=players,
    )
    # riwayat: prediksi "saat itu" (hanya data sebelum GW tsb) vs poin aktual, maks 8 GW terakhir
    hgws, hp = [], {e["id"]: [] for e in bs["elements"]}
    for a in range(max(4, asof - 8), asof):
        pr, *_ = predict(bs, fx, hist, a, 1, use_avail=False)
        g = a + 1
        hgws.append(dict(id=g, avg=events[g]["average_entry_score"], top=events[g]["highest_score"]))
        for e in bs["elements"]:
            hs = [h for h in hist[e["id"]] if h["round"] == g]
            hp[e["id"]].append([round(pr[e["id"]][0]["xp"], 1), sum(h["total_points"] for h in hs),
                                hs[0]["value"] if hs else None])
    for p in players:
        if any(x[0] or x[1] for x in hp[p["id"]]):
            p["h"] = hp[p["id"]]
    data["hist"] = hgws
    data["chips"] = [dict(name=c["name"], start=c["start_event"], stop=c["stop_event"]) for c in bs.get("chips", [])]
    rs = backtest(bs, fx, hist, asof)
    avg = lambda i: round(sum(r[i] for r in rs) / len(rs), 2)
    data["bt"] = dict(gw=[rs[0][0], rs[-1][0]], r=[avg(2), avg(3), avg(4)], mae=[avg(5), avg(6), avg(7)], top=[avg(8), avg(9), avg(10)]) if rs else None
    if out:
        json.dump(data, open(out, "w"), ensure_ascii=False, separators=(",", ":"))
    return data



# ===== optimasi =====
"""Susunan terbaik, optimasi skuad (ILP), rencana transfer, dan saran chip."""
import pulp

QUOTA = {1: 2, 2: 5, 3: 5, 4: 3}
FORMS = [(3, 4, 3), (3, 5, 2), (4, 4, 2), (4, 3, 3), (4, 5, 1), (5, 4, 1), (5, 3, 2), (5, 2, 3)]
BENCH_W = 0.08


class Ctx:
    """Data siap pakai untuk perhitungan."""

    def __init__(self, D):
        self.D = D
        self.P = {p["id"]: p for p in D["players"]}
        self.teams = {int(k): v for k, v in D["teams"].items()}
        self.pos = {i: p["p"] for i, p in self.P.items()}
        self.team = {i: p["t"] for i, p in self.P.items()}
        self.cost = {i: p["c"] for i, p in self.P.items()}
        self.NG = len(D["gws"])
        self.xpw = [{i: (p["xp"][g] if g < len(p["xp"]) else 0.0) for i, p in self.P.items()} for g in range(self.NG)]
        self.fit = {i for i, p in self.P.items() if p["st"] == "a" or (p["ch"] is not None and p["ch"] >= 75)}
        self.H = D.get("hist", [])
        zero = [0, 0, None]
        self.hpred = [{i: (p["h"][j][0] if "h" in p else 0) for i, p in self.P.items()} for j in range(len(self.H))]
        self.hact = [{i: (p["h"][j][1] if "h" in p else 0) for i, p in self.P.items()} for j in range(len(self.H))]
        self.hcost = [{i: ((p["h"][j][2] if "h" in p else None) or p["c"]) for i, p in self.P.items()} for j in range(len(self.H))]

    def range_xp(self, i, start, n):
        return sum(self.xpw[g][i] for g in range(start, n))


def best_xi(ids, sc, pos):
    by = {1: [], 2: [], 3: [], 4: []}
    for i in ids:
        by[pos[i]].append(i)
    for k in by:
        by[k].sort(key=lambda i: -sc[i])
    best = None
    for f in FORMS:
        xi = by[1][:1] + by[2][: f[0]] + by[3][: f[1]] + by[4][: f[2]]
        tot = sum(sc[i] for i in xi)
        if best is None or len(xi) > len(best["xi"]) or (len(xi) == len(best["xi"]) and tot > best["tot"]):
            best = dict(xi=xi, tot=tot)
    srt = sorted(best["xi"], key=lambda i: -sc[i])
    best["cap"] = srt[0] if srt else None
    best["vice"] = srt[1] if len(srt) > 1 else None
    if best["cap"] is not None:
        best["tot"] += sc[best["cap"]]
    inxi = set(best["xi"])
    rest = [i for i in ids if i not in inxi]
    best["bench"] = [i for i in rest if pos[i] == 1] + sorted([i for i in rest if pos[i] != 1], key=lambda i: -sc[i])
    best["formation"] = "-".join(str(sum(1 for i in best["xi"] if pos[i] == k)) for k in (2, 3, 4))
    return best


def horizon_value(c, ids, n, start=0):
    v = 0.0
    for g in range(start, n):
        sc = c.xpw[g]
        b = best_xi(ids, sc, c.pos)
        v += b["tot"] + BENCH_W * sum(sc[i] for i in b["bench"])
    return v


def squad_problems(c, ids):
    out = []
    if len(ids) != 15:
        out.append(f"Skuad berisi {len(ids)} pemain, seharusnya 15.")
    names = {1: "kiper", 2: "bek", 3: "gelandang", 4: "penyerang"}
    for k, q in QUOTA.items():
        n = sum(1 for i in ids if c.pos[i] == k)
        if n > q:
            out.append(f"Terlalu banyak {names[k]}: {n} dari maksimal {q}.")
    cnt = {}
    for i in ids:
        cnt[c.team[i]] = cnt.get(c.team[i], 0) + 1
    for t, n in cnt.items():
        if n > 3:
            out.append(f"{n} pemain dari {c.teams[t]['n']}, maksimal 3 per klub.")
    return out


def solve_squad(c, scores, cost, budget, pool):
    """Skuad 15 pemain optimal (ILP). scores: daftar dict id->xP, satu per gameweek."""
    G = range(len(scores))
    tot = {i: sum(s[i] for s in scores) for i in pool}
    keep = {i for i in pool if tot[i] > 0}
    for k in QUOTA:  # pemain termurah sebagai pengisi bangku
        keep |= set(sorted((i for i in pool if c.pos[i] == k), key=lambda i: (cost[i], -tot[i]))[:6])
    keep = sorted(keep)
    capc = set(sorted(keep, key=lambda i: -tot[i])[:40])
    m = pulp.LpProblem("skuad", pulp.LpMaximize)
    x = {i: pulp.LpVariable(f"x{i}", cat="Binary") for i in keep}
    s = {(i, g): pulp.LpVariable(f"s{i}_{g}", cat="Binary") for i in keep for g in G}
    k = {(i, g): pulp.LpVariable(f"c{i}_{g}", cat="Binary") for i in capc for g in G}
    m += pulp.lpSum(scores[g][i] * ((1 - BENCH_W) * s[i, g] + BENCH_W * x[i]) for i in keep for g in G) + \
        pulp.lpSum(scores[g][i] * k[i, g] for i in capc for g in G)
    m += pulp.lpSum(cost[i] * x[i] for i in keep) <= budget
    for p, q in QUOTA.items():
        m += pulp.lpSum(x[i] for i in keep if c.pos[i] == p) == q
    for t in {c.team[i] for i in keep}:
        m += pulp.lpSum(x[i] for i in keep if c.team[i] == t) <= 3
    lim = {1: (1, 1), 2: (3, 5), 3: (2, 5), 4: (1, 3)}
    for g in G:
        m += pulp.lpSum(s[i, g] for i in keep) == 11
        m += pulp.lpSum(k[i, g] for i in capc) == 1
        for p, (lo, hi) in lim.items():
            e = pulp.lpSum(s[i, g] for i in keep if c.pos[i] == p)
            m += e >= lo
            m += e <= hi
        for i in keep:
            m += s[i, g] <= x[i]
        for i in capc:
            m += k[i, g] <= s[i, g]
    m.solve(pulp.PULP_CBC_CMD(msg=0, timeLimit=25, gapRel=0.002))
    if pulp.LpStatus[m.status] not in ("Optimal", "Not Solved") and not any((x[i].value() or 0) > .5 for i in keep):
        return None
    ids = [i for i in keep if (x[i].value() or 0) > .5]
    return ids if len(ids) == 15 else None


def transfer_ideas(c, ids, n, bank, start=0, limit=6, tries=12):
    """Transfer tunggal terbaik. bank dalam persepuluh juta (mis. 15 = £1.5m)."""
    base = horizon_value(c, ids, n, start)
    inset = set(ids)
    cands = sorted((i for i in c.fit if i not in inset), key=lambda i: -c.range_xp(i, start, n))
    out = []
    for kx, o in enumerate(ids):
        cnt = {}
        for i in ids:
            if i != o:
                cnt[c.team[i]] = cnt.get(c.team[i], 0) + 1
        tried = 0
        for cand in cands:
            if c.pos[cand] != c.pos[o] or c.cost[cand] > c.cost[o] + bank or cnt.get(c.team[cand], 0) >= 3:
                continue
            tried += 1
            if tried > tries:
                break
            trial = ids[:kx] + [cand] + ids[kx + 1:]
            g = horizon_value(c, trial, n, start) - base
            if g > .05:
                out.append(dict(o=o, c=cand, g=g))
    out.sort(key=lambda t: -t["g"])
    seen_in, seen_out, res = set(), {}, []
    for t in out:
        if t["c"] in seen_in or seen_out.get(t["o"], 0) >= 2:
            continue
        seen_in.add(t["c"]); seen_out[t["o"]] = seen_out.get(t["o"], 0) + 1
        res.append(t)
        if len(res) >= limit:
            break
    return res


def plan_transfers(c, ids0, n, bank, ft):
    ids, hits, total, base, weeks = list(ids0), 0, 0.0, 0.0, []
    for w in range(n):
        moves = []
        for _ in range(3):
            best = transfer_ideas(c, ids, n, bank, w, 1, 8)
            free = ft > 0
            if not best or best[0]["g"] < (.3 if free else 5):
                break
            b = best[0]
            ids = [b["c"] if i == b["o"] else i for i in ids]
            bank += c.cost[b["o"]] - c.cost[b["c"]]
            if free:
                ft -= 1
            else:
                hits += 1
            moves.append(dict(b, hit=not free))
        x = best_xi(ids, c.xpw[w], c.pos)
        total += x["tot"]; base += best_xi(ids0, c.xpw[w], c.pos)["tot"]
        weeks.append(dict(moves=moves, xp=x["tot"], cap=x["cap"], ft_left=ft, ids=list(ids), bank=bank))
        ft = min(5, ft + 1)
    return dict(weeks=weeks, total=total - 4 * hits, base=base, hits=hits)


def chip_advice(c, ids, bank):
    D = c.D
    chips = D.get("chips") or []

    def ok(name, g):
        return not chips or any(ch["name"] == name and ch["start"] <= D["gws"][g]["id"] <= ch["stop"] for ch in chips)

    budget = sum(c.cost[i] for i in ids) + bank
    pool = list(c.fit)

    def pick(name, f):
        best = None
        for g in range(c.NG):
            if ok(name, g):
                r = f(g)
                if r and (best is None or r["gain"] > best["gain"]):
                    best = dict(r, g=g)
        return best

    def tc(g):
        b = best_xi(ids, c.xpw[g], c.pos)
        return dict(gain=c.xpw[g][b["cap"]], note=c.P[b["cap"]]["n"])

    def bb(g):
        b = best_xi(ids, c.xpw[g], c.pos)
        return dict(gain=sum(c.xpw[g][i] for i in b["bench"]), note="4 cadangan ikut dihitung")

    def fh(g):
        o = solve_squad(c, [c.xpw[g]], c.cost, budget, pool)
        if not o:
            return None
        return dict(gain=best_xi(o, c.xpw[g], c.pos)["tot"] - best_xi(ids, c.xpw[g], c.pos)["tot"], note="skuad bebas satu pekan")

    rows = [("Triple Captain", pick("3xc", tc), 9), ("Bench Boost", pick("bboost", bb), 14), ("Free Hit", pick("freehit", fh), 12)]
    wc = None
    if ok("wildcard", 0):
        o = solve_squad(c, c.xpw, c.cost, budget, pool)
        if o:
            g = sum(best_xi(o, c.xpw[w], c.pos)["tot"] - best_xi(ids, c.xpw[w], c.pos)["tot"] for w in range(c.NG))
            wc = dict(gain=g, g=0, note=f"rombak skuad, dihitung untuk {c.NG} GW")
    rows.append(("Wildcard", wc, 18))
    return [r for r in rows if r[1]]


def hist_row(c, ids, j):
    b = best_xi(ids, c.hpred[j], c.pos)
    act = sum(c.hact[j][i] for i in b["xi"]) + (c.hact[j][b["cap"]] if b["cap"] is not None else 0)
    return dict(gw=c.H[j]["id"], pred=b["tot"], act=act, cap=b["cap"],
                cap_pts=c.hact[j][b["cap"]] if b["cap"] is not None else 0, avg=c.H[j]["avg"])

# ===== tampilan =====
st.set_page_config(page_title="Prediksi Poin FPL", page_icon="⚽", layout="wide")
POS = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}
POSN = {1: "Kiper", 2: "Bek", 3: "Gelandang", 4: "Penyerang"}
HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def wib(iso):
    d = datetime.fromisoformat(iso.replace("Z", "+00:00")) + timedelta(hours=7)
    return f"{HARI[d.weekday()]}, {d.day} {BULAN[d.month - 1]} {d:%H.%M} WIB"


@st.cache_resource(ttl=3 * 3600, show_spinner="Mengambil data terbaru dari FPL (sekitar satu menit)…")
def load_ctx():
    tmp = tempfile.mkdtemp(prefix="fpl_")
    try:
        ok, total = fetch_all(tmp)
        bs, fx, hist = load(tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    done = [e["id"] for e in bs["events"] if e["finished"]]
    if not done:
        raise RuntimeError("Belum ada gameweek yang selesai, jadi belum ada data untuk diprediksi.")
    c = Ctx(build(bs, fx, hist, max(done), None))
    c.cur = next((e["id"] for e in bs["events"] if e["is_current"]), max(done))
    c.fetched, c.missing = time.time(), total - ok
    return c


try:
    c = load_ctx()
except Exception as e:  # data FPL tidak tersedia
    st.error(f"Data FPL tidak bisa dimuat: {e}")
    st.stop()
D, P = c.D, c.P
if not D["gws"]:
    st.info("Musim sudah selesai. Tidak ada gameweek yang bisa diprediksi.")
    st.stop()
NG, GW0 = c.NG, D["gws"][0]["id"]
VER = f"{D['updated']}|{GW0}|{int(c.fetched)}"


# ---------- perhitungan yang di-cache ----------
@st.cache_data(show_spinner=False)
def best_squad(ver, n, budget):
    return solve_squad(c, c.xpw[:n], c.cost, budget, list(c.fit))


@st.cache_data(show_spinner=False)
def hist_best(ver, budget):
    rows = []
    for j in range(len(c.H)):
        ids = solve_squad(c, [c.hpred[j]], c.hcost[j], budget, [i for i in P if c.hpred[j][i] > 0])
        if ids:
            rows.append(hist_row(c, ids, j))
    return rows


@st.cache_data(show_spinner=False)
def get_plan(ver, ids, n, bank, ft):
    return plan_transfers(c, list(ids), n, bank, ft)


@st.cache_data(show_spinner=False)
def get_chips(ver, ids, bank):
    return chip_advice(c, list(ids), bank)


@st.cache_data(show_spinner=False)
def get_ideas(ver, ids, n, bank):
    return transfer_ideas(c, list(ids), n, bank)


# ---------- pembantu tampilan ----------
def money(t):
    return f"£{t / 10:.1f}"


def label(i):
    p = P[i]
    return f"{p['n']} · {c.teams[p['t']]['s']} · {POS[p['p']]} · {money(p['c'])}"


def fx_text(i, g):
    fs = c.teams[P[i]["t"]]["fx"][g]
    return ", ".join(c.teams[o]["s"] if h else c.teams[o]["s"].lower() for o, h, *_ in fs) or "–"


def status(p):
    if p["st"] == "a":
        return "Fit"
    return p["news"] or "Tidak pasti"


def tok(i, val, sub, badge=""):
    b = f'<span style="position:absolute;top:-7px;right:-5px;background:#a8510a;color:#fff;border-radius:50%;width:19px;height:19px;font-size:11px;font-weight:700;line-height:19px">{badge}</span>' if badge else ""
    return (f'<div style="background:#fff;color:#12211c;border-radius:7px;padding:5px 6px;width:88px;text-align:center;font-size:12px;line-height:1.25;position:relative">{b}'
            f'<b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{html.escape(P[i]["n"])}</b>'
            f'<span style="font-weight:700;font-size:13px">{val:.1f}</span><small style="display:block;color:#586a63;font-size:10px">{html.escape(sub)}</small></div>')


def pitch(b, val, sub):
    rows = ""
    for k in (1, 2, 3, 4):
        line = [i for i in b["xi"] if c.pos[i] == k]
        if line:
            rows += '<div style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap">' + "".join(
                tok(i, val(i), sub(i), "C" if i == b["cap"] else "V" if i == b["vice"] else "") for i in line) + "</div>"
    st.markdown(f'<div style="background:repeating-linear-gradient(180deg,#2f8f5b 0 44px,#2a8453 44px 88px);border-radius:10px;padding:16px 8px;display:flex;flex-direction:column;gap:12px;border:2px solid rgba(255,255,255,.5)">{rows}</div>', unsafe_allow_html=True)
    if b["bench"]:
        st.caption("Cadangan (urutan masuk)")
        st.markdown('<div style="display:flex;gap:6px;flex-wrap:wrap">' + "".join(
            f'<div style="border:1px solid #d7e0dc;border-radius:8px">{tok(i, val(i), sub(i))}</div>' for i in b["bench"]) + "</div>", unsafe_allow_html=True)


def history(rows):
    if not rows:
        st.caption("Belum ada gameweek yang bisa dibandingkan.")
        return
    df = pd.DataFrame(rows)
    long = pd.DataFrame([dict(GW=f"GW{r['gw']}", Seri=name, Poin=round(r[k], 1)) for r in rows
                         for k, name in (("pred", "Prediksi"), ("act", "Aktual"), ("avg", "Rata-rata FPL"))])
    order = [f"GW{r['gw']}" for r in rows]
    dom = ["Prediksi", "Aktual", "Rata-rata FPL"]
    ch = alt.Chart(long).mark_line(point=True, strokeWidth=2).encode(
        x=alt.X("GW:N", sort=order, title=None, axis=alt.Axis(labelAngle=0)),
        y=alt.Y("Poin:Q", title=None, scale=alt.Scale(zero=True)),
        color=alt.Color("Seri:N", scale=alt.Scale(domain=dom, range=["#2a78d6", "#eb6834", "#1baf7a"]), legend=alt.Legend(title=None, orient="top")),
        strokeDash=alt.StrokeDash("Seri:N", scale=alt.Scale(domain=dom, range=[[1, 0], [1, 0], [5, 4]]), legend=None),
        tooltip=["GW", "Seri", "Poin"]).properties(height=240)
    st.altair_chart(ch, width="stretch")
    tab = pd.DataFrame({
        "GW": [f"GW{r['gw']}" for r in rows], "Prediksi": [round(r["pred"], 1) for r in rows], "Aktual": [r["act"] for r in rows],
        "Selisih": [round(r["act"] - r["pred"], 1) for r in rows],
        "Kapten (poin)": [f"{P[r['cap']]['n']} ({r['cap_pts']})" if r["cap"] is not None else "–" for r in rows],
        "Rata-rata FPL": [r["avg"] for r in rows]})
    tab.loc[len(tab)] = ["Total", round(df["pred"].sum(), 1), int(df["act"].sum()), round(df["act"].sum() - df["pred"].sum(), 1), "", int(df["avg"].sum())]
    st.dataframe(tab, hide_index=True, width="stretch")


# ---------- keadaan & bilah samping ----------
def do_import():
    tid = str(st.session_state.get("team_id", "")).strip()
    if not tid.isdigit():
        st.session_state["imp_msg"] = ("error", "ID tim harus berupa angka.")
        return
    e = fetch_entry(int(tid), c.cur)
    if not e:
        st.session_state["imp_msg"] = ("error", f"Tim dengan ID {tid} tidak ditemukan, atau FPL sedang tidak bisa dihubungi.")
        return
    st.session_state["squad_sel"] = [i for i in e["ids"] if i in P]
    st.session_state["bank"] = e["bank"] / 10
    st.session_state["sample"] = False
    st.query_params["team"] = tid
    st.session_state["imp_msg"] = ("success", f"Skuad {e['name']} per GW{e['gw']} dimuat. Transfer setelah deadline GW{e['gw']} belum ikut; sesuaikan di tab Tim Saya.")


if "squad_sel" not in st.session_state:
    st.session_state["bank"] = 0.0
    st.session_state["ft"] = 1
    qp = st.query_params.get("team")
    if qp and qp.isdigit():
        st.session_state["team_id"] = qp
        do_import()
    if "squad_sel" not in st.session_state:
        st.session_state["squad_sel"] = best_squad(VER, min(3, NG), 1000) or []
        st.session_state["sample"] = True
st.session_state["squad_sel"] = [i for i in st.session_state["squad_sel"] if i in P]

with st.sidebar:
    st.title("Prediksi Poin FPL")
    st.caption(f"Gameweek {GW0} · batas waktu {wib(D['gws'][0]['deadline'])}")
    HZ = sorted({1, min(3, NG), NG})
    hz = st.radio("Rentang prediksi", HZ, format_func=lambda n: f"GW{GW0}" if n == 1 else f"{n} GW", horizontal=True)
    st.divider()
    st.subheader("Impor tim FPL")
    st.text_input("ID tim", key="team_id", placeholder="mis. 1234567",
                  help="Buka fantasy.premierleague.com, masuk ke menu Points. ID tim adalah angka di alamat halaman: …/entry/ANGKA/event/…")
    st.button("Impor skuad", on_click=do_import, width="stretch")
    if "imp_msg" in st.session_state:
        kind, msg = st.session_state.pop("imp_msg")
        (st.success if kind == "success" else st.error)(msg)
    st.divider()
    st.caption(f"Laga terakhir dalam data: {wib(D['updated'])}. Data diambil {wib(datetime.utcfromtimestamp(c.fetched).isoformat() + 'Z')} dan diperbarui otomatis tiap 3 jam.")
    if c.missing:
        st.warning(f"Riwayat {c.missing} pemain gagal diunduh; prediksi mereka kurang akurat.")
    if st.button("Muat ulang data sekarang", width="stretch"):
        load_ctx.clear()
        st.cache_data.clear()
        st.rerun()

sumxp = lambda i, n=None: c.range_xp(i, 0, n or hz)
RL = f"GW{GW0}" if hz == 1 else f"{hz} GW"
t_pred, t_cmp, t_team, t_best, t_how = st.tabs(["Prediksi", "Bandingkan", "Tim Saya", "Skuad Terbaik", "Cara kerja"])

# ---------- Prediksi ----------
with t_pred:
    f1, f2, f3, f4, f5 = st.columns([1, 1.3, 1, 1.4, 1.3])
    fpos = f1.selectbox("Posisi", [0, 1, 2, 3, 4], format_func=lambda k: "Semua" if k == 0 else POSN[k])
    tnames = sorted(c.teams, key=lambda t: c.teams[t]["n"])
    fteam = f2.selectbox("Klub", [0] + tnames, format_func=lambda t: "Semua" if t == 0 else c.teams[t]["n"])
    fprice = f3.number_input("Harga maks (£m)", 3.5, 20.0, 20.0, 0.5)
    fq = f4.text_input("Cari pemain", placeholder="nama pemain")
    fsort = f5.selectbox("Urutkan", ["xP tertinggi", "xP per £m", "Diferensial (dipilih < 10%)"])
    only_fit = st.checkbox("Hanya yang fit", True)
    q = fq.strip().lower()
    ids = [i for i, p in P.items() if (not fpos or p["p"] == fpos) and (not fteam or p["t"] == fteam) and p["c"] <= fprice * 10 + 1e-9
           and (not q or q in p["n"].lower() or q in p["fn"].lower()) and (not only_fit or q or i in c.fit)
           and (not fsort.startswith("Dif") or p["sel"] < 10)]
    key = (lambda i: -sumxp(i) / P[i]["c"]) if fsort == "xP per £m" else (lambda i: -sumxp(i))
    ids = sorted(ids, key=key)[:150]
    nfx = max(hz, min(3, NG))
    df = pd.DataFrame([{
        "Pemain": P[i]["n"], "Klub": c.teams[P[i]["t"]]["s"], "Pos": POS[P[i]["p"]], "Harga": P[i]["c"] / 10,
        f"xP {RL}": round(sumxp(i), 2), "xP/£m": round(sumxp(i) / P[i]["c"] * 10, 2),
        "Laga (huruf besar = kandang)": " · ".join(fx_text(i, g) for g in range(nfx)),
        "Dipilih %": P[i]["sel"], "Status": status(P[i])} for i in ids])
    if df.empty:
        st.info("Tidak ada pemain yang cocok dengan filter ini.")
    else:
        top = max(sumxp(i) for i in P) or 1
        st.dataframe(df, hide_index=True, width="stretch", height=560, column_config={
            "Harga": st.column_config.NumberColumn(format="£%.1f"),
            f"xP {RL}": st.column_config.ProgressColumn(format="%.1f", min_value=0, max_value=float(top)),
            "Dipilih %": st.column_config.NumberColumn(format="%.1f%%")})
        with st.expander("Rincian poin seorang pemain"):
            pid = st.selectbox("Pemain", ids, format_func=label, key="detail")
            p = P[pid]
            m = st.columns(5)
            for col, name, v in zip(m, ["Main", "Gol", "Assist", "Clean sheet", "Lain-lain"], p["br"]):
                col.metric(f"{name} (GW{GW0})", f"{v:.1f}")
            st.dataframe(pd.DataFrame({"GW": [f"GW{g['id']}" for g in D["gws"]], "Lawan": [fx_text(pid, g) for g in range(NG)],
                                       "xP": [round(x, 1) for x in p["xp"]]}), hide_index=True, width="stretch")
            st.caption(f"{p['fn']} · musim ini {p['pts']} poin, {p['mins']} menit, proyeksi {p['em']} menit per laga. Status: {status(p)}.")

# ---------- Bandingkan ----------
with t_cmp:
    allp = sorted(P, key=lambda i: -sumxp(i, NG))
    c1, c2 = st.columns(2)
    a = P[c1.selectbox("Pemain A", allp, index=0, format_func=label)]
    b = P[c2.selectbox("Pemain B", allp, index=1, format_func=label)]
    rows, wins = [], []

    def row(name, va, vb, fmt="{:.1f}", better=1):
        rows.append((name, fmt.format(va), fmt.format(vb)))
        wins.append(-1 if not better or va == vb else (0 if (va > vb) == (better > 0) else 1))

    def txt(name, ta, tb):
        rows.append((name, ta, tb)); wins.append(-1)

    n3 = min(3, NG)
    txt("Klub · posisi", f"{c.teams[a['t']]['s']} · {POS[a['p']]}", f"{c.teams[b['t']]['s']} · {POS[b['p']]}")
    row("Harga (£m)", a["c"] / 10, b["c"] / 10, better=-1)
    txt("Status", status(a), status(b))
    for g in range(NG):
        row(f"xP GW{D['gws'][g]['id']}", a["xp"][g], b["xp"][g])
    row(f"xP total {n3} GW", sumxp(a["id"], n3), sumxp(b["id"], n3))
    row(f"xP total {NG} GW", sumxp(a["id"], NG), sumxp(b["id"], NG))
    row(f"xP per £m ({NG} GW)", sumxp(a["id"], NG) / a["c"] * 10, sumxp(b["id"], NG) / b["c"] * 10, "{:.2f}")
    txt("Jadwal", " · ".join(fx_text(a["id"], g) for g in range(NG)), " · ".join(fx_text(b["id"], g) for g in range(NG)))
    for k, name in enumerate(["Main", "Gol", "Assist", "Clean sheet", "Lain-lain"]):
        row(f"Rincian GW{GW0}: {name}", a["br"][k], b["br"][k])
    row("Poin musim ini", a["pts"], b["pts"], "{:.0f}")
    row("Menit musim ini", a["mins"], b["mins"], "{:.0f}")
    row("Form", a["form"], b["form"])
    row("Proyeksi menit per laga", a["em"], b["em"], "{:.0f}")
    row("Dipilih (%)", a["sel"], b["sel"], better=0)
    if c.H:
        hs = lambda p, k: sum(r[k] for r in p["h"]) if "h" in p else 0
        row(f"Riwayat GW{c.H[0]['id']}–{c.H[-1]['id']}: prediksi", hs(a, 0), hs(b, 0))
        row(f"Riwayat GW{c.H[0]['id']}–{c.H[-1]['id']}: poin aktual", hs(a, 1), hs(b, 1), "{:.0f}")
    cdf = pd.DataFrame(rows, columns=["", a["n"], b["n"] if b["n"] != a["n"] else b["n"] + " "])
    hl = "background-color: rgba(11,115,89,.18); font-weight: 600"
    sty = pd.DataFrame([["", hl if w == 0 else "", hl if w == 1 else ""] for w in wins], columns=cdf.columns)
    st.dataframe(cdf.style.apply(lambda _: sty, axis=None), hide_index=True, width="stretch", height=38 * (len(rows) + 1))
    st.caption("Nilai yang lebih baik di tiap baris ditandai.")

# ---------- Tim Saya ----------
def apply_plan(ids, bank, ft):
    st.session_state["squad_sel"], st.session_state["bank"], st.session_state["ft"] = ids, bank / 10, ft
    st.session_state["sample"] = False


with t_team:
    if st.session_state.get("sample"):
        st.info("Ini skuad contoh hasil optimasi £100m, bukan timmu. Impor timmu lewat ID tim di bilah samping, atau ganti pemainnya di kotak Skuad.")
    left, right = st.columns([1.25, 1])
    with right:
        st.subheader("Skuad")
        st.multiselect("15 pemain (ketik nama untuk mencari)", sorted(P, key=lambda i: P[i]["n"]), key="squad_sel", format_func=label,
                       max_selections=15, on_change=lambda: st.session_state.update(sample=False))
        squad = list(st.session_state["squad_sel"])
        b1, b2 = st.columns(2)
        b1.number_input("Uang di bank (£m)", 0.0, 50.0, step=0.1, key="bank")
        b2.selectbox("Transfer gratis", [0, 1, 2, 3, 4, 5], key="ft")
        bank_t, ft = round(st.session_state["bank"] * 10), st.session_state["ft"]
        probs = squad_problems(c, squad)
        for m in probs:
            st.warning(m)
        if squad:
            sq = sorted(squad, key=lambda i: (P[i]["p"], -sumxp(i)))
            st.dataframe(pd.DataFrame([{"Pemain": P[i]["n"], "Klub": c.teams[P[i]["t"]]["s"], "Pos": POS[P[i]["p"]], "Harga": P[i]["c"] / 10,
                                        f"xP {RL}": round(sumxp(i), 1), "Status": status(P[i])} for i in sq]),
                         hide_index=True, width="stretch", height=38 * 16,
                         column_config={"Harga": st.column_config.NumberColumn(format="£%.1f")})
    with left:
        if not squad:
            st.info("Skuad masih kosong. Impor tim lewat ID tim, atau pilih pemain di kotak Skuad.")
        else:
            st.subheader("Susunan terbaik")
            g = st.selectbox("Gameweek", range(NG), format_func=lambda k: f"GW{D['gws'][k]['id']}")
            bx = best_xi(squad, c.xpw[g], c.pos)
            m1, m2, m3, m4 = st.columns(4)
            m1.metric(f"xP tim GW{D['gws'][g]['id']}", f"{bx['tot']:.1f}")
            m2.metric("Formasi", bx["formation"])
            m3.metric("Kapten", P[bx["cap"]]["n"] if bx["cap"] is not None else "–")
            m4.metric("Nilai skuad", money(sum(c.cost[i] for i in squad)))
            pitch(bx, lambda i: c.xpw[g][i], lambda i: fx_text(i, g))

            st.subheader("Rencana transfer")
            if probs:
                st.caption("Lengkapi skuad yang sah (15 pemain) untuk melihat rencana transfer dan saran chip.")
            else:
                st.caption("Urutan transfer terbaik per gameweek selama rentang yang dipilih. Transfer gratis bertambah satu tiap pekan (maksimal 5). "
                           "Transfer berbayar −4 hanya disarankan kalau tambahan xP-nya minimal 5. Harga jual dianggap sama dengan harga sekarang.")
                pl = get_plan(VER, tuple(squad), hz, bank_t, ft)
                k1, k2, k3 = st.columns(3)
                k1.metric(f"xP {RL} dengan rencana", f"{pl['total']:.1f}", f"{pl['total'] - pl['base']:+.1f} dibanding tanpa transfer")
                k2.metric("Tanpa transfer", f"{pl['base']:.1f}")
                k3.metric("Potongan poin", f"−{4 * pl['hits']}" if pl["hits"] else "0")
                for w, wk in enumerate(pl["weeks"]):
                    head = f"**GW{D['gws'][w]['id']}** · xP tim {wk['xp']:.1f} · kapten {P[wk['cap']]['n']} · bank {money(wk['bank'])}"
                    if wk["moves"]:
                        lines = "\n".join(f"- {P[t['o']]['n']} ({money(c.cost[t['o']])}) → **{P[t['c']]['n']}** ({c.teams[c.team[t['c']]]['s']}, {money(c.cost[t['c']])}) · +{t['g']:.1f} xP"
                                          + (" · **potongan −4**" if t["hit"] else "") for t in wk["moves"])
                    else:
                        lines = "- Tidak perlu transfer. Simpan transfer gratisnya."
                    st.markdown(head + "\n" + lines)
                w0 = pl["weeks"][0]
                if w0["moves"]:
                    st.button(f"Terapkan transfer GW{GW0} ke skuad", on_click=apply_plan, args=(w0["ids"], w0["bank"], max(0, w0["ft_left"])))
                with st.expander("Pilihan transfer tunggal lainnya"):
                    ideas = get_ideas(VER, tuple(squad), hz, bank_t)
                    if ideas:
                        st.dataframe(pd.DataFrame([{"Keluar": P[t["o"]]["n"], "Masuk": P[t["c"]]["n"], "Klub": c.teams[c.team[t["c"]]]["s"],
                                                    "Harga masuk": money(c.cost[t["c"]]), f"Tambahan xP {RL}": round(t["g"], 1)} for t in ideas]),
                                     hide_index=True, width="stretch")
                    else:
                        st.caption("Tidak ada transfer tunggal yang menambah xP dengan dana ini.")

                st.subheader("Saran chip")
                st.caption("Gameweek terbaik untuk tiap chip dalam 6 gameweek ke depan. Chip biasanya paling bernilai di gameweek ganda, "
                           "dan model belum melihat lebih jauh dari 6 pekan, jadi \"simpan\" sering kali jawaban yang benar. Ambang sarannya perkiraan kasar.")
                with st.spinner("Menghitung saran chip…"):
                    chips = get_chips(VER, tuple(squad), bank_t)
                st.dataframe(pd.DataFrame([{"Chip": n, "Keterangan": r["note"], "GW terbaik": f"GW{D['gws'][r['g']]['id']}",
                                            "Tambahan xP": round(r["gain"], 1), "Saran": "Layak dipakai" if r["gain"] >= thr else "Simpan dulu"}
                                           for n, r, thr in chips]), hide_index=True, width="stretch")

            st.subheader("Riwayat: prediksi vs aktual")
            st.caption("Seandainya skuad ini dipakai di gameweek lalu. Susunan dan kapten dipilih model hanya dengan data sebelum gameweek itu. "
                       "Tanpa pergantian otomatis dan chip. Pemain yang dipilih karena sedang bagus wajar terlihat bagus di masa lalu.")
            history([hist_row(c, squad, j) for j in range(len(c.H))])

# ---------- Skuad Terbaik ----------
def use_best(ids, bank):
    st.session_state["squad_sel"], st.session_state["bank"], st.session_state["sample"] = ids, bank / 10, False


with t_best:
    st.subheader("Prediksi skuad terbaik")
    st.caption("15 pemain dengan total xP tertinggi yang muat dalam anggaran, mengikuti aturan FPL: 2 kiper, 5 bek, 5 gelandang, 3 penyerang, "
               "maksimal 3 pemain per klub. Hanya pemain fit yang dipilih. Dihitung dengan pemrograman linear, jadi ini kombinasi optimal menurut model.")
    budget = round(st.number_input("Anggaran (£m)", 60.0, 150.0, 100.0, 0.5) * 10)
    with st.spinner("Mencari skuad terbaik…"):
        bids = best_squad(VER, hz, budget)
    if not bids:
        st.error("Tidak ada skuad sah yang muat di anggaran ini. Naikkan anggarannya.")
    else:
        agg = {i: sumxp(i) for i in P}
        bx = best_xi(bids, agg, c.pos)
        cost = sum(c.cost[i] for i in bids)
        k = st.columns(5)
        k[0].metric(f"xP 11 utama · {RL}", f"{bx['tot']:.1f}")
        k[1].metric("Formasi", bx["formation"])
        k[2].metric("Kapten", P[bx["cap"]]["n"])
        k[3].metric("Biaya", money(cost))
        k[4].metric("Sisa", money(budget - cost))
        bl, br = st.columns([1.25, 1])
        with bl:
            pitch(bx, lambda i: agg[i], lambda i: f"{c.teams[c.team[i]]['s']} · {money(c.cost[i])}")
            st.caption(f"Angka di tiap pemain adalah xP untuk {RL}; xP 11 utama sudah menghitung poin kapten dua kali.")
            st.button("Jadikan Tim Saya", on_click=use_best, args=(bids, budget - cost), type="primary")
        with br:
            st.markdown("**Riwayat: prediksi vs aktual**")
            st.caption("Skuad terbaik yang akan dipilih model di tiap gameweek lalu dengan anggaran yang sama dan harga saat itu. "
                       "Model tidak punya kabar cedera masa lalu, jadi sesekali memilih pemain yang ternyata absen.")
            history(hist_best(VER, budget))

# ---------- Cara kerja ----------
with t_how:
    st.subheader("Bagaimana xP dihitung")
    st.markdown("""
xP (expected points) adalah perkiraan rata-rata poin FPL seorang pemain di satu gameweek, dijumlahkan dari beberapa komponen memakai aturan skor resmi musim ini:

- **Main** — peluang tampil dan peluang bermain 60+ menit, dari menit di lima laga terakhir klubnya, dikalikan peluang fit dari kabar cedera FPL.
- **Gol dan assist** — xG dan xA per 90 menit (laga terbaru berbobot lebih besar, pemain bermenit sedikit ditarik ke rata-rata pemain sekelas harganya), dikali seberapa mudah lawannya dibobol.
- **Clean sheet** — peluang lawan tidak mencetak gol, dari kekuatan serang lawan dan pertahanan klub sendiri.
- **Lain-lain** — bonus, penyelamatan kiper, kontribusi bertahan, dikurangi kebobolan dan kartu.

Kekuatan tiap klub dihitung dari gol dan xG semua laga yang sudah selesai, disesuaikan dengan lawan yang dihadapi dan faktor kandang.
""")
    st.subheader("Seberapa akurat?")
    bt = D.get("bt")
    if bt:
        st.write(f"Model diuji mundur pada GW{bt['gw'][0]}–GW{bt['gw'][1]} musim ini: tiap pekan diprediksi hanya dengan data pekan-pekan sebelumnya, lalu dibandingkan dengan poin sebenarnya dan dua tebakan sederhana.")
        st.dataframe(pd.DataFrame({"Metode": ["Model xP ini", "Rata-rata poin per laga", "Form 4 laga terakhir"], "Korelasi": bt["r"],
                                   "Galat rata-rata": bt["mae"], "Poin 30 teratas": bt["top"]}), hide_index=True)
    else:
        st.write("Uji mundur baru tersedia setelah gameweek 5.")
    st.write("Poin FPL sangat acak dari pekan ke pekan. xP paling berguna untuk membandingkan pilihan, bukan menebak skor persis. "
             "Model tidak tahu rotasi, taktik baru, atau kabar yang belum masuk ke data FPL.")
    st.caption("Sumber data: API resmi Fantasy Premier League. Bukan produk resmi Premier League.")
