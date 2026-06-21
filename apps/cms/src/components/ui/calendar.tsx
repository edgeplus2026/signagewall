import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import * as React from 'react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-2', className)}
      classNames={{
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'flex w-full flex-col gap-3',
        month_caption: 'flex h-8 items-center justify-center px-9',
        caption_label: 'text-sm font-medium text-primary',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous:
          'inline-flex size-8 items-center justify-center rounded-md text-secondary transition-colors outline-none hover:bg-highlight hover:text-primary focus-visible:ring-3 focus-visible:ring-tertiary/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
        button_next:
          'inline-flex size-8 items-center justify-center rounded-md text-secondary transition-colors outline-none hover:bg-highlight hover:text-primary focus-visible:ring-3 focus-visible:ring-tertiary/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-[0.75rem] font-normal text-secondary',
        week: 'mt-1 flex w-full',
        day: 'relative size-9 p-0 text-center text-sm',
        day_button:
          'inline-flex size-9 items-center justify-center rounded-md font-normal text-primary transition-colors outline-none hover:bg-highlight focus-visible:ring-3 focus-visible:ring-tertiary/50 aria-selected:font-medium',
        selected: '[&>button]:bg-brand [&>button]:text-brand-contrast [&>button]:hover:bg-brand/90',
        range_start: 'rounded-l-md bg-highlight',
        range_middle:
          'bg-highlight [&>button]:rounded-none [&>button]:bg-transparent [&>button]:text-primary [&>button]:hover:bg-secondary/20',
        range_end: 'rounded-r-md bg-highlight',
        today: '[&>button]:ring-1 [&>button]:ring-secondary',
        outside: 'text-secondary/50 [&>button]:text-secondary/50',
        disabled: '[&>button]:pointer-events-none [&>button]:opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          const Icon = orientation === 'left' ? ChevronLeftIcon : ChevronRightIcon
          return <Icon className={cn('size-4', chevronClassName)} {...chevronProps} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
