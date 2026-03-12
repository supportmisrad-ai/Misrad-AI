// Google Apps Script for WAAM-It Blaster + MISRAD AI Integration
// Version 1.3 - Working with forward to MISRAD AI
// 
// DEPLOYMENT INSTRUCTIONS:
// 1. Open Google Apps Script (script.google.com)
// 2. Create new project
// 3. Paste this entire code
// 4. Deploy as Web App (Execute as Me, Allow Anyone)
// 5. Copy the deployment URL
// 6. Update BotApi.json in Blaster with the new URL

const CONFIG = {
  MISRAD_AI_WEBHOOK: "https://misrad-ai.com/api/webhooks/blaster",
  MISRAD_AI_SECRET: "YOUR_SECRET_HERE", // <-- UPDATE THIS after generating
  LOG_TO_SHEET: true
};

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
