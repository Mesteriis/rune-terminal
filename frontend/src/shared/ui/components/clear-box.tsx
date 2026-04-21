import * as React from 'react'

import { Box, type BoxProps } from '@/shared/ui/primitives'
import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

export const ClearBox = React.forwardRef<HTMLDivElement, BoxProps>(function ClearBox(
  { style, ...props },
  ref,
) {
  return <Box {...props} ref={ref} style={{ ...resetBoxStyle, ...style }} />
})

ClearBox.displayName = 'ClearBox'
