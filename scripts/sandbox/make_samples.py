"""Generates the sample evidence pack a tester uploads during onboarding.

Each PDF carries a machine-readable marker in its text layer:

    SSX-CHECK: PASS
    SSX-CHECK: FAIL | <short reason> | <what the supplier must do>

The app reads the head of the uploaded file as text and looks for that marker,
which is why `pageCompression=0` matters - a compressed content stream is not
greppable and every document would silently pass.

The pack tells one story deliberately: six required documents sail through, the bank
letter is rejected because the account name does not match the registered legal
name, and a corrected bank letter then clears it. That is the most common real
rejection in supplier onboarding, and it is one a supplier can actually fix.
"""
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

OUT = Path(__file__).resolve().parents[3] / "Sample documents"
OUT.mkdir(parents=True, exist_ok=True)

INK = HexColor("#10231e")
MUTED = HexColor("#5c6b66")
LINE = HexColor("#d8e0dc")
RED = HexColor("#b4291f")
GREEN = HexColor("#1f7a52")

LEGAL_NAME = "Kalyani Silks Private Limited"
REG_NO = "U17299KA2016PTC094412"
TAX_ID = "29AAJCK4419P1ZK"
ADDRESS = "48 Residency Cross Road, Bengaluru 560025, Karnataka, India"


def draw(path, title, issuer, rows, marker, note=None, stamp=None, stamp_tone=GREEN):
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=0)
    c.setTitle(title)
    c.setAuthor(issuer)
    # The marker also goes in the document metadata, so it survives even if a
    # reader only looks at the info dictionary.
    c.setSubject(marker)
    w, h = A4

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(20 * mm, h - 20 * mm, issuer.upper())
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(20 * mm, h - 23 * mm, w - 20 * mm, h - 23 * mm)

    c.setFont("Helvetica-Bold", 17)
    c.drawString(20 * mm, h - 36 * mm, title)

    if note:
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9.5)
        c.drawString(20 * mm, h - 43 * mm, note)

    y = h - 58 * mm
    for label, value in rows:
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 8.5)
        c.drawString(20 * mm, y, label.upper())
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(20 * mm, y - 6 * mm, value)
        c.setStrokeColor(LINE)
        c.line(20 * mm, y - 10 * mm, w - 20 * mm, y - 10 * mm)
        y -= 18 * mm

    if stamp:
        c.setFillColor(stamp_tone)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20 * mm, y - 4 * mm, stamp)
        y -= 12 * mm

    # The marker, printed small at the foot of the page. Visible on purpose:
    # a tester should be able to see why a file passes or fails.
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7)
    c.drawString(20 * mm, 18 * mm, marker)
    c.drawString(20 * mm, 14 * mm,
                 "Sample document generated for the StyleSphere Vendor Nexus prototype. Not a real certificate.")
    c.showPage()
    c.save()
    return path


PASS = "SSX-CHECK: PASS"

# --- the five that sail through ---------------------------------------------
draw(OUT / "01 Tax Registration Certificate (PASS).pdf",
     "Certificate of Tax Registration",
     "Government of India - Goods and Services Tax",
     [("Registered legal name", LEGAL_NAME),
      ("GSTIN / Tax identification number", TAX_ID),
      ("Principal place of business", ADDRESS),
      ("Valid from", "01 April 2024"),
      ("Status", "Active")],
     PASS, note="Issued under Section 25 of the CGST Act, 2017.",
     stamp="VERIFIED ELECTRONICALLY - no signature required")

draw(OUT / "02 Import Export Code Licence (PASS).pdf",
     "Importer-Exporter Code Certificate",
     "Directorate General of Foreign Trade",
     [("Registered legal name", LEGAL_NAME),
      ("IEC number", "0716009432"),
      ("Company registration number", REG_NO),
      ("Registered address", ADDRESS),
      ("Date of issue", "12 June 2016")],
     PASS, stamp="ACTIVE - no restrictions on record")

