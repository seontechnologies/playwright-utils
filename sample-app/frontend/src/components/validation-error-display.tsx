import styled from 'styled-components'
import type { z } from 'zod'

type props = {
  readonly validationError: z.ZodError | null
}

export default function ValidationErrorDisplay({ validationError }: props) {
  if (!validationError) return null

  return (
    <SError>
      {validationError.errors.map((err) => (
        <p key={err.path.join('.')} data-cy="validation-error">
          {err.message}
        </p>
      ))}
    </SError>
  )
}

const SError = styled.div`
  color: red;
  margin-bottom: 10px;
`
