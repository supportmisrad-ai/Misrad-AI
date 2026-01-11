#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to generate PDF with screenshots of all system screens
Uses Playwright to capture screenshots and creates a PDF
"""

import os
import re
import time
import asyncio
import json
from pathlib import Path
from datetime import datetime

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("אנא התקן את playwright: pip install playwright")
    print("ואז הרץ: playwright install chromium")
    exit(1)

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER
    from PIL import Image as PILImage
except ImportError:
    print("אנא התקן את reportlab ו-Pillow: pip install reportlab Pillow")
    exit(1)

# Get project root directory
PROJECT_ROOT = Path(__file__).parent.parent
VIEWS_DIR = PROJECT_ROOT / "views"
APP_DIR = PROJECT_ROOT / "app"
CONSTANTS_FILE = PROJECT_ROOT / "constants.ts"
SCREENSHOTS_DIR = PROJECT_ROOT / "כלים מתקדמים" / "screenshots"

# Default URL - change if your app runs on different port
BASE_URL = "http://localhost:4000"

def reverse_hebrew(text):
    """Simple function to reverse Hebrew text for RTL display"""
    return text[::-1] if any('\u0590' <= c <= '\u05FF' for c in text) else text

def extract_screens_from_constants():
    """Extract screen definitions from constants.ts"""
    screens = {
        'main': [],
        'settings': []
    }
    
    if not CONSTANTS_FILE.exists():
        print(f"קובץ constants.ts לא נמצא: {CONSTANTS_FILE}")
        return screens
    
    content = CONSTANTS_FILE.read_text(encoding='utf-8')
    
    # Extract SYSTEM_SCREENS array
    pattern = r'SYSTEM_SCREENS:\s*ScreenDefinition\[\]\s*=\s*\[(.*?)\];'
    match = re.search(pattern, content, re.DOTALL)
    
    if match:
        screens_content = match.group(1)
        # Extract individual screen entries
        screen_pattern = r'\{[^}]*id:\s*[\'"](\w+)[\'"][^}]*label:\s*[\'"]([^\'"]+)[\'"][^}]*category:\s*[\'"]([^\'"]+)[\'"]'
        for screen_match in re.finditer(screen_pattern, screens_content):
            screen_id = screen_match.group(1)
            label = screen_match.group(2)
            category = screen_match.group(3)
            screens[category].append({'id': screen_id, 'label': label, 'category': category})
    
    return screens

def get_route_for_screen(screen_id):
    """Map screen ID to route path"""
    route_map = {
        'dashboard': '/',
        'tasks': '/tasks',
        'calendar': '/calendar',
        'clients': '/clients',
        'team': '/team',
        'reports': '/reports',
        'assets': '/assets',
        'brain': '/brain',
        'trash': '/trash',
        'settings_organization': '/settings?tab=organization',
        'settings_audit': '/settings?tab=audit',
        'settings_updates': '/settings?tab=updates',
        'settings_requests': '/settings?tab=requests',
        'settings_integrations': '/settings?tab=integrations',
        'settings_team': '/settings?tab=team',
        'settings_goals': '/settings?tab=goals',
        'settings_products': '/settings?tab=products',
        'settings_templates': '/settings?tab=templates',
        'settings_workflow': '/settings?tab=workflow',
        'settings_departments': '/settings?tab=departments',
        'settings_roles': '/settings?tab=roles',
        'settings_data': '/settings?tab=data',
    }
    return route_map.get(screen_id, '/')

async def take_screenshots(base_url, screens):
    """Take screenshots of all screens using Playwright"""
    print("מתחיל לצלם מסכים...")
    print(f"בסיס URL: {base_url}")
    print("\nהדפדפן יפתח כעת.")
    print("אם המערכת דורשת התחברות:")
    print("  1. התחבר במסך שנפתח")
    print("  2. חזור לקונסול ולחץ Enter להמשך")
    print("\nאם כבר התחברת בעבר, לחץ Enter עכשיו...")
    input("לחץ Enter להמשך...")
    
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    cookies_file = SCREENSHOTS_DIR.parent / "cookies.json"
    
    screenshots = []
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False)  # headless=False so you can see and login
        
        # Try to load saved cookies
        context_options = {
            'viewport': {'width': 1920, 'height': 1080},
            'locale': 'he-IL'
        }
        
        context = await browser.new_context(**context_options)
        
        # Load cookies if they exist
        if cookies_file.exists():
            try:
                with open(cookies_file, 'r', encoding='utf-8') as f:
                    cookies = json.load(f)
                    await context.add_cookies(cookies)
                    print("✓ נטענו cookies שמורים")
            except Exception as e:
                print(f"לא הצלחתי לטעון cookies: {e}")
        
        page = await context.new_page()
        
        try:
            # Navigate to base URL first
            print(f"ניגש ל-{base_url}...")
            await page.goto(base_url, wait_until='networkidle', timeout=60000)
            await asyncio.sleep(2)  # Wait for initial load
            
            # Take screenshots of main screens
            all_screens = screens['main'] + screens['settings']
            
            for idx, screen in enumerate(all_screens, 1):
                screen_id = screen['id']
                label = screen['label']
                route = get_route_for_screen(screen_id)
                url = f"{base_url}{route}"
                
                print(f"[{idx}/{len(all_screens)}] מצלם: {label} ({screen_id})")
                
                try:
                    # Navigate to screen
                    await page.goto(url, wait_until='networkidle', timeout=30000)
                    await asyncio.sleep(2)  # Wait for content to load
                    
                    # Take screenshot
                    screenshot_path = SCREENSHOTS_DIR / f"{screen_id}.png"
                    await page.screenshot(path=str(screenshot_path), full_page=True)
                    
                    screenshots.append({
                        'screen': screen,
                        'path': screenshot_path,
                        'url': url
                    })
                    
                    print(f"  ✓ נשמר: {screenshot_path.name}")
                    
                except Exception as e:
                    print(f"  ✗ שגיאה בצילום {label}: {e}")
                    continue
                    
        finally:
            # Save cookies for next time (before closing browser)
            try:
                cookies = await context.cookies()
                with open(cookies_file, 'w', encoding='utf-8') as f:
                    json.dump(cookies, f, indent=2)
                print("\n✓ Cookies נשמרו לשימוש בעתיד")
            except Exception as e:
                print(f"\n! לא הצלחתי לשמור cookies: {e}")
            
            await browser.close()
    
    print(f"\nסיימתי לצלם {len(screenshots)} מסכים")
    return screenshots

def create_pdf_from_screenshots(screenshots):
    """Create PDF document from screenshots"""
    output_file = PROJECT_ROOT / "מסכי_המערכת.pdf"
    
    # Create PDF document
    doc = SimpleDocTemplate(str(output_file), pagesize=A4,
                          rightMargin=1*cm, leftMargin=1*cm,
                          topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    story = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_RIGHT,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=15,
        spaceBefore=20,
        alignment=TA_RIGHT,
        fontName='Helvetica-Bold'
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=colors.HexColor('#475569'),
        spaceAfter=10,
        spaceBefore=15,
        alignment=TA_RIGHT,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        alignment=TA_RIGHT,
        fontName='Helvetica'
    )
    
    # Title page
    story.append(Paragraph(reverse_hebrew("תיעוד מסכי המערכת"), title_style))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(reverse_hebrew("Scale CRM / Nexus OS"), subheading_style))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(reverse_hebrew(f"נוצר ב-{datetime.now().strftime('%d/%m/%Y %H:%M')}"), normal_style))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(reverse_hebrew(f"סה\"כ {len(screenshots)} מסכים"), normal_style))
    story.append(PageBreak())
    
    # Group screenshots by category
    main_screenshots = [s for s in screenshots if s['screen']['category'] == 'main']
    settings_screenshots = [s for s in screenshots if s['screen']['category'] == 'settings']
    
    # Main Screens Section
    if main_screenshots:
        story.append(Paragraph(reverse_hebrew("מסכים ראשיים"), heading_style))
        story.append(Spacer(1, 0.3*cm))
        
        for screenshot in main_screenshots:
            screen = screenshot['screen']
            img_path = screenshot['path']
            
            # Check if image exists
            if not img_path.exists():
                print(f"קובץ תמונה לא נמצא: {img_path}")
                continue
            
            # Add screen title
            story.append(Paragraph(f"<b>{reverse_hebrew(screen['label'])}</b>", subheading_style))
            story.append(Paragraph(reverse_hebrew(f"({screen['id']})"), normal_style))
            story.append(Spacer(1, 0.2*cm))
            
            # Add screenshot
            try:
                # Open and resize image to fit page width
                img = PILImage.open(img_path)
                img_width, img_height = img.size
                
                # Calculate dimensions to fit page (with margins)
                page_width = A4[0] - 2*cm
                page_height = A4[1] - 3*cm
                
                # Scale to fit width, maintaining aspect ratio
                scale = page_width / img_width
                new_width = page_width
                new_height = img_height * scale
                
                # If image is too tall, scale to fit height instead
                if new_height > page_height:
                    scale = page_height / img_height
                    new_height = page_height
                    new_width = img_width * scale
                
                # Add image to PDF
                pdf_img = Image(str(img_path), width=new_width, height=new_height)
                story.append(pdf_img)
                story.append(Spacer(1, 0.3*cm))
                story.append(PageBreak())
                
            except Exception as e:
                print(f"שגיאה בהוספת תמונה {img_path}: {e}")
                story.append(Paragraph(reverse_hebrew(f"שגיאה בטעינת תמונה"), normal_style))
                story.append(PageBreak())
    
    # Settings Screens Section
    if settings_screenshots:
        story.append(Paragraph(reverse_hebrew("הגדרות - תפריטי משנה"), heading_style))
        story.append(Spacer(1, 0.3*cm))
        
        for screenshot in settings_screenshots:
            screen = screenshot['screen']
            img_path = screenshot['path']
            
            if not img_path.exists():
                continue
            
            story.append(Paragraph(f"<b>{reverse_hebrew(screen['label'])}</b>", subheading_style))
            story.append(Paragraph(reverse_hebrew(f"({screen['id']})"), normal_style))
            story.append(Spacer(1, 0.2*cm))
            
            try:
                img = PILImage.open(img_path)
                img_width, img_height = img.size
                
                page_width = A4[0] - 2*cm
                page_height = A4[1] - 3*cm
                
                scale = page_width / img_width
                new_width = page_width
                new_height = img_height * scale
                
                if new_height > page_height:
                    scale = page_height / img_height
                    new_height = page_height
                    new_width = img_width * scale
                
                pdf_img = Image(str(img_path), width=new_width, height=new_height)
                story.append(pdf_img)
                story.append(Spacer(1, 0.3*cm))
                story.append(PageBreak())
                
            except Exception as e:
                print(f"שגיאה בהוספת תמונה {img_path}: {e}")
                story.append(Paragraph(reverse_hebrew(f"שגיאה בטעינת תמונה"), normal_style))
                story.append(PageBreak())
    
    # Build PDF
    doc.build(story)
    print(f"\n✓ PDF נוצר בהצלחה: {output_file}")

async def main():
    """Main function"""
    import sys
    
    # Allow custom URL
    base_url = BASE_URL
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
        print(f"שימוש ב-URL מותאם: {base_url}")
    
    # Extract screens
    print("קורא הגדרות מסכים...")
    screens = extract_screens_from_constants()
    print(f"נמצאו {len(screens['main'])} מסכים ראשיים ו-{len(screens['settings'])} תפריטי הגדרות")
    
    # Take screenshots
    screenshots = await take_screenshots(base_url, screens)
    
    if not screenshots:
        print("לא נצלמו מסכים. בדוק שהמערכת רצה ושאין שגיאות.")
        return
    
    # Create PDF
    print("\nיוצר PDF...")
    create_pdf_from_screenshots(screenshots)
    
    print("\n✓ סיום!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nבוטל על ידי המשתמש")
    except Exception as e:
        print(f"\nשגיאה: {e}")
        import traceback
        traceback.print_exc()
