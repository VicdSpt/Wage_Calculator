"""Script de référence indépendant du moteur TypeScript.

Il recalcule les cas de référence directement depuis les textes officiels
(SPF-FC-2026, ONSS-BE-2026/3, ONSS-CSSS-2026/3), en euros avec le module
decimal, et écrit src/engine/__tests__/references.json (montants en centimes).

Usage : python tools/reference/reference.py
"""

import json
import math
from decimal import ROUND_HALF_UP, Decimal as D
from fractions import Fraction as Fr
from pathlib import Path

SORTIE = Path(__file__).resolve().parents[2] / "src" / "engine" / "__tests__" / "references.json"
SORTIE_VOITURE = SORTIE.parent / "referencesVoiture.json"


def r(x: D) -> D:
    """Arrondi au centime, 0,005 vers le haut (SPF-FC-2026 n° 3)."""
    return x.quantize(D("0.01"), rounding=ROUND_HALF_UP)


def cents(x: D) -> int:
    return int((x * 100).to_integral_value())


# (max, plancher, plafond, coefficient) — ONSS-BE-2026/3, employés
VOLET_B = (D("171.99"), D("2300.62"), D("2937.93"), D("0.2699"))
PERIODES = [
    ("P2026-07", "2026-07-01", "2026-08-31", (D("127.54"), D("2937.93"), D("3336.98"), D("0.3196")), VOLET_B),
    ("P2026-09", "2026-09-01", "2026-12-31", (D("127.54"), D("2937.93"), D("3403.62"), D("0.2739")), VOLET_B),
]


def periode(date: str):
    for p in PERIODES:
        if p[1] <= date <= p[2]:
            return p
    raise ValueError(f"période non couverte : {date}")


def volet(s: D, v) -> D:
    maximum, plancher, plafond, coef = v
    if s <= plancher:
        return maximum
    if s <= plafond:
        return max(D("0"), r(maximum - coef * (s - plancher)))
    return D("0")


def bareme(x: D) -> D:
    if x <= 0:
        return D("0")
    tranches = [
        (D("0"), D("0"), D("0.2675")),
        (D("16710"), D("4469.93"), D("0.4280")),
        (D("29500"), D("9944.05"), D("0.4815")),
        (D("51050"), D("20320.38"), D("0.5350")),
    ]
    de, fixe, taux = [t for t in tranches if x > t[0]][-1]
    return fixe + r((x - de) * taux)


# Voiture de société — art. 36 § 2 CIR 92 (spec voiture § 3.1).
# (du, au, référence essence/LPG/gaz naturel en g/km, référence diesel en g/km, minimum annuel en centimes)
PERIODES_VOITURE = [
    ("2025-02-01", "2025-12-31", 71, 59, 165000),
    ("2026-07-01", "2026-08-31", 70, 58, 169000),
    ("2026-09-01", "2026-12-31", 70, 58, 169000),
]


def arrondi_centime(x: Fr) -> int:
    """Arrondi au centime le plus proche, 0,5 vers le haut (montants positifs)."""
    return math.floor(x + Fr(1, 2))


