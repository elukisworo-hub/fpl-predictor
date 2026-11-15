"""Prediksi Poin FPL — aplikasi Streamlit. Jalankan: streamlit run app.py"""
import html
import shutil
import tempfile
import time
from datetime import datetime, timedelta

import altair as alt
import pandas as pd
import streamlit as st

from fpl import fetch, model
from fpl import optimize as opt

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
        ok, total = fetch.fetch_all(tmp)
        bs, fx, hist = model.load(tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    done = [e["id"] for e in bs["events"] if e["finished"]]
    if not done:
        raise RuntimeError("Belum ada gameweek yang selesai, jadi belum ada data untuk diprediksi.")
    c = opt.Ctx(model.build(bs, fx, hist, max(done), None))
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
    return opt.solve_squad(c, c.xpw[:n], c.cost, budget, list(c.fit))


@st.cache_data(show_spinner=False)
def hist_best(ver, budget):
    rows = []
    for j in range(len(c.H)):
        ids = opt.solve_squad(c, [c.hpred[j]], c.hcost[j], budget, [i for i in P if c.hpred[j][i] > 0])
        if ids:
            rows.append(opt.hist_row(c, ids, j))
    return rows


@st.cache_data(show_spinner=False)
def get_plan(ver, ids, n, bank, ft):
    return opt.plan_transfers(c, list(ids), n, bank, ft)


@st.cache_data(show_spinner=False)
def get_chips(ver, ids, bank):
    return opt.chip_advice(c, list(ids), bank)


@st.cache_data(show_spinner=False)
def get_ideas(ver, ids, n, bank):
    return opt.transfer_ideas(c, list(ids), n, bank)


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
    e = fetch.fetch_entry(int(tid), c.cur)
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
        probs = opt.squad_problems(c, squad)
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
            bx = opt.best_xi(squad, c.xpw[g], c.pos)
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
            history([opt.hist_row(c, squad, j) for j in range(len(c.H))])

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
        bx = opt.best_xi(bids, agg, c.pos)
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
