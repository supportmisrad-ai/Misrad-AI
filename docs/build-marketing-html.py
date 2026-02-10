#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build complete HTML files from markdown documentation
Creates mobile-responsive, print-friendly HTML with full content
"""

import os
import glob
import re
from pathlib import Path

def markdown_to_html_simple(md_content):
    """Convert basic markdown to HTML"""
    html = md_content
    
    # Headers
    html = re.sub(r'^# (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)
    html = re.sub(r'^#### (.+)$', r'<h5>\1</h5>', html, flags=re.MULTILINE)
    
    # Bold and italic
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
    
    # Code blocks
    html = re.sub(r'```(.+?)```', r'<pre>\1</pre>', html, flags=re.DOTALL)
    html = re.sub(r'`(.+?)`', r'<code>\1</code>', html)
    
    # Blockquotes
    lines = html.split('\n')
    in_blockquote = False
    result_lines = []
    for line in lines:
        if line.startswith('> '):
            if not in_blockquote:
                result_lines.append('<blockquote>')
                in_blockquote = True
            result_lines.append(line[2:] + '<br>')
        else:
            if in_blockquote:
                result_lines.append('</blockquote>')
                in_blockquote = False
            result_lines.append(line)
    
    if in_blockquote:
        result_lines.append('</blockquote>')
    
    html = '\n'.join(result_lines)
    
    # Lists
    html = re.sub(r'^\- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'^\d+\. (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    
    # Wrap consecutive <li> in <ul>
    html = re.sub(r'(<li>.+?</li>\n?)+', r'<ul>\g<0></ul>', html, flags=re.DOTALL)
    
    # Paragraphs
    paragraphs = html.split('\n\n')
    html_paragraphs = []
    for p in paragraphs:
        p = p.strip()
        if p and not p.startswith('<'):
            html_paragraphs.append(f'<p>{p}</p>')
        else:
            html_paragraphs.append(p)
    
    return '\n'.join(html_paragraphs)

def build_sales_scripts_html():
    """Build complete HTML for sales scripts"""
    
    base_path = Path(r'c:\Projects\Misrad-AI\docs\תסריטי מכירה')
    output_path = base_path / 'MISRAD-AI-תסריטי-מכירה-COMPLETE.html'
    
    # Get all markdown files
    md_files = sorted(base_path.glob('*.md'))
    
    html_content = []
    
    for i, md_file in enumerate(md_files):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Convert to HTML
        html_section = markdown_to_html_simple(content)
        
        # Wrap in section
        section_id = md_file.stem
        html_content.append(f'<section id="{section_id}">')
        html_content.append(html_section)
        html_content.append('</section>')
    
    # Build full HTML
    full_html = f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>תסריטי מכירה מלאים - MISRAD AI</title>
    <style>
        /* Responsive Mobile-First CSS */
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.8;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            font-size: 16px;
        }}
        
        .container {{
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.3);
        }}
        
        h2 {{ color: #667eea; font-size: 2em; margin: 40px 0 20px; border-bottom: 3px solid #667eea; padding-bottom: 10px; }}
        h3 {{ color: #764ba2; font-size: 1.5em; margin: 30px 0 15px; }}
        h4 {{ color: #555; font-size: 1.2em; margin: 20px 0 10px; }}
        
        p {{ margin-bottom: 15px; text-align: justify; }}
        
        ul, ol {{ margin: 15px 0 15px 30px; }}
        li {{ margin-bottom: 10px; }}
        
        blockquote {{
            background: #f8f9fa;
            border-right: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            font-style: italic;
        }}
        
        code {{
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            color: #d63384;
        }}
        
        pre {{
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
        }}
        
        section {{
            margin-bottom: 60px;
            padding-bottom: 40px;
            border-bottom: 2px solid #e9ecef;
        }}
        
        section:last-child {{ border-bottom: none; }}
        
        /* Mobile Responsive */
        @media (max-width: 768px) {{
            body {{ padding: 10px; font-size: 14px; }}
            .container {{ padding: 20px; border-radius: 16px; }}
            h2 {{ font-size: 1.5em; }}
            h3 {{ font-size: 1.2em; }}
        }}
        
        @media print {{
            body {{ background: white; padding: 0; }}
            .container {{ box-shadow: none; }}
            section {{ page-break-inside: avoid; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1 style="text-align: center; color: #667eea; font-size: 2.5em; margin-bottom: 30px;">
            🤖 MISRAD AI - תסריטי מכירה מלאים
        </h1>
        <p style="text-align: center; color: #666; margin-bottom: 40px;">
            מערכת AI שמקדמת ארגונים | עודכן: 10/02/2026 | ✅ מותאם מובייל
        </p>
        
        {''.join(html_content)}
        
        <footer style="text-align: center; margin-top: 60px; padding-top: 40px; border-top: 3px solid #667eea; color: #666;">
            <p><strong>MISRAD AI</strong> - בינה מלאכותית שמקדמת ארגונים</p>
            <p>גרסה 2.0 | ניתן לפתיחה ב-Word או שמירה כ-PDF</p>
        </footer>
    </div>
</body>
</html>"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_html)
    
    return output_path, len(md_files)

def build_marketing_strategy_html():
    """Build complete HTML for marketing strategy"""
    
    base_path = Path(r'c:\Projects\Misrad-AI\docs\marketing-strategy')
    output_path = base_path / 'MISRAD-AI-Marketing-Strategy-COMPLETE.html'
    
    # Get all markdown files
    md_files = sorted(base_path.glob('*.md'))
    
    html_content = []
    
    for i, md_file in enumerate(md_files):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Convert to HTML
        html_section = markdown_to_html_simple(content)
        
        # Wrap in section
        section_id = md_file.stem
        html_content.append(f'<section id="{section_id}">')
        html_content.append(html_section)
        html_content.append('</section>')
    
    # Build full HTML
    full_html = f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>אסטרטגיית שיווק מלאה - MISRAD AI</title>
    <style>
        /* Same CSS as sales scripts */
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.8;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            font-size: 16px;
        }}
        
        .container {{
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.3);
        }}
        
        h2 {{ color: #667eea; font-size: 2em; margin: 40px 0 20px; border-bottom: 3px solid #667eea; padding-bottom: 10px; }}
        h3 {{ color: #764ba2; font-size: 1.5em; margin: 30px 0 15px; }}
        h4 {{ color: #555; font-size: 1.2em; margin: 20px 0 10px; }}
        
        p {{ margin-bottom: 15px; text-align: justify; }}
        
        ul, ol {{ margin: 15px 0 15px 30px; }}
        li {{ margin-bottom: 10px; }}
        
        blockquote {{
            background: #f8f9fa;
            border-right: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            font-style: italic;
        }}
        
        code {{
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            color: #d63384;
        }}
        
        pre {{
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
        }}
        
        section {{
            margin-bottom: 60px;
            padding-bottom: 40px;
            border-bottom: 2px solid #e9ecef;
        }}
        
        section:last-child {{ border-bottom: none; }}
        
        /* Mobile Responsive */
        @media (max-width: 768px) {{
            body {{ padding: 10px; font-size: 14px; }}
            .container {{ padding: 20px; border-radius: 16px; }}
            h2 {{ font-size: 1.5em; }}
            h3 {{ font-size: 1.2em; }}
        }}
        
        @media print {{
            body {{ background: white; padding: 0; }}
            .container {{ box-shadow: none; }}
            section {{ page-break-inside: avoid; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1 style="text-align: center; color: #667eea; font-size: 2.5em; margin-bottom: 30px;">
            🚀 MISRAD AI - אסטרטגיית שיווק מלאה
        </h1>
        <p style="text-align: center; color: #666; margin-bottom: 40px;">
            מערכת AI שמקדמת ארגונים | עודכן: 10/02/2026 | ✅ מותאם מובייל
        </p>
        
        {''.join(html_content)}
        
        <footer style="text-align: center; margin-top: 60px; padding-top: 40px; border-top: 3px solid #667eea; color: #666;">
            <p><strong>MISRAD AI</strong> - בינה מלאכותית שמקדמת ארגונים</p>
            <p>גרסה 2.0 | ניתן לפתיחה ב-Word או שמירה כ-PDF</p>
        </footer>
    </div>
</body>
</html>"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_html)
    
    return output_path, len(md_files)

if __name__ == '__main__':
    print("🔨 Building HTML files from markdown...")
    print()
    
    # Build sales scripts
    print("📝 Building sales scripts HTML...")
    sales_path, sales_count = build_sales_scripts_html()
    print(f"✅ Created: {sales_path}")
    print(f"   Included {sales_count} markdown files")
    print()
    
    # Build marketing strategy
    print("🚀 Building marketing strategy HTML...")
    marketing_path, marketing_count = build_marketing_strategy_html()
    print(f"✅ Created: {marketing_path}")
    print(f"   Included {marketing_count} markdown files")
    print()
    
    print("✨ Done! All HTML files created successfully.")
    print()
    print("📌 Note: HTML files can be opened in:")
    print("   • Microsoft Word (File → Open)")
    print("   • Google Docs (File → Open → Upload)")
    print("   • Any web browser (double-click)")
    print("   • Save as PDF (Print → Save as PDF)")
