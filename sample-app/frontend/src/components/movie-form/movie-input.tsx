import { SInput } from '@styles/styled-components'

type MovieInputProps = Readonly<{
  type: 'text' | 'number'
  value: string | number
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
}>

export default function MovieInput({
  type,
  value,
  onChange,
  placeholder
}: MovieInputProps) {
  return (
    <SInput
      data-testid={`movie-input-comp-${type}`}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}
