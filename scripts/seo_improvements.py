#!/usr/bin/env python3
"""
Comprehensive SEO and UI improvements for Cedars Dental Centre website.
"""

import os
import re

BASE_DIR = "/Users/eli/Downloads/CDCTestAi"

# ─────────────────────────────────────────────
# STEP 1: Create robots.txt
# ─────────────────────────────────────────────
robots_content = """User-agent: *
Allow: /
Sitemap: https://cedarsdentalcentre.com/sitemap.xml
"""
with open(os.path.join(BASE_DIR, "robots.txt"), "w") as f:
    f.write(robots_content)
print("✓ robots.txt created")

# ─────────────────────────────────────────────
# STEP 2: Create sitemap.xml
# ─────────────────────────────────────────────
sitemap_content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cedarsdentalcentre.com/</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cedarsdentalcentre.com/about</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cedarsdentalcentre.com/services</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cedarsdentalcentre.com/procedures</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cedarsdentalcentre.com/team</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://cedarsdentalcentre.com/cases</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cedarsdentalcentre.com/blog</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://cedarsdentalcentre.com/contact</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
"""
with open(os.path.join(BASE_DIR, "sitemap.xml"), "w") as f:
    f.write(sitemap_content)
print("✓ sitemap.xml created")

# ─────────────────────────────────────────────
# STEP 3: Per-page SEO tags
# ─────────────────────────────────────────────
seo_tags = {
    "index.html": '<title>Cedars Dental Centre - Expert Dentist in Mansourieh, Lebanon</title><meta name="description" content="Cedars Dental Centre offers expert dental care in Mansourieh, Lebanon. Teeth whitening, implants, braces, veneers &amp; root canal. Call +961 70 533 831 to book."/><meta name="robots" content="index, follow"/><link rel="canonical" href="https://cedarsdentalcentre.com/"/><meta property="og:type" content="website"/><meta property="og:title" content="Cedars Dental Centre - Expert Dentist in Mansourieh, Lebanon"/><meta property="og:description" content="Expert dental care in Mansourieh, Lebanon. Teeth whitening, implants, braces, veneers &amp; root canal. Call +961 70 533 831."/><meta property="og:url" content="https://cedarsdentalcentre.com/"/><meta property="og:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/><meta property="og:site_name" content="Cedars Dental Centre"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Cedars Dental Centre - Expert Dentist in Mansourieh, Lebanon"/><meta name="twitter:description" content="Expert dental care in Mansourieh, Lebanon. Whitening, implants, braces, veneers &amp; more."/><meta name="twitter:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/>',

    "about.html": '<title>About Us - Cedars Dental Centre Mansourieh, Lebanon</title><meta name="description" content="Learn about Cedars Dental Centre in Mansourieh, Lebanon. Our mission, values, and experienced dental team dedicated to your smile and oral health."/><meta name="robots" content="index, follow"/><link rel="canonical" href="https://cedarsdentalcentre.com/about"/><meta property="og:type" content="website"/><meta property="og:title" content="About Us - Cedars Dental Centre Mansourieh, Lebanon"/><meta property="og:description" content="Learn about Cedars Dental Centre in Mansourieh. Our mission, values, and experienced dental team."/><meta property="og:url" content="https://cedarsdentalcentre.com/about"/><meta property="og:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/><meta property="og:site_name" content="Cedars Dental Centre"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="About Us - Cedars Dental Centre Mansourieh, Lebanon"/><meta name="twitter:description" content="Our mission, values, and experienced dental team in Mansourieh, Lebanon."/><meta name="twitter:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/>',

    "services.html": '<title>Dental Services in Lebanon - Cedars Dental Centre</title><meta name="description" content="Explore our full range of dental services at Cedars Dental Centre: whitening, crowns, veneers, implants, root canal, orthodontics, pediatric dentistry &amp; more in Lebanon."/><meta name="robots" content="index, follow"/><link rel="canonical" href="https://cedarsdentalcentre.com/services"/><meta property="og:type" content="website"/><meta property="og:title" content="Dental Services in Lebanon - Cedars Dental Centre"/><meta property="og:description" content="Whitening, crowns, veneers, implants, root canal, orthodontics &amp; more. Expert dental services in Mansourieh, Lebanon."/><meta property="og:url" content="https://cedarsdentalcentre.com/services"/><meta property="og:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/><meta property="og:site_name" content="Cedars Dental Centre"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Dental Services in Lebanon - Cedars Dental Centre"/><meta name="twitter:description" content="Expert dental services in Mansourieh, Lebanon."/><meta name="twitter:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/>',

    "procedures.html": '<title>Dental Procedures Explained - Cedars Dental Centre Lebanon</title><meta name="description" content="Detailed information on dental procedures at Cedars Dental Centre Mansourieh. Understand your treatment options before your appointment."/><meta name="robots" content="index, follow"/><link rel="canonical" href="https://cedarsdentalcentre.com/procedures"/><meta property="og:type" content="website"/><meta property="og:title" content="Dental Procedures Explained - Cedars Dental Centre Lebanon"/><meta property="og:description" content="Learn about dental procedures at Cedars Dental Centre Mansourieh. Understand your treatment options."/><meta property="og:url" content="https://cedarsdentalcentre.com/procedures"/><meta property="og:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/><meta property="og:site_name" content="Cedars Dental Centre"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Dental Procedures Explained - Cedars Dental Centre Lebanon"/><meta name="twitter:description" content="Learn about dental procedures at Cedars Dental Centre Mansourieh."/><meta name="twitter:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/>',

    "team.html": '<title>Meet Our Dental Team - Cedars Dental Centre Lebanon</title><meta name="description" content="Meet the experienced dentists and specialists at Cedars Dental Centre in Mansourieh, Lebanon. Skilled, caring professionals dedicated to your dental health."/><meta name="robots" content="index, follow"/><link rel="canonical" href="https://cedarsdentalcentre.com/team"/><meta property="og:type" content="website"/><meta property="og:title" content="Meet Our Dental Team - Cedars Dental Centre Lebanon"/><meta property="og:description" content="Meet our experienced dentists and specialists in Mansourieh, Lebanon."/><meta property="og:url" content="https://cedarsdentalcentre.com/team"/><meta property="og:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/><meta property="og:site_name" content="Cedars Dental Centre"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Meet Our Dental Team - Cedars Dental Centre Lebanon"/><meta name="twitter:description" content="Skilled, caring dental professionals in Mansourieh, Lebanon."/><meta name="twitter:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/>',

    "cases.html": '<title>Before &amp; After Cases - Cedars Dental Centre Lebanon</title><meta name="description" content="See real before and after dental transformations at Cedars Dental Centre in Lebanon. Veneers, crowns, composite bonding, braces &amp; gum contouring results."/><meta name="robots" content="index, follow"/><link rel="canonical" href="https://cedarsdentalcentre.com/cases"/><meta property="og:type" content="website"/><meta property="og:title" content="Before &amp; After Cases - Cedars Dental Centre Lebanon"/><meta property="og:description" content="Real before and after dental transformations. Veneers, crowns, braces &amp; more at Cedars Dental Centre."/><meta property="og:url" content="https://cedarsdentalcentre.com/cases"/><meta property="og:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/><meta property="og:site_name" content="Cedars Dental Centre"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Before &amp; After Cases - Cedars Dental Centre Lebanon"/><meta name="twitter:description" content="Real dental transformation results at Cedars Dental Centre Lebanon."/><meta name="twitter:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/>',

    "blog.html": '<title>Dental Health Blog - Cedars Dental Centre Lebanon</title><meta name="description" content="Read expert dental health tips and guides from Cedars Dental Centre Mansourieh. Topics include whitening, orthodontics, children\'s teeth, root canal &amp; more."/><meta name="robots" content="index, follow"/><link rel="canonical" href="https://cedarsdentalcentre.com/blog"/><meta property="og:type" content="website"/><meta property="og:title" content="Dental Health Blog - Cedars Dental Centre Lebanon"/><meta property="og:description" content="Expert dental health tips and guides from Cedars Dental Centre Mansourieh."/><meta property="og:url" content="https://cedarsdentalcentre.com/blog"/><meta property="og:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/><meta property="og:site_name" content="Cedars Dental Centre"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Dental Health Blog - Cedars Dental Centre Lebanon"/><meta name="twitter:description" content="Expert dental health tips from Cedars Dental Centre Mansourieh, Lebanon."/><meta name="twitter:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/>',

    "contact.html": '<title>Contact Us - Cedars Dental Centre Mansourieh, Lebanon</title><meta name="description" content="Contact Cedars Dental Centre in Mansourieh, Lebanon. Call +961 70 533 831, email info@cedarsdentalcentre.com, or visit us at Latifa Center, 4th Floor."/><meta name="robots" content="index, follow"/><link rel="canonical" href="https://cedarsdentalcentre.com/contact"/><meta property="og:type" content="website"/><meta property="og:title" content="Contact Us - Cedars Dental Centre Mansourieh, Lebanon"/><meta property="og:description" content="Contact Cedars Dental Centre: +961 70 533 831. Mansourieh Main Road, Latifa Center, 4th Floor, Lebanon."/><meta property="og:url" content="https://cedarsdentalcentre.com/contact"/><meta property="og:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/><meta property="og:site_name" content="Cedars Dental Centre"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Contact Us - Cedars Dental Centre Mansourieh, Lebanon"/><meta name="twitter:description" content="Contact Cedars Dental Centre in Mansourieh, Lebanon. Call +961 70 533 831."/><meta name="twitter:image" content="https://cedarsdentalcentre.com/images/logo-cedars.png"/>',
}

# Strings for various replacements
VIEWPORT_TAG = '<meta name="viewport" content="width=device-width, initial-scale=1"/>'

# WhatsApp HTML anchor (rendered HTML)
WA_OLD_HTML = '<a target="_blank" href="#"><i class="fa-brands fa-whatsapp"></i></a>'
WA_NEW_HTML = '<a target="_blank" href="https://wa.me/96170533831"><i class="fa-brands fa-whatsapp"></i></a>'

# WhatsApp JSON/RSC payload pattern – find the href="#" that immediately precedes whatsapp className
# Pattern: "href":"#","children":["$","i",null,{"className":"fa-brands fa-whatsapp"
WA_OLD_JSON = '"href":"#","children":["$","i",null,{"className":"fa-brands fa-whatsapp"'
WA_NEW_JSON = '"href":"https://wa.me/96170533831","children":["$","i",null,{"className":"fa-brands fa-whatsapp"'

# Copyright
COPYRIGHT_OLD = '© 2017-<!-- -->2025<!-- -->'
COPYRIGHT_NEW = '© 2017-<!-- -->2026<!-- -->'

# Copyright in RSC payload (two forms seen)
COPYRIGHT_OLD_RSC1 = '"© 2017-",2025," "'
COPYRIGHT_NEW_RSC1 = '"© 2017-",2026," "'

# Footer Blog link
BLOG_LINK_OLD = '<a href="#">Blog</a>'
BLOG_LINK_NEW = '<a href="/blog">Blog</a>'

# WhatsApp floating button (insert before </body>)
WA_FLOAT_BTN = '<a href="https://wa.me/96170533831" target="_blank" rel="noopener noreferrer" style="position:fixed;bottom:24px;right:24px;z-index:9999;background:#25D366;color:#fff;border-radius:50%;width:60px;height:60px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);text-decoration:none;font-size:28px;" title="Chat with us on WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>'

# JSON-LD schemas (index.html only)
LOCAL_BUSINESS_SCHEMA = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Dentist","name":"Cedars Dental Centre","address":{"@type":"PostalAddress","streetAddress":"Mansourieh Main Road, Latifa Center, 4th Floor","addressLocality":"Mansourieh","addressCountry":"LB"},"telephone":"+96170533831","email":"info@cedarsdentalcentre.com","openingHours":["Mo-Fr 10:00-18:00","Sa 09:00-14:00"],"url":"https://cedarsdentalcentre.com","sameAs":["https://www.facebook.com/cedarsdentalcentrelebanon/"]}</script>'

FAQ_SCHEMA = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"What dental services does Cedars Dental Centre offer?","acceptedAnswer":{"@type":"Answer","text":"Cedars Dental Centre offers a wide range of services including teeth whitening, dental fillings and crowns, veneers, root canal treatment, oral surgery, dental implants, braces/orthodontics, and pediatric dentistry."}},{"@type":"Question","name":"Where is Cedars Dental Centre located?","acceptedAnswer":{"@type":"Answer","text":"We are located at Mansourieh Main Road, Latifa Center, 4th Floor, Lebanon."}},{"@type":"Question","name":"What are the opening hours?","acceptedAnswer":{"@type":"Answer","text":"We are open Monday to Friday from 10:00 to 18:00, and Saturday from 9:00 to 14:00."}},{"@type":"Question","name":"How can I book an appointment?","acceptedAnswer":{"@type":"Answer","text":"You can call us at +961 70 533 831, email us at info@cedarsdentalcentre.com, or send us a message via WhatsApp."}}]}</script>'

html_files = [
    "index.html", "about.html", "services.html", "procedures.html",
    "team.html", "cases.html", "blog.html", "contact.html"
]

for filename in html_files:
    filepath = os.path.join(BASE_DIR, filename)
    print(f"\nProcessing {filename} ...")

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original_len = len(content)
    changes = []

    # ── A) Insert SEO tags after viewport meta tag ──────────────────────────
    tags = seo_tags[filename]
    insert_after = VIEWPORT_TAG + tags
    if tags not in content:
        if VIEWPORT_TAG in content:
            content = content.replace(VIEWPORT_TAG, insert_after, 1)
            changes.append("SEO tags inserted")
        else:
            print(f"  WARNING: viewport tag not found in {filename}")
    else:
        changes.append("SEO tags already present (skipped)")

    # ── B) Fix copyright year ───────────────────────────────────────────────
    if COPYRIGHT_OLD in content:
        content = content.replace(COPYRIGHT_OLD, COPYRIGHT_NEW)
        changes.append("copyright year fixed (HTML)")
    if COPYRIGHT_OLD_RSC1 in content:
        content = content.replace(COPYRIGHT_OLD_RSC1, COPYRIGHT_NEW_RSC1)
        changes.append("copyright year fixed (RSC)")

    # ── C) Fix WhatsApp social link ─────────────────────────────────────────
    if WA_OLD_HTML in content:
        content = content.replace(WA_OLD_HTML, WA_NEW_HTML)
        changes.append("WhatsApp HTML link fixed")
    if WA_OLD_JSON in content:
        content = content.replace(WA_OLD_JSON, WA_NEW_JSON)
        changes.append("WhatsApp JSON link fixed")

    # ── D) Add WhatsApp floating button before </body> ──────────────────────
    if WA_FLOAT_BTN not in content:
        if '</body>' in content:
            content = content.replace('</body>', WA_FLOAT_BTN + '</body>', 1)
            changes.append("WhatsApp floating button added")
        else:
            print(f"  WARNING: </body> not found in {filename}")
    else:
        changes.append("WhatsApp floating button already present (skipped)")

    # ── E & F) index.html only: JSON-LD schemas ─────────────────────────────
    if filename == "index.html":
        if LOCAL_BUSINESS_SCHEMA not in content:
            content = content.replace('</body>', LOCAL_BUSINESS_SCHEMA + '</body>', 1)
            changes.append("Local Business schema added")
        if FAQ_SCHEMA not in content:
            content = content.replace('</body>', FAQ_SCHEMA + '</body>', 1)
            changes.append("FAQ schema added")

    # ── G) Fix footer Blog link ─────────────────────────────────────────────
    if BLOG_LINK_OLD in content:
        content = content.replace(BLOG_LINK_OLD, BLOG_LINK_NEW)
        changes.append("footer Blog link fixed")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"  Changes: {', '.join(changes)}")
    print(f"  Size: {original_len} → {len(content)} bytes (+{len(content)-original_len})")

print("\n✓ All HTML files processed successfully.")
