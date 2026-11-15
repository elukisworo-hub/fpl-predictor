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


if __name__ == "__main__":
    folder, mode = sys.argv[1], sys.argv[2]
    bs, fx, hist = load(folder)
    done = [e["id"] for e in bs["events"] if e["finished"]]
    asof = max(done)
    if mode == "backtest":
        print("GW   n   r_model r_ppg r_form | MAE model ppg form | top30 model ppg form")
        rs = backtest(bs, fx, hist, asof)
        for r in rs:
            print("%2d %4d  %.3f  %.3f  %.3f | %.2f %.2f %.2f | %.2f %.2f %.2f" % r)
        print("rata2:", " ".join("%.3f" % (sum(r[i] for r in rs) / len(rs)) for i in range(2, 11)))
    else:
        d = build(bs, fx, hist, asof, sys.argv[3])
        top = sorted(d["players"], key=lambda p: -p["xp"][0])[:15]
        for p in top:
            print(p["n"], POS[p["p"]], p["c"] / 10, p["xp"], p["br"])
