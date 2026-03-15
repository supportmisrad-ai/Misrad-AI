// Google Apps Script for WAAM-It Blaster + MISRAD AI Integration
// Version 1.5 - Added Message/Messages headers for Blaster compatibility
// 
// DEPLOYMENT INSTRUCTIONS:
// 1. Open Google Apps Script (script.google.com)
// 2. Create new project
// 3. Paste this entire code
// 4. Run setupSheets() ONCE to create sheets and headers
// 5. Deploy as Web App (Execute as Me, Allow Anyone)
// 6. Copy the deployment URL
// 7. Update BotApi.json in Blaster with the new URL
// 
// IMPORTANT FOR BLASTER:
// If Blaster shows "Missing Headers: Message/Messages", 
// make sure the sheet "MISRAD_AI_Leads" (or whatever name you use) 
// has "Message" and "Messages" columns.

const CONFIG = {
  MISRAD_AI_WEBHOOK: "https://misrad-ai.com/api/webhooks/blaster",
  MISRAD_AI_SECRET: "YOUR_SECRET_HERE", // <-- UPDATE THIS after generating
  LOG_TO_SHEET: true
};

// Sheet configurations with headers
const SHEETS_CONFIG = {
  "Variable_Log": {
    headers: ["Contact", "Name", "Business", "Email", "Industry", "Org_Size", "Pain_Point", "Selected_Plan", "Message", "Messages", "Rule_ID", "Timestamp"]
  },
  "Lead_Log": {
    headers: ["Phone", "Name", "Business", "Email", "Industry", "Org_Size", "Pain_Point", "Selected_Plan", "Status", "Source", "Message", "Messages", "Timestamp"]
  },
  "Conversation_Log": {
    headers: ["Phone", "Message", "Messages", "Direction", "Timestamp", "Rule_ID"]
  },
  "MISRAD_AI_Leads": {
    headers: ["Contact", "Message", "Messages", "Action", "Date", "Time", "Campaigns", "Files", "FirstName", "Timestamp"]
  },
  "Errors": {
    headers: ["Timestamp", "Error_Data"]
  }
};

// SETUP FUNCTION - Run this ONCE to create all sheets with headers
function setupSheets() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  
  console.log("Starting setup...");
  
  for (let sheetName in SHEETS_CONFIG) {
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      // Create new sheet
      sheet = ss.insertSheet(sheetName);
      console.log("Created sheet: " + sheetName);
    } else {
      console.log("Sheet exists: " + sheetName);
    }
    
    // Check if headers already exist
    let firstRow = sheet.getRange(1, 1, 1, SHEETS_CONFIG[sheetName].headers.length).getValues()[0];
    let hasHeaders = firstRow.some(cell => cell !== "");
    
    if (!hasHeaders) {
      // Add headers
      sheet.getRange(1, 1, 1, SHEETS_CONFIG[sheetName].headers.length)
        .setValues([SHEETS_CONFIG[sheetName].headers])
        .setFontWeight("bold")
        .setBackground("#f0f0f0");
      console.log("Added headers to: " + sheetName);
    } else {
      console.log("Headers already exist in: " + sheetName);
    }
    
    // Freeze header row
    sheet.setFrozenRows(1);
  }
  
  console.log("Setup complete! ✅");
  console.log("Sheets created: " + Object.keys(SHEETS_CONFIG).join(", "));
  
  return "Setup complete! Sheets: " + Object.keys(SHEETS_CONFIG).join(", ");
}

// doGet - Handles GET requests from Blaster (reading data)
function doGet(e) {
  try {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(e.parameter["name"]);
    if (sheet == null) {
      return ContentService.createTextOutput("invalid_name");
    }
    
    var act = e.parameter["action"];
    
    if (act == "lastrow") {
      return ContentService.createTextOutput(sheet.getLastRow() + 1);
    }
    else if (act == "read") {
      let range = e.parameter["range"];
      try {
        let timezone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
        let cells = sheet.getRange(range).getValues()
          .map(row => row.map(cell => cell instanceof Date ? Utilities.formatDate(cell, timezone, 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'') : cell));
        return ContentService.createTextOutput(JSON.stringify(cells));
      } catch { 
        return ContentService.createTextOutput("RANGE ERROR"); 
      }
    }
    else if (act == "headers") {
      return ContentService.createTextOutput(JSON.stringify(sheet.getRange("A1:ZZZ1").getValues()[0]));
    }
    else if (act == "version") {
      return ContentService.createTextOutput("1.3");
    }
    else {
      return ContentService.createTextOutput("invalid_action");
    }
  } catch(ex) { 
    console.error("doGet error:", ex);
    return ContentService.createTextOutput("error");
  }
}

