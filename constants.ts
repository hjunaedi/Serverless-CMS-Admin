export const MOCK_POSTS = [
  {
    title: "Getting Started with Serverless CMS",
    label: "Tutorial",
    image: "https://picsum.photos/800/600",
    content: "This is a demo post showing how the system works. Deploy the script to see real data.",
    slug: "getting-started",
    description: "Learn how to setup your Google Sheet CMS.",
    status: "Published",
    date: new Date().toISOString(),
    type: "Post"
  },
  {
    title: "Why Google Sheets?",
    label: "Opinion",
    image: "https://picsum.photos/800/601",
    content: "Google Sheets is a powerful database for small to medium projects.",
    slug: "why-google-sheets",
    description: "An analysis of using Sheets as a DB.",
    status: "Draft",
    date: new Date().toISOString(),
    type: "Article"
  }
];

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
 * Action: Get all posts
 */
function getAllPosts() {
  const sheet = getSheet(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  // Remove header row
  const rows = data.slice(1);

  // Map columns A-I
  const posts = rows.map(row => ({
    title: row[0],       // A: Judul 0
    label: row[1],       // B: Label 1
    image: row[2],       // C: Gambar 2
    content: row[3],     // D: Body 3
    slug: row[4],        // E: Slug + PermaLink 4
    description: row[5], // F: Meta Deskripsi 5
    status: row[6],      // G: Status View 6
    date: row[7],        // H: Tgl/Jam 7
    type: row[8]         // I: Type 8
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
  
  // Iterate from row 2 (index 1)
  for (let i = 1; i < data.length; i++) {
    // Column E is index 4
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
  
  // Validation (Simple)
  if (!data.title || !data.slug) {
     return response({ status: 'error', message: 'Title and Slug are required' });
  }

  // Append row matching A-I order
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
  
  // Find by Slug (4) or Title (0)
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][4] === data.slug || (data.oldSlug && rows[i][4] === data.oldSlug)) {
      rowIndex = i + 1; // 1-based index for getRange
      break;
    }
  }

  if (rowIndex === -1) {
    return response({ status: 'error', message: 'Post not found for update' });
  }

  // Update logic: we replace the whole row or specific cells.
  // Here we replace the whole row content to ensure consistency.
  // NOTE: This assumes 'data' contains ALL fields. If partial updates are needed,
  // logic should be adjusted to merge with existing data.
  
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
  
  // Find by Slug (4)
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
  const props = PropertiesService.getScriptProperties();
  const privateKey = props.getProperty('IMAGEKIT_PRIVATE_KEY');
  
  if (!privateKey) {
    return response({ status: 'error', message: 'IMAGEKIT_PRIVATE_KEY not configured in Script Properties' });
  }
  
  const token = Utilities.getUuid();
  const expire = Math.floor(Date.now() / 1000) + 2400; // 40 minutes
  const signature = Utilities.computeHmacSha1Signature(token + expire, privateKey)
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
 * Helper: Get or create sheet (safely)
 * Note: Does not create main sheet, assumes it exists per requirements.
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
  }
  
  // 2. MEDIA
  if (!ss.getSheetByName(MEDIA_SHEET)) {
    const s = ss.insertSheet(MEDIA_SHEET);
    s.appendRow(['file_name', 'file_url']);
  }
  
  // 3. Ensure LIVE WEBSITE exists? User said they have it.
  if (!ss.getSheetByName(SHEET_NAME)) {
     // Optional: Create it if missing, but requirements said "I have a Google Sheet"
     const s = ss.insertSheet(SHEET_NAME);
     s.appendRow(['Judul 0', 'Label 1', 'Gambar 2', 'Body 3', 'Slug + PermaLink 4', 'Meta Deskripsi 5', 'Status View 6', 'Tgl/Jam 7', 'Type 8']);
  }
}
`;