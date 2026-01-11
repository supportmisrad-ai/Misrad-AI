/**
 * Translate Clerk error messages to Hebrew
 */
export function translateClerkError(errorMessage: string): string {
  const translations: Record<string, string> = {
    // Authentication errors
    'Invalid email or password': 'אימייל או סיסמה שגויים',
    'Invalid password': 'סיסמה שגויה',
    'Password is too short': 'הסיסמה קצרה מדי',
    'Password must contain': 'הסיסמה חייבת להכיל',
    'Email already exists': 'האימייל כבר קיים במערכת',
    'User not found': 'משתמש לא נמצא',
    'Invalid email address': 'כתובת אימייל לא תקינה',
    'Email verification required': 'נדרש אימות אימייל',
    'Invalid verification code': 'קוד אימות שגוי',
    'Verification code expired': 'קוד האימות פג תוקף',
    
    // Passkey errors
    'passkey_not_found': 'לא נמצאה טביעת אצבע',
    'Passkey not found': 'לא נמצאה טביעת אצבע',
    'Passkey authentication failed': 'האימות עם טביעת אצבע נכשל',
    'WebAuthn not supported': 'WebAuthn לא נתמך בדפדפן שלך',
    
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

