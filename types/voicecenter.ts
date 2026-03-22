/**
 * Voicenter API Types
 * Based on official API documentation from Nikita Karpushin
 */

// ============================================================================
// Call Log API Types
// ============================================================================

export type VoicecenterCallType = 
  | 'Incoming Call'           // 1
  | 'CC'                      // 2
  | 'Extension Outgoing'      // 4
  | 'Queue'                   // 8
  | 'Click2Call leg1'         // 9
  | 'Click2Call leg2'         // 10
  | 'VoiceMail'              // 11
  | 'Callference'            // 12
  | 'XferCDR'                // 13
  | 'ProductiveCall Leg1'    // 14
  | 'ProductiveCall Leg2'    // 15
  | 'Scrubber'               // 16
  | 'Click 2 IVR'            // 17
  | 'Click 2 IVR Incoming'   // 18
  | 'Click 2 Queue Incoming' // 19
  | 'FaxCdr'                 // 20
  | 'Attended CDR leg1'      // 21
  | 'Attended CDR leg2'      // 22
  | 'Auto forward';          // 23

export type VoicecenterDialStatus =
  | 'NOTDIALED'
  | 'ANSWER'
  | 'BUSY'
  | 'NOANSWER'
  | 'CANCEL'
  | 'ABANDONE'
  | 'TIMEOUT'
  | 'FULL'
  | 'EXIT'
  | 'JOINEMPTY'
  | 'VOEND'
  | 'TE'
  | 'NOTCALLED'
  | 'VOICEMAIL'
  | 'CONGESTION'
  | 'CHANUNAVAIL'
  | 'INVALIDARGS'
  | 'SSWPREAUTH';

export interface VoicecenterCallLogRequest {
  code: string;                    // API code (required)
  fromdate: string;                // ISO 8601 format, GMT 0 (required)
  todate: string;                  // ISO 8601 format, GMT 0 (required)
  fields?: string[];               // Fields to return
  search?: {
    phones?: string[];             // Phone numbers with country code
    extensions?: string[];         // Extension IDs
    IdentityCriteria?: 'Account' | 'Hierarchical' | 'Department' | 'User';
    callID?: string;
    cdrTypes?: number[];           // Call type numbers (1-23)
    campaignID?: number[];
    queueID?: number[];
  };
  sort?: Array<{
    field: string;
    order: 'asc' | 'desc';
  }>;
}

export interface VoicecenterCallLogRecord {
  CallerNumber?: string;           // Caller's phone number
  TargetNumber?: string;           // Target phone/extension
  Date?: string;                   // Call date/time
  DateEpoch?: number;              // Unix timestamp
  Duration?: number;               // Call duration in seconds
  CallID?: string;                 // Unique call ID
  Type?: VoicecenterCallType;      // Call type
  CdrType?: number;                // Call type number (1-23)
  DialStatus?: VoicecenterDialStatus;
  TargetExtension?: string;
  CallerExtension?: string;
  DID?: string;                    // Dialed number
  QueueName?: string;
  RecordURL?: string;              // Recording URL
  RecordExpect?: boolean;
  RingTime?: number;               // Ring duration in seconds
  Price?: number;                  // Call cost in agorot
  RepresentativeName?: string;
  RepresentativeCode?: string;
  UserName?: string;
  UserId?: number;
  DepartmentName?: string;
  DepartmentId?: number;
  TargetPrefixName?: string;       // Target country
  DTMFData?: Array<{
    LayerName: string;
    DTMF: number;
    LayerNumber: string;
  }>;
  CustomData?: Record<string, unknown>;
}

export interface VoicecenterCallLogResponse {
  ERROR_NUMBER: number;
  ERROR_DESCRIPTION: string;
  STATUS_CODE: number;
  TOTAL_HITS: number;
  RETURN_HITS: number;
  CDR_LIST: VoicecenterCallLogRecord[];
}

// ============================================================================
// Click2Call API Types
// ============================================================================

export interface VoicecenterClick2CallRequest {
  code: string;                    // Account code (required)
  phone: string;                   // Extension/number to call FROM (required)
  target: string;                  // Number to call TO (required)
  action: 'call' | 'terminate';    // Action type (required)
  
  // Recommended parameters
  phoneautoanswer?: boolean;       // Auto-answer for agent (recommended: true)
  checkphonedevicestate?: boolean; // Check if extension is online (recommended: true)
  
