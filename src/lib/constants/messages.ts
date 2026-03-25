// API error messages
export const ERR_UNAUTHORIZED = 'Unauthorized'
export const ERR_SIGN_IN_REQUIRED = 'Sign in required'
export const ERR_MAP_NOT_FOUND = 'Map not found'
export const ERR_NOT_FOUND = 'Not found'
export const ERR_ALREADY_REVIEWED = 'Already reviewed'
export const ERR_NO_FILE = 'No file provided'
export const ERR_FILE_TOO_LARGE = 'File too large (max 20 MB)'
export const ERR_UNSUPPORTED_ARCHIVE = 'Unsupported format. Use .zip, .7z, or .rar'
export const ERR_MAP_ALREADY_IN_LIBRARY = 'This map is already in the library'
export const ERR_MAP_ALREADY_PENDING = 'This map is already pending review'
export const ERR_REJECTION_REASON_REQUIRED = 'Rejection reason is required'
export const ERR_SCREENSHOT_FORMAT = 'Unsupported format. Use JPG, PNG or WebP.'
export const ERR_SCREENSHOT_TOO_LARGE = 'File too large (max 2 MB)'
export const ERR_MAX_SCREENSHOTS = 'Maximum 3 screenshots per map'
export const ERR_SCREENSHOT_NOT_FOUND = 'Screenshot not found'
export const ERR_INVALID_INDEX = 'Invalid index'
export const ERR_FILE_MISSING_FROM_STORAGE = 'File missing from storage'

// Validation messages (client-side, shown in forms)
export const VALIDATE_SCREENSHOT_FORMAT = 'Only JPG, PNG, WebP allowed'
export const VALIDATE_SCREENSHOT_SIZE = 'Max 2 MB per screenshot'
export const VALIDATE_ARCHIVE_FORMAT = 'Only .zip, .7z, .rar allowed'
export const VALIDATE_ARCHIVE_TOO_LARGE = 'File too large (max 20 MB)'
export const VALIDATE_ARCHIVE_CORRUPTED = 'Could not read archive contents. The file may be corrupted.'
export const VALIDATE_ARCHIVE_NO_BSP = 'Archive does not appear to contain a CS 1.6 map (no .bsp file found).'

// Success/status messages
export const MSG_SUBMISSION_APPROVED = 'Submission approved'
export const MSG_SUBMISSION_REJECTED = 'Submission rejected'
export const MSG_SCREENSHOTS_UPLOADED = 'Screenshot(s) uploaded'
export const MSG_SIGN_IN_FAILED = 'Sign-in failed. Please try again.'
export const MSG_UPLOADED_SUCCESSFULLY = (name: string) => `${name} uploaded successfully`
export const MSG_SUBMITTED_FOR_REVIEW = (name: string) => `${name} submitted for review`

// UI labels — headings
export const LABEL_UPLOAD_MAP = 'Upload Map'
export const LABEL_PENDING_REVIEW = (count: number) => `Pending Review (${count})`
export const LABEL_MY_SUBMISSIONS = 'My Submissions'
export const LABEL_SUBMIT_MAPS = 'Submit map(s)'
export const LABEL_TOP_MAPS = 'Top Maps by Installs'
export const LABEL_RECENT_ACTIVITY = 'Recent Activity'
export const LABEL_NOTIFICATIONS = 'Notifications'
export const LABEL_SCREENSHOTS = 'Screenshots'
export const LABEL_TAGS = 'Tags'
export const LABEL_TAGS_REQUIRED = '— required'

// UI labels — buttons & actions
export const BTN_HOME = '← Home'
export const BTN_APPROVE = 'Approve'
export const BTN_REJECT = 'Reject'
export const BTN_REINSTALL = 'Reinstall'
export const BTN_CANCEL = 'Cancel'
export const BTN_CHANGE = 'Change'
export const BTN_SHOW = 'Show'
export const BTN_HIDE = 'Hide'
export const BTN_DELETE = 'Delete'
export const BTN_PREVIEW = 'Preview'
export const BTN_REMOVE = 'Remove'
export const BTN_ADD_IMG = '+ IMG'
export const BTN_ADD_SCREENSHOT = '+ Add'
export const BTN_CLEAR_ALL = 'Clear all'
export const BTN_SIGN_IN_GOOGLE = 'Sign in with Google'
export const BTN_ADMIN_PANEL = 'Admin panel'
export const BTN_SIGN_OUT = 'Sign out'
export const BTN_SUBMIT_MAP = '+ SUBMIT MAP(S)'
export const BTN_INSTALL = 'INSTALL'
export const BTN_INSTALLED = '✓ INSTALLED'
export const BTN_INSTALLING = 'INSTALLING...'
export const BTN_DOWNLOAD = '↓ DOWNLOAD'
export const BTN_DOWNLOAD_LONG = '↓ Download'
export const BTN_INSTALL_ALL = 'INSTALL ALL'
export const BTN_MOVE_UP = 'Move up'
export const BTN_MOVE_DOWN = 'Move down'
export const BTN_PICK_THIS = '← pick this'

