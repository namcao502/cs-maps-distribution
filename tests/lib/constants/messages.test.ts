import {
  PHASE_DOWNLOADING,
  PHASE_WRITING,
  LABEL_INSTALL_COUNT,
  LABEL_SELECTED_COUNT,
  LABEL_DELETE_CONFIRM,
  LABEL_REJECTION_REASON,
  LABEL_SUBMITTED_AT,
  LABEL_SUBMIT_FILES,
  LABEL_UPLOAD_FILES,
} from '@/lib/constants/messages'

describe('dynamic message functions', () => {
  it('PHASE_DOWNLOADING formats percentage', () => {
    expect(PHASE_DOWNLOADING(75)).toBe('Downloading... 75%')
    expect(PHASE_DOWNLOADING(0)).toBe('Downloading... 0%')
  })

  it('PHASE_WRITING formats progress', () => {
    expect(PHASE_WRITING(3, 10)).toBe('Writing 3/10...')
  })

  it('LABEL_INSTALL_COUNT formats count', () => {
    expect(LABEL_INSTALL_COUNT(5, 24)).toBe('5 / 24 installed')
  })

  it('LABEL_SELECTED_COUNT formats count', () => {
    expect(LABEL_SELECTED_COUNT(3)).toBe('3 selected')
  })

  it('LABEL_DELETE_CONFIRM includes map name', () => {
    expect(LABEL_DELETE_CONFIRM('de_dust2')).toBe('Delete de_dust2?')
  })

  it('LABEL_REJECTION_REASON includes reason', () => {
    expect(LABEL_REJECTION_REASON('Not a valid map')).toBe('Reason: Not a valid map')
  })

  it('LABEL_SUBMITTED_AT includes date string', () => {
    expect(LABEL_SUBMITTED_AT('yesterday')).toBe('Submitted yesterday')
  })

  it('LABEL_SUBMIT_FILES pluralises correctly', () => {
    expect(LABEL_SUBMIT_FILES(1)).toBe('Submit 1 file')
    expect(LABEL_SUBMIT_FILES(3)).toBe('Submit 3 files')
  })

  it('LABEL_UPLOAD_FILES pluralises correctly', () => {
    expect(LABEL_UPLOAD_FILES(1)).toBe('Upload 1 file')
    expect(LABEL_UPLOAD_FILES(2)).toBe('Upload 2 files')
  })
})
