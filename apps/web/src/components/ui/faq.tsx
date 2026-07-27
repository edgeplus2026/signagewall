'use client'

import { ChevronDown } from 'lucide-react'
import { Accordion } from 'radix-ui'

interface QA {
  q: string
  a: string
}

export function Faq({ items }: { items: QA[] }) {
  return (
    <Accordion.Root
      type="single"
      collapsible
      className="divide-y divide-secondary border-y border-secondary"
    >
      {items.map((item, i) => (
        <Accordion.Item key={item.q} value={`item-${i.toString()}`}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium">
              {item.q}
              <ChevronDown className="size-5 shrink-0 text-secondary transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <p className="pb-5 text-sm leading-relaxed text-secondary">{item.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
