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

    // expect each to be visible
    expect(screen.getByTestId('file-type-application/pdf')).toBeVisible()
    expect(screen.getByTestId('file-type-application/zip')).toBeVisible()
    expect(screen.getByTestId('file-type-text/csv')).toBeVisible()
    expect(
      screen.getByTestId(
        'file-type-application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
    ).toBeVisible()
  })
})
