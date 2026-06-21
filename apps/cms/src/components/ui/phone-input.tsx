import * as React from 'react'
import PhoneInputPrimitive, { type Value } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import '@/styles/phone-input.css'

interface PhoneInputProps {
  id?: string
  name?: string
  value?: Value
  onChange: (value: Value) => void
  onBlur?: () => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

function FlagComponent({ country, countryName }: { country: string; countryName: string }) {
  const Flag = flags[country as keyof typeof flags]

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-brand/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag ? <Flag title={countryName} /> : null}
    </span>
  )
}

const PhoneInput = React.forwardRef<React.ComponentRef<typeof PhoneInputPrimitive>, PhoneInputProps>(
  ({ className, onChange, ...props }, ref) => {
    return (
      <PhoneInputPrimitive
        ref={ref}
        international
        defaultCountry="RS"
        flagComponent={FlagComponent}
        inputComponent={Input}
        onChange={onChange}
        className={cn('phone-input', className)}
        {...props}
      />
    )
  },
)
PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