def atn_voiture(v: dict, date: str) -> dict:
    ess, dies, minimum = next((e, d, m) for du, au, e, d, m in PERIODES_VOITURE if du <= date <= au)
    if v["carburant"] == "electrique":
        pct = Fr(4)
    else:
        ref = dies if v["carburant"] == "diesel" else ess
        pct = min(Fr(18), max(Fr(4), Fr(55, 10) + Fr(1, 10) * (v["co2GrammesKm"] - ref)))
    annee_imm, mois_imm = (int(x) for x in v["premiereImmatriculation"].split("-"))
    mois = (int(date[:4]) - annee_imm) * 12 + (int(date[5:7]) - mois_imm) + 1  # le mois d'immatriculation est le mois 1
    age = max(Fr(70), Fr(100) - 6 * ((mois - 1) // 12))
    formule = arrondi_centime(Fr(v["valeurCatalogueCentimes"]) * age / 100 * Fr(6, 7) * pct / 100)
    annuel = max(formule, minimum)
    return {
        "valeurCatalogueCentimes": v["valeurCatalogueCentimes"],
        "pourcentageCo2DixMilliemes": int(pct * 100),
        "coefficientAgeDixMilliemes": int(age * 100),
        "moisEcoules": mois,
        "annuelFormuleCentimes": formule,
        "minimumAppliqueCentimes": minimum if formule < minimum else None,
        "annuelCentimes": annuel,
        "mensuelCentimes": arrondi_centime(Fr(annuel, 12)),
    }


def voiture(carburant, valeur_centimes, co2, immatriculation):
    return {
        "carburant": carburant,
        "valeurCatalogueCentimes": valeur_centimes,
        "co2GrammesKm": co2,
        "premiereImmatriculation": immatriculation,
    }


CAS_VOITURE = [
    ("essence-45000-103g-20mois-2026-09-14", "2026-09-14", voiture("essence", 4500000, 103, "2025-02")),
    ("diesel-35000-120g-neuve-2026-09-14", "2026-09-14", voiture("diesel", 3500000, 120, "2026-09")),
    ("essence-45000-250g-neuve-2026-08-31", "2026-08-31", voiture("essence", 4500000, 250, "2026-08")),
    ("essence-30000-95g-61mois-2026-09-14", "2026-09-14", voiture("essence", 3000000, 95, "2021-09")),
    ("electrique-60000-81mois-2026-09-14", "2026-09-14", voiture("electrique", 6000000, 0, "2020-01")),
    ("electrique-60000-69mois-2025-09-14", "2025-09-14", voiture("electrique", 6000000, 0, "2020-01")),
    ("essence-45000-103g-neuve-2025-09-14", "2025-09-14", voiture("essence", 4500000, 103, "2025-09")),
    ("diesel-770000-250g-neuve-2026-09-14", "2026-09-14", voiture("diesel", 77000000, 250, "2026-09")),
]


ENFANTS = [0, 624, 1656, 4404, 7620, 11100, 14592, 18120, 21996]


def reduction_enfants(n: int) -> D:
    return D(ENFANTS[n]) if n <= 8 else D(21996 + 3864 * (n - 8))


def csss(m: D, categorie: str) -> D:
    if categorie == "individuelle":
        if m <= D("1945.38"):
            return D("0")
        if m <= D("2190.18"):
            return r((m - D("1945.38")) * D("0.0422"))
        if m <= D("3737.00"):
            return D("10.33") + r((m - D("2190.18")) * D("0.011"))
        if m <= D("4100.00"):
            return D("27.35") + r((m - D("3737.00")) * D("0.0338"))
        if m <= D("6038.82"):
            return D("39.61") + r((m - D("4100.00")) * D("0.011"))
        return D("60.94")
    if categorie == "communeConjointAvecRevenus":
        if m < D("1095.10"):
            return D("0")
        if m < D("1945.38"):
            return D("5.15")
        if m <= D("2190.18"):
            return max(D("5.15"), r((m - D("1945.38")) * D("0.059")))
        return min(D("51.64"), D("14.44") + r((m - D("2190.18")) * D("0.011")))
    if m <= D("1945.38"):
        return D("0")
    if m <= D("2190.18"):
        return r((m - D("1945.38")) * D("0.059"))
    return min(D("60.94"), D("14.44") + r((m - D("2190.18")) * D("0.011")))


def calculer(sit: dict, date: str) -> dict:
    _, _, _, volet_a, volet_b = periode(date)
    brut = D(sit["brutMensuelCentimes"]) / 100
    conjoint = sit["revenusConjoint"]

    onss = r(brut * D("0.1307"))
    a, b = volet(brut, volet_a), volet(brut, volet_b)
    if a + b > onss:
        b = max(D("0"), onss - a)
        a = min(a, onss)
    bonus = a + b
    onss_net = onss - bonus
    imposable = brut - onss_net
    annuel = imposable * 12
    frais = min(r(annuel * D("0.30")), D("6070"))
    net_imposable = annuel - frais

    if conjoint in ("aucun", "pensionMax174"):
        impute = min(r(net_imposable * D("0.30")), D("13790"))
        impot_base = bareme(impute) + bareme(net_imposable - impute) - D("5975.96")
    else:
        impute = D("0")
        impot_base = bareme(net_imposable) - D("2987.98")
    impot_base = max(D("0"), impot_base)

    reductions = reduction_enfants(sit["enfantsACharge"])
    if sit["parentIsole"]:
        reductions += D("624")
    if conjoint == "autresMax290":
        reductions += D("1740")
    if conjoint == "pensionMax579":
        reductions += D("3474")
    reductions_accordees = min(reductions, impot_base)
    impot_annuel = impot_base - reductions_accordees

    precompte_avant = r(impot_annuel / 12)
    bonus_fiscal = r(a * D("0.3314")) + r(b * D("0.5254"))
    precompte = max(D("0"), precompte_avant - bonus_fiscal)

    if sit["etatCivil"] == "isole":
        categorie = "individuelle"
    elif conjoint == "superieurs":
        categorie = "communeConjointAvecRevenus"
    else:
        categorie = "communeConjointSansRevenus"
    cotisation = csss(brut, categorie)
    net = brut - onss_net - precompte - cotisation

    valeurs = {
        "onss": onss, "bonusVoletA": a, "bonusVoletB": b, "bonusSocial": bonus,
        "onssNet": onss_net, "imposableMensuel": imposable, "atn": D("0"),
        "imposablePrecompte": imposable, "annuelBrut": annuel,
        "fraisForfaitaires": frais, "netImposable": net_imposable, "revenuImpute": impute,
        "impotBase": impot_base, "reductionsAccordees": reductions_accordees,
        "impotAnnuel": impot_annuel, "precompteAvantBonus": precompte_avant,
        "bonusFiscal": precompte_avant - precompte, "precompte": precompte,
        "cotisationSpeciale": cotisation, "net": net,
    }
    return {k: cents(v) for k, v in valeurs.items()}


def situation(etat, conjoint=None, enfants=0, parent_isole=False):
    # atnMensuelCentimes : les 74 cas de référence sont tous sans avantage de toute nature.
    return {
        "etatCivil": etat,
        "revenusConjoint": conjoint,
        "enfantsACharge": enfants,
        "parentIsole": parent_isole,
        "atnMensuelCentimes": 0,
    }


SITUATIONS = {
    "isole": situation("isole"),
    "isole-2enfants": situation("isole", enfants=2),
    "parentIsole-1enfant": situation("isole", enfants=1, parent_isole=True),
    "conjoint-aucun": situation("marieOuCohabitant", "aucun"),
    "conjoint-pensionMax174": situation("marieOuCohabitant", "pensionMax174"),
    "conjoint-pensionMax579": situation("marieOuCohabitant", "pensionMax579"),
    "conjoint-autresMax290": situation("marieOuCohabitant", "autresMax290"),
    "conjoint-superieurs": situation("marieOuCohabitant", "superieurs"),
    "conjoint-aucun-3enfants": situation("marieOuCohabitant", "aucun", enfants=3),
}
BRUTS = [223361, 230062, 293793, 300000, 340362, 450000, 650000, 1000000]
DATE_PRINCIPALE = "2026-09-14"


def main() -> None:
    cas = []
    for nom, base in SITUATIONS.items():
        for brut in BRUTS:
            cas.append((f"{nom}-{brut}-{DATE_PRINCIPALE}", {"brutMensuelCentimes": brut, **base}, DATE_PRINCIPALE))
    for date in ("2026-08-31", "2026-09-01"):
        cas.append((f"isole-335000-{date}", {"brutMensuelCentimes": 335000, **SITUATIONS["isole"]}, date))

    contenu = {
        "description": "Généré par tools/reference/reference.py — ne pas modifier à la main",
        "cas": [
            {
                "id": identifiant,
                "date": date,
                "situation": sit,
                "attendu": calculer(sit, date),
                "source": "tools/reference/reference.py (SPF-FC-2026, ONSS-BE-2026/3, ONSS-CSSS-2026/3)",
                "verifie": False,
            }
            for identifiant, sit, date in cas
        ],
    }
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(contenu, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(cas)} cas écrits dans {SORTIE}")

    contenu_voiture = {
        "description": "Généré par tools/reference/reference.py — ne pas modifier à la main",
        "cas": [
            {
                "id": identifiant,
                "date": date,
                "voiture": v,
                "attendu": atn_voiture(v, date),
                "source": "tools/reference/reference.py (art. 36 § 2 CIR 92)",
                "verifie": False,
            }
            for identifiant, date, v in CAS_VOITURE
        ],
    }
    SORTIE_VOITURE.write_text(json.dumps(contenu_voiture, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(CAS_VOITURE)} cas voiture écrits dans {SORTIE_VOITURE}")


if __name__ == "__main__":
    main()