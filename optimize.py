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
