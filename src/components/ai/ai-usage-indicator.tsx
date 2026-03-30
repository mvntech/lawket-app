import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'

interface AIUsageIndicatorProps {
  used: number
  limit: number
}

export function AIUsageIndicator({ used, limit }: AIUsageIndicatorProps) {
  const remaining = limit - used

  const colorClass =
    remaining > 10
      ? 'text-muted-foreground'
      : remaining >= 5
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-destructive'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-default',
              colorClass,
            )}
          >
            {used}/{limit} AI requests
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI requests reset every hour</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