// doPost - Handles POST requests from Blaster (sending data)
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(e.parameter["name"]);
    if (sheet == null) {
      return ContentService.createTextOutput("ERROR: invalid spreadsheet name");
    }
    
    let action = e.parameter["action"];
    let rowData = [];
    let payload = {};
    
    // Get headers from first row
    let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (action == "writecell") {
      // Write to single cell
      let cell = sheet.getRange(e.parameter["cell"]);
      if (cell != null) {
        cell.setValue(e.postData.contents);
        payload = { 
          cell: e.parameter["cell"], 
          value: e.postData.contents,
          action: "writecell"
        };
      }
    } else {
      // Append row to sheet
      rowData = e.postData.contents.split("<COMMA>");
      sheet.appendRow(rowData);
      
      // Build payload object from headers and row data
      for (let i = 0; i < headers.length && i < rowData.length; i++) {
        if (headers[i]) {
          let key = headers[i].toString().trim().toLowerCase().replace(/\s+/g, '_');
          payload[key] = rowData[i];
        }
      }
      payload.raw_data = rowData;
    }
    
    // Forward to MISRAD AI (async - don't wait for response)
    forwardToMISRAD_AI(payload, e.parameter["name"], headers);
    
    // Return success to Blaster immediately
    return ContentService.createTextOutput("success");
    
  } catch (error) {
    console.error("doPost error:", error);
    // Log error but still return success to Blaster
    logError({error: error.toString(), params: e.parameter});
    return ContentService.createTextOutput("success");
  }
}

// Forward data to MISRAD AI webhook
function forwardToMISRAD_AI(data, sheetName, headers) {
  try {
    // Determine type from sheet name
    let sheetLower = sheetName.toLowerCase();
    let type = "lead";
    
    if (sheetLower.includes("conversation") || sheetLower.includes("message") || sheetLower.includes("send")) {
      type = "conversation";
    } else if (sheetLower.includes("variable") || sheetLower.includes("var")) {
      type = "variable";
    } else if (sheetLower.includes("log") || sheetLower.includes("lead")) {
      type = "lead";
    }
    
    // Map common fields
    let misradPayload = {
      phone: data.contact || data.phone || data.phonenumber || data.phonenumber_id || "",
      name: data.name || data.whatsname || data.customer_name || "",
      business: data.business || data.business_name || data.company || "",
      email: data.email || data.user_email || "",
      industry: data.industry || data.sector || "",
      org_size: data.org_size || data.orgsize || data.organization_size || data.team_size || "",
      pain_point: data.pain_point || data.painpoint || data.problem || data.issue || "",
      selected_plan: data.selected_plan || data.selectedplan || data.plan || data.package || "",
      message: data.message || data.msg || data.text || data.content || "",
      rule_id: data.rule_id || data.ruleid || data.rule || "",
      type: type,
      source: "whatsapp",
      timestamp: new Date().toISOString(),
      sheet_name: sheetName,
      raw_data: data.raw_data || []
    };
    
    // Add any custom variables
    if (data.variable || data.var_name) {
      misradPayload.variable_name = data.variable || data.var_name;
      misradPayload.variable_value = data.value || data.var_value || data.variable_value;
    }
    
    // Send to MISRAD AI
    let options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": CONFIG.MISRAD_AI_SECRET
      },
      payload: JSON.stringify(misradPayload),
      muteHttpExceptions: true // Don't throw on HTTP errors
    };
    
    let response = UrlFetchApp.fetch(CONFIG.MISRAD_AI_WEBHOOK + "?type=" + type, options);
    let responseCode = response.getResponseCode();
    let responseBody = response.getContentText();
    
    console.log("MISRAD AI forward - Code:", responseCode, "Body:", responseBody);
    
    // Log if not successful (but don't fail)
    if (responseCode < 200 || responseCode >= 300) {
      logError({
        stage: "forward_to_misrad",
        payload: misradPayload,
        response_code: responseCode,
        response_body: responseBody
      });
    }
    
  } catch (error) {
    console.error("Forward to MISRAD AI failed:", error);
    logError({stage: "forward_error", error: error.toString(), data: data});
  }
}

// Log errors to Error sheet for debugging
function logError(errorData) {
  try {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let errorSheet = ss.getSheetByName("Errors");
    
    if (!errorSheet) {
      errorSheet = ss.insertSheet("Errors");
      errorSheet.appendRow(["Timestamp", "Error Data"]);
      errorSheet.getRange(1, 1, 1, 2).setFontWeight("bold");
    }
    
    errorSheet.appendRow([
      new Date().toISOString(),
      JSON.stringify(errorData)
    ]);
    
  } catch (e) {
    console.error("Failed to log error:", e);
  }
}

// Test function (run from Apps Script editor)
function testForward() {
  let testData = {
    contact: "972559296626",
    name: "Test User",
    message: "Hello from test",
    raw_data: ["972559296626", "Test User", "Hello"]
  };
  forwardToMISRAD_AI(testData, "Variable_Log", ["Contact", "Name", "Message"]);
}
