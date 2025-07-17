import {
  describe,
  expect,
  it,
  screen,
  wrappedRender
} from '@vitest-utils/utils'
import FileDownload from './file-download'

describe('<FileDownload />', () => {
  it('should render the file download component and each file type', () => {
    wrappedRender(<FileDownload />)
    expect(screen.getByTestId('files-list')).toBeVisible()

    // there should be multiple download-buttons and file-types
    const downloadButtons = screen.getAllByTestId(/download-button/)
    expect(downloadButtons).toHaveLength(5)
    const fileTypes = screen.getAllByTestId(/file-type/)
    expect(fileTypes).toHaveLength(5)
  })
})