  // Optional parameters
  record?: boolean;                // Record the call
  phonecallerid?: string;          // Caller ID for leg 1
  phonecallername?: string;        // Caller name for leg 1
  targetcallerid?: string;         // Caller ID for leg 2
  targetcallername?: string;       // Caller name for leg 2
  phonemaxdialtime?: number;       // Max dial time for leg 1 (seconds, default: 60)
  targetmaxdialtime?: number;      // Max dial time for leg 2 (seconds, default: 60)
  maxduration?: number;            // Max call duration (seconds, default: 7200)
  targetautoanswer?: boolean;      // Auto-answer for target
  checktargetdevicestate?: boolean;// Check target device state
  format?: 'JSON' | 'XML';         // Response format (default: XML)
  ignoredncstatus?: 1 | 2 | 3;     // Ignore DNC list (1=phone, 2=target, 3=both)
  
  // Custom variables (prefix with var_)
  [key: `var_${string}`]: unknown;
}

export interface VoicecenterClick2CallResponse {
  ERRORCODE: number;               // 0 = OK, 1 = Invalid params, 2 = App error, 3 = Extension offline, 4 = Extension blocked
  ERRORMESSAGE: string;
  CALLID: string;                  // Unique call ID (32 chars)
}

// ============================================================================
// WebRTC Widget Types
// ============================================================================

export interface VoicecenterWidgetCredentials {
  username: string;
  password: string;
  authorization_jwt?: string;
  domain: string;
}

export interface VoicecenterWidgetTheme {
  colors?: {
    primary?: string;
    secondary?: string;
    'main-text'?: string;
    'secondary-text'?: string;
    'button-pressed-text'?: string;
    'border-lines'?: string;
    'primary-bg'?: string;
    'secondary-bg'?: string;
    'inactive-bg'?: string;
    success?: string;
    danger?: string;
    'additional-danger-bg'?: string;
    'additional-success-bg'?: string;
    'draggable-bg'?: string;
  };
  widgetType?: 'audio' | 'video';
  lang?: 'en' | 'he' | 'ru';
  audioConfig?: {
    layoutConfig?: {
      type?: 'rounded' | 'square';
      mode?: 'floating' | 'embedded';
      position?: {
        anchor?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
        left?: number;
        top?: number;
        right?: number;
        bottom?: number;
      };
      keypadMode?: 'popover' | 'inline';
      keypadPosition?: 'top' | 'bottom' | 'left' | 'right';
    };
    images?: {
      backgroundLogo?: string;
    };
    outgoingCallPlaceHolder?: string;
    outgoingInputRegexValidator?: string[];
    noiseReductionOptions?: {
      mode?: 'static' | 'dynamic' | 'off';
    };
  };
}

export interface VoicecenterWidgetCallSettings {
  showKeypad?: boolean;
  allowTransfer?: boolean;
  mergeCalls?: boolean;
  outgoingCalls?: boolean;
  shrinkOnIdle?: boolean;
  displayName?: boolean;
  displayCallerID?: boolean;
  maskCallerID?: boolean;
  allowChangingAutoAnswer?: boolean;
  defaultAutoAnswer?: boolean;
  allowChangingDND?: boolean;
  defaultDND?: boolean;
  incomingCallWaitingBehaviour?: 'accept' | 'reject' | 'ignore';
  quickCallNumber?: string;
}

export interface VoicecenterWidgetCall {
  id: string;
  direction: 'incoming' | 'outgoing';
  remoteIdentity: string;
  status: 'ringing' | 'answered' | 'ended';
  startTime?: Date;
  endTime?: Date;
}

export interface VoicecenterWidgetAPI {
  login(credentials: VoicecenterWidgetCredentials): Promise<void>;
  logout(): Promise<void>;
  on(event: 'callIncoming', callback: (call: VoicecenterWidgetCall) => void): void;
  on(event: 'callOutgoing', callback: (call: VoicecenterWidgetCall) => void): void;
  on(event: 'callAnswered', callback: (call: VoicecenterWidgetCall) => void): void;
  on(event: 'callEnded', callback: (call: VoicecenterWidgetCall) => void): void;
  makeCall(number: string): Promise<void>;
  answerCall(callId: string): Promise<void>;
  hangupCall(callId: string): Promise<void>;
}

// ============================================================================
// Webhook Types (existing, for reference)
// ============================================================================

export interface VoicecenterWebhookCDR {
  CallID: string;
  CallerNumber: string;
  TargetNumber: string;
  Duration: number;
  RecordURL?: string;
  DialStatus: VoicecenterDialStatus;
  Type: VoicecenterCallType;
  Date: string;
  [key: string]: unknown;
}

export interface VoicecenterWebhookScreenPop {
  caller: string;
  orgId: string;
}