// UI labels — status & inline text
export const STATUS_LOADING = 'Loading...'
export const STATUS_VALIDATING = 'Validating…'
export const STATUS_UPLOADING = 'Uploading…'
export const STATUS_SUBMITTING = 'Submitting…'
export const STATUS_SAVING_ORDER = 'Saving order…'
export const STATUS_LOADING_MAPS = 'Loading maps...'
export const STATUS_ACCESS_DENIED = 'Access denied.'
export const STATUS_NO_MAPS = 'No maps available yet.'
export const STATUS_NO_MAPS_FOUND = 'No maps found.'
export const STATUS_NO_MAPS_ADMIN = 'No maps yet.'
export const STATUS_NO_SUBMISSIONS = 'No submissions yet.'
export const STATUS_NO_NOTIFICATIONS = 'No notifications yet'
export const STATUS_SHA256 = 'SHA256 ✓'
export const STATUS_INSTALLS = 'installs'
export const STATUS_ELLIPSIS = '…'

// UI labels — install phase labels
export const PHASE_DOWNLOAD = 'DOWNLOAD'
export const PHASE_VERIFY = 'VERIFY'
export const PHASE_EXTRACT = 'EXTRACT'
export const PHASE_WRITE = 'WRITE'

// UI labels — informational text
export const INFO_SUBMIT_DESCRIPTION = 'Upload a CS 1.6 map archive. It will appear on the public list after admin review.'
export const INFO_DROP_ZONE = 'Drop .zip, .7z, or .rar files here, or click to browse'
export const INFO_DROP_ZONE_ADMIN = 'Max 20 MB per file · Multiple files supported'
export const INFO_DROP_ZONE_SUBMIT = 'Max 20 MB per file · Your map will be reviewed before publishing'
export const INFO_SCREENSHOTS_OPTIONAL = '(optional, up to 3)'
export const INFO_SCREENSHOTS_UP_TO = '(up to 3)'
export const INFO_NO_BROWSER_INSTALL = "Your browser doesn't support one-click install. Use the **Download** button instead."
export const INFO_SELECT_CS_FOLDER = "Select your CS 1.6 folder first — e.g. C:\\Games\\Counter-Strike"
export const INFO_WRONG_CS_FOLDER = "This doesn't look like a CS 1.6 root folder (no 'cstrike' subfolder found). Continue anyway?"
export const INFO_PICK_CS_FOLDER = 'Pick your CS 1.6 root folder and install map!'
export const INFO_FOLDER_EXAMPLE = 'Ex: C:\\Games\\Counter-Strike'
export const INFO_YOUR_FOLDER = 'Your folder:'
export const INFO_YOUR_FOLDER_LABEL = 'Your Folder'
export const INFO_SEARCH_PLACEHOLDER = 'Search maps…'
export const INFO_REJECTION_PLACEHOLDER = 'Rejection reason…'
export const INFO_SITE_TITLE = 'CS MAPS'

// UI labels — dynamic text (functions)
export const LABEL_INSTALL_COUNT = (done: number, total: number) => `${done} / ${total} installed`
export const LABEL_SELECTED_COUNT = (n: number) => `${n} selected`
export const LABEL_DELETE_CONFIRM = (name: string) => `Delete ${name}?`
export const LABEL_REJECTION_REASON = (reason: string) => `Reason: ${reason}`
export const LABEL_SUBMITTED_AT = (date: string) => `Submitted ${date}`
export const LABEL_SUBMIT_FILES = (n: number) => `Submit ${n} file${n > 1 ? 's' : ''}`
export const LABEL_UPLOAD_FILES = (n: number) => `Upload ${n} file${n > 1 ? 's' : ''}`
export const PHASE_DOWNLOADING = (pct: number) => `Downloading... ${pct}%`
export const PHASE_WRITING = (done: number, total: number) => `Writing ${done}/${total}...`
export const PHASE_VERIFYING = 'Verifying...'
export const PHASE_EXTRACTING = 'Extracting...'
