import {
  describe,
  expect,
  it,
  screen,
  wrappedRender
} from '@vitest-utils/utils'
import ValidationErrorDisplay from './validation-error-display'
import { ZodError } from 'zod'

describe('<ValidationErrorDisplay />', () => {
  it('should not render when there is no validation error', () => {
    wrappedRender(<ValidationErrorDisplay validationError={null} />)

    expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument()
  })

  it('should render validation errors correctly', () => {
    const mockError = new ZodError([
      {
        path: ['name'],
        message: 'Name is required',
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined'
      },
      {
        path: ['year'],
        message: 'Year must be a number',
        code: 'invalid_type',
        expected: 'number',
        received: 'string'
      }
    ])

    wrappedRender(<ValidationErrorDisplay validationError={mockError} />)

    expect(screen.getAllByTestId('validation-error')).toHaveLength(2)
    expect(screen.getByText('Name is required')).toBeVisible()
    expect(screen.getByText('Year must be a number')).toBeVisible()
  })
})
