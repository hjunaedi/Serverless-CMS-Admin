export const MOCK_POSTS = [];

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * SERVERLESS HEADLESS CMS - BACKEND SCRIPT
 * Paste this into your Google Apps Script editor (Extensions > Apps Script).
 */

const SHEET_NAME = 'LIVE WEBSITE';
const CONFIG_SHEET = 'CONFIG';
const MEDIA_SHEET = 'MEDIA';

/**
 * Handle GET requests
 */
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    const action = e.parameter.action;
    
    if (action === 'getAllPosts') {
      return getAllPosts();
    } else if (action === 'getPostBySlug') {
      return getPostBySlug(e.parameter.slug);
    } else if (action === 'authImageKit') {
      return authImageKit();
    } else if (action === 'getSystemStatus') {
      return getSystemStatus();
    }
    
    return response({ status: 'error', message: 'Invalid Action: ' + action });
  } catch (err) {
    return response({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const action = e.parameter.action;
    
    // Parse JSON payload
    let data;
    try {
        data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
        return response({ status: 'error', message: 'Invalid JSON payload' });
    }

    if (action === 'createPost') {
      return createPost(data);
    } else if (action === 'updatePost') {
      return updatePost(data);
    } else if (action === 'deletePost') {
      return deletePost(data);
    } else if (action === 'logMedia') {
      return logMedia(data);
    }

    return response({ status: 'error', message: 'Invalid Action: ' + action });
  } catch (err) {
    return response({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper to return JSON response
 */
function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper: Get Config value from PropertyService OR CONFIG Sheet
 */
function getConfig(key) {
  // 1. Try Script Properties (Secure way)
  const props = PropertiesService.getScriptProperties();
  let val = props.getProperty(key);
  if (val) return val;

  // 2. Try CONFIG Sheet (Easy way)
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG_SHEET);
    if (!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    // Assuming Row 1 is header, start from Row 2
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === key) {
        return String(data[i][1]).trim();
      }
    }
  } catch (e) {
    // Sheet might not exist
  }
  return null;
}

/**
 * Action: Get System Status (Health Check)
 */
function getSystemStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const live = !!ss.getSheetByName(SHEET_NAME);
  const config = !!ss.getSheetByName(CONFIG_SHEET);
  const media = !!ss.getSheetByName(MEDIA_SHEET);
  
  const key = getConfig('IMAGEKIT_PRIVATE_KEY');
  
  return response({
    status: 'success',
    data: {
      sheets: {
        website: live,
        config: config,
        media: media
      },
      config: {
        imageKitKey: !!key
      },
      version: '1.0.1'
    }
  });
}

/**
 * Action: Get all posts
 */
function getAllPosts() {
  const sheet = getSheet(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);

  const posts = rows.map(row => ({
    title: row[0],
    label: row[1],
    image: row[2],
    content: row[3],
    slug: row[4],
    description: row[5],
    status: row[6],
    date: row[7],
    type: row[8]
  }));

  return response({ status: 'success', data: posts });
}

/**
 * Action: Get single post by slug
 */
function getPostBySlug(slug) {
  if (!slug) return response({ status: 'error', message: 'Missing slug' });

  const sheet = getSheet(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === slug) {
      const row = data[i];
      const post = {
        title: row[0],
        label: row[1],
        image: row[2],
        content: row[3],
        slug: row[4],
        description: row[5],
        status: row[6],
        date: row[7],
        type: row[8]
      };
      return response({ status: 'success', data: post });
    }
  }
  return response({ status: 'error', message: 'Post not found' });
}

/**
 * Action: Create a new post
 */
function createPost(data) {
  const sheet = getSheet(SHEET_NAME);
  
  if (!data.title || !data.slug) {
     return response({ status: 'error', message: 'Title and Slug are required' });
  }

  sheet.appendRow([
    data.title,
    data.label || '',
    data.image || '',
    data.content || '',
    data.slug,
    data.description || '',
    data.status || 'Draft',
    data.date || new Date().toISOString(),
    data.type || 'Post'
  ]);
  
  return response({ status: 'success', message: 'Post created' });
}

/**
 * Action: Update an existing post
 */
function updatePost(data) {
  const sheet = getSheet(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  
  let rowIndex = -1;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][4] === data.slug || (data.oldSlug && rows[i][4] === data.oldSlug)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return response({ status: 'error', message: 'Post not found for update' });
  }
  
  const updatedRow = [
    data.title,
    data.label,
    data.image,
    data.content,
    data.slug,
    data.description,
    data.status,
    data.date,
    data.type
  ];

  sheet.getRange(rowIndex, 1, 1, 9).setValues([updatedRow]);
  return response({ status: 'success', message: 'Post updated' });
}

/**
 * Action: Delete a post
 */
function deletePost(data) {
  const sheet = getSheet(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  
  let rowIndex = -1;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][4] === data.slug) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return response({ status: 'error', message: 'Post not found for deletion' });
  }
  
  sheet.deleteRow(rowIndex);
  return response({ status: 'success', message: 'Post deleted' });
}

/**
 * Action: Auth ImageKit
 */
function authImageKit() {
  const privateKey = getConfig('IMAGEKIT_PRIVATE_KEY');
  
  if (!privateKey) {
    return response({ status: 'error', message: 'IMAGEKIT_PRIVATE_KEY not found in Script Properties or CONFIG sheet' });
  }
  
  const token = Utilities.getUuid();
  const expire = Math.floor(Date.now() / 1000) + 2400; // 40 minutes
  
  const signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, token + expire, privateKey)
    .reduce(function(str,chr){
      chr = (chr < 0 ? chr + 256 : chr).toString(16);
      return str + (chr.length==1?'0':'') + chr;
    },'');

  return response({
    status: 'success',
    data: {
      token: token,
      expire: expire,
      signature: signature
    }
  });
}

/**
 * Action: Log uploaded media
 */
function logMedia(data) {
  try {
    const sheet = getSheet(MEDIA_SHEET);
    sheet.appendRow([
      data.file_name || 'Unknown',
      data.file_url || '',
      new Date().toISOString()
    ]);
    return response({ status: 'success', message: 'Media logged' });
  } catch (e) {
    return response({ status: 'error', message: 'Failed to log media: ' + e.toString() });
  }
}

/**
 * Helper: Get or create sheet
 */
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('Sheet "' + name + '" not found. Please run setup() first.');
  }
  return sheet;
}

/**
 * Run this function once manually to setup helper tabs.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. CONFIG
  if (!ss.getSheetByName(CONFIG_SHEET)) {
    const s = ss.insertSheet(CONFIG_SHEET);
    s.appendRow(['Key', 'Value']);
    s.appendRow(['IMAGEKIT_PRIVATE_KEY', 'Paste_Your_Private_Key_Here']);
  }
  
  // 2. MEDIA
  if (!ss.getSheetByName(MEDIA_SHEET)) {
    const s = ss.insertSheet(MEDIA_SHEET);
    s.appendRow(['file_name', 'file_url', 'uploaded_at']);
  }
  
  // 3. Ensure LIVE WEBSITE exists
  if (!ss.getSheetByName(SHEET_NAME)) {
     const s = ss.insertSheet(SHEET_NAME);
     s.appendRow(['Judul 0', 'Label 1', 'Gambar 2', 'Body 3', 'Slug + PermaLink 4', 'Meta Deskripsi 5', 'Status View 6', 'Tgl/Jam 7', 'Type 8']);
  }
}
`;