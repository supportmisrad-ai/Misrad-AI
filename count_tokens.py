#!/usr/bin/env python3
"""
סקריפט לספירת אסימונים בכל קבצי המקור של הפרויקט
משתמש ב-tiktoken אם זמין, אחרת מעריך 4 תווים לכל אסימון
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# נסה לייבא tiktoken
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
    print("✅ משתמש ב-tiktoken לספירת אסימונים מדויקת")
except ImportError:
    TIKTOKEN_AVAILABLE = False
    print("⚠️ tiktoken לא זמין, משתמש בהערכה של 4 תווים לאסימון")

# סיומות קבצי מקור לספירה
SOURCE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
    '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sh',
    '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd', '.html', '.htm',
    '.css', '.scss', '.sass', '.less', '.xml', '.json', '.yaml', '.yml',
    '.toml', '.ini', '.cfg', '.conf', '.md', '.txt', '.sql', '.graphql',
    '.gql', '.vue', '.svelte', '.astro'
}

# תיקיות לדילוג
SKIP_DIRS = {
    'node_modules', '.git', '.next', '.nuxt', '.vercel', '.netlify',
    'dist', 'build', 'out', 'target', 'bin', 'obj', '__pycache__',
    '.pytest_cache', '.tox', 'venv', 'env', '.env', '.venv',
    'coverage', '.coverage', 'site-packages', 'temp', 'tmp'
}

def should_skip_file(file_path: Path) -> bool:
    """בדיקה אם יש לדלג על הקובץ"""
    # דילוג על קבצים שמתחילים בנקודה (חוץ מ-.env וקבצים דומים)
    if file_path.name.startswith('.') and file_path.suffix not in {'.env', '.gitignore', '.eslintrc', '.prettierrc'}:
        return True
    
    # דילוג על קבצי lock וקבצי build
    if file_path.name in {'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock'}:
        return True
    
    # דילוג על קבצים גדולים מאוד (מעל 5MB)
    if file_path.stat().st_size > 5 * 1024 * 1024:
        return True
    
    return False

def should_skip_dir(dir_name: str) -> bool:
    """בדיקה אם יש לדלג על התיקייה"""
    return dir_name in SKIP_DIRS or dir_name.startswith('.')

def count_tokens_in_text(text: str, encoding=None) -> int:
    """ספירת אסימונים בטקסט"""
    if not text.strip():
        return 0
    
    if TIKTOKEN_AVAILABLE and encoding:
        try:
            return len(encoding.encode(text))
        except Exception:
            pass
    
    # הערכה פשוטה של 4 תווים לאסימון
    return len(text) // 4

def scan_directory(root_path: Path) -> Dict[str, Tuple[int, int]]:
    """סריקת תיקייה וספירת אסימונים לפי סיומת"""
    results = {}
    encoding = None
    
    if TIKTOKEN_AVAILABLE:
        try:
            # שימוש במידול cl100k_base (GPT-4) כמידול ברירת מחדל
            encoding = tiktoken.get_encoding("cl100k_base")
        except Exception as e:
            print(f"⚠️ שגיאה בטעינת tiktoken: {e}")
    
    total_files = 0
    total_tokens = 0
    total_chars = 0
    
    for root, dirs, files in os.walk(root_path):
        # סינון תיקיות לדילוג
        dirs[:] = [d for d in dirs if not should_skip_dir(d)]
        
        for file in files:
            file_path = Path(root) / file
            
            # בדיקת סיומת והאם לדלג על הקובץ
            if file_path.suffix.lower() not in SOURCE_EXTENSIONS:
                continue
            if should_skip_file(file_path):
                continue
            
            try:
                # קריאת קובץ עם קידוד אוטומטי
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                if not content.strip():
                    continue
                
                tokens = count_tokens_in_text(content, encoding)
                chars = len(content)
                ext = file_path.suffix.lower()
                
                if ext not in results:
                    results[ext] = [0, 0, 0]  # [files, tokens, chars]
                
                results[ext][0] += 1
                results[ext][1] += tokens
                results[ext][2] += chars
                
                total_files += 1
                total_tokens += tokens
                total_chars += chars
                
            except Exception as e:
                print(f"⚠️ שגיאה בקריאת {file_path}: {e}")
                continue
    
    return results, total_files, total_tokens, total_chars

def main():
    """פונקציה ראשית"""
    root_dir = Path.cwd()
    print(f"🔍 סורק את: {root_dir}")
    print("=" * 60)
    
    results, total_files, total_tokens, total_chars = scan_directory(root_dir)
    
    if not results:
        print("❌ לא נמצאו קבצי מקור")
        return
    
    # מיון לפי מספר אסימונים
    sorted_results = sorted(results.items(), key=lambda x: x[1][1], reverse=True)
    
    print(f"📊 סיכום אסימונים לפי סוג קובץ:")
    print("-" * 60)
    print(f"{'סיומת':<12} {'קבצים':<8} {'אסימונים':<12} {'תווים':<12} {'אסימון/קובץ':<12}")
    print("-" * 60)
    
    for ext, (files, tokens, chars) in sorted_results:
        avg_tokens = tokens // files if files > 0 else 0
        print(f"{ext:<12} {files:<8} {tokens:<12,} {chars:<12,} {avg_tokens:<12,}")
    
    print("-" * 60)
    print(f"{'סה״כ':<12} {total_files:<8} {total_tokens:<12,} {total_chars:<12,} {'-':<12}")
    
    print("\n" + "=" * 60)
    print("📈 סטטיסטיקות כלליות:")
    print(f"• סך הכל קבצי מקור: {total_files:,}")
    print(f"• סך הכל אסימונים: {total_tokens:,}")
    print(f"• סך הכל תווים: {total_chars:,}")
    print(f"• ממוצע אסימונים לקובץ: {total_tokens // total_files:,}")
    print(f"• יחס תווים/אסימונים: {total_chars / total_tokens:.2f}:1")
    
    if not TIKTOKEN_AVAILABLE:
        print("\n💡 טיפ: התקן tiktoken לספירה מדויקת יותר:")
        print("   pip install tiktoken")

if __name__ == "__main__":
    main()
