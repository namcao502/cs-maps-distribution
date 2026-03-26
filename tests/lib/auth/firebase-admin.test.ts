jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(),
  initializeApp: jest.fn(),
  cert: jest.fn(cfg => cfg),
}))
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn(() => ({ type: 'auth' })) }))
jest.mock('firebase-admin/firestore', () => ({ getFirestore: jest.fn(() => ({ type: 'db' })) }))
jest.mock('firebase-admin/storage', () => ({ getStorage: jest.fn(() => ({ type: 'storage' })) }))

// Import after mocks are hoisted
import { getAdminAuth, getAdminDb, getAdminStorage } from '@/lib/auth/firebase-admin'

const mockApp = { name: 'mock-app' }

// Reference mocks via requireMock so they stay in sync after any module resets
const firebaseApp = jest.requireMock('firebase-admin/app')
const firebaseAuth = jest.requireMock('firebase-admin/auth')
const firebaseFirestore = jest.requireMock('firebase-admin/firestore')
const firebaseStorage = jest.requireMock('firebase-admin/storage')

beforeEach(() => {
  jest.clearAllMocks()
  process.env.FIREBASE_PROJECT_ID = 'test-project'
  process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com'
  process.env.FIREBASE_PRIVATE_KEY = 'test-key'
  process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket'
  firebaseApp.initializeApp.mockReturnValue(mockApp)
})

describe('getAdminAuth', () => {
  it('initialises a new app when none exists', () => {
    firebaseApp.getApps.mockReturnValue([])
    getAdminAuth()
    expect(firebaseApp.initializeApp).toHaveBeenCalled()
    expect(firebaseAuth.getAuth).toHaveBeenCalledWith(mockApp)
  })

  it('reuses existing app when already initialised', () => {
    firebaseApp.getApps.mockReturnValue([mockApp])
    getAdminAuth()
    expect(firebaseApp.initializeApp).not.toHaveBeenCalled()
    expect(firebaseAuth.getAuth).toHaveBeenCalledWith(mockApp)
  })
})

describe('getAdminDb', () => {
  it('returns Firestore instance', () => {
    firebaseApp.getApps.mockReturnValue([mockApp])
    getAdminDb()
    expect(firebaseFirestore.getFirestore).toHaveBeenCalledWith(mockApp)
  })
})

describe('getAdminStorage', () => {
  it('returns Storage instance', () => {
    firebaseApp.getApps.mockReturnValue([mockApp])
    getAdminStorage()
    expect(firebaseStorage.getStorage).toHaveBeenCalledWith(mockApp)
  })
})
