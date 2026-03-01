/**
 * Translate Clerk error messages to Hebrew
 */
export function translateClerkError(errorMessage: string): string {
  const translations: Record<string, string> = {
    // Authentication errors
    'Invalid email or password': 'אימייל או סיסמה שגויים',
    'Invalid password': 'סיסמה שגויה',
    'Password is incorrect': 'סיסמה שגויה',
    'Password is incorrect. Try again, or use another method.': 'סיסמה שגויה. נסה שוב, או השתמש בשיטה אחרת.',
    'form_password_incorrect': 'סיסמה שגויה. נסה שוב, או השתמש בשיטה אחרת.',
    'form_password_invalid': 'סיסמה שגויה. נסה שוב.',
    'Password is too short': 'הסיסמה קצרה מדי',
    'Password must contain': 'הסיסמה חייבת להכיל',
    'Email already exists': 'האימייל כבר קיים במערכת',
    'form_identifier_not_found': 'משתמש לא נמצא',
    'User not found': 'משתמש לא נמצא',
    'Invalid email address': 'כתובת אימייל לא תקינה',
    'form_identifier_invalid': 'כתובת אימייל לא תקינה',
    'form_password_not_set': 'למשתמש הזה אין סיסמה מוגדרת. נסה להתחבר עם Google או בצע "שכחתי סיסמה" כדי להגדיר סיסמה.',
    'strategy_for_user_invalid': 'שיטת התחברות זו לא זמינה למשתמש הזה. נסה שיטה אחרת (למשל Google) או בצע איפוס סיסמה.',
    'strategy_not_enabled': 'שיטת ההתחברות אינה פעילה בפרויקט. יש לאפשר Password/OAuth בהגדרות Clerk.',
    'Email verification required': 'נדרש אימות אימייל',
    'Invalid verification code': 'קוד אימות שגוי',
    'Verification code expired': 'קוד האימות פג תוקף',
    
    // Passkey errors
    'passkey_not_found': 'לא נמצאה טביעת אצבע',
    'Passkey not found': 'לא נמצאה טביעת אצבע',
    'Passkey authentication failed': 'האימות עם טביעת אצבע נכשל',
    'WebAuthn not supported': 'WebAuthn לא נתמך בדפדפן שלך',
    'You need to provide additional verification': 'נדרש אימות נוסף. הזן את הסיסמה שלך או התחבר מחדש.',
    'additional verification': 'נדרש אימות נוסף לפני ביצוע פעולה זו.',
    
    // Password reset errors
    'form_code_incorrect': 'קוד אימות שגוי. בדוק את הקוד ונסה שוב.',
    'verification_expired': 'קוד האימות פג תוקף. לחץ על "שלח קוד חדש".',
    'form_password_pwned': 'סיסמה זו נמצאה ברשימת סיסמאות שנפרצו. בחר סיסמה אחרת.',
    'form_password_length_too_short': 'הסיסמה קצרה מדי. יש להזין לפחות 8 תווים.',
    'Couldn\'t find your account': 'לא נמצא חשבון עם כתובת אימייל זו.',
    
    // OAuth errors
    'OAuth authentication failed': 'האימות עם OAuth נכשל',
    'Google authentication failed': 'האימות עם Google נכשל',
    
    // General errors
    'Network error': 'שגיאת רשת',
    'Request timeout': 'פג תוקף הבקשה',
    'Internal server error': 'שגיאת שרת פנימית',
    'Too many requests': 'יותר מדי בקשות. נא לנסות שוב מאוחר יותר',
    'Unprocessable Entity': 'הנתונים שנשלחו לא תקינים. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    'unprocessable_entity': 'הנתונים שנשלחו לא תקינים. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    '422': 'הנתונים שנשלחו לא תקינים. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    'Bad Request': 'בקשה שגויה. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    'bad_request': 'בקשה שגויה. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    '400': 'בקשה שגויה. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    // Session / flow errors
    'Session already exists': 'כבר יש תהליך אימות פתוח. רענן את הדף או המשך לשלב הבא בתהליך.',
    'session_already_exists': 'כבר יש תהליך אימות פתוח. רענן את הדף או המשך לשלב הבא בתהליך.',
  };

  // Check for exact match
  if (translations[errorMessage]) {
    return translations[errorMessage];
  }

  // Check for partial matches
  for (const [key, translation] of Object.entries(translations)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }

  // Return original message if no translation found
  return errorMessage;
}

/**
 * Translate generic error messages to Hebrew
 */
export function translateError(errorMessage: string): string {
  const translations: Record<string, string> = {
    'Failed to fetch': 'שגיאה בטעינה',
    'Failed to create': 'שגיאה ביצירה',
    'Failed to update': 'שגיאה בעדכון',
    'Failed to delete': 'שגיאה במחיקה',
    'Failed to send': 'שגיאה בשליחה',
    'Not found': 'לא נמצא',
    'Unauthorized': 'אין הרשאה',
    'Forbidden': 'גישה נדחתה',
    'permission denied': 'אין לך הרשאה לבצע פעולה זו',
    'Not configured': 'לא מוגדר',
    'Not initialized': 'לא אותחל',
    'An unexpected error occurred': 'אירעה שגיאה בלתי צפויה',
    'Unprocessable Entity': 'הנתונים שנשלחו לא תקינים. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    'unprocessable_entity': 'הנתונים שנשלחו לא תקינים. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    '422': 'הנתונים שנשלחו לא תקינים. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    'Bad Request': 'בקשה שגויה. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    'bad_request': 'בקשה שגויה. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
    '400': 'בקשה שגויה. נא לבדוק את הפרטים ולהשלים את כל השדות הנדרשים',
  };

  // Check for exact match
  if (translations[errorMessage]) {
    return translations[errorMessage];
  }

  // Check for partial matches
  for (const [key, translation] of Object.entries(translations)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }

  // Return original message if no translation found
  return errorMessage;
}

