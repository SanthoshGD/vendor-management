#!/usr/bin/env font
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs')
os.makedirs(DOCS_DIR, exist_ok=True)

documents = [
    {
        "filename": "01_Unified_Business_License_Leather_Kings.pdf",
        "title": "PEOPLE'S REPUBLIC OF CHINA",
        "subtitle": "UNIFIED SOCIAL CREDIT BUSINESS LICENSE",
        "details": [
            ("Unified Social Credit Code / Reg No:", "91440101LK998822CN"),
            ("Company Legal Name:", "Leather Kings Co., Ltd. (广州皮革之王有限公司)"),
            ("Legal Representative:", "Anubhav Srivastav"),
            ("Registered Capital:", "RMB 10,000,000"),
            ("Enterprise Type:", "Limited Liability Company (Foreign Enterprise)"),
            ("Establishment Date:", "June 15, 2018"),
            ("Registered Address:", "No. 88 Leather Industrial Avenue, Baiyun District, Guangzhou, Guangdong, China 510000"),
            ("Scope of Business:", "Manufacturing, export, and international trade of genuine leather products, footwear, apparel, accessories, and raw leather materials."),
            ("Issuing Authority:", "Guangzhou Market Supervision and Administration Bureau"),
            ("License Status:", "VALID & ACTIVE"),
        ]
    },
    {
        "filename": "02_Tax_Registration_Certificate_Leather_Kings.pdf",
        "title": "STATE TAXATION ADMINISTRATION OF CHINA",
        "subtitle": "TAX REGISTRATION CERTIFICATE",
        "details": [
            ("Taxpayer Identification Number (TIN):", "TIN-LK998822"),
            ("Taxpayer Entity Name:", "Leather Kings Co., Ltd."),
            ("Primary Executive / Contact:", "Anubhav Srivastav (Founder & Export Director)"),
            ("Registered Address:", "No. 88 Leather Industrial Avenue, Baiyun District, Guangzhou, Guangdong, China"),
            ("Taxpayer Classification:", "General Taxpayer Status (13% Export Tariff Rebate)"),
            ("Tax Office Location:", "State Tax Bureau of Guangzhou City, Guangdong Province"),
            ("Effective Registration Date:", "July 01, 2018"),
            ("Compliance Standing:", "Good Standing - Fully Tax Compliant"),
        ]
    },
    {
        "filename": "03_Export_License_Leather_Kings.pdf",
        "title": "MINISTRY OF COMMERCE OF CHINA",
        "subtitle": "FOREIGN TRADE VENDOR EXPORT LICENSE",
        "details": [
            ("License Serial Number:", "EXP-LK-2024-88992"),
            ("Exporter Enterprise:", "Leather Kings Co., Ltd."),
            ("Authorized Director:", "Anubhav Srivastav"),
            ("Registered Port of Export:", "Port of Nansha / Port of Guangzhou"),
            ("Category Permissions:", "Apparel, Footwear, Leather Goods, Fashion Accessories"),
            ("Validity Period:", "January 01, 2024 to December 31, 2028"),
            ("Issuing Authority:", "Department of Commerce of Guangdong Province"),
            ("Customs Code:", "440196LK88"),
        ]
    },
    {
        "filename": "04_Factory_Social_Compliance_Audit_Leather_Kings.pdf",
        "title": "SGS COMPLIANCE SERVICES",
        "subtitle": "SMETA 4-PILLAR SOCIAL COMPLIANCE AUDIT REPORT",
        "details": [
            ("Report Number:", "AUD-SGS-2024-LK99"),
            ("Facility Name:", "Leather Kings Manufacturing Plant #1"),
            ("Facility Location:", "No. 88 Leather Industrial Avenue, Baiyun District, Guangzhou, China"),
            ("Facility Contact Person:", "Anubhav Srivastav"),
            ("Audit Agency:", "SGS International Compliance Services"),
            ("Audit Date:", "November 12, 2024"),
            ("Audit Rating:", "APPROVED (A Grade - Zero Major Non-Conformities)"),
            ("Labor Standards:", "PASS - Fully Compliant (No underage labor, fair wages)"),
            ("Health & Safety:", "PASS - Fully Compliant (PPE supplied, clear exits)"),
            ("Environment:", "PASS - Fully Compliant (ISO 14001 Waste Treatment)"),
        ]
    },
    {
        "filename": "05_Certificate_of_Liability_Insurance_Leather_Kings.pdf",
        "title": "PING AN GLOBAL INSURANCE CORP.",
        "subtitle": "COMMERCIAL GENERAL LIABILITY INSURANCE CERTIFICATE",
        "details": [
            ("Policy Number:", "CGL-INS-2024-LK7788"),
            ("Insured Entity:", "Leather Kings Co., Ltd."),
            ("Insured Address:", "No. 88 Leather Industrial Avenue, Baiyun District, Guangzhou, Guangdong, China"),
            ("Authorized Executive:", "Anubhav Srivastav"),
            ("General Liability Limit:", "$5,000,000 USD per occurrence"),
            ("Product Liability Limit:", "$10,000,000 USD aggregate"),
            ("Fire Legal Liability:", "$1,000,000 USD"),
            ("Policy Period:", "January 01, 2025 to December 31, 2025"),
            ("Policy Status:", "ACTIVE & IN FORCE"),
        ]
    },
    {
        "filename": "06_REACH_Chemical_Compliance_Certificate_Leather_Kings.pdf",
        "title": "TÜV RHEINLAND GREATER CHINA",
        "subtitle": "EU REACH CHEMICAL COMPLIANCE CERTIFICATE OF CONFORMITY",
        "details": [
            ("Certificate Number:", "REACH-EUR-2024-LK9922"),
            ("Regulation Reference:", "Regulation (EC) No 1907/2006 (REACH SVHC List)"),
            ("Manufacturer Name:", "Leather Kings Co., Ltd."),
            ("Factory Location:", "Guangzhou, Guangdong Province, China"),
            ("Responsible Person:", "Anubhav Srivastav"),
            ("Tested Material:", "Finished Calfskin & Cowhide Leather (Top Grain & Suede)"),
            ("Test Results:", "PASS - Below Detection Limits (ND < 0.005%) for all 240 SVHC Substances, Azo Dyes, Lead & Phthalates"),
            ("Date of Issue:", "October 20, 2024"),
        ]
    },
    {
        "filename": "07_ISO_17075_Chromium_VI_Leather_Test_Leather_Kings.pdf",
        "title": "INTERTEK TESTING SERVICES",
        "subtitle": "ISO 17075 CHROMIUM VI LEATHER TEST CERTIFICATE",
        "details": [
            ("Report Number:", "LAB-ISO-17075-LK88"),
            ("Test Standard:", "ISO 17075-1:2017 (Quantitative Chemical Determination)"),
            ("Client Enterprise:", "Leather Kings Co., Ltd., Guangzhou, China"),
            ("Contact Person:", "Anubhav Srivastav"),
            ("Sample Description:", "Premium Aniline Finished Tanned Leather"),
            ("Test Result:", "PASS - Hexavalent Chromium (Cr VI) < 3.0 mg/kg"),
            ("Regulatory Standing:", "Fully Compliant with EU & US Footwear/Garment Standards"),
            ("Testing Body:", "Intertek Testing Services Guangzhou Ltd."),
        ]
    }
]