draw(OUT / "03 Certificate of Liability Insurance (PASS).pdf",
     "Certificate of Liability Insurance",
     "Bharat General Insurance Company Limited",
     [("Insured legal name", LEGAL_NAME),
      ("Policy number", "BG-PL-2026-118447"),
      ("Limit of indemnity", "USD 5,000,000 each and every claim"),
      ("Period of cover", "01 January 2026 to 31 December 2026"),
      ("Coverage", "Public and products liability")],
     PASS, stamp="IN FORCE - premium paid to 31 December 2026")

draw(OUT / "04 REACH Chemical Compliance (PASS).pdf",
     "REACH Compliance Declaration",
     "Intertek Testing Services - Bengaluru Laboratory",
     [("Manufacturer", LEGAL_NAME),
      ("Report reference", "ITS-REACH-2026-40219"),
      ("Substances screened", "SVHC candidate list, 241 substances"),
      ("Result", "No substance detected above 0.1% w/w"),
      ("Date of test", "18 February 2026")],
     PASS, stamp="PASS - compliant with EC 1907/2006")

draw(OUT / "05 ISO 17075 Chromium VI Test (PASS).pdf",
     "ISO 17075-1 Chromium (VI) Test Report",
     "SGS India Private Limited - Leather Testing Division",
     [("Manufacturer", LEGAL_NAME),
      ("Report reference", "SGS-LTH-2026-77310"),
      ("Method", "ISO 17075-1:2017 photometric determination"),
      ("Result", "Not detected - below 3 mg/kg limit of quantification"),
      ("Date of test", "02 March 2026")],
     PASS, stamp="PASS - within EU REACH Annex XVII limit")

# --- the one that is rejected, and its fix -----------------------------------
FAIL = ("SSX-CHECK: FAIL | The account name does not match your registered legal name "
        "| The letter names 'Kalyani Silk Exports' but your application says "
        "'Kalyani Silks Private Limited'. Ask your bank to reissue it in the registered "
        "legal name, then upload it again.")

draw(OUT / "06 Bank Verification Letter (FAILS - try this one).pdf",
     "Bank Account Verification Letter",
     "Canara Bank - Residency Road Branch, Bengaluru",
     [("Account holder name", "Kalyani Silk Exports"),
      ("Account number", "0913 2010 044 781"),
      ("IFSC / SWIFT", "CNRB0000913 / CNRBINBBBGL"),
      ("Account type", "Current account"),
      ("Letter dated", "14 March 2026")],
     FAIL, note="This letter confirms the account details held with this branch.",
     stamp="NAME ON ACCOUNT DIFFERS FROM APPLICANT", stamp_tone=RED)

draw(OUT / "07 Bank Verification Letter CORRECTED (PASS).pdf",
     "Bank Account Verification Letter",
     "Canara Bank - Residency Road Branch, Bengaluru",
     [("Account holder name", LEGAL_NAME),
      ("Account number", "0913 2010 044 781"),
      ("IFSC / SWIFT", "CNRB0000913 / CNRBINBBBGL"),
      ("Account type", "Current account"),
      ("Letter dated", "21 March 2026")],
     PASS, note="Reissued in the registered legal name at the customer's request.",
     stamp="ACCOUNT NAME MATCHES THE REGISTERED ENTITY")


draw(OUT / "08 Factory Social Compliance Audit (PASS).pdf",
     "Factory Social Compliance Audit",
     "QIMA Ethical Audit Services - Bengaluru",
     [("Audited legal entity", LEGAL_NAME),
      ("Audit standard", "SMETA 4-pillar workplace assessment"),
      ("Site address", ADDRESS),
      ("Audit date", "08 February 2026"),
      ("Overall result", "Grade A - no critical findings"),
      ("Open corrective actions", "None")],
     PASS, note="Independent announced audit covering labour, health, safety, and business ethics.",
     stamp="PASS - NO OPEN CORRECTIVE ACTIONS")
print("\n".join(sorted(p.name for p in OUT.glob("*.pdf"))))