def build_pdf(doc_info):
    filepath = os.path.join(DOCS_DIR, doc_info["filename"])
    doc = SimpleDocTemplate(filepath, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#059669'),
        alignment=1,
        fontName='Helvetica-Bold'
    )
    label_style = ParagraphStyle(
        'DocLabel',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        fontName='Helvetica-Bold'
    )
    val_style = ParagraphStyle(
        'DocVal',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0F172A'),
        fontName='Helvetica'
    )

    story.append(Paragraph(doc_info["title"], title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(doc_info["subtitle"], subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#10B981'), spaceAfter=15))

    table_data = []
    for label, val in doc_info["details"]:
        p_label = Paragraph(label, label_style)
        p_val = Paragraph(val, val_style)
        table_data.append([p_label, p_val])

    t = Table(table_data, colWidths=[180, 360])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))

    story.append(t)
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    footer_text = Paragraph("<font color='#64748B' size=8>Official Document Record &middot; Verified Entity: Leather Kings Co., Ltd. &middot; Representative: Anubhav Srivastav &middot; Guangzhou, China</font>", ParagraphStyle('Footer', alignment=1))
    story.append(footer_text)

    doc.build(story)
    print(f"Generated PDF: {filepath}")

for doc_info in documents:
    build_pdf(doc_info)

print("All 7 PDFs generated successfully in docs/")
